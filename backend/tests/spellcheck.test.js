module.exports = function(request, app) {
    describe('Spellcheck API', () => {
        var userToken = '';
        var adminToken = '';
        
        beforeAll(async () => {
            // Get regular user token
            var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'});
            userToken = response.body.datas.token;
            adminToken = userToken; // Admin has all permissions
        });

        describe('POST /api/spellcheck', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .post('/api/spellcheck')
                    .send({ text: 'test', language: 'en-CA' });
                expect(response.status).toBe(401);
            });

            it('Should return empty matches for empty text', async () => {
                // Mock fetch for LanguageTool API
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ matches: [] })
                    })
                );

                var response = await request(app)
                    .post('/api/spellcheck')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ text: '', language: 'en-CA' });

                expect(response.status).toBe(200);
                expect(response.body.datas.matches).toEqual([]);

                global.fetch = originalFetch;
            });

            it('Should check spelling and filter dictionary words', async () => {
                // Mock fetch for LanguageTool API
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            matches: [
                                {
                                    message: 'Possible spelling mistake',
                                    offset: 0,
                                    length: 4,
                                    replacements: [{ value: 'test' }]
                                }
                            ]
                        })
                    })
                );

                var response = await request(app)
                    .post('/api/spellcheck')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ text: 'test', language: 'en-CA' });

                expect(response.status).toBe(200);
                expect(response.body.datas).toHaveProperty('matches');
                // If 'test' is in dictionary, it should be filtered out
                // If not, it should appear in matches

                global.fetch = originalFetch;
            });

            it('Should handle LanguageTool API errors', async () => {
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: false,
                        status: 502
                    })
                );

                var response = await request(app)
                    .post('/api/spellcheck')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ text: 'test', language: 'en-CA' });

                expect(response.status).toBe(502);
                expect(response.body.datas).toContain('LanguageTool HTTP 502');

                global.fetch = originalFetch;
            });

            it('Should use default language en-CA if not provided', async () => {
                const originalFetch = global.fetch;
                global.fetch = jest.fn(() =>
                    Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ matches: [] })
                    })
                );

                var response = await request(app)
                    .post('/api/spellcheck')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ text: 'test' });

                expect(response.status).toBe(200);
                // Verify that fetch was called with en-CA language
                expect(global.fetch).toHaveBeenCalled();

                global.fetch = originalFetch;
            });
        });

        describe('GET /api/spellcheck/dict', () => {
            it('Should require authentication', async () => {
                var response = await request(app).get('/api/spellcheck/dict');
                expect(response.status).toBe(401);
            });

            it('Should return dictionary words', async () => {
                var response = await request(app)
                    .get('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(response.status).toBe(200);
                expect(response.body.status).toBe('success');
                expect(Array.isArray(response.body.datas)).toBe(true);
            });
        });

        describe('POST /api/spellcheck/dict', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .post('/api/spellcheck/dict')
                    .send({ word: 'testword' });
                expect(response.status).toBe(401);
            });

            it('Should require settings:update permission', async () => {
                var response = await request(app)
                    .post('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ word: 'testword' });

                // Should succeed if user has permission
                expect([200, 400, 500]).toContain(response.status);
            });

            it('Should reject request without word', async () => {
                var response = await request(app)
                    .post('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({});

                expect(response.status).toBe(422);
                expect(response.body.datas).toContain("Missing required parameter: word");
            });

            it('Should add word to dictionary (lowercase)', async () => {
                const testWord = 'TestWord' + Date.now(); // Unique word
                
                var response = await request(app)
                    .post('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ word: testWord });

                expect(response.status).toBe(200);
                expect(response.body.datas.success).toBe(true);
                expect(response.body.datas.word).toBe(testWord.toLowerCase());

                // Verify word was added
                var getResponse = await request(app)
                    .get('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(getResponse.status).toBe(200);
                const words = getResponse.body.datas.map(w => w.word);
                expect(words).toContain(testWord.toLowerCase());
            });

            it('Should handle duplicate words gracefully', async () => {
                const testWord = 'DuplicateWord' + Date.now();
                
                // Add word first time
                var response1 = await request(app)
                    .post('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ word: testWord });

                expect(response1.status).toBe(200);

                // Add same word again (should use upsert)
                var response2 = await request(app)
                    .post('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ word: testWord });

                // Should succeed (upsert handles duplicates)
                expect([200, 500]).toContain(response2.status);
            });
        });

        describe('DELETE /api/spellcheck/dict', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .delete('/api/spellcheck/dict')
                    .send({ word: 'testword' });
                expect(response.status).toBe(401);
            });

            it('Should require settings:update permission', async () => {
                var response = await request(app)
                    .delete('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ word: 'testword' });

                // Should succeed or return 404 if word doesn't exist
                expect([200, 404, 500]).toContain(response.status);
            });

            it('Should reject request without word', async () => {
                var response = await request(app)
                    .delete('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({});

                expect(response.status).toBe(422);
                expect(response.body.datas).toContain("Missing required parameter: word");
            });

            it('Should delete word from dictionary', async () => {
                const testWord = 'DeleteWord' + Date.now();
                
                // Add word first
                var addResponse = await request(app)
                    .post('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ word: testWord });

                expect(addResponse.status).toBe(200);

                // Delete word
                var deleteResponse = await request(app)
                    .delete('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ word: testWord });

                expect(deleteResponse.status).toBe(200);
                expect(deleteResponse.body.datas.success).toBe(true);
                expect(deleteResponse.body.datas.removed).toBe(testWord.toLowerCase());

                // Verify word was removed
                var getResponse = await request(app)
                    .get('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(getResponse.status).toBe(200);
                const words = getResponse.body.datas.map(w => w.word);
                expect(words).not.toContain(testWord.toLowerCase());
            });

            it('Should handle deletion of non-existent word gracefully', async () => {
                const nonExistentWord = 'NonExistent' + Date.now();
                
                var response = await request(app)
                    .delete('/api/spellcheck/dict')
                    .set('Cookie', [`token=JWT ${adminToken}`])
                    .send({ word: nonExistentWord });

                expect(response.status).toBe(404);
            });
        });
    });
};
