/*
  At the end
    No custom roles created by this suite remain.
    User role-regression-user remains with the default user role.
*/

module.exports = function(request, app) {
  describe('Roles Suite Tests', () => {
    var userToken = ''
    var limitedToken = ''
    var roleUserId = ''

    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token

      response = await request(app).post('/api/users/token').send({username: 'user2', password: 'User1234'})
      limitedToken = response.body.datas.token
    })

    describe('Role API permissions and validation', () => {
      it('Gets system roles and permissions catalog', async () => {
        var response = await request(app).get('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.arrayContaining([
          expect.objectContaining({name: 'admin', displayName: 'Admin', virtual: true}),
          expect.objectContaining({name: 'user', displayName: 'User', virtual: true})
        ]))

        response = await request(app).get('/api/data/roles/permissions')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.arrayContaining([
          expect.objectContaining({
            key: 'roles',
            permissions: expect.arrayContaining([
              expect.objectContaining({scope: 'roles:read'})
            ])
          }),
          expect.objectContaining({
            key: 'audits',
            permissions: expect.arrayContaining([
              expect.objectContaining({scope: 'audits:ai-generate', core: true}),
              expect.objectContaining({scope: 'audits:ai-qa', core: true})
            ])
          }),
          expect.objectContaining({
            key: 'vulnerabilities',
            permissions: expect.arrayContaining([
              expect.objectContaining({scope: 'vulnerabilities:ai-qa', core: true}),
              expect.objectContaining({scope: 'vulnerabilities:ai-generate', core: true})
            ])
          }),
          expect.objectContaining({
            key: 'settings',
            permissions: expect.arrayContaining([
              expect.objectContaining({scope: 'ai-settings:read'}),
              expect.objectContaining({scope: 'ai-settings:update'})
            ])
          }),
          expect.objectContaining({
            key: 'ai',
            permissions: expect.arrayContaining([
              expect.objectContaining({scope: 'ai:prompts:read'}),
              expect.objectContaining({scope: 'ai:prompts:update'}),
              expect.objectContaining({scope: 'ai:redaction-guidelines:read'}),
              expect.objectContaining({scope: 'ai:redaction-guidelines:update'}),
              expect.objectContaining({scope: 'ai:qa-instructions:read'}),
              expect.objectContaining({scope: 'ai:qa-instructions:update'})
            ])
          })
        ]))
      })

      it('Allows read-only role users to list roles but not mutate them', async () => {
        var response = await request(app).get('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${limitedToken}`
          ])

        expect(response.status).toBe(200)

        response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${limitedToken}`
          ])
          .send({
            name: 'limited-create-attempt',
            displayName: 'Limited Create Attempt',
            allows: ['clients:read']
          })

        expect(response.status).toBe(403)
      })

      it('Rejects invalid role payloads', async () => {
        var response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'invalid role',
            displayName: 'Invalid Role',
            allows: ['clients:read']
          })

        expect(response.status).toBe(422)
        expect(response.body.datas).toBe('Role name must match /^[a-zA-Z0-9_-]+$/')

        response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'missing-display-name',
            displayName: '',
            allows: ['clients:read']
          })

        expect(response.status).toBe(422)
        expect(response.body.datas).toBe('Role display name is required')

        response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'invalid-allows-type',
            displayName: 'Invalid Allows Type',
            allows: 'clients:read'
          })

        expect(response.status).toBe(422)
        expect(response.body.datas).toBe('allows must be an array')

        response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'invalid-permission-role',
            displayName: 'Invalid Permission Role',
            allows: ['clients:fly']
          })

        expect(response.status).toBe(422)
        expect(response.body.datas).toBe('Invalid permission: clients:fly')

        response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'wildcard-role',
            displayName: 'Wildcard Role',
            allows: ['*']
          })

        expect(response.status).toBe(422)
        expect(response.body.datas).toBe('Invalid permission: *')
      })

      it('Prevents modifying system roles', async () => {
        var response = await request(app).put('/api/data/roles/admin')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'admin',
            displayName: 'Admin Override',
            allows: ['clients:read']
          })

        expect(response.status).toBe(403)
        expect(response.body.datas).toBe('System roles cannot be modified')

        response = await request(app).delete('/api/data/roles/user')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(403)
        expect(response.body.datas).toBe('System roles cannot be modified')
      })
    })

    describe('Role lifecycle effects', () => {
      it('Creates, updates, and deletes a custom role', async () => {
        var response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'role-api-lifecycle',
            displayName: 'Role API Lifecycle',
            description: 'Created by role API tests',
            allows: ['clients:read']
          })

        expect(response.status).toBe(201)
        expect(response.body.datas).toEqual(expect.objectContaining({
          name: 'role-api-lifecycle',
          displayName: 'Role API Lifecycle',
          description: 'Created by role API tests',
          allows: ['clients:read']
        }))

        response = await request(app).put('/api/data/roles/role-api-lifecycle')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'renamed-value-ignored',
            displayName: 'Role API Lifecycle Updated',
            description: 'Updated by role API tests',
            allows: ['clients:read', 'companies:read']
          })

        expect(response.status).toBe(200)

        response = await request(app).get('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.body.datas).toEqual(expect.arrayContaining([
          expect.objectContaining({
            name: 'role-api-lifecycle',
            displayName: 'Role API Lifecycle Updated',
            description: 'Updated by role API tests',
            allows: ['clients:read', 'companies:read']
          })
        ]))

        response = await request(app).delete('/api/data/roles/role-api-lifecycle')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(200)
      })

      it('Falls users back to the user role when deleting their only custom role', async () => {
        var response = await request(app).post('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            name: 'temporary-only-role',
            displayName: 'Temporary Only Role',
            allows: ['clients:read']
          })

        expect(response.status).toBe(201)

        response = await request(app).post('/api/users')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            username: 'role-regression-user',
            password: 'Roleuser123',
            firstname: 'Role',
            lastname: 'Regression',
            roles: ['temporary-only-role']
          })

        expect(response.status).toBe(201)

        response = await request(app).get('/api/users/role-regression-user')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        roleUserId = response.body.datas._id
        expect(response.body.datas.roles).toEqual(['temporary-only-role'])

        response = await request(app).delete('/api/data/roles/temporary-only-role')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(200)

        response = await request(app).get('/api/users/role-regression-user')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.body.datas.roles).toEqual(['user'])
      })

      it('Rejects deleting nonexistent roles', async () => {
        var response = await request(app).delete('/api/data/roles/deadbeef-role')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(404)
      })
    })
  })
}
