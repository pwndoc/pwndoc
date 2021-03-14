/*
  At the end
    2 Languages: [
        {locale: 'en', language: 'English'},
        {locale: 'fr', language: 'French'}
      ]
    1 Audit type: {locale: 'en', name: 'Web'}
    1 Vulnerability type: {locale: 'en', name: 'Internal'}
    3 Sections: [
        {locale: 'en', name: 'Attack Scenario', field: 'attack_scenario'},
        {locale: 'en', name: 'Goal', field: 'goal'},
        {locale: 'fr', name: 'But', field: 'goal'}
      ]
*/

module.exports = function(request) {
  describe('Data Suite Tests', () => {
    var options = {headers: {}}
    beforeAll(async done => {
      var response = await request.post('/api/users/token', {username: 'admin', password: 'admin2'})
      options.headers.Cookie = `token=${response.data.datas.token}` // Set header Cookie for next requests
      done()
    })

    describe('Language CRUD operations', () => {
      it('Get languages', async done => {
        var response = await request.get('/api/data/languages', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toHaveLength(0)
        done()
      })

      it('Create 3 languages', async done => {
        var english = {
          locale: 'en',
          language: 'English'
        }

        var french = {
          locale: 'fr',
          language: 'French'
        }

        var espagnol = {
          locale: 'es',
          language: 'Espagnol'
        }
        var response = await request.post('/api/data/languages', english, options)
        expect(response.status).toBe(201)

        var response = await request.post('/api/data/languages', french, options)
        expect(response.status).toBe(201)

        var response = await request.post('/api/data/languages', espagnol, options)
        expect(response.status).toBe(201)
        done()
      })

      it('Should not create with existing locale', async done => {
        var language = {
          locale: 'fr',
          language: 'French2'
        }
        var response = await request.post('/api/data/languages', language, options)
      
        expect(response.status).toBe(422)
        done()
      })

      it('Should not create with existing name', async done => {
        var language = {
          locale: 'us',
          language: 'English'
        }
        var response = await request.post('/api/data/languages', language, options)
      
        expect(response.status).toBe(422)
        done()
      })

      it('Get languages', async done => {
        const expected = [
          {locale: 'en', language: 'English'},
          {locale: 'fr', language: 'French'},
          {locale: 'es', language: 'Espagnol'}
        ]

        var response = await request.get('/api/data/languages', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toEqual(expect.arrayContaining(expected))
        done()
      })

      it('Delete language', async done => {
        var response = await request.delete('/api/data/languages/es', options)
        expect(response.status).toBe(200)

        var response = await request.get('/api/data/languages', options)
        expect(response.data.datas).toHaveLength(2)
        done()
      })

      it('Should not delete language with nonexistent locale', async done => {
        var response = await request.delete('/api/data/languages/us', options)
        expect(response.status).toBe(404)
        done()
      })
    })

    describe('Audit types CRUD operations', () => {
      it('Get audit types', async done => {
        var response = await request.get('/api/data/audit-types', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toHaveLength(0)
        done()
      })

      it('Create audit type Internal', async done => {
        var type = {
          locale: 'en',
          name: 'Internal Test'
        }
        var response = await request.post('/api/data/audit-types', type, options)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Create audit type Web', async done => {
        var type = {
          locale: 'en',
          name: 'Web'
        }
        var response = await request.post('/api/data/audit-types', type, options)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Should not create with existing name', async done => {
        var type = {
          locale: 'en',
          name: 'Web'
        }
        var response = await request.post('/api/data/audit-types', type, options)
      
        expect(response.status).toBe(422)
        done()
      })

      it('Get audit types', async done => {
        const expected = [
          {locale: 'en', name: 'Internal Test'},
          {locale: 'en', name: 'Web'}
        ]
        var response = await request.get('/api/data/audit-types', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toEqual(expect.arrayContaining(expected))
        done()
      })

      it('Delete audit type', async done => {
        var response = await request.delete('/api/data/audit-types/Internal%20Test', options)
        expect(response.status).toBe(200)

        var response = await request.get('/api/data/audit-types', options)
        expect(response.data.datas).toHaveLength(1)
        done()
      })

      it('Should not delete audit type with nonexistent name', async done => {
        var response = await request.delete('/api/data/audit-types/nonexistent', options)
        expect(response.status).toBe(404)
        done()
      })
    })

    describe('Vulnerability types CRUD operations', () => {
      it('Get vulnerability types', async done => {
        var response = await request.get('/api/data/vulnerability-types', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toHaveLength(0)
        done()
      })

      it('Create vulnerability type Internal', async done => {
        var type = {
          locale: 'en',
          name: 'Internal'
        }
        var response = await request.post('/api/data/vulnerability-types', type, options)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Create vulnerability type Web', async done => {
        var type = {
          locale: 'en',
          name: 'Web'
        }
        var response = await request.post('/api/data/vulnerability-types', type, options)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Should not create with existing name', async done => {
        var type = {
          locale: 'en',
          name: 'Web'
        }
        var response = await request.post('/api/data/vulnerability-types', type, options)
      
        expect(response.status).toBe(422)
        done()
      })

      it('Get vulnerability types', async done => {
        const expected = [
          {locale: 'en', name: 'Internal'},
          {locale: 'en', name: 'Web'}
        ]
        var response = await request.get('/api/data/vulnerability-types', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toEqual(expect.arrayContaining(expected))
        done()
      })

      it('Delete vulnerability type', async done => {
        var response = await request.delete('/api/data/vulnerability-types/Web', options)
        expect(response.status).toBe(200)

        var response = await request.get('/api/data/vulnerability-types', options)
        expect(response.data.datas).toHaveLength(1)
        done()
      })

      it('Should not delete vulnerability type with nonexistent name', async done => {
        var response = await request.delete('/api/data/vulnerability-types/nonexistent', options)
        expect(response.status).toBe(404)
        done()
      })
    })

    describe('Sections CRUD operations', () => {
      it('Get sections', async done => {
        var response = await request.get('/api/data/sections', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toHaveLength(0)
        done()
      })

      it('Create section Attack Scenario locale en', async done => {
        var section = {
          locale: 'en',
          name: 'Attack Scenario',
          field: 'attack_scenario'
        }
        var response = await request.post('/api/data/sections', section, options)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Create section But locale fr', async done => {
        var section = {
          locale: 'fr',
          name: 'But',
          field: 'goal'
        }
        var response = await request.post('/api/data/sections', section, options)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Should not create section with existing (name,locale)', async done => {
        var section = {
          locale: 'en',
          name: 'Attack Scenario',
          field: 'goal'
        }
        var response = await request.post('/api/data/sections', section, options)
      
        expect(response.status).toBe(422)
        done()
      })

      it('Should not create section with existing (field,locale)', async done => {
        var section = {
          locale: 'fr',
          name: 'But2',
          field: 'goal'
        }
        var response = await request.post('/api/data/sections', section, options)
      
        expect(response.status).toBe(422)
        done()
      })

      it('Create section with existing name from a different locale', async done => {
        var section = {
          locale: 'fr',
          name: 'Attack Scenario',
          field: 'attack_scenario'
        }
        var response = await request.post('/api/data/sections', section, options)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Create section with nonexistent name', async done => {
        var section = {
          locale: 'en',
          name: 'Goal',
          field: 'goal'
        }
        var response = await request.post('/api/data/sections', section, options)
      
        expect(response.status).toBe(201)
        done()
      })

      it('Get sections', async done => {
        const expected = [
          {locale: 'en', name: 'Attack Scenario', field: 'attack_scenario'},
          {locale: 'en', name: 'Goal', field: 'goal'},
          {locale: 'fr', name: 'But', field: 'goal'},
          {locale: 'fr', name: 'Attack Scenario', field: 'attack_scenario'},
        ]
        var response = await request.get('/api/data/sections', options)
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toEqual(expect.arrayContaining(expected))
        done()
      })

      it('Should not delete nonexistent section', async done => {
        var response = await request.delete('/api/data/sections/attack_scenario/us', options)
        expect(response.status).toBe(404)
        done()
      })

      it('Delete section', async done => {
        const expected = [
          {locale: 'en', name: 'Attack Scenario', field: 'attack_scenario'},
          {locale: 'en', name: 'Goal', field: 'goal'},
          {locale: 'fr', name: 'But', field: 'goal'}
        ]

        var response = await request.delete('/api/data/sections/attack_scenario/fr', options)
        expect(response.status).toBe(200)

        var response = await request.get('/api/data/sections', options)
        expect(response.data.datas).toHaveLength(3)
        expect(response.data.datas).toEqual(expect.arrayContaining(expected))
        done()
      })
    })
  })
}