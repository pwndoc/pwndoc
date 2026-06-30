module.exports = function(request, app) {
    describe('AI integration API', () => {
        const Settings = require('mongoose').model('Settings');
        let adminToken = '';
        let userToken = '';
        let noAiToken = '';

        const login = async (username, password) => {
            const response = await request(app).post('/api/users/token').send({ username, password });
            expect(response.status).toBe(200);
            expect(response.body.datas.token).toBeDefined();
            return response.body.datas.token;
        };

        beforeAll(async () => {
            adminToken = await login('admin', 'Admin123');
            userToken = await login('user2', 'User1234');

            let response = await request(app).post('/api/data/roles')
                .set('Cookie', [`token=JWT ${adminToken}`])
                .send({
                    name: 'no-ai-integration',
                    displayName: 'No AI Integration',
                    allows: ['clients:read']
                });
            expect([201, 422]).toContain(response.status);

            response = await request(app).post('/api/users')
                .set('Cookie', [`token=JWT ${adminToken}`])
                .send({
                    username: 'noaiuser',
                    password: 'Noai1234',
                    firstname: 'No',
                    lastname: 'Ai',
                    roles: ['no-ai-integration']
                });
            expect([201, 422]).toContain(response.status);

            noAiToken = await login('noaiuser', 'Noai1234');

            await Settings.findOneAndUpdate({}, {
                $set: {
                    'ai.public.redactionGuidelines.content': 'Secret redaction policy',
                    'ai.public.qaInstructions.content': 'Secret QA checklist',
                    'ai.public.qaChecks.redaction': false
                }
            }, { upsert: true });
        });

        beforeEach(async () => {
            await Settings.findOneAndUpdate({}, {
                $set: {
                    'ai.public.redactionGuidelines.content': 'Secret redaction policy',
                    'ai.public.qaInstructions.content': 'Secret QA checklist',
                    'ai.public.qaChecks.redaction': false
                }
            }, { upsert: true });
        });

        it('should omit admin-only AI config from public settings', async () => {
            const response = await request(app).get('/api/settings/public')
                .set('Cookie', [`token=JWT ${userToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.datas.ai.public).toEqual({ enabled: true });
        });

        it('should deny AI integration config to users without ai read permissions', async () => {
            const response = await request(app).get('/api/data/ai-integration')
                .set('Cookie', [`token=JWT ${noAiToken}`]);

            expect(response.status).toBe(403);
        });

        it('should return redaction guidelines only for standard users', async () => {
            const response = await request(app).get('/api/data/ai-integration')
                .set('Cookie', [`token=JWT ${userToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.datas.redactionGuidelines.content).toBe('Secret redaction policy');
            expect(response.body.datas.promptMappings).toBeUndefined();
            expect(response.body.datas.qaInstructions).toBeUndefined();
            expect(response.body.datas.qaChecks).toBeUndefined();
        });

        it('should return enabled field prompts for users with ai-generate permission', async () => {
            const response = await request(app).get('/api/ai/enabled-fields?entityType=finding')
                .set('Cookie', [`token=JWT ${userToken}`]);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.datas.fields)).toBe(true);
            expect(response.body.datas.fields.some((field) => field.fieldKey === 'description')).toBe(true);
            expect(response.body.datas.fields[0]).toHaveProperty('prompt');
            expect(response.body.datas.redactionGuidelines).toBeUndefined();
            expect(response.body.datas.promptMappings).toBeUndefined();
        });

        it('should return full AI integration config for settings admins', async () => {
            const response = await request(app).get('/api/data/ai-integration')
                .set('Cookie', [`token=JWT ${adminToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.datas.redactionGuidelines.content).toBe('Secret redaction policy');
            expect(response.body.datas.qaInstructions.content).toBe('Secret QA checklist');
            expect(response.body.datas.qaChecks.redaction).toBe(false);
        });
    });
};
