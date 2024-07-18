/* 
  4 Users at the end:
    admin:Admin123 (admin)
    user2:User1234 (user)
    report:Report123 (report)
    reviewer:Reviewer123 (reviewer)
*/

module.exports = function(request, app) {
  var userToken = '';

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

        userToken = response.body.datas.token
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
          role: 'admin'
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
          role: 'user'
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
      })
      
      it('Create user with role report', async () => {
        var user = {
          username: 'report',
          password: 'Report123',
          firstname: 'Report',
          lastname: 'Admin',
          role: 'report'
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

      it('Create user with role reviewer', async () => {
        var user = {
          username: 'reviewer',
          password: 'Reviewer123',
          firstname: 'reviewer',
          lastname: 'reviewer',
          role: 'reviewer'
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
          role: 'user'
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
          role: 'admin'
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
          role: 'user'
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