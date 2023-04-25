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

module.exports = function(request, app) {
  describe('Client Suite Tests', () => {
    var userToken = '';
    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token
    })

    describe('Client CRUD operations', () => {
      var client1Id = ""
      var client2Id = ""
      var client3Id = ""
      it('Get clients (no existing clients in db)', async () => {
        var response = await request(app).get('/api/clients')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create client with email only', async () => {
        var client = {email: "client1@example.com"}
        var response = await request(app).post('/api/clients')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(client)
        expect(response.status).toBe(201)
        client1Id = response.body.datas._id
      })

      it('Create client with all information and existing company', async () => {
        var client = {
          email: "client2@example.com",
          lastname: "Client",
          firstname: "User",
          phone: "5146669999",
          cell: "4389996666",
          title: "IT manager",
          company: {name: 'Company 1'}
        }
        var response = await request(app).post('/api/clients')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(client)
        expect(response.status).toBe(201)
        client2Id = response.body.datas._id
      })

      it('Create client with nonexistent company', async () => {
        var client = {
          email: "client3@example.com",
          company: {name: 'New Company'}
        }
        var response = await request(app).post('/api/clients')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(client)
        expect(response.status).toBe(201)
        client3Id = response.body.datas._id
      })

      it('Should not create client with existing email', async () => {
        var client = {email: "client1@example.com"}
        var response = await request(app).post('/api/clients')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(client)

        expect(response.status).toBe(422)
      })

      it('Should not create client without email', async () => {
        var client = {firstname: "firstname", lastname: "lastname"}
        var response = await request(app).post('/api/clients')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(client)

        expect(response.status).toBe(422)
      })

      it('Get clients (existing clients in db)', async () => {
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
        var response = await request(app).get('/api/clients')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas.map(t => {return {
          email: t.email,
          lastname: t.lastname,
          firstname: t.firstname,
          phone: t.phone,
          cell: t.cell,
          title: t.title,
          company: t.company
        }})).toEqual(expect.arrayContaining(expected))
      })

      it('Update client', async () => {
        var client = {
          email: "client_updated@example.com",
          lastname: "Client",
          firstname: "Updated",
          phone: "5146669999",
          cell: "4389996666",
          title: "IT manager",
          company: {name: 'New Updated Company'}
        }

        var response = await request(app).put(`/api/clients/${client1Id}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(client)
        expect(response.status).toBe(200)
      })

      it('Update client with nonexistent id', async () => {
        var client = {firstname: "Client"}

        var response = await request(app).put(`/api/clients/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(client)
        expect(response.status).toBe(404)
      })

      it('Delete client', async () => {
        var response = await request(app).delete(`/api/clients/${client3Id}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)

        response = await request(app).get('/api/clients')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toHaveLength(2)
      })

      it('Delete client with nonexistent email', async () => {
        var response = await request(app).delete(`/api/clients/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
      })
    })
  })
}