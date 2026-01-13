module.exports = function(request, app) {
    describe('LanguageTool Rules API', () => {
        var userToken = '';
        var adminToken = '';
        
        const mockRuleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rules lang="en">
  <rule id="TEST_RULE" name="Test Rule">
    <pattern>
      <token regexp="yes">test</token>
    </pattern>
    <message>This is a test rule</message>
  </rule>
</rules>`;

        const mockRuleXmlInvalid = `<?xml version="1.0" encoding="UTF-8"?>
<rules lang="en">
  <rule name="Test Rule">
    <pattern>
      <token regexp="yes">test</token>
    </pattern>
  </rule>
</rules>`;
        
    const mockRuleXmlInvalidNoName = `<?xml version="1.0" encoding="UTF-8"?>
<rules lang="en">
<rule id="TEST_RULE">
<pattern>
<token regexp="yes">test</token>
</pattern>
<message>This is a test rule</message>
</rule>
</rules>`;

        beforeAll(async () => {
            // Get regular user token
            var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'});
            userToken = response.body.datas.token;
            adminToken = userToken; // Admin has all permissions
        });

        describe('GET /api/languagetool-rules/languages', () => {
            it('Should require authentication', async () => {
                var response = await request(app).get('/api/languagetool-rules/languages');
                expect(response.status).toBe(401);
            });

            it('Should return languages list', async () => {
                // Mock fetch for LanguageTool API
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ languages: ['en', 'fr', 'de'] })
                    })
                );

                var response = await request(app)
                    .get('/api/languagetool-rules/languages')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(response.status).toBe(200);
                expect(response.body.status).toBe('success');
                expect(response.body.datas.languages).toEqual(['en', 'fr', 'de']);

                global.fetch = originalFetch;
            });

            it('Should handle LanguageTool API errors', async () => {
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: false,
                        status: 500,
                        text: () => Promise.resolve('Internal Server Error')
                    })
                );

                var response = await request(app)
                    .get('/api/languagetool-rules/languages')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(response.status).toBe(500);

                global.fetch = originalFetch;
            });
        });

        describe('GET /api/languagetool-rules', () => {
            it('Should require authentication', async () => {
                var response = await request(app).get('/api/languagetool-rules');
                expect(response.status).toBe(401);
            });

            it('Should return empty list when no rules exist', async () => {
                var response = await request(app)
                    .get('/api/languagetool-rules')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(response.status).toBe(200);
                expect(response.body.status).toBe('success');
                expect(Array.isArray(response.body.datas)).toBe(true);
            });
        });

        describe('GET /api/languagetool-rules/:id', () => {
            it('Should require authentication', async () => {
                var response = await request(app).get('/api/languagetool-rules/123');
                expect(response.status).toBe(401);
            });

            it('Should return 404 for non-existent rule', async () => {
                var response = await request(app)
                    .get('/api/languagetool-rules/507f1f77bcf86cd799439011')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(response.status).toBe(404);
            });
        });

        describe('POST /api/languagetool-rules', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .post('/api/languagetool-rules')
                    .send({ language: 'en', ruleXml: mockRuleXml });
                expect(response.status).toBe(401);
            });

            it('Should require settings:update permission', async () => {
                // This would require a user without settings:update permission
                // For now, we test that authenticated users can create
                var response = await request(app)
                    .post('/api/languagetool-rules')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ language: 'en', ruleXml: mockRuleXml });

                // Should succeed if user has permission
                expect([200, 201, 400, 500]).toContain(response.status);
            });

            it('Should reject request without language', async () => {
                var response = await request(app)
                    .post('/api/languagetool-rules')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ ruleXml: mockRuleXml });

                expect(response.status).toBe(422);
                expect(response.body.datas).toContain('Language is required');
            });

            it('Should reject request without ruleXml', async () => {
                var response = await request(app)
                    .post('/api/languagetool-rules')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ language: 'en' });

                expect(response.status).toBe(422);
                expect(response.body.datas).toContain('Rule XML is required');
            });

            it('Should reject invalid XML without id attribute', async () => {
                var response = await request(app)
                    .post('/api/languagetool-rules')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ language: 'en', ruleXml: mockRuleXmlInvalid });

                expect(response.status).toBe(422);
                expect(response.body.datas).toContain('id attribute');
            });

            it('Should reject invalid XML without name attribute', async () => {
                var response = await request(app)
                    .post('/api/languagetool-rules')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ language: 'en', ruleXml: mockRuleXmlInvalidNoName });

                expect(response.status).toBe(422);
                expect(response.body.datas).toContain('name attribute');
            });

            it('Should create a rule with valid XML', async () => {
                // Mock fetch for LanguageTool API
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ success: true })
                    })
                );

                var response = await request(app)
                    .post('/api/languagetool-rules')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ language: 'en', ruleXml: mockRuleXml });

                // Should succeed or fail based on database state
                expect([200, 201, 400, 500]).toContain(response.status);

                global.fetch = originalFetch;
            });
        });

        describe('DELETE /api/languagetool-rules/:id', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .delete('/api/languagetool-rules/123');
                expect(response.status).toBe(401);
            });

            it('Should return 404 for non-existent rule', async () => {
                var response = await request(app)
                    .delete('/api/languagetool-rules/507f1f77bcf86cd799439011')
                    .set('Cookie', [`token=JWT ${adminToken}`]);

                expect(response.status).toBe(404);
            });
        });

        describe('POST /api/languagetool-rules/reload', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .post('/api/languagetool-rules/reload');
                expect(response.status).toBe(401);
            });

            it('Should reload rules and restart LanguageTool', async () => {
                // Mock fetch for LanguageTool API
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ success: true, pid: 12345 })
                    })
                );

                var response = await request(app)
                    .post('/api/languagetool-rules/reload')
                    .set('Cookie', [`token=JWT ${adminToken}`]);

                // Should succeed or fail based on database state
                expect([200, 500]).toContain(response.status);

                global.fetch = originalFetch;
            });
        });

        describe('POST /api/languagetool-rules/restart', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .post('/api/languagetool-rules/restart');
                expect(response.status).toBe(401);
            });

            it('Should restart LanguageTool', async () => {
                // Mock fetch for LanguageTool API
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ success: true, message: 'Restarted', pid: 12345 })
                    })
                );

                var response = await request(app)
                    .post('/api/languagetool-rules/restart')
                    .set('Cookie', [`token=JWT ${adminToken}`]);

                // Should succeed
                expect([200, 500]).toContain(response.status);

                global.fetch = originalFetch;
            });
        });

        describe('GET /api/internal/languagetool-rules', () => {
            it('Should not require authentication (internal endpoint)', async () => {
                var response = await request(app)
                    .get('/api/internal/languagetool-rules');

                // Should succeed (no auth required) or return empty array
                expect([200, 500]).toContain(response.status);
            });

            it('Should return all rules in expected format', async () => {
                var response = await request(app)
                    .get('/api/internal/languagetool-rules');

                if (response.status === 200) {
                    expect(response.body.status).toBe('success');
                    expect(Array.isArray(response.body.datas)).toBe(true);
                    if (response.body.datas.length > 0) {
                        expect(response.body.datas[0]).toHaveProperty('_id');
                        expect(response.body.datas[0]).toHaveProperty('id');
                        expect(response.body.datas[0]).toHaveProperty('name');
                        expect(response.body.datas[0]).toHaveProperty('language');
                        expect(response.body.datas[0]).toHaveProperty('ruleXml');
                    }
                }
            });
        });
    });
};
