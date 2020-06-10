/*
  At the end
    1 Template: {name: 'Test Template 2', file: 'VGVzdCB0ZW1wbGF0ZQ=='}
*/

module.exports = function(request) {
  describe('Template Suite Tests', () => {
    var options = {headers: {}}
    beforeAll(async done => {
      var response = await request.post('/api/users/token', {username: 'admin', password: 'admin2'})
      options.headers.Authorization = response.data.datas.token // Set header Authentication for next requests
      done()
    })

    describe('Template CRUD operations', () => {
      it('Get templates (no existing templates in db)', async done => {
        var response = await request.get('/api/templates', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toHaveLength(0)
        done()
      })

      it('Create 2 templates', async done => {
        var template = {name: "Template 1", file: "VGVzdCB0ZW1wbGF0ZQ=="}
        var response = await request.post('/api/templates', template, options)
        expect(response.status).toBe(201)

        template.name = "Template 2"
        var response = await request.post('/api/templates', template, options)
        expect(response.status).toBe(201)
        done()
      })

      it('Should not create template with name without file', async done => {
        var template = {name: "Template 3"}
        var response = await request.post('/api/templates', template, options)

        expect(response.status).toBe(422)
        done()
      })

      it('Should not create template with existing name', async done => {
        var template = {name: "Template 1", file: "VGVzdCB0ZW1wbGF0ZQ=="}
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
        var response = await request.get('/api/templates', options)
        expect(response.data.datas).toHaveLength(2)
        var templateId = response.data.datas[0]._id
        var template = {name: "Template Updated"}

        response = await request.put(`/api/templates/${templateId}`, template, options)
        expect(response.status).toBe(200)

        response = await request.get('/api/templates', options)
        expect(response.data.datas[0].name).toBe('Template Updated')
        done()
      })

      it('Update template with nonexistent ID', async done => {
        var templateId = 'deadbeefdeadbeefdeadbeef'
        var template = {name: "Template Updated"}

        response = await request.put(`/api/templates/${templateId}`, template, options)
        expect(response.status).toBe(404)
        done()
      })

      it('Delete template', async done => {
        var response = await request.get('/api/templates', options)
        expect(response.data.datas).toHaveLength(2)
        var templateId = response.data.datas[0]._id

        response = await request.delete(`/api/templates/${templateId}`, options)
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