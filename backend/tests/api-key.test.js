const mongoose = require('mongoose');

module.exports = function(request, app) {
  describe('API Key Authentication & Management Tests', () => {
    let userToken = '';
    let adminToken = '';
    let testApiKey = '';
    let testApiKeyId = '';
    let testKeyDoc = null;
    let normalUserId = '';
    let adminUserId = '';

    beforeAll(async () => {
      // Login as normal user 'user2'
      let response = await request(app).post('/api/users/token')
        .send({ username: 'user2', password: 'User1234' });
      expect(response.status).toBe(200);
      userToken = response.body.datas.token;

      // Get normal user id
      response = await request(app).get('/api/users/me')
        .set('Cookie', [`token=JWT ${userToken}`]);
      expect(response.status).toBe(200);
      normalUserId = response.body.datas._id;

      // Login as admin
      response = await request(app).post('/api/users/token')
        .send({ username: 'admin', password: 'Admin123' });
      expect(response.status).toBe(200);
      adminToken = response.body.datas.token;

      // Get admin user id
      response = await request(app).get('/api/users/me')
        .set('Cookie', [`token=JWT ${adminToken}`]);
      expect(response.status).toBe(200);
      adminUserId = response.body.datas._id;
    });

    describe('API Key Generation & Validation', () => {
      it('Rejects unauthenticated requests to API key endpoints', async () => {
        let response = await request(app).get('/api/apikeys');
        expect(response.status).toBe(401);

        response = await request(app).post('/api/apikeys').send({ name: 'Test' });
        expect(response.status).toBe(401);

        response = await request(app).delete('/api/apikeys/123456789012345678901234');
        expect(response.status).toBe(401);
      });

      it('Rejects creation when name is missing or empty', async () => {
        let response = await request(app).post('/api/apikeys')
          .set('Cookie', [`token=JWT ${userToken}`])
          .send({});
        expect(response.status).toBe(422);

        response = await request(app).post('/api/apikeys')
          .set('Cookie', [`token=JWT ${userToken}`])
          .send({ name: '   ' });
        expect(response.status).toBe(422);
      });

      it('Rejects creation with past expiration date', async () => {
        const pastDate = new Date(Date.now() - 3600000).toISOString();
        const response = await request(app).post('/api/apikeys')
          .set('Cookie', [`token=JWT ${userToken}`])
          .send({ name: 'Expired Key', expiresAt: pastDate });
        expect(response.status).toBe(422);
      });

      it('Creates a valid API key with prefix pwn_ and 256-bit entropy', async () => {
        const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
        const response = await request(app).post('/api/apikeys')
          .set('Cookie', [`token=JWT ${userToken}`])
          .send({ name: 'CI/CD Key', expiresAt: futureDate });

        expect(response.status).toBe(201);
        expect(response.body.datas).toBeDefined();
        expect(response.body.datas.name).toBe('CI/CD Key');
        expect(response.body.datas.apiKey).toBeDefined();
        expect(response.body.datas.apiKey.startsWith('pwn_')).toBe(true);
        // 'pwn_' (4 chars) + 64 hex characters (32 bytes) = 68 chars
        expect(response.body.datas.apiKey.length).toBe(68);
        expect(response.body.datas.prefix).toBeDefined();
        expect(response.body.datas.enabled).toBe(true);

        testApiKey = response.body.datas.apiKey;
        testApiKeyId = response.body.datas._id;

        // Verify in DB that keyHash is stored and plaintext apiKey is NOT stored
        const ApiKey = mongoose.model('ApiKey');
        testKeyDoc = await ApiKey.findById(testApiKeyId).lean();
        expect(testKeyDoc).toBeTruthy();
        expect(testKeyDoc.keyHash).toBeDefined();
        expect(testKeyDoc.apiKey).toBeUndefined();
      });

      it('Lists API keys without exposing keyHash or plaintext apiKey', async () => {
        const response = await request(app).get('/api/apikeys')
          .set('Cookie', [`token=JWT ${userToken}`]);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.datas)).toBe(true);
        expect(response.body.datas.length).toBeGreaterThanOrEqual(1);

        const found = response.body.datas.find(k => k._id === testApiKeyId);
        expect(found).toBeDefined();
        expect(found.name).toBe('CI/CD Key');
        expect(found.keyHash).toBeUndefined();
        expect(found.apiKey).toBeUndefined();
        expect(found.prefix).toBeDefined();
      });
    });

    describe('API Authentication via Headers', () => {
      it('Authenticates /api/users/me with X-API-Key header', async () => {
        const response = await request(app).get('/api/users/me')
          .set('X-API-Key', testApiKey);

        expect(response.status).toBe(200);
        expect(response.body.datas).toBeDefined();
        expect(response.body.datas.username).toBe('user2');
      });

      it('Authenticates /api/users/me with Authorization: ApiKey <key>', async () => {
        const response = await request(app).get('/api/users/me')
          .set('Authorization', `ApiKey ${testApiKey}`);

        expect(response.status).toBe(200);
        expect(response.body.datas.username).toBe('user2');
      });

      it('Authenticates /api/users/me with Authorization: Bearer <key>', async () => {
        const response = await request(app).get('/api/users/me')
          .set('Authorization', `Bearer ${testApiKey}`);

        expect(response.status).toBe(200);
        expect(response.body.datas.username).toBe('user2');
      });

      it('Allows accessing other authorized endpoints with API key', async () => {
        const response = await request(app).get('/api/vulnerabilities')
          .set('X-API-Key', testApiKey);

        expect(response.status).toBe(200);
      });

      it('Updates lastUsed timestamp on successful authentication', async () => {
        const ApiKey = mongoose.model('ApiKey');
        const keyDoc = await ApiKey.findById(testApiKeyId).lean();
        expect(keyDoc.lastUsed).toBeDefined();
        expect(keyDoc.lastUsed).not.toBeNull();
      });

      it('Rejects invalid or malformed API key', async () => {
        let response = await request(app).get('/api/users/me')
          .set('X-API-Key', 'pwn_0000000000000000000000000000000000000000000000000000000000000000');
        expect(response.status).toBe(401);
        expect(response.body.datas).toBe('Invalid API Key');

        response = await request(app).get('/api/users/me')
          .set('X-API-Key', 'invalid_format_key');
        expect(response.status).toBe(401);
      });
    });

    describe('API Key State & Lifecycle', () => {
      it('Toggles API key disabled and blocks requests', async () => {
        // Toggle key disabled
        let response = await request(app).put(`/api/apikeys/${testApiKeyId}/toggle`)
          .set('Cookie', [`token=JWT ${userToken}`]);
        expect(response.status).toBe(200);
        expect(response.body.datas.enabled).toBe(false);

        // Attempt authentication with disabled key
        response = await request(app).get('/api/users/me')
          .set('X-API-Key', testApiKey);
        expect(response.status).toBe(401);
        expect(response.body.datas).toBe('API Key is disabled');

        // Toggle back to enabled
        response = await request(app).put(`/api/apikeys/${testApiKeyId}/toggle`)
          .set('Cookie', [`token=JWT ${userToken}`]);
        expect(response.status).toBe(200);
        expect(response.body.datas.enabled).toBe(true);

        // Authentication succeeds again
        response = await request(app).get('/api/users/me')
          .set('X-API-Key', testApiKey);
        expect(response.status).toBe(200);
      });

      it('Rejects authentication when API key is expired', async () => {
        const ApiKey = mongoose.model('ApiKey');
        // Temporarily set expiresAt to the past
        await ApiKey.updateOne({ _id: testApiKeyId }, { expiresAt: new Date(Date.now() - 60000) });

        const response = await request(app).get('/api/users/me')
          .set('X-API-Key', testApiKey);
        expect(response.status).toBe(401);
        expect(response.body.datas).toBe('API Key has expired');

        // Restore future expiration
        await ApiKey.updateOne({ _id: testApiKeyId }, { expiresAt: new Date(Date.now() + 86400000) });
      });

      it('Rejects authentication when owner user is disabled', async () => {
        const User = mongoose.model('User');
        // Disable user
        await User.updateOne({ _id: normalUserId }, { enabled: false });

        const response = await request(app).get('/api/users/me')
          .set('X-API-Key', testApiKey);
        expect(response.status).toBe(401);
        expect(response.body.datas).toBe('Account disabled or user not found');

        // Re-enable user
        await User.updateOne({ _id: normalUserId }, { enabled: true });
      });

      it('Admin can list all API keys with ?all=true', async () => {
        const response = await request(app).get('/api/apikeys?all=true')
          .set('Cookie', [`token=JWT ${adminToken}`]);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.datas)).toBe(true);
        expect(response.body.datas.length).toBeGreaterThanOrEqual(1);
      });

      it('Revokes/deletes API key and prevents subsequent requests', async () => {
        let response = await request(app).delete(`/api/apikeys/${testApiKeyId}`)
          .set('Cookie', [`token=JWT ${userToken}`]);
        expect(response.status).toBe(200);
        expect(response.body.datas).toBe('API Key revoked successfully');

        // Verify key is gone from DB
        const ApiKey = mongoose.model('ApiKey');
        const deleted = await ApiKey.findById(testApiKeyId);
        expect(deleted).toBeNull();

        // Authentication fails now
        response = await request(app).get('/api/users/me')
          .set('X-API-Key', testApiKey);
        expect(response.status).toBe(401);
        expect(response.body.datas).toBe('Invalid API Key');
      });
    });
  });
};
