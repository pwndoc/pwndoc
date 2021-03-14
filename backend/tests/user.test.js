/* 
  3 Users at the end:
    admin:admin2 (admin)
    user2:user2 (user)
    report:report (report)
*/

module.exports = function(request) {
  describe('Users Suite Tests', () => {

    describe('User Initialization', () => {
      it('Get the users init state', async done => {
        var response = await request.get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toBe(true)
        done()
      })

      it('Authenticate with nonexistent user', async done => {
        var response = await request.post('/api/users/token', {username: 'admin', password: 'admin'})
      
        expect(response.status).toBe(401)
        done()
      })

      it('Create first user', async done => {
        var user = {
          username: 'admin',
          password: 'admin',
          firstname: 'Admin',
          lastname: 'Istrator'
        }
        var response = await request.post('/api/users/init', user)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Create first user when it already exists', async done => {
        var user = {
          username: 'admin2',
          password: 'admin2',
          firstname: 'Admin2',
          lastname: 'Istrator2'
        }
        var response = await request.post('/api/users/init', user)
      
        expect(response.status).toBe(403)
        done()
      })

      it('Authenticate with first user', async done => {
        var user = {
          username: 'admin',
          password: 'admin'
        }
        var response = await request.post('/api/users/token', user)
      
        expect(response.status).toBe(200)
        expect(response.data.datas.token).toBeDefined()
        expect(response.data.datas.token).toContain('JWT')
        done()
      })

    })

    describe('User CRUD operations', () => {
      var options = {headers: {}}
      it('Get the users init state', async done => {
        var response = await request.get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toBe(false)
        done()
      })
      
      it('Authenticate with admin user', async done => {
        var user = {
          username: 'admin',
          password: 'admin'
        }
        var response = await request.post('/api/users/token', user)
      
        expect(response.status).toBe(200)
        expect(response.data.datas.token).toBeDefined()
        options.headers.Cookie = `token=${response.data.datas.token}` // Set header Cookie for next requests
        done()
      })

      it('Check token validity', async done => {
        var response = await request.get('/api/users/checktoken', options)
      
        expect(response.status).toBe(200)
        done()
      })

      it('Get my profile', async done => {
        const expected = {
          username: 'admin',
          firstname: 'Admin',
          lastname: 'Istrator',
          role: 'admin'
        }
        var response = await request.get('/api/users/me', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toEqual(expect.objectContaining(expected))
        done()
      })

      it('Create user with role user', async done => {
        var user = {
          username: 'user',
          password: 'user',
          firstname: 'User',
          lastname: 'Test',
          role: 'user'
        }
        var response = await request.post('/api/users', user, options)
        expect(response.status).toBe(201)

        response = await request.post('/api/users/token', user)
        expect(response.status).toBe(200)
        done()
      })

      it('Create user with role user without role parameter', async done => {
        var user = {
          username: 'tmpuser',
          password: 'tmpuser',
          firstname: 'Tmp',
          lastname: 'User'
        }
        var response = await request.post('/api/users', user, options)
        expect(response.status).toBe(201)

        response = await request.post('/api/users/token', user)
        expect(response.status).toBe(200)
        done()
      })
      
      it('Create user with role report', async done => {
        var user = {
          username: 'report',
          password: 'report',
          firstname: 'Report',
          lastname: 'Admin',
          role: 'report'
        }
        var response = await request.post('/api/users', user, options)
        expect(response.status).toBe(201)

        response = await request.post('/api/users/token', user)
        expect(response.status).toBe(200)
        done()
      })

      it('Get user profile', async done => {
        const expected = {
          username: 'user',
          firstname: 'User',
          lastname: 'Test',
          role: 'user'
        }
        var response = await request.get('/api/users/user', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toEqual(expect.objectContaining(expected))
        done()
      })

      it('Update my profile', async done => {
        const expected = {
          username: 'admin',
          firstname: 'Admin2',
          lastname: 'Istrator',
          role: 'admin'
        }

        var user = {
          currentPassword: "admin",
          newPassword: 'admin2',
          confirmPassword: 'admin2',
          firstname: 'Admin2'
        }
        var response = await request.put('/api/users/me', user, options)
        expect(response.status).toBe(200)

        var response = await request.get('/api/users/me', options)
        expect(response.data.datas).toEqual(expect.objectContaining(expected))
        done()
      })

      it('Update user profile', async done => {
        const expected = {
          username: 'user2',
          firstname: 'User2',
          lastname: 'Test',
          role: 'user'
        }

        var user = {
          username: 'user2',
          firstname: 'User2',
          password: 'user2',
        }

        var userRequest = await request.get('/api/users/user', options)
        var userId = userRequest.data.datas._id

        var response = await request.put(`/api/users/${userId}`, user, options)
        expect(response.status).toBe(200)

        var response = await request.get('/api/users/user2', options)
        expect(response.data.datas).toEqual(expect.objectContaining(expected))
        done()
      })

      it('Delete user', async done => {
        var userRequest = await request.get('/api/users/tmpuser', options)
        var userId = userRequest.data.datas._id

        var response = await request.delete('/api/users/deadbeefdeadbeefdeadbeef', options)
        expect(response.status).toBe(404)

        var response = await request.delete(`/api/users/${userId}`, options)
        expect(response.status).toBe(200)

        var response = await request.get('/api/users/tmpuser', options)
        expect(response.status).toBe(404)

        var response = await request.get('/api/users', options)
        expect(response.data.datas).toHaveLength(3)
        done()
      })
    })
  })
}