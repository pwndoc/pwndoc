/*
  At the end
  no data
*/

module.exports = function(request, app) {
  describe('Image Suite Tests', () => {
    var adminToken = '';

    var imageId = '';
    var auditId = '';

    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      adminToken = response.body.datas.token

      response = await request(app).get('/api/audits')
        .set('Cookie', [
          `token=JWT ${adminToken}`
        ])
  
      auditId = response.body.datas[0]._id
    })

    describe('Image CRUD operations', () => {
      it('Should not create image without value', async () => {
        var response = await request(app).post('/api/images')
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])
          .send({ name: 'missing-value.png' })

        expect(response.status).toBe(422)
      })

      it('Should not create image with non-string value', async () => {
        var response = await request(app).post('/api/images')
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])
          .send({ value: 1234 })

        expect(response.status).toBe(422)
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

      it('Create duplicate image should return same id', async () => {
        var response = await request(app).post('/api/images')
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])
          .send({
            name: 'image1-duplicate.png',
            auditId: auditId,
            value: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw'
          })

        expect(response.status).toBe(201)
        expect(response.body.datas._id).toBe(imageId)
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

      it('Download image', async () => {
        var response = await request(app).get(`/api/images/download/${imageId}`)
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])

        expect(response.status).toBe(200)
        expect(response.header['content-type']).toContain('image/png')
      })

      it('Should not get image with nonexistent id', async () => {
        var response = await request(app).get('/api/images/66f7a6b8e2fa4b49cfe9d123')
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])

        expect(response.status).toBe(404)
      })

      it('Should not download image with nonexistent id', async () => {
        var response = await request(app).get('/api/images/download/66f7a6b8e2fa4b49cfe9d123')
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])

        expect(response.status).toBe(404)
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

      it('Should not delete image with nonexistent id', async () => {
        var response = await request(app).delete('/api/images/66f7a6b8e2fa4b49cfe9d123')
          .set('Cookie', [
            `token=JWT ${adminToken}`
          ])

        expect(response.status).toBe(404)
      })
    })
  })
}
