module.exports = function(request, app) {
    describe('AI integration API', () => {
        const Settings = require('mongoose').model('Settings');
        let adminToken = '';
        let userToken = '';

        beforeAll(async () => {
            let response = await request(app).post('/api/users/token').send({
                username: 'admin',
                password: 'Admin123'
            });
            adminToken = response.body.datas.token;

            response = await request(app).post('/api/users/token').send({
                username: 'user',
                password: 'Password1'
            });
            userToken = response.body.datas.token;

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

        it('should deny AI integration config to report users', async () => {
            const response = await request(app).get('/api/data/ai-integration')
                .set('Cookie', [`token=JWT ${userToken}`]);

            expect(response.status).toBe(403);
        });

        it('should return enabled field prompts only for report users', async () => {
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
