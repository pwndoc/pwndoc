/*
  At the end
    1 Template: {name: 'Test Template 2', file: 'VGVzdCB0ZW1wbGF0ZQ=='}
*/

module.exports = function(request, app) {
  describe('Template Suite Tests', () => {
    var userToken = '';
    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token
    })

    describe('Template CRUD operations', () => {
      var template1Id = ""
      var template2Id = ""
      it('Get templates (no existing templates in db)', async () => {
        var response = await request(app).get('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create 2 templates', async () => {
        var template = {name: "Template 1", ext: 'docx', file: "VGVzdCB0ZW1wbGF0ZQ=="}
        var response = await request(app).post('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(template)

        expect(response.status).toBe(201)
        template1Id = response.body.datas._id

        template.name = "Template 2"
        var response = await request(app).post('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(template)
        expect(response.status).toBe(201)
        template2Id = response.body.datas._id

      })

      it('Should not create template with name without file', async () => {
        var template = {name: "Template 3"}
        var response = await request(app).post('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(template)

        expect(response.status).toBe(422)
      })

      it('Should not create template with existing name', async () => {
        var template = {name: "Template 1", filename: "File.docx", file: "VGVzdCB0ZW1wbGF0ZQ=="}
        var response = await request(app).post('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(template)

        expect(response.status).toBe(422)
      })

      it('Should not create template with wrong name format', async () => {
        var template = {name: "../../../../../../etc/passwd", file: "VGVzdCB0ZW1wbGF0ZQ=="}
        var response = await request(app).post('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(template)
        expect(response.status).toBe(422)

        template.name = "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        response = await request(app).post('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(template)
        expect(response.status).toBe(422)
      })

      it('Get templates (existing templates in db)', async () => {
        const expected = [
          {name: "Template 1"},
          {name: "Template 2"}
        ]
        var response = await request(app).get('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas.map(t => {return {name: t.name}})).toEqual(expect.arrayContaining(expected))
      })

      it('Update template with name only', async () => {
        var template = {name: "Template Updated"}

        var response = await request(app).put(`/api/templates/${template1Id}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(template)
        expect(response.status).toBe(200)
      })

      it('Update template with nonexistent ID', async () => {
        var template = {name: "Template Updated"}

        var response = await request(app).put(`/api/templates/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(template)
        expect(response.status).toBe(404)
      })

      it('Delete template', async () => {
        var response = await request(app).delete(`/api/templates/${template2Id}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)

        response = await request(app).get('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toHaveLength(1)
      })

      it('Delete template with nonexistent ID', async () => {
        var response = await request(app).delete(`/api/templates/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
      })
    })
  })
}