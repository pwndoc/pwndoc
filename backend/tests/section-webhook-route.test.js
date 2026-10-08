const mockAudit = {getAudit: jest.fn(), updateSection: jest.fn()};
const mockSettings = {getAll: jest.fn()};
const mockResponse = {Ok: jest.fn(), BadParameters: jest.fn(), Forbidden: jest.fn(), Internal: jest.fn()};
const mockEmit = jest.fn();
jest.mock('mongoose', () => ({model: name => name === 'Audit' ? mockAudit : mockSettings}));
jest.mock('../src/lib/httpResponse', () => mockResponse);
jest.mock('../src/lib/auth', () => ({acl: {hasPermission: () => () => {}, isAllowed: () => true}}));
jest.mock('../src/lib/report-generator', () => ({}));
jest.mock('../src/lib/utils', () => ({}));
jest.mock('../src/lib/section-webhooks', () => ({emitSectionUpdateWebhook: context => mockEmit(context)}));

describe('Section-save webhook boundary', () => {
    let handler;
    beforeEach(() => {
        jest.clearAllMocks();
        mockSettings.getAll.mockResolvedValue({reviews: {enabled: false}});
        mockAudit.getAudit.mockResolvedValue({state: 'EDIT'});
        mockAudit.updateSection.mockResolvedValue('saved');
        const app = {};
        for (const method of ['get', 'put', 'post', 'delete']) app[method] = jest.fn((path, ...handlers) => {
            if (method === 'put' && path === '/api/audits/:auditId/sections/:sectionId') handler = handlers.at(-1);
        });
        require('../src/routes/audit')(app, {});
    });
    const req = () => ({params: {auditId: 'a', sectionId: 's'}, decodedToken: {id: 'u', roles: ['user']}, body: {customFields: [{text: 'secret'}]}});
    const flush = () => new Promise(resolve => setImmediate(resolve));
    it('emits after persistence succeeds, including unchanged saves', async () => {
        await handler(req(), {}); await flush();
        expect(mockEmit).toHaveBeenCalledWith({auditId: 'a', sectionId: 's', actorId: 'u', changedFields: ['customFields']});
        await handler(req(), {}); await flush();
        expect(mockEmit).toHaveBeenCalledTimes(2);
    });
    it('does not emit after a database failure', async () => {
        mockAudit.updateSection.mockRejectedValue(new Error('offline'));
        await handler(req(), {}); await flush();
        expect(mockResponse.Internal).toHaveBeenCalled(); expect(mockEmit).not.toHaveBeenCalled();
    });
    it('does not emit for invalid parameters or a review-state refusal', async () => {
        await handler({...req(), body: {}}, {});
        mockSettings.getAll.mockResolvedValue({reviews: {enabled: true}});
        mockAudit.getAudit.mockResolvedValue({state: 'APPROVED'});
        await handler(req(), {});
        expect(mockEmit).not.toHaveBeenCalled(); expect(mockAudit.updateSection).not.toHaveBeenCalled();
    });
    it('does not emit when audit access is denied', async () => {
        mockAudit.getAudit.mockRejectedValue(new Error('denied'));
        await expect(handler(req(), {})).rejects.toThrow('denied');
        expect(mockEmit).not.toHaveBeenCalled();
    });
});
