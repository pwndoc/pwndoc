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

module.exports = function(request, app) {
  describe('Data Suite Tests', () => {
    var userToken = '';
    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token
    })

    describe('Language CRUD operations', () => {
      it('Get languages', async () => {
        var response = await request(app).get('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create 3 languages', async () => {
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
        var response = await request(app).post('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(english)
        expect(response.status).toBe(201)

        var response = await request(app).post('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(french)
        expect(response.status).toBe(201)

        var response = await request(app).post('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(espagnol)
        expect(response.status).toBe(201)
      })

      it('Should not create with existing locale', async () => {
        var language = {
          locale: 'fr',
          language: 'French2'
        }
        var response = await request(app).post('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(language)
      
        expect(response.status).toBe(422)
      })

      it('Should not create with existing name', async () => {
        var language = {
          locale: 'us',
          language: 'English'
        }
        var response = await request(app).post('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(language)
      
        expect(response.status).toBe(422)
      })

      it('Get languages', async () => {
        const expected = [
          {locale: 'en', language: 'English'},
          {locale: 'fr', language: 'French'},
          {locale: 'es', language: 'Espagnol'}
        ]

        var response = await request(app).get('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.arrayContaining(expected))
      })

      it('Delete language', async () => {
        var response = await request(app).delete('/api/data/languages/es')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)

        var response = await request(app).get('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toHaveLength(2)
      })

      it('Should not delete language with nonexistent locale', async () => {
        var response = await request(app).delete('/api/data/languages/us')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
      })
    })

    describe('Audit types CRUD operations', () => {
      it('Get audit types', async () => {
        var response = await request(app).get('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create audit type Internal', async () => {
        // Get the template ID first
        response = await request(app).get('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        
        var templates = response.body.datas

        var auditType = {
          name: 'Internal Test',
          templates: templates
        }

        var response = await request(app).post('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(auditType)
      
        expect(response.status).toBe(201)
      })

      it('Create audit type Web', async () => {
        // Get the template ID first
        response = await request(app).get('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        
        var templates = response.body.datas

        var auditType = {
          name: 'Web',
          templates: templates
        }
        var response = await request(app).post('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(auditType)
      
        expect(response.status).toBe(201)
      })

      it('Should not create with existing name', async () => {
        // Get the template ID first
        response = await request(app).get('/api/templates')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        
        var templates = response.body.datas

        var auditType = {
          name: 'Web',
          templates: templates
        }
        var response = await request(app).post('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(auditType)
      
        expect(response.status).toBe(422)
      })

      it('Get audit types', async () => {
        const expected = [
          {"hidden": [], "name": "Internal Test", "sections": [], "templates": [{}]},
          {"hidden": [], "name": "Web", "sections": [], "templates": [{}]}
        ]
        var response = await request(app).get('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.arrayContaining(expected))
      })

      it('Delete audit type', async () => {
        var response = await request(app).delete('/api/data/audit-types/Internal%20Test')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)

        var response = await request(app).get('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toHaveLength(1)
      })

      it('Should not delete audit type with nonexistent name', async () => {
        var response = await request(app).delete('/api/data/audit-types/nonexistent')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
      })
    })

    describe('Vulnerability types CRUD operations', () => {
      it('Get vulnerability types', async () => {
        var response = await request(app).get('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create vulnerability type Internal', async () => {
        var type = {
          locale: 'en',
          name: 'Internal'
        }
        var response = await request(app).post('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(type)
      
        expect(response.status).toBe(201)
      })

      it('Create vulnerability type Web', async () => {
        var type = {
          locale: 'en',
          name: 'Web'
        }
        var response = await request(app).post('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(type)
      
        expect(response.status).toBe(201)
      })

      it('Should not create with existing name', async () => {
        var type = {
          locale: 'en',
          name: 'Web'
        }
        var response = await request(app).post('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(type)
      
        expect(response.status).toBe(422)
      })

      it('Get vulnerability types', async () => {
        const expected = [
          {"locale": "en", "name": "Internal"},
          {"locale": "en", "name": "Web"}
        ]
        var response = await request(app).get('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.arrayContaining(expected))
      })

      it('Delete vulnerability type', async () => {
        var response = await request(app).delete('/api/data/vulnerability-types/Web')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)

        var response = await request(app).get('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toHaveLength(1)
      })

      it('Should not delete vulnerability type with nonexistent name', async () => {
        var response = await request(app).delete('/api/data/vulnerability-types/nonexistent')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
      })
    })

    describe('Sections CRUD operations', () => {
      it('Get sections', async () => {
        var response = await request(app).get('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create section Attack Scenario locale en', async () => {
        var section = {
          name: 'Attack Scenario',
          field: 'attack_scenario'
        }
        var response = await request(app).post('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(section)
      
        expect(response.status).toBe(201)
      })

      it('Create section But locale fr', async () => {
        var section = {
          name: 'But',
          field: 'goal'
        }
        var response = await request(app).post('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(section)
      
        expect(response.status).toBe(201)
      })

      it('Should not create section with existing name', async () => {
        var section = {
          name: 'Attack Scenario',
          field: 'goal'
        }
        var response = await request(app).post('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(section)
      
        expect(response.status).toBe(422)
      })

      it('Should not create section with existing field', async () => {
        var section = {
          name: 'But2',
          field: 'goal'
        }
        var response = await request(app).post('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(section)
      
        expect(response.status).toBe(422)
      })

      it('Get sections', async () => {
        const expected = [
          {name: 'Attack Scenario', field: 'attack_scenario'},
          {name: 'But', field: 'goal'},
        ]
        var response = await request(app).get('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.arrayContaining(expected))
      })

      //it('Should not delete nonexistent section', async () => {
      //  var response = await request(app).delete('/api/data/sections/attack_scenario/ru')
      //    .set('Cookie', [
      //      `token=JWT ${userToken}`
      //    ])
      //  expect(response.status).toBe(404)
      //})

      //it('Delete section', async () => {
      //  const expected = [
      //    {locale: "en", name: 'Attack Scenario', field: 'attack_scenario'},
      //    {locale: "fr", name: 'Scenario', field: 'attack_scenario'},
      //    {locale: "en", name: 'Goal', field: 'goal'},
      //  ]

      //  var response = await request(app).delete('/api/data/sections/but/fr')
      //    .set('Cookie', [
      //      `token=JWT ${userToken}`
      //    ])
      //  expect(response.status).toBe(200)

      //  var response = await request(app).get('/api/data/sections')
      //    .set('Cookie', [
      //      `token=JWT ${userToken}`
      //    ])
      //  expect(response.body.datas).toHaveLength(3)
      //  expect(response.body.datas).toEqual(expect.arrayContaining(expected))
      //})
    })
  })
}