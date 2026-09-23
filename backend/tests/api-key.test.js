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
      const User = mongoose.model('User');
      const Role = mongoose.model('Role');
      await Role.create({
        name: 'key-manager', displayName: 'Key manager',
        allows: ['apikeys:create', 'apikeys:read', 'apikeys:update', 'apikeys:delete']
      });
      await require('../src/lib/auth').acl.reload();
      await User.updateOne({username: 'user2'}, {$addToSet: {roles: 'key-manager'}});
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

    afterAll(async () => {
      await mongoose.model('User').updateOne({username: 'user2'}, {$pull: {roles: 'key-manager'}});
      await mongoose.model('Role').deleteOne({name: 'key-manager'});
      await mongoose.model('ApiKey').deleteMany({user: {$in: [normalUserId, adminUserId]}});
      await require('../src/lib/auth').acl.reload();
    });

    describe('Explicit permissions and role boundaries', () => {
      it('API key permissions are opt-in, and own-key scopes do not grant read-all', async () => {
        const acl = require('../src/lib/auth').acl;
        expect(acl.isAllowed(['user'], 'apikeys:create')).toBe(false);
        expect(acl.isAllowed(['user'], 'apikeys:read')).toBe(false);
        const response = await request(app).get('/api/apikeys?all=true')
          .set('Cookie', [`token=JWT ${userToken}`]);
        expect(response.status).toBe(403);
      });

      it('Persists explicit owner roles and supports keys without expiration', async () => {
        const ApiKey = mongoose.model('ApiKey');
        const key = await ApiKey.generateKey(normalUserId, {name: 'No expiry', roles: ['user']});
        expect(key.roles).toEqual(['user']);
        expect(key.expiresAt).toBeNull();
        expect(key.permissions).toBeUndefined();
        expect((await ApiKey.validateKey(key.apiKey)).apiKey.keyHash).toBeUndefined();
      });

      it('Validates role assignments against the current owner', async () => {
        const ApiKey = mongoose.model('ApiKey');
        for (const roles of [[], ['missing-role'], 'user']) {
          await expect(ApiKey.generateKey(normalUserId, {name: 'Invalid assignment', roles}))
            .rejects.toMatchObject({fn: 'BadParameters'});
        }
      });

      it('Retains only roles still assigned to the owner and denies an empty intersection', async () => {
        const ApiKey = mongoose.model('ApiKey');
        const User = mongoose.model('User');
        const key = await ApiKey.generateKey(normalUserId, {name: 'Role lifecycle', roles: ['key-manager']});
        await User.updateOne({_id: normalUserId}, {$pull: {roles: 'key-manager'}});
        try {
          const response = await request(app).get('/api/users/me').set('X-API-Key', key.apiKey);
          expect(response.status).toBe(401);
          expect(response.body.datas).toBe('API Key has no active roles');
        } finally {
          await User.updateOne({_id: normalUserId}, {$addToSet: {roles: 'key-manager'}});
        }
      });

      it('Does not allow API key authentication to create more keys', async () => {
        const key = await mongoose.model('ApiKey').generateKey(adminUserId, {name: 'Admin integration'});
        const response = await request(app).post('/api/apikeys')
          .set('X-API-Key', key.apiKey).send({name: 'Disallowed child'});
        expect(response.status).toBe(403);
      });

      it('Requires update-all and delete-all for another owner', async () => {
        const key = await mongoose.model('ApiKey').generateKey(adminUserId, {name: 'Owned by admin'});
        const toggled = await request(app).put(`/api/apikeys/${key._id}/toggle`)
          .set('Cookie', [`token=JWT ${userToken}`]);
        expect(toggled.status).toBe(404);
        const deleted = await request(app).delete(`/api/apikeys/${key._id}`)
          .set('Cookie', [`token=JWT ${userToken}`]);
        expect(deleted.status).toBe(404);
      });

      it('Applies catalog permissions to each management route', async () => {
        const jwt = require('jsonwebtoken');
        const auth = require('../src/lib/auth');
        const token = jwt.sign({id: normalUserId, roles: ['user'], permissions: auth.acl.getRoles(['user'])}, auth.jwtSecret);
        const cookie = [`token=JWT ${token}`];
        expect((await request(app).get('/api/apikeys').set('Cookie', cookie)).status).toBe(403);
        expect((await request(app).post('/api/apikeys').set('Cookie', cookie).send({name: 'Denied'})).status).toBe(403);
        expect((await request(app).put('/api/apikeys/123456789012345678901234/toggle').set('Cookie', cookie)).status).toBe(403);
        expect((await request(app).delete('/api/apikeys/123456789012345678901234').set('Cookie', cookie)).status).toBe(403);
      });

      it('Authorizes delegated all-key management through catalog permissions', async () => {
        const Role = mongoose.model('Role');
        const auth = require('../src/lib/auth');
        await Role.create({name: 'key-operator', displayName: 'Key operator',
          allows: ['apikeys:read-all', 'apikeys:update-all', 'apikeys:delete-all']});
        await auth.acl.reload();
        try {
          const token = require('jsonwebtoken').sign({
            id: normalUserId, roles: ['key-operator'], permissions: auth.acl.getRoles(['key-operator'])
          }, auth.jwtSecret);
          const cookie = [`token=JWT ${token}`];
          const key = await mongoose.model('ApiKey').generateKey(adminUserId, {name: 'Managed key'});
          expect((await request(app).get('/api/apikeys?all=true').set('Cookie', cookie)).status).toBe(200);
          expect((await request(app).put(`/api/apikeys/${key._id}/toggle`).set('Cookie', cookie)).body.datas.enabled).toBe(false);
          expect((await request(app).delete(`/api/apikeys/${key._id}`).set('Cookie', cookie)).status).toBe(200);
        } finally {
          await Role.deleteOne({name: 'key-operator'});
          await auth.acl.reload();
        }
      });
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
