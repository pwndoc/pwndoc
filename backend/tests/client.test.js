/*
  At the end
    2 Clients: [
      {
        email: "client_updated@example.com",
          lastname: "Client",
          firstname: "Updated",
          phone: "5146669999",
          cell: "4389996666",
          title: "IT manager",
          company: {name: 'New Updated Company'}
      },
      {
        email: "client2@example.com",
          lastname: "Client",
          firstname: "User",
          phone: "5146669999",
          cell: "4389996666",
          title: "IT manager",
          company: {name: 'Company 1'}
      }
    ]

    2 more Companies created: 
      'New Company'
      'New Updated Company'
*/

module.exports = function(request) {
  describe('Client Suite Tests', () => {
    var options = {headers: {}}
    beforeAll(async done => {
      var response = await request.post('/api/users/token', {username: 'admin', password: 'admin2'})
      options.headers.Authorization = response.data.datas.token // Set header Authentication for next requests
      done()
    })

    describe('Client CRUD operations', () => {
      it('Get clients (no existing clients in db)', async done => {
        var response = await request.get('/api/clients', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toHaveLength(0)
        done()
      })

      it('Create client with email only', async done => {
        var client = {email: "client1@example.com"}
        var response = await request.post('/api/clients', client, options)
        expect(response.status).toBe(201)
        done()
      })

      it('Create client with all information and existing company', async done => {
        var client = {
          email: "client2@example.com",
          lastname: "Client",
          firstname: "User",
          phone: "5146669999",
          cell: "4389996666",
          title: "IT manager",
          company: {name: 'Company 1'}
        }
        var response = await request.post('/api/clients', client, options)
        expect(response.status).toBe(201)
        done()
      })

      it('Create client with nonexistent company', async done => {
        var client = {
          email: "client3@example.com",
          company: {name: 'New Company'}
        }
        var response = await request.post('/api/clients', client, options)
        expect(response.status).toBe(201)
        done()
      })

      it('Should not create client with existing email', async done => {
        var client = {email: "client1@example.com"}
        var response = await request.post('/api/clients', client, options)

        expect(response.status).toBe(422)
        done()
      })

      it('Should not create client without email', async done => {
        var client = {firstname: "firstname", lastname: "lastname"}
        var response = await request.post('/api/clients', client, options)

        expect(response.status).toBe(422)
        done()
      })

      it('Get clients (existing clients in db)', async done => {
        const expected = [
          {email: "client1@example.com"},
          {
            email: "client2@example.com",
            lastname: "Client",
            firstname: "User",
            phone: "5146669999",
            cell: "4389996666",
            title: "IT manager",
            company: {name: 'Company 1'}
          },
          {
            email: "client3@example.com",
            company: {name: 'New Company'}
          }
        ]
        var response = await request.get('/api/clients', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas.map(t => {return {
          email: t.email,
          lastname: t.lastname,
          firstname: t.firstname,
          phone: t.phone,
          cell: t.cell,
          title: t.title,
          company: t.company
        }})).toEqual(expect.arrayContaining(expected))
        done()
      })

      it('Update client', async done => {
        var client = {
          email: "client_updated@example.com",
          lastname: "Client",
          firstname: "Updated",
          phone: "5146669999",
          cell: "4389996666",
          title: "IT manager",
          company: {name: 'New Updated Company'}
        }

        response = await request.put(`/api/clients/client1@example.com`, client, options)
        expect(response.status).toBe(200)

        response = await request.get('/api/clients', options)
        expect(response.data.datas[0].email).toBe('client_updated@example.com')
        done()
      })

      it('Update client with nonexistent email', async done => {
        var client = {firstname: "Client"}

        response = await request.put(`/api/clients/nonexistentclient@example.com`, client, options)
        expect(response.status).toBe(404)
        done()
      })

      it('Delete client', async done => {
        var response = await request.delete(`/api/clients/client3@example.com`, options)
        expect(response.status).toBe(200)

        response = await request.get('/api/clients', options)
        expect(response.data.datas).toHaveLength(2)
        done()
      })

      it('Delete client with nonexistent email', async done => {
        var response = await request.delete(`/api/clients/nonexistentclient@example.com`, options)
        expect(response.status).toBe(404)
        done()
      })
    })
  })
}