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
    var templates = []
    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token

      response = await request(app).get('/api/templates')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
      templates = response.body.datas
    })

    describe('Roles operations', () => {
      it('Get roles', async () => {
        var response = await request(app).get('/api/data/roles')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(200)
        expect(response.body.datas).toContain('admin')
        expect(response.body.datas).toContain('user')
      })
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

      it('Should not create language with missing parameters', async () => {
        var response = await request(app).post('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ locale: 'de' })

        expect(response.status).toBe(422)
      })

      it('Should not create language with invalid format', async () => {
        var response = await request(app).post('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ locale: 'de/de', language: 'Deutsch' })

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

      it('Should not update languages with missing parameters', async () => {
        var response = await request(app).put('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ locale: 'fr' }])

        expect(response.status).toBe(422)
      })

      it('Should not update languages with invalid format', async () => {
        var response = await request(app).put('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ locale: 'fr/fr', language: 'French' }])

        expect(response.status).toBe(422)
      })

      it('Update languages', async () => {
        var response = await request(app).put('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([
            { locale: 'en', language: 'English' },
            { locale: 'fr', language: 'Francais' }
          ])

        expect(response.status).toBe(201)

        response = await request(app).get('/api/data/languages')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toEqual(expect.arrayContaining([
          { locale: 'en', language: 'English' },
          { locale: 'fr', language: 'Francais' }
        ]))
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

      it('Create audit type Retest', async () => {
        var auditType = {
          name: 'Retest',
          templates: templates,
          stage: "retest"
        }

        var response = await request(app).post('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(auditType)
      
        expect(response.status).toBe(201)
      })

      it('Create audit type Multi', async () => {
        var auditType = {
          name: 'Multi',
          templates: templates,
          stage: 'multi'
        }

        var response = await request(app).post('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(auditType)
      
        expect(response.status).toBe(201)
      })

      it('Create audit type with wrong stage', async () => {
        var auditType = {
          name: 'Wifi',
          templates: templates,
          stage: 'itdoesnotexist'
        }

        var response = await request(app).post('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(auditType)
      
        expect(response.status).toBe(201)
      })

      it('Create audit type Web', async () => {
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

      it('Should not create audit type with missing parameters', async () => {
        var response = await request(app).post('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ name: 'MissingTemplates' })

        expect(response.status).toBe(422)
      })

      it('Should not create audit type with invalid format', async () => {
        var response = await request(app).post('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ name: 'Bad/Type', templates: templates })

        expect(response.status).toBe(422)
      })

      it('Get audit types', async () => {
        const expected = [
          {_id: expect.anything(), "hidden": ["network"], "name": "Retest", "sections": [], "templates": [{}], "stage": "retest"},
          {_id: expect.anything(), "hidden": ["network"], "name": "Multi", "sections": [], "templates": [{}], "stage": "multi"},
          {_id: expect.anything(), "hidden": [], "name": "Wifi", "sections": [], "templates": [{}], "stage": "default"},
          {_id: expect.anything(), "hidden": [], "name": "Web", "sections": [], "templates": [{}], "stage": "default"}
        ]
        var response = await request(app).get('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expected)
      })

      it('Delete audit type', async () => {
        var response = await request(app).delete('/api/data/audit-types/Wifi')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)

        var response = await request(app).get('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toHaveLength(3)
      })

      it('Should not delete audit type with nonexistent name', async () => {
        var response = await request(app).delete('/api/data/audit-types/nonexistent')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
      })

      it('Should not update audit types with missing parameters', async () => {
        var response = await request(app).put('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ name: 'Web' }])

        expect(response.status).toBe(422)
      })

      it('Should not update audit types with invalid format', async () => {
        var response = await request(app).put('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ name: 'Bad/Type', templates: templates }])

        expect(response.status).toBe(422)
      })

      it('Update audit types', async () => {
        var response = await request(app).put('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([
            { name: 'Retest', templates: templates, stage: 'retest' },
            { name: 'Multi', templates: templates, stage: 'multi' },
            { name: 'Web', templates: templates, hidden: [] }
          ])

        expect(response.status).toBe(201)

        response = await request(app).get('/api/data/audit-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toEqual(expect.arrayContaining([
          expect.objectContaining({ name: 'Retest', hidden: ['network'], stage: 'retest' }),
          expect.objectContaining({ name: 'Multi', hidden: ['network'], stage: 'multi' }),
          expect.objectContaining({ name: 'Web', hidden: [], stage: 'default' })
        ]))
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

      it('Should not create type with missing parameters', async () => {
        var response = await request(app).post('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ locale: 'en' })

        expect(response.status).toBe(422)
      })

      it('Should not create type with invalid format', async () => {
        var response = await request(app).post('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ locale: 'en/en', name: 'Cloud' })

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

      it('Should not update vulnerability types with missing parameters', async () => {
        var response = await request(app).put('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ name: 'Internal' }])

        expect(response.status).toBe(422)
      })

      it('Should not update vulnerability types with invalid format', async () => {
        var response = await request(app).put('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ name: 'Internal', locale: 'en/en' }])

        expect(response.status).toBe(422)
      })

      it('Update vulnerability types', async () => {
        var response = await request(app).put('/api/data/vulnerability-types')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ name: 'Internal', locale: 'en' }])

        expect(response.status).toBe(201)
      })
    })

    describe('Vulnerability categories CRUD operations', () => {
      it('Get vulnerability categories', async () => {
        var response = await request(app).get('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create vulnerability categories', async () => {
        var response = await request(app).post('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ name: 'Authentication', sortValue: 'priority', sortOrder: 'asc', sortAuto: false })
        expect(response.status).toBe(201)

        response = await request(app).post('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ name: 'Transport' })
        expect(response.status).toBe(201)
      })

      it('Should not create vulnerability category with missing parameters', async () => {
        var response = await request(app).post('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({})
        expect(response.status).toBe(422)
      })

      it('Should not create vulnerability category with invalid format', async () => {
        var response = await request(app).post('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ name: 'Invalid/Name' })
        expect(response.status).toBe(422)
      })

      it('Should not create vulnerability category with duplicate name', async () => {
        var response = await request(app).post('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ name: 'Authentication' })
        expect(response.status).toBe(422)
      })

      it('Should not update vulnerability categories with missing parameters', async () => {
        var response = await request(app).put('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ sortValue: 'cvssScore' }])
        expect(response.status).toBe(422)
      })

      it('Should not update vulnerability categories with invalid format', async () => {
        var response = await request(app).put('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ name: 'Authentication/Invalid' }])
        expect(response.status).toBe(422)
      })

      it('Update vulnerability categories', async () => {
        var response = await request(app).put('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([
            { name: 'Transport', sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true },
            { name: 'Authentication', sortValue: 'priority', sortOrder: 'asc', sortAuto: false }
          ])
        expect(response.status).toBe(201)

        response = await request(app).get('/api/data/vulnerability-categories')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas[0]).toEqual(expect.objectContaining({ name: 'Transport' }))
        expect(response.body.datas[1]).toEqual(expect.objectContaining({ name: 'Authentication', sortAuto: false }))
      })

      it('Delete vulnerability category', async () => {
        var response = await request(app).delete('/api/data/vulnerability-categories/Transport')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)
      })

      it('Should not delete vulnerability category with nonexistent name', async () => {
        var response = await request(app).delete('/api/data/vulnerability-categories/nonexistent')
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

      it('Should not create section with missing parameters', async () => {
        var response = await request(app).post('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ name: 'Missing Field' })

        expect(response.status).toBe(422)
      })

      it('Should not create section with invalid format', async () => {
        var response = await request(app).post('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ name: 'Invalid/Section', field: 'invalid_section' })

        expect(response.status).toBe(422)
      })

      it('Get sections', async () => {
        const expected = [
          {_id: expect.anything(), name: 'Attack Scenario', field: 'attack_scenario'},
          {_id: expect.anything(), name: 'But', field: 'goal'},
        ]
        var response = await request(app).get('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expected)
      })

      it('Should not update sections with missing parameters', async () => {
        var response = await request(app).put('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ name: 'Attack Scenario' }])

        expect(response.status).toBe(422)
      })

      it('Should not update sections with invalid format', async () => {
        var response = await request(app).put('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ name: 'Invalid/Name', field: 'attack_scenario' }])

        expect(response.status).toBe(422)
      })

      it('Update sections', async () => {
        var response = await request(app).put('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([
            { name: 'Attack Scenario', field: 'attack_scenario', icon: 'mdi-bug' },
            { name: 'But', field: 'goal', icon: 'mdi-target' }
          ])

        expect(response.status).toBe(201)

        response = await request(app).get('/api/data/sections')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toEqual(expect.arrayContaining([
          expect.objectContaining({ name: 'Attack Scenario', icon: 'mdi-bug' }),
          expect.objectContaining({ name: 'But', icon: 'mdi-target' })
        ]))
      })

      it('Should not delete section with nonexistent locale', async () => {
        var response = await request(app).delete('/api/data/sections/attack_scenario/ru')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
      })
    })

    describe('Custom fields CRUD operations', () => {
      var richFieldId = ''
      var spaceFieldId = ''

      it('Get custom fields', async () => {
        var response = await request(app).get('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Should not create custom field with missing parameters', async () => {
        var response = await request(app).post('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ fieldType: 'input' })

        expect(response.status).toBe(422)
      })

      it('Should not create custom field with invalid format', async () => {
        var response = await request(app).post('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ fieldType: 'input', label: 'bad/label', display: 'vuln' })

        expect(response.status).toBe(422)
      })

      it('Create custom fields', async () => {
        var response = await request(app).post('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({ fieldType: 'space', position: 1 })
        expect(response.status).toBe(201)
        spaceFieldId = response.body.datas._id

        response = await request(app).post('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            fieldType: 'text',
            label: 'Business Impact',
            display: 'general',
            displaySub: 'summary',
            size: 12,
            offset: 0,
            required: true,
            inline: true,
            description: 'Business impact description',
            text: [{ locale: 'en', value: '<p>Initial value</p>' }],
            options: [{ locale: 'en', value: 'A' }],
            position: 2
          })
        expect(response.status).toBe(201)
        richFieldId = response.body.datas._id
      })

      it('Should not create custom field with duplicate key', async () => {
        var response = await request(app).post('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send({
            fieldType: 'text',
            label: 'Business Impact',
            display: 'general',
            displaySub: 'summary'
          })

        expect(response.status).toBe(422)
      })

      it('Get custom fields with created values', async () => {
        var response = await request(app).get('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])

        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expect.arrayContaining([
          expect.objectContaining({ _id: richFieldId, label: 'Business Impact', display: 'general', displaySub: 'summary' }),
          expect.objectContaining({ _id: spaceFieldId, fieldType: 'space' })
        ]))
      })

      it('Should not update custom fields with missing parameters', async () => {
        var response = await request(app).put('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ _id: richFieldId, label: 'Business Impact' }])

        expect(response.status).toBe(422)
      })

      it('Should not update custom fields with invalid format', async () => {
        var response = await request(app).put('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([{ _id: richFieldId, label: 'Bad/Label', fieldType: 'text', display: 'general' }])

        expect(response.status).toBe(422)
      })

      it('Update custom fields', async () => {
        var response = await request(app).put('/api/data/custom-fields')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send([
            {
              _id: richFieldId,
              label: 'Business Impact',
              display: 'general',
              required: false,
              inline: false,
              text: [{ locale: 'en', value: '<p>Updated value</p>' }],
              options: [{ locale: 'en', value: 'B' }],
              position: 3
            }
          ])

        expect(response.status).toBe(201)
      })

      it('Delete custom fields', async () => {
        var response = await request(app).delete(`/api/data/custom-fields/${richFieldId}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)
        expect(response.body.datas.msg).toBe('Custom Field deleted successfully')

        response = await request(app).delete(`/api/data/custom-fields/${spaceFieldId}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)
      })

      it('Should not delete custom field with nonexistent id', async () => {
        var response = await request(app).delete('/api/data/custom-fields/66f7a6b8e2fa4b49cfe9d123')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
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
