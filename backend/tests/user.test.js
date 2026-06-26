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

      it('Rejects authentication requests with missing or invalid password payloads', async () => {
        var response = await request(app).post('/api/users/token').send({username: 'admin'})
        expect(response.status).toBe(422)

        response = await request(app).post('/api/users/token').send({username: 'admin', password: {invalid: true}})
        expect(response.status).toBe(422)
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
