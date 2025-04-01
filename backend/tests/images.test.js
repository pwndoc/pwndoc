/*
  At the end
  no data
*/

module.exports = function(request, app) {
  describe('Image Suite Tests', () => {
    var adminToken = '';
    var userToken = '';

    var imageId = '';
    var auditId = '';

    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      adminToken = response.body.datas.token
      
      var response = await request(app).post('/api/users/token').send({username: 'user2', password: 'User1234'})
      userToken = response.body.datas.token

      response = await request(app).get('/api/audits')
        .set('Cookie', [
          `token=JWT ${adminToken}`
        ])
  
      auditId = response.body.datas[0]._id
    })

    describe('Image CRUD operations', () => {
      it('Create image no permission', async () => {
        var audit = {
          name: 'image1.png',
          auditId: auditId,
          value: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw'
        }
        var response = await request(app).post('/api/images')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(audit)

        expect(response.status).toBe(404)
      })

      it('Create image', async () => {
        var audit = {
          name: 'image1.png',
          auditId: auditId,
          value: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw'
        }
        var response = await request(app).post('/api/images')
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])
          .send(audit)

        imageId = response.body.datas._id

        expect(response.status).toBe(201)
      })

      it('Get Image no permissions', async () => {
        var response = await request(app).get(`/api/images/${imageId}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
          expect(response.status).toBe(404)
      })

      it('Get Image', async () => {
        var response = await request(app).get(`/api/images/${imageId}`)
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])
      
          expect(response.status).toBe(200)
  
          expect(response.body.datas.name).toBe('image1.png');
          expect(response.body.datas.value).toBe('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw');
          expect(response.body.datas.auditId).toBe(auditId);
      })

      it('Delete Image no permissions', async () => {
        var response = await request(app).delete(`/api/images/${imageId}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(403)
      })

      it('Delete image', async () => {
        var response = await request(app).delete(`/api/images/${imageId}`)
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])
        expect(response.status).toBe(200)

        response = await request(app).get(`/api/images/${imageId}`)
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])
        
        expect(response.status).toBe(404)
      })
    })
  })
}