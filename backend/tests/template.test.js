/*
  At the end
    1 Template: {name: 'Test Template 2', file: 'VGVzdCB0ZW1wbGF0ZQ=='}
*/

module.exports = function(request) {
  describe('Template Suite Tests', () => {
    var options = {headers: {}}
    beforeAll(async done => {
      var response = await request.post('/api/users/token', {username: 'admin', password: 'admin2'})
      options.headers.Cookie = `token=${response.data.datas.token}` // Set header Cookie for next requests
      done()
    })

    describe('Template CRUD operations', () => {
      var template1Id = ""
      var template2Id = ""
      it('Get templates (no existing templates in db)', async done => {
        var response = await request.get('/api/templates', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toHaveLength(0)
        done()
      })

      it('Create 2 templates', async done => {
        var template = {name: "Template 1", ext: 'docx', file: "VGVzdCB0ZW1wbGF0ZQ=="}
        var response = await request.post('/api/templates', template, options)
        expect(response.status).toBe(201)
        template1Id = response.data.datas._id

        template.name = "Template 2"
        var response = await request.post('/api/templates', template, options)
        expect(response.status).toBe(201)
        template2Id = response.data.datas._id

        done()
      })

      it('Should not create template with name without file', async done => {
        var template = {name: "Template 3"}
        var response = await request.post('/api/templates', template, options)

        expect(response.status).toBe(422)
        done()
      })

      it('Should not create template with existing name', async done => {
        var template = {name: "Template 1", filename: "File.docx", file: "VGVzdCB0ZW1wbGF0ZQ=="}
        var response = await request.post('/api/templates', template, options)

        expect(response.status).toBe(422)
        done()
      })

      it('Should not create template with wrong name format', async done => {
        var template = {name: "../../../../../../etc/passwd", file: "VGVzdCB0ZW1wbGF0ZQ=="}
        var response = await request.post('/api/templates', template, options)
        expect(response.status).toBe(422)

        template.name = "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        response = await request.post('/api/templates', template, options)
        expect(response.status).toBe(422)
        done()
      })

      it('Get templates (existing templates in db)', async done => {
        const expected = [
          {name: "Template 1"},
          {name: "Template 2"}
        ]
        var response = await request.get('/api/templates', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas.map(t => {return {name: t.name}})).toEqual(expect.arrayContaining(expected))
        done()
      })

      it('Update template with name only', async done => {
        var template = {name: "Template Updated"}

        var response = await request.put(`/api/templates/${template1Id}`, template, options)
        expect(response.status).toBe(200)
        done()
      })

      it('Update template with nonexistent ID', async done => {
        var template = {name: "Template Updated"}

        var response = await request.put(`/api/templates/deadbeefdeadbeefdeadbeef`, template, options)
        expect(response.status).toBe(404)
        done()
      })

      it('Delete template', async done => {
        var response = await request.delete(`/api/templates/${template2Id}`, options)
        expect(response.status).toBe(200)

        response = await request.get('/api/templates', options)
        expect(response.data.datas).toHaveLength(1)
        done()
      })

      it('Delete template with nonexistent ID', async done => {
        var response = await request.delete(`/api/templates/deadbeefdeadbeefdeadbeef`, options)
        expect(response.status).toBe(404)
        done()
      })
    })
  })
}