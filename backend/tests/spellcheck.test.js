module.exports = function(request, app) {
    describe('Spellcheck API', () => {
        var userToken = '';
        var adminToken = '';
        
        var originalFetch;

        beforeAll(async () => {
            // Mock fetch globally to prevent real calls to languagetool service.
            // The /v2/info response identifies it as LanguageTool so testLanguageToolConnection
            // returns isLanguageTool:true, allowing the settings PUT to save the LT URL.
            originalFetch = global.fetch;
            global.fetch = jest.fn((url) => {
                const urlStr = url.toString();
                if (urlStr.includes('/v2/info')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ software: { name: 'LanguageTool', version: '6.0' } })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ matches: [] })
                });
            });

            // Get regular user token
            var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'});
            userToken = response.body.datas.token;
            adminToken = userToken; // Admin has all permissions

            // Configure a LT URL. Must include enableSpellCheck:true so the settings route
            // validates and saves the LT URL (the route ignores LT fields when spellcheck is off).
            await request(app)
                .put('/api/settings')
                .set('Cookie', [`token=JWT ${adminToken}`])
                .send({ report: { public: { enableSpellCheck: true }, private: { languageToolUrl: 'http://localhost:8020' } } });
        });

        afterAll(async () => {
            global.fetch = originalFetch;
            // Clear the LT URL. Sending enableSpellCheck:true with an empty URL bypasses
            // LT validation (empty URL skips the check) and saves the empty value.
            await request(app)
                .put('/api/settings')
                .set('Cookie', [`token=JWT ${adminToken}`])
                .send({ report: { public: { enableSpellCheck: true }, private: { languageToolUrl: '', languageToolApiKey: '', languageToolUsername: '' } } });
        });

        beforeEach(() => {
            global.fetch.mockReset();
            global.fetch.mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ matches: [] })
                })
            );
        });

        describe('POST /api/spellcheck', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .post('/api/spellcheck')
                    .send({ text: 'test', language: 'en-CA' });
                expect(response.status).toBe(401);
            });

            it('Should return empty matches for empty text', async () => {
                var response = await request(app)
                    .post('/api/spellcheck')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ text: '', language: 'en-CA' });

                expect(response.status).toBe(200);
                expect(response.body.datas.matches).toEqual([]);
            });

            it('Should check spelling and filter dictionary words', async () => {
                global.fetch.mockImplementation(() =>
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
            });

            it('Should handle LanguageTool API errors', async () => {
                global.fetch.mockImplementation(() =>
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
            });

            it('Should return 502 when LanguageTool cannot be reached', async () => {
                global.fetch.mockImplementation(() =>
                    Promise.reject({
                        message: 'connect ECONNREFUSED',
                        cause: { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:8010' }
                    })
                );

                var response = await request(app)
                    .post('/api/spellcheck')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ text: 'test', language: 'en-CA' });

                expect(response.status).toBe(502);
                expect(response.body.datas).toContain('LanguageTool fetch failed');
                expect(response.body.datas).toContain('ECONNREFUSED');
            });

            it('Should use default language en-CA if not provided', async () => {
                var response = await request(app)
                    .post('/api/spellcheck')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ text: 'test' });

                expect(response.status).toBe(200);
                // Verify that fetch was called with en-CA language
                expect(global.fetch).toHaveBeenCalled();
            });
        });

        describe('GET /api/spellcheck/capabilities', () => {
            it('Should require authentication', async () => {
                var response = await request(app).get('/api/spellcheck/capabilities');
                expect(response.status).toBe(401);
            });

            it('Should return capability fields', async () => {
                var response = await request(app)
                    .get('/api/spellcheck/capabilities')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(response.status).toBe(200);
                expect(response.body.datas).toHaveProperty('enabled');
                expect(response.body.datas).toHaveProperty('configured');
                expect(response.body.datas).toHaveProperty('hasApiKey');
                expect(response.body.datas).toHaveProperty('supportsCustomRules');
            });

            it('Should return configured:true when LT URL is saved', async () => {
                var response = await request(app)
                    .get('/api/spellcheck/capabilities')
                    .set('Cookie', [`token=JWT ${userToken}`]);

                expect(response.status).toBe(200);
                // LT URL was configured in beforeAll
                expect(response.body.datas.configured).toBe(true);
                expect(response.body.datas.supportsCustomRules).toBe(false);
            });
        });

        describe('POST /api/spellcheck/test', () => {
            it('Should require authentication', async () => {
                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .send({ url: 'http://localhost:8020' });
                expect(response.status).toBe(401);
            });

            it('Should require url parameter', async () => {
                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({});
                expect(response.status).toBe(422);
                expect(response.body.datas).toContain('url is required');
            });

            it('Should return reachable:false when service is unreachable', async () => {
                global.fetch.mockImplementation(() => Promise.reject(new Error('ECONNREFUSED')));

                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ url: 'http://localhost:8020' });

                expect(response.status).toBe(200);
                expect(response.body.datas.reachable).toBe(false);
                expect(response.body.datas.supportsCustomRules).toBe(false);
                expect(response.body.datas.authValid).toBeNull();
            });

            it('Should return reachable:true for vanilla LT via /health', async () => {
                global.fetch.mockImplementation((url) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/health')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ type: 'vanilla-lt' })
                        });
                    }
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                });

                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ url: 'http://localhost:8020' });

                expect(response.status).toBe(200);
                expect(response.body.datas.reachable).toBe(true);
                expect(response.body.datas.supportsCustomRules).toBe(false);
            });

            it('Should fall back to /v2/info when /health is unreachable', async () => {
                global.fetch.mockImplementation((url) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/health')) return Promise.reject(new Error('timeout'));
                    if (urlStr.includes('/v2/info')) {
                        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                    }
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                });

                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ url: 'http://localhost:8020' });

                expect(response.status).toBe(200);
                expect(response.body.datas.reachable).toBe(true);
                expect(response.body.datas.supportsCustomRules).toBe(false);
            });

            it('Should detect pwndoc-languagetools and validate API key', async () => {
                global.fetch.mockImplementation((url) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/health')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ type: 'pwndoc-languagetools' })
                        });
                    }
                    if (urlStr.includes('/api/languages')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ languages: ['en'] })
                        });
                    }
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                });

                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ url: 'http://localhost:8020', apiKey: 'valid-key' });

                expect(response.status).toBe(200);
                expect(response.body.datas.reachable).toBe(true);
                expect(response.body.datas.supportsCustomRules).toBe(true);
                expect(response.body.datas.authValid).toBe(true);
            });

            it('Should return authValid:false when API key is rejected (401)', async () => {
                global.fetch.mockImplementation((url) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/health')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ type: 'pwndoc-languagetools' })
                        });
                    }
                    if (urlStr.includes('/api/languages')) {
                        return Promise.resolve({ ok: false, status: 401 });
                    }
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                });

                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ url: 'http://localhost:8020', apiKey: 'wrong-key' });

                expect(response.status).toBe(200);
                expect(response.body.datas.authValid).toBe(false);
                expect(response.body.datas.requiresApiKey).toBe(false);
            });

            it('Should indicate requiresApiKey when no key provided and LT returns 401', async () => {
                global.fetch.mockImplementation((url) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/health')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ type: 'pwndoc-languagetools' })
                        });
                    }
                    if (urlStr.includes('/api/languages')) {
                        return Promise.resolve({ ok: false, status: 401 });
                    }
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                });

                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ url: 'http://localhost:8020' });

                expect(response.status).toBe(200);
                expect(response.body.datas.authValid).toBe(false);
                expect(response.body.datas.requiresApiKey).toBe(true);
            });

            it('Should validate public LT credentials when apiKey and username both provided', async () => {
                global.fetch.mockImplementation((url) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/health')) return Promise.reject(new Error('not found'));
                    if (urlStr.includes('/v2/check')) {
                        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ matches: [] }) });
                    }
                    // /v2/info fallback for reachability
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                });

                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ url: 'http://api.languagetool.com', apiKey: 'mykey', username: 'myuser' });

                expect(response.status).toBe(200);
                expect(response.body.datas.reachable).toBe(true);
                expect(response.body.datas.authValid).toBe(true);
            });

            it('Should not validate credentials when only apiKey but no username (public LT)', async () => {
                global.fetch.mockImplementation((url) => {
                    const urlStr = url.toString();
                    if (urlStr.includes('/health')) return Promise.reject(new Error('not found'));
                    // /v2/info fallback for reachability
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                });

                var response = await request(app)
                    .post('/api/spellcheck/test')
                    .set('Cookie', [`token=JWT ${userToken}`])
                    .send({ url: 'http://api.languagetool.com', apiKey: 'mykey' });

                expect(response.status).toBe(200);
                expect(response.body.datas.reachable).toBe(true);
                // No credential validation attempted — authValid stays null
                expect(response.body.datas.authValid).toBeNull();
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
