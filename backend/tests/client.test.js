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
      options.headers.Cookie = `token=${response.data.datas.token}` // Set header Cookie for next requests
      done()
    })

    describe('Client CRUD operations', () => {
      var client1Id = ""
      var client2Id = ""
      var client3Id = ""
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
        client1Id = response.data.datas._id
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
        client2Id = response.data.datas._id
        done()
      })

      it('Create client with nonexistent company', async done => {
        var client = {
          email: "client3@example.com",
          company: {name: 'New Company'}
        }
        var response = await request.post('/api/clients', client, options)
        expect(response.status).toBe(201)
        client3Id = response.data.datas._id
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

        var response = await request.put(`/api/clients/${client1Id}`, client, options)
        expect(response.status).toBe(200)
        done()
      })

      it('Update client with nonexistent id', async done => {
        var client = {firstname: "Client"}

        var response = await request.put(`/api/clients/deadbeefdeadbeefdeadbeef`, client, options)
        expect(response.status).toBe(404)
        done()
      })

      it('Delete client', async done => {
        var response = await request.delete(`/api/clients/${client3Id}`, options)
        expect(response.status).toBe(200)

        response = await request.get('/api/clients', options)
        expect(response.data.datas).toHaveLength(2)
        done()
      })

      it('Delete client with nonexistent email', async done => {
        var response = await request.delete(`/api/clients/deadbeefdeadbeefdeadbeef`, options)
        expect(response.status).toBe(404)
        done()
      })
    })
  })
}