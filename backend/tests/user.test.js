/* 
  4 Users at the end:
    admin:Admin123 (admin)
    user2:User1234 (user)
    vulnadmin:Vulnadmin1 (user, vuln-admin)
    reviewer:Reviewer123 (user)
*/

module.exports = function(request, app) {
  var OTPAuth = require('otpauth')
  var User = require('mongoose').model('User')
  var Role = require('mongoose').model('Role')
  var Migration = require('mongoose').model('Migration')
  var migrations = require('../src/migrations')
  var fs = require('fs')
  var path = require('path')
  var permissionsCatalog = require('../src/lib/permissions-catalog')
  var oidc = require('../src/lib/oidc')

  var userToken = '';
  var refreshToken = '';

  describe('Users Suite Tests', () => {

    describe('User Initialization', () => {
      it('Get the users init state', async () => {
        var response = await request(app).get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toBe(true)
      })

      it('Authenticate with nonexistent user', async () => {
        var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
        
        expect(response.status).toBe(401)
      })

      it('Create first user', async () => {
        var user = {
          username: 'admin',
          password: 'Password1',
          firstname: 'Admin',
          lastname: 'Istrator'
        }
        var response = await request(app).post('/api/users/init').send(user)
      
        expect(response.status).toBe(201)
      })

      it('Create first user when it already exists', async () => {
        var user = {
          username: 'admin2',
          password: 'Admin123',
          firstname: 'Admin2',
          lastname: 'Istrator2'
        }
        var response = await request(app).post('/api/users/init').send(user)
      
        expect(response.status).toBe(403)
      })

      it('Authenticate with first user', async () => {
        var user = {
          username: 'admin',
          password: 'Password1'
        }
        var response = await request(app).post('/api/users/token').send(user)
        expect(response.status).toBe(200)
        expect(response.body.datas.token).toBeDefined()
        expect(response.body.datas.token).toContain('eyJ')
        expect(response.body.datas.refreshToken).toBeDefined()
        expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
          expect.stringContaining('token=JWT%20'),
          expect.stringContaining('refreshToken=')
        ]))

        userToken = response.body.datas.token
        refreshToken = response.body.datas.refreshToken
      })

    })

    describe('User CRUD operations', () => {
      it('Check token validity', async () => {
        var response = await request(app).get('/api/users/checktoken')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
      })

      it('Get my profile', async () => {
        const expected = {
          username: 'admin',
          firstname: 'Admin',
          lastname: 'Istrator',
          roles: ['admin']
        }
        var response = await request(app).get('/api/users/me')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.objectContaining(expected))
      })

      it('Create user with role user', async () => {
        var user = {
          username: 'user',
          password: 'Password1',
          firstname: 'User',
          lastname: 'Test',
          roles: ['user']
        }
        var response = await request(app).post('/api/users')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(user)

        expect(response.status).toBe(201)

        response = await request(app).post('/api/users/token').send(user)
        expect(response.status).toBe(200)
      })

      it('Create user with role user without role parameter', async () => {
        var user = {
          username: 'tmpuser',
          password: 'Tmpuser1',
          firstname: 'Tmp',
          lastname: 'User'
        }
        var response = await request(app).post('/api/users')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(user)

        expect(response.status).toBe(201)

        response = await request(app).post('/api/users/token').send(user)
        expect(response.status).toBe(200)

        response = await request(app).get('/api/users/tmpuser')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toEqual(expect.objectContaining({roles: ['user']}))
      })
      
      it('Create user with a custom role alongside user', async () => {
        var role = {
          name: 'vuln-admin',
          displayName: 'Vulnerability Admin',
          allows: ['vulnerabilities:update']
        }
        var response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(role)

        expect(response.status).toBe(201)

        var user = {
          username: 'vulnadmin',
          password: 'Vulnadmin1',
          firstname: 'Vuln',
          lastname: 'Admin',
          roles: ['user', 'vuln-admin']
        }
        response = await request(app).post('/api/users')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(user)

        expect(response.status).toBe(201)

        response = await request(app).post('/api/users/token').send(user)
        expect(response.status).toBe(200)

        response = await request(app).get('/api/users/vulnadmin')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toEqual(expect.objectContaining({roles: ['user', 'vuln-admin']}))
      })

      it('Create reviewer user with default user role', async () => {
        var user = {
          username: 'reviewer',
          password: 'Reviewer123',
          firstname: 'reviewer',
          lastname: 'reviewer'
        }
        var response = await request(app).post('/api/users')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(user)
          
        expect(response.status).toBe(201)

        response = await request(app).post('/api/users/token').send(user)
        expect(response.status).toBe(200)
      })

      it('Get user profile', async () => {
        const expected = {
          username: 'user',
          firstname: 'User',
          lastname: 'Test',
          roles: ['user']
        }
        var response = await request(app).get('/api/users/user')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.objectContaining(expected))
      })

      it('Update my profile', async () => {
        const expected = {
          username: 'admin',
          firstname: 'Admin2',
          lastname: 'Istrator',
          roles: ['admin']
        }

        var user = {
          currentPassword: "Password1",
          newPassword: 'Admin123',
          confirmPassword: 'Admin123',
          firstname: 'Admin2'
        }
        var response = await request(app).put('/api/users/me')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(user)
          
        expect(response.status).toBe(200)

        var response = await request(app).get('/api/users/me')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.body.datas).toEqual(expect.objectContaining(expected))
      })

      it('Update user profile', async () => {
        const expected = {
          username: 'user2',
          firstname: 'User2',
          lastname: 'Test',
          roles: ['user']
        }

        var user = {
          username: 'user2',
          firstname: 'User2',
          password: 'User1234',
        }

        var userRequest = await request(app).get('/api/users/user')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        var userId = userRequest.body.datas._id

        var response = await request(app).put(`/api/users/${userId}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(user)
        
        expect(response.status).toBe(200)

        var response = await request(app).get('/api/users/user2')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.body.datas).toEqual(expect.objectContaining(expected))
      })

      it('Get users list and reviewers list', async () => {
        var response = await request(app).get('/api/users')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)
        expect(response.body.datas.length).toBeGreaterThanOrEqual(4)

        response = await request(app).get('/api/users/reviewers')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.datas)).toBeTruthy()
        response.body.datas.forEach(user => {
          expect(user.username).toBeDefined()
        })
      })

      it('Prevents disabling the last enabled admin through single and bulk updates', async () => {
        var adminRequest = await request(app).get('/api/users/admin')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        var adminId = adminRequest.body.datas._id

        var response = await request(app).put(`/api/users/${adminId}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({enabled: false})

        expect(response.status).toBe(422)
        expect(response.body.datas).toBe('Cannot disable the last remaining enabled admin')

        response = await request(app).put('/api/users/bulk-status')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({userIds: [adminId], enabled: false})

        expect(response.status).toBe(422)
        expect(response.body.datas).toBe('Cannot disable the last remaining enabled admin')

        response = await request(app).get('/api/users/admin')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas.enabled).not.toBe(false)
      })

      it('Rejects authentication requests with missing or invalid password payloads', async () => {
        var response = await request(app).post('/api/users/token').send({username: 'admin'})
        expect(response.status).toBe(422)

        response = await request(app).post('/api/users/token').send({username: 'admin', password: {invalid: true}})
        expect(response.status).toBe(422)
      })

      it('Rejects login and refresh for a disabled user', async () => {
        var loginResponse = await request(app).post('/api/users/token')
          .send({username: 'user2', password: 'User1234'})
        expect(loginResponse.status).toBe(200)
        var disabledRefreshToken = loginResponse.body.datas.refreshToken

        var userRequest = await request(app).get('/api/users/user2')
          .set('Cookie', [`token=JWT ${userToken}`])
        var userId = userRequest.body.datas._id

        var response = await request(app).put(`/api/users/${userId}`)
          .set('Cookie', [`token=JWT ${userToken}`])
          .send({enabled: false})
        expect(response.status).toBe(200)

        response = await request(app).post('/api/users/token')
          .send({username: 'user2', password: 'User1234'})
        expect(response.status).toBe(401)
        expect(response.body.datas).toBe('Authentication Failed.')

        response = await request(app).get('/api/users/refreshtoken')
          .set('Cookie', [`refreshToken=${disabledRefreshToken}`])
        expect(response.status).toBe(401)
        expect(response.body.datas).toBe('Account disabled')

        response = await request(app).put(`/api/users/${userId}`)
          .set('Cookie', [`token=JWT ${userToken}`])
          .send({enabled: true})
        expect(response.status).toBe(200)
      })

      it('Handles OIDC discovery entry, linked login, and unlinked identities', async () => {
        const previousEnv = {
          OIDC_ENABLED: process.env.OIDC_ENABLED,
          OIDC_ISSUER: process.env.OIDC_ISSUER,
          OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
          OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
          OIDC_DISPLAY_NAME: process.env.OIDC_DISPLAY_NAME,
          OIDC_IDENTITY_CLAIM: process.env.OIDC_IDENTITY_CLAIM,
          OIDC_JIT_ENABLED: process.env.OIDC_JIT_ENABLED,
          OIDC_ROLE_CLAIM: process.env.OIDC_ROLE_CLAIM,
          OIDC_ROLE_MAPPINGS: process.env.OIDC_ROLE_MAPPINGS,
          OIDC_ADMIN_ROLE: process.env.OIDC_ADMIN_ROLE,
          OIDC_USER_ROLE: process.env.OIDC_USER_ROLE,
          OIDC_GROUP_CLAIM: process.env.OIDC_GROUP_CLAIM,
          OIDC_GROUP_MAPPINGS: process.env.OIDC_GROUP_MAPPINGS,
          OIDC_ADMIN_GROUP: process.env.OIDC_ADMIN_GROUP,
          OIDC_USER_GROUP: process.env.OIDC_USER_GROUP,
          OIDC_REAUTH_INTERVAL_MINUTES: process.env.OIDC_REAUTH_INTERVAL_MINUTES
        }
        process.env.OIDC_ENABLED = 'true'
        process.env.OIDC_ISSUER = 'https://issuer.example/'
        process.env.OIDC_CLIENT_ID = 'pwndoc-test'
        process.env.OIDC_REDIRECT_URI = 'https://pwndoc.example/api/auth/oidc/callback'
        process.env.OIDC_DISPLAY_NAME = 'Test SSO'
        process.env.OIDC_IDENTITY_CLAIM = 'sub'
        process.env.OIDC_JIT_ENABLED = 'false'
        delete process.env.OIDC_ROLE_CLAIM
        delete process.env.OIDC_ROLE_MAPPINGS
        delete process.env.OIDC_ADMIN_ROLE
        delete process.env.OIDC_USER_ROLE
        delete process.env.OIDC_GROUP_CLAIM
        delete process.env.OIDC_GROUP_MAPPINGS
        delete process.env.OIDC_ADMIN_GROUP
        delete process.env.OIDC_USER_GROUP
        process.env.OIDC_REAUTH_INTERVAL_MINUTES = '480'

        const requestSpy = jest.spyOn(oidc, 'createAuthorizationRequest')
          .mockResolvedValue({url: 'https://issuer.example/authorize', transaction: 'signed-transaction'})
        const callbackSpy = jest.spyOn(oidc, 'completeAuthorization')

        try {
          var response = await request(app).get('/api/auth/oidc/config')
          expect(response.status).toBe(200)
          expect(response.body.datas).toEqual({enabled: true, displayName: 'Test SSO'})

          response = await request(app).get('/api/auth/oidc/login')
          expect(response.status).toBe(302)
          expect(response.headers.location).toBe('https://issuer.example/authorize')
          expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
            expect.stringContaining('oidcTransaction=signed-transaction')
          ]))

          await Role.create({
            name: 'oidc-auditor',
            displayName: 'OIDC Auditor',
            description: 'Custom role used by the OIDC route regression test',
            allows: ['audits:read']
          })
          callbackSpy.mockResolvedValue({
            issuer: 'https://issuer.example/',
            subject: 'unlinked-subject',
            successRedirect: '/'
          })
          response = await request(app).get('/api/auth/oidc/callback?code=test&state=test')
            .set('Cookie', ['oidcTransaction=signed-transaction'])
          expect(response.status).toBe(401)
          expect(response.body.datas).toBe('OIDC identity is not linked to a PwnDoc user')

          callbackSpy.mockResolvedValue({
            issuer: 'https://issuer.example/',
            subject: 'jit-subject',
            successRedirect: '/',
            jitEnabled: true,
            role: 'oidc-auditor',
            profile: {
              username: 'jit-user@example.test', firstname: 'JIT', lastname: 'User',
              email: 'jit-user@example.test'
            },
            externalAuthExpiresAt: Math.floor(Date.now() / 1000) + 3600
          })
          response = await request(app).get('/api/auth/oidc/callback?code=test&state=test')
            .set('Cookie', ['oidcTransaction=signed-transaction'])
          expect(response.status).toBe(302)
          const jitUser = await User.findOne({username: 'jit-user@example.test'})
          expect(jitUser).toMatchObject({
            firstname: 'JIT', lastname: 'User', roles: ['oidc-auditor'], enabled: true,
            oidc: {issuer: 'https://issuer.example/', subject: 'jit-subject', roleManaged: true}
          })
          expect(jitUser.password).toBeDefined()

          callbackSpy.mockResolvedValue({
            issuer: 'https://issuer.example/', subject: 'jit-subject', successRedirect: '/',
            jitEnabled: true, role: 'admin', externalAuthExpiresAt: Math.floor(Date.now() / 1000) + 3600
          })
          response = await request(app).get('/api/auth/oidc/callback?code=test&state=test')
            .set('Cookie', ['oidcTransaction=signed-transaction'])
          expect(response.status).toBe(302)
          expect((await User.findOne({username: 'jit-user@example.test'})).roles).toEqual(['admin'])

          var userResponse = await request(app).get('/api/users/user2')
            .set('Cookie', [`token=JWT ${userToken}`])
          var userId = userResponse.body.datas._id
          response = await request(app).put(`/api/users/${userId}`)
            .set('Cookie', [`token=JWT ${userToken}`])
            .send({oidc: {issuer: 'https://issuer.example', subject: 'linked-subject'}})
          expect(response.status).toBe(200)

          userResponse = await request(app).get('/api/users/user2')
            .set('Cookie', [`token=JWT ${userToken}`])
          expect(userResponse.body.datas.oidc).toMatchObject({
            issuer: 'https://issuer.example/', subject: 'linked-subject'
          })

          var regularLogin = await request(app).post('/api/users/token')
            .send({username: 'user2', password: 'User1234'})
          var regularView = await request(app).get('/api/users/user2')
            .set('Cookie', [`token=JWT ${regularLogin.body.datas.token}`])
          expect(regularView.status).toBe(200)
          expect(regularView.body.datas.oidc).toBeUndefined()

          var adminResponse = await request(app).get('/api/users/admin')
            .set('Cookie', [`token=JWT ${userToken}`])
          response = await request(app).put(`/api/users/${adminResponse.body.datas._id}`)
            .set('Cookie', [`token=JWT ${userToken}`])
            .send({oidc: {issuer: 'https://issuer.example', subject: 'linked-subject'}})
          expect(response.status).toBe(422)
          expect(response.body.datas).toBe('OIDC identity is already linked')

          response = await request(app).put(`/api/users/${adminResponse.body.datas._id}`)
            .set('Cookie', [`token=JWT ${userToken}`])
            .send({oidc: {issuer: 'https://issuer.example', subject: 'local-admin-subject'}})
          expect(response.status).toBe(200)

          callbackSpy.mockResolvedValue({
            issuer: 'https://issuer.example/', subject: 'invalid-role-subject', successRedirect: '/',
            jitEnabled: true, role: 'missing-custom-role', profile: {
              username: 'invalid-role@example.test', firstname: 'Invalid', lastname: 'Role'
            }, externalAuthExpiresAt: Math.floor(Date.now() / 1000) + 3600
          })
          response = await request(app).get('/api/auth/oidc/callback?code=test&state=test')
            .set('Cookie', ['oidcTransaction=signed-transaction'])
          expect(response.status).toBe(422)
          expect(response.body.datas).toBe('OIDC mapping targets unknown PwnDoc role: missing-custom-role')

          callbackSpy.mockResolvedValue({
            issuer: 'https://issuer.example/', subject: 'local-admin-subject', successRedirect: '/',
            jitEnabled: true, role: 'user', externalAuthExpiresAt: Math.floor(Date.now() / 1000) + 3600
          })
          response = await request(app).get('/api/auth/oidc/callback?code=test&state=test')
            .set('Cookie', ['oidcTransaction=signed-transaction'])
          expect(response.status).toBe(302)
          const localAdmin = await User.findOne({username: 'admin'})
          expect(localAdmin.roles).toEqual(['admin'])
          expect(localAdmin.oidc.roleManaged).toBeUndefined()

          const localAdminLogin = await request(app).post('/api/users/token')
            .send({username: 'admin', password: 'Admin123'})
          expect(localAdminLogin.status).toBe(200)

          response = await request(app).put(`/api/users/${adminResponse.body.datas._id}`)
            .set('Cookie', [`token=JWT ${userToken}`])
            .send({oidc: null})
          expect(response.status).toBe(200)

          callbackSpy.mockResolvedValue({
            issuer: 'https://issuer.example/',
            subject: 'linked-subject',
            successRedirect: '/'
          })
          await User.updateOne({username: 'user2'}, {$set: {enabled: false}})
          response = await request(app).get('/api/auth/oidc/callback?code=test&state=test')
            .set('Cookie', ['oidcTransaction=signed-transaction'])
          expect(response.status).toBe(401)
          expect(response.body.datas).toBe('Account disabled')

          await User.updateOne({username: 'user2'}, {$set: {enabled: true}})
          response = await request(app).get('/api/auth/oidc/callback?code=test&state=test')
            .set('Cookie', ['oidcTransaction=signed-transaction'])
          expect(response.status).toBe(302)
          expect(response.headers.location).toBe('/')
          expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
            expect.stringContaining('token=JWT%20'),
            expect.stringContaining('refreshToken=')
          ]))

          response = await request(app).put(`/api/users/${userId}`)
            .set('Cookie', [`token=JWT ${userToken}`])
            .send({oidc: null})
          expect(response.status).toBe(200)
          userResponse = await request(app).get('/api/users/user2')
            .set('Cookie', [`token=JWT ${userToken}`])
          expect(userResponse.body.datas.oidc).toBeUndefined()
        }
        finally {
          requestSpy.mockRestore()
          callbackSpy.mockRestore()
          await User.deleteOne({username: 'jit-user@example.test'})
          await Role.deleteOne({name: 'oidc-auditor'})
          await User.updateOne({username: 'user2'}, {$unset: {oidc: 1}})
          Object.entries(previousEnv).forEach(([key, value]) => {
            if (value === undefined) delete process.env[key]
            else process.env[key] = value
          })
        }
      })

      it('Uses PKCE and resolves configurable OIDC roles with groups compatibility', async () => {
        const previousEnv = {
          OIDC_ENABLED: process.env.OIDC_ENABLED,
          OIDC_ISSUER: process.env.OIDC_ISSUER,
          OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
          OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
          OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
          OIDC_SUCCESS_REDIRECT: process.env.OIDC_SUCCESS_REDIRECT,
          OIDC_IDENTITY_CLAIM: process.env.OIDC_IDENTITY_CLAIM,
          OIDC_JIT_ENABLED: process.env.OIDC_JIT_ENABLED,
          OIDC_ROLE_CLAIM: process.env.OIDC_ROLE_CLAIM,
          OIDC_ROLE_MAPPINGS: process.env.OIDC_ROLE_MAPPINGS,
          OIDC_ADMIN_ROLE: process.env.OIDC_ADMIN_ROLE,
          OIDC_USER_ROLE: process.env.OIDC_USER_ROLE,
          OIDC_GROUP_CLAIM: process.env.OIDC_GROUP_CLAIM,
          OIDC_GROUP_MAPPINGS: process.env.OIDC_GROUP_MAPPINGS,
          OIDC_ADMIN_GROUP: process.env.OIDC_ADMIN_GROUP,
          OIDC_USER_GROUP: process.env.OIDC_USER_GROUP,
          OIDC_REAUTH_INTERVAL_MINUTES: process.env.OIDC_REAUTH_INTERVAL_MINUTES
        }
        process.env.OIDC_ENABLED = 'true'
        process.env.OIDC_ISSUER = 'https://issuer.example'
        process.env.OIDC_CLIENT_ID = 'pwndoc-test'
        process.env.OIDC_CLIENT_SECRET = 'test-secret'
        process.env.OIDC_REDIRECT_URI = 'https://pwndoc.example/api/auth/oidc/callback'
        process.env.OIDC_SUCCESS_REDIRECT = '/audits'
        process.env.OIDC_IDENTITY_CLAIM = 'sub'
        process.env.OIDC_JIT_ENABLED = 'false'
        delete process.env.OIDC_ROLE_CLAIM
        delete process.env.OIDC_ROLE_MAPPINGS
        delete process.env.OIDC_ADMIN_ROLE
        delete process.env.OIDC_USER_ROLE
        delete process.env.OIDC_GROUP_CLAIM
        delete process.env.OIDC_GROUP_MAPPINGS
        delete process.env.OIDC_ADMIN_GROUP
        delete process.env.OIDC_USER_GROUP
        process.env.OIDC_REAUTH_INTERVAL_MINUTES = '480'

        const claims = jest.fn(() => ({
          sub: 'subject', oid: 'entra-object-id', preferred_username: 'entra@example.test',
          given_name: 'Entra', family_name: 'User'
        }))
        const authorizationCodeGrant = jest.fn().mockResolvedValue({claims})
        const fakeClient = {
          randomPKCECodeVerifier: jest.fn(() => 'verifier'),
          randomState: jest.fn(() => 'state'),
          randomNonce: jest.fn(() => 'nonce'),
          calculatePKCECodeChallenge: jest.fn(async () => 'challenge'),
          discovery: jest.fn(async () => ({metadata: 'client-config'})),
          buildAuthorizationUrl: jest.fn(() => new URL('https://issuer.example/authorize')),
          authorizationCodeGrant
        }
        oidc.setClientLibraryForTests(fakeClient)

        try {
          const authRequest = await oidc.createAuthorizationRequest()
          expect(authRequest.url).toBe('https://issuer.example/authorize')
          expect(fakeClient.discovery).toHaveBeenCalledWith(
            new URL('https://issuer.example/'), 'pwndoc-test', 'test-secret'
          )
          expect(fakeClient.buildAuthorizationUrl).toHaveBeenCalledWith(
            expect.anything(), expect.objectContaining({
              response_type: 'code',
              state: 'state',
              nonce: 'nonce',
              code_challenge: 'challenge',
              code_challenge_method: 'S256'
            })
          )

          const callbackUrl = new URL('https://pwndoc.example/api/auth/oidc/callback?code=code&state=state')
          const identity = await oidc.completeAuthorization(callbackUrl, authRequest.transaction)
          expect(identity).toMatchObject({
            issuer: 'https://issuer.example/', subject: 'subject', successRedirect: '/audits'
          })
          expect(identity.profile).toEqual({
            username: 'entra@example.test', firstname: 'Entra', lastname: 'User', email: 'entra@example.test'
          })
          expect(identity.externalAuthExpiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
          expect(authorizationCodeGrant).toHaveBeenCalledWith(
            expect.anything(), callbackUrl, {
              expectedState: 'state', expectedNonce: 'nonce', pkceCodeVerifier: 'verifier'
            }
          )
          expect(claims).toHaveBeenCalled()

          process.env.OIDC_IDENTITY_CLAIM = 'oid'
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            issuer: 'https://issuer.example/', subject: 'entra-object-id', successRedirect: '/audits'
          })

          claims.mockReturnValueOnce({sub: 'subject'})
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction))
            .rejects.toMatchObject({fn: 'Unauthorized', message: 'OIDC identity does not contain a valid oid claim'})

          process.env.OIDC_IDENTITY_CLAIM = 'email'
          let configError
          try { oidc.getConfig() }
          catch (err) { configError = err }
          expect(configError).toMatchObject({fn: 'BadParameters', message: 'OIDC identity claim must be sub or oid'})
          process.env.OIDC_IDENTITY_CLAIM = 'oid'

          process.env.OIDC_JIT_ENABLED = 'true'
          claims.mockReturnValueOnce({sub: 'subject', oid: 'entra-object-id', roles: ['admin']})
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            role: 'admin'
          })

          claims.mockReturnValueOnce({sub: 'subject', oid: 'entra-object-id', roles: 'user'})
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            role: 'user'
          })

          claims.mockReturnValueOnce({
            sub: 'subject', oid: 'entra-object-id', roles: ['user', 'admin']
          })
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            role: 'admin'
          })

          process.env.OIDC_ROLE_CLAIM = 'realm_access.roles'
          process.env.OIDC_ROLE_MAPPINGS = JSON.stringify([
            {external: 'company-lead', internal: 'custom-lead'},
            {external: 'company-reader', internal: 'report'}
          ])
          claims.mockReturnValueOnce({
            sub: 'subject', oid: 'entra-object-id',
            realm_access: {roles: ['company-reader', 'company-lead']}
          })
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            role: 'custom-lead'
          })
          claims.mockReturnValueOnce({
            sub: 'subject', oid: 'entra-object-id', realm_access: {roles: ['company-reader']}
          })
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            role: 'report'
          })
          delete process.env.OIDC_ROLE_CLAIM
          delete process.env.OIDC_ROLE_MAPPINGS

          claims.mockReturnValueOnce({sub: 'subject', oid: 'entra-object-id'})
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction))
            .rejects.toMatchObject({fn: 'Unauthorized', message: 'OIDC user has no authorized role'})

          claims.mockReturnValueOnce({sub: 'subject', oid: 'entra-object-id', roles: ['unknown-role']})
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction))
            .rejects.toMatchObject({fn: 'Unauthorized', message: 'OIDC user has no authorized role'})

          claims.mockReturnValueOnce({sub: 'subject', oid: 'entra-object-id', roles: []})
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction))
            .rejects.toMatchObject({fn: 'Unauthorized', message: 'OIDC user has no authorized role'})

          // The groups mapping is attempted only when the
          // primary role claim does not resolve an authorized role.
          process.env.OIDC_USER_GROUP = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'
          claims.mockReturnValueOnce({
            sub: 'subject', oid: 'entra-object-id', groups: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'],
            preferred_username: 'jit@example.test', name: 'JIT User'
          })
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            subject: 'entra-object-id', jitEnabled: true, role: 'user',
            profile: {username: 'jit@example.test', firstname: 'JIT', lastname: 'User'}
          })

          process.env.OIDC_ADMIN_GROUP = 'PwnDoc Admins'
          claims.mockReturnValueOnce({
            sub: 'subject', oid: 'entra-object-id',
            groups: [
              'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              'pwndoc admins'
            ]
          })
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            role: 'admin'
          })

          process.env.OIDC_GROUP_MAPPINGS = JSON.stringify([
            {external: 'PwnDoc Read Only', internal: 'report'},
            {external: 'PwnDoc Users', internal: 'user'}
          ])
          claims.mockReturnValueOnce({
            sub: 'subject', oid: 'entra-object-id', groups: ['pwndoc read only']
          })
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            role: 'report'
          })
          delete process.env.OIDC_GROUP_MAPPINGS

          // A valid primary role wins and does not depend on the groups fallback
          // or its provider-specific overage representation.
          claims.mockReturnValueOnce({
            sub: 'subject', oid: 'entra-object-id', roles: ['user'],
            _claim_names: {groups: 'src1'}, _claim_sources: {src1: {endpoint: 'https://example.invalid'}}
          })
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction)).resolves.toMatchObject({
            role: 'user'
          })

          claims.mockReturnValueOnce({sub: 'subject', oid: 'entra-object-id', groups: []})
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction))
            .rejects.toMatchObject({fn: 'Unauthorized', message: 'OIDC user has no authorized role'})

          claims.mockReturnValueOnce({
            sub: 'subject', oid: 'entra-object-id',
            _claim_names: {groups: 'src1'}, _claim_sources: {src1: {endpoint: 'https://example.invalid'}}
          })
          await expect(oidc.completeAuthorization(callbackUrl, authRequest.transaction))
            .rejects.toMatchObject({fn: 'Unauthorized', message: 'OIDC group membership exceeds the token limit'})

          process.env.OIDC_ADMIN_ROLE = 'same-role'
          process.env.OIDC_USER_ROLE = 'same-role'
          let roleConfigError
          try { oidc.getConfig() }
          catch (err) { roleConfigError = err }
          expect(roleConfigError).toMatchObject({
            fn: 'BadParameters', message: 'OIDC_ROLE_MAPPINGS external values must be unique'
          })
          delete process.env.OIDC_ADMIN_ROLE
          delete process.env.OIDC_USER_ROLE

          process.env.OIDC_ROLE_MAPPINGS = 'not-json'
          try { oidc.getConfig() }
          catch (err) {
            expect(err).toMatchObject({fn: 'BadParameters', message: 'OIDC_ROLE_MAPPINGS must be valid JSON'})
          }
          delete process.env.OIDC_ROLE_MAPPINGS

          delete process.env.OIDC_ADMIN_GROUP
          delete process.env.OIDC_USER_GROUP
          process.env.OIDC_JIT_ENABLED = 'false'
          process.env.OIDC_IDENTITY_CLAIM = 'sub'

          await expect(oidc.completeAuthorization(callbackUrl, `${authRequest.transaction}tampered`))
            .rejects.toMatchObject({fn: 'Unauthorized'})
          const accessTokenShapedTransaction = require('jsonwebtoken').sign(
            {state: 'state', nonce: 'nonce', codeVerifier: 'verifier'},
            require('../src/lib/auth').jwtSecret
          )
          await expect(oidc.completeAuthorization(callbackUrl, accessTokenShapedTransaction))
            .rejects.toMatchObject({fn: 'Unauthorized'})
        }
        finally {
          oidc.setClientLibraryForTests(undefined)
          Object.entries(previousEnv).forEach(([key, value]) => {
            if (value === undefined) delete process.env[key]
            else process.env[key] = value
          })
        }
      })

      it('Refresh token endpoints', async () => {
        var response = await request(app).get('/api/users/refreshtoken')
          .set('Cookie', [
            `refreshToken=${refreshToken}`
          ])
        expect(response.status).toBe(200)
        expect(response.body.datas.token).toBeDefined()
        expect(response.body.datas.refreshToken).toBeDefined()
        refreshToken = response.body.datas.refreshToken

        response = await request(app).delete('/api/users/refreshtoken')
          .set('Cookie', [
            'refreshToken=invalid-token'
          ])
        expect(response.status).toBe(401)

        response = await request(app).delete('/api/users/refreshtoken')
          .set('Cookie', [
            `refreshToken=${refreshToken}`
          ])
        expect(response.status).toBe(200)

        response = await request(app).get('/api/users/refreshtoken')
          .set('Cookie', [
            `refreshToken=${refreshToken}`
          ])
        expect(response.status).toBe(401)
        expect(response.body.datas).toBe('Session not found')
      })

      it('Requires external reauthentication after the configured session boundary', async () => {
        const user = await User.findOne({username: 'user2'})
        const expiredExternalRefreshToken = require('jsonwebtoken').sign({
          sessionId: null,
          userId: user._id,
          externalAuthExpiresAt: Math.floor(Date.now() / 1000) - 1
        }, require('../src/lib/auth').jwtRefreshSecret)

        const response = await request(app).get('/api/users/refreshtoken')
          .set('Cookie', [`refreshToken=${expiredExternalRefreshToken}`])

        expect(response.status).toBe(401)
        expect(response.body.datas).toBe('External reauthentication required')
        expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
          expect.stringContaining('token=;'),
          expect.stringContaining('refreshToken=;')
        ]))
      })

      it('Migrates legacy role field to roles array', async () => {
        await Migration.deleteOne({name: '20260617-user-roles-array'})
        await User.collection.insertMany([
          {username: 'legacyadmin', password: 'x', firstname: 'Legacy', lastname: 'Admin', role: 'admin'},
          {username: 'legacyuser', password: 'x', firstname: 'Legacy', lastname: 'User', role: 'user'},
          {username: 'legacyreport', password: 'x', firstname: 'Legacy', lastname: 'Report', role: 'legacy-field-role'}
        ])

        await migrations.run()

        const users = await User.collection.find(
          {username: {$in: ['legacyadmin', 'legacyuser', 'legacyreport']}},
          {projection: {username: 1, role: 1, roles: 1}}
        ).toArray()
        const byUsername = Object.fromEntries(users.map(user => [user.username, user]))

        expect(byUsername.legacyadmin.roles).toEqual(['admin'])
        expect(byUsername.legacyuser.roles).toEqual(['user'])
        expect(byUsername.legacyreport.roles).toEqual(['legacy-field-role'])
        expect(byUsername.legacyadmin.role).toBeUndefined()
        expect(byUsername.legacyuser.role).toBeUndefined()
        expect(byUsername.legacyreport.role).toBeUndefined()
        expect(await Migration.findOne({name: '20260617-user-roles-array'}).lean()).toBeTruthy()

        await User.collection.deleteMany({username: {$in: ['legacyadmin', 'legacyuser', 'legacyreport']}})
        await Role.collection.deleteOne({name: 'legacy-field-role'})
      })

      it('Migrates legacy roles to display names', async () => {
        await Migration.deleteOne({name: '20260617-user-roles-array'})
        await Role.collection.insertOne({
          name: 'legacy-reviewer',
          allows: ['audits:review']
        })

        await migrations.run()

        const role = await Role.collection.findOne(
          {name: 'legacy-reviewer'},
          {projection: {name: 1, displayName: 1}}
        )

        expect(role.displayName).toBe('legacy-reviewer')
        expect(await Migration.findOne({name: '20260617-user-roles-array'}).lean()).toBeTruthy()

        await Role.collection.deleteOne({name: 'legacy-reviewer'})
      })

      it('Migrates custom roles from legacy roles config', async () => {
        const rolesConfigPath = path.join(__dirname, '..', 'src', 'config', 'roles.json')
        const existingConfig = fs.existsSync(rolesConfigPath) ? fs.readFileSync(rolesConfigPath, 'utf8') : null

        await Migration.deleteOne({name: '20260617-user-roles-array'})
        await Role.collection.deleteOne({name: 'legacy-report'})
        fs.writeFileSync(rolesConfigPath, JSON.stringify({
          'legacy-report': {
            inherits: ['user'],
            allows: ['audits:read-all']
          }
        }))

        try {
          await migrations.run()

          const role = await Role.collection.findOne(
            {name: 'legacy-report'},
            {projection: {name: 1, displayName: 1, allows: 1}}
          )

          expect(role.displayName).toBe('legacy-report')
          expect(role.allows).toContain('audits:create')
          expect(role.allows).toContain('audits:read-all')
          expect(await Migration.findOne({name: '20260617-user-roles-array'}).lean()).toBeTruthy()
        }
        finally {
          await Role.collection.deleteOne({name: 'legacy-report'})
          if (existingConfig === null)
            fs.unlinkSync(rolesConfigPath)
          else
            fs.writeFileSync(rolesConfigPath, existingConfig)
        }
      })

      it('Creates missing user-assigned roles with core permissions', async () => {
        await Migration.deleteOne({name: '20260617-user-roles-array'})
        await Role.collection.deleteOne({name: 'orphan-role'})
        await User.collection.insertOne({
          username: 'legacyorphan',
          password: 'x',
          firstname: 'Legacy',
          lastname: 'Orphan',
          roles: ['orphan-role']
        })

        await migrations.run()

        const role = await Role.collection.findOne(
          {name: 'orphan-role'},
          {projection: {name: 1, displayName: 1, description: 1, allows: 1}}
        )

        expect(role.displayName).toBe('orphan-role')
        expect(role.description).toBe('Migrated from user assignment. Review permissions.')
        expect(role.allows.sort()).toEqual(permissionsCatalog.core().sort())
        expect(await Migration.findOne({name: '20260617-user-roles-array'}).lean()).toBeTruthy()

        await User.collection.deleteOne({username: 'legacyorphan'})
        await Role.collection.deleteOne({name: 'orphan-role'})
      })

      it('TOTP setup and cancel flow', async () => {
        var response = await request(app).get('/api/users/totp')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)
        expect(response.body.datas.totpSecret).toBeDefined()

        var totpSecret = response.body.datas.totpSecret
        var totp = new OTPAuth.TOTP({
          issuer: 'PwnDoc',
          label: 'admin',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: totpSecret
        })
        var validToken = totp.generate()

        response = await request(app).post('/api/users/totp')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({totpSecret: totpSecret})
        expect(response.status).toBe(422)

        response = await request(app).post('/api/users/totp')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({totpToken: '000000', totpSecret: totpSecret})
        expect(response.status).toBe(401)

        response = await request(app).post('/api/users/totp')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({totpToken: validToken, totpSecret: totpSecret})
        expect(response.status).toBe(200)

        response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
        expect(response.status).toBe(422)

        response = await request(app).post('/api/users/token')
          .send({username: 'admin', password: 'Admin123', totpToken: '000000'})
        expect(response.status).toBe(401)

        validToken = totp.generate()
        response = await request(app).post('/api/users/token')
          .send({username: 'admin', password: 'Admin123', totpToken: validToken})
        expect(response.status).toBe(200)
        expect(response.body.datas.token).toBeDefined()
        expect(response.body.datas.refreshToken).toBeDefined()

        response = await request(app).delete('/api/users/totp')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({})
        expect(response.status).toBe(422)

        response = await request(app).delete('/api/users/totp')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({totpToken: '000000'})
        expect(response.status).toBe(401)

        validToken = totp.generate()
        response = await request(app).delete('/api/users/totp')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({totpToken: validToken})
        expect(response.status).toBe(200)
      })
    })

    describe('User Enumeration testing', () => {
      it('User Enumeration due to Response Discrepancy', async () => {
        var validUserBadPassword = {
          username: 'admin',
          password: 'InvalidPassword'
        }
        var invalidUser = {
          username: 'InvalidUser',
          password: 'InvalidPassword'
        }

        var responseValidBadPassword = await request(app).post('/api/users/token').send(validUserBadPassword)
        expect(responseValidBadPassword.status).toBe(401)

        var responseInvalid = await request(app).post('/api/users/token').send(invalidUser)
        expect(responseInvalid.status).toBe(401)

        expect(responseValidBadPassword.text).toBe(responseInvalid.text)
      })

      it('User Enumeration based on response time', async () => {
        var start = new Date()

        for (var index = 0; index <= 200; index++) {
          await request(app).post('/api/users/token').send({username: 'InvalidUser' + index, password: 'InvalidPassword'})
        }

        var endTimeInvalidUsers = new Date() - start

        start = new Date()

        for (var index = 0; index <= 200; index++) {
          await request(app).post('/api/users/token').send({username: 'admin', password: 'InvalidPassword' + index})
        }

        var endTimeValidUsers = new Date() - start

        var timeDelta = endTimeInvalidUsers / endTimeValidUsers

        expect(timeDelta <= 1.15 && timeDelta >= 0.85).toBeTruthy()
      }, 50000)
    })
  })
}
