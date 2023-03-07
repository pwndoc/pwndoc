module.exports = function(request, app) {
  describe('Unhauthenticated Suite Tests', () => {

    describe('Testing Unauthenticated User routes', () => {
      it('should return 401 Unauthorized', async () => {
        var response = await request(app).get('/api/users')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/users')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/users/checktoken')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/users/me')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/users/me')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/users/refreshtoken')
        expect(response.status).toBe(401)

        response = await request(app).delete('/api/users/refreshtoken')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/users/reviewers')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/users/token')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/users/totp')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/users/totp')
        expect(response.status).toBe(401)

        response = await request(app).delete('/api/users/totp')
        expect(response.status).toBe(401)

        // put /api/users/{id}
        response = await request(app).put('/api/users/1')
        expect(response.status).toBe(401)

        // get /api/users/{username}
        response = await request(app).get('/api/users/test')
        expect(response.status).toBe(401)
      })

      it('should return 200 Ok', async () => {
        // First use
        var response = await request(app).get('/api/users/init')
        expect(response.status).toBe(200)

        var response = await request(app).post('/api/users/init')
        expect(response.status).toBe(422)

        // Login
        response = await request(app).post('/api/users/token')
        expect(response.status).toBe(422)
      })
    })

    describe('Testing Unauthenticated Data routes', () => {
      it('should return 401 Unauthorized', async () => {
        var response = await request(app).get('/api/data/roles')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/data/languages')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/data/languages')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/data/languages')
        expect(response.status).toBe(401)

        // delete /api/data/languages/{locale(*)}
        response = await request(app).delete('/api/data/languages/en')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/data/audit-types')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/data/audit-types')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/data/audit-types')
        expect(response.status).toBe(401)

        // delete /api/data/audit-types/{name(*)}
        response = await request(app).delete('/api/data/audit-types/Internal')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/data/vulnerability-categories')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/data/vulnerability-categories')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/data/vulnerability-categories')
        expect(response.status).toBe(401)

        // delete /api/data/vulnerability-categories/{name(*)}
        response = await request(app).delete('/api/data/vulnerability-categories/Web')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/data/sections')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/data/sections')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/data/sections')
        expect(response.status).toBe(401)

        // delete /api/data/sections/{field}/{locale(*)}
        response = await request(app).delete('/api/data/sections/attack_scenario/en')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/data/custom-fields')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/data/custom-fields')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/data/custom-fields')
        expect(response.status).toBe(401)

        // delete /api/data/custom-fields/{fieldId}
        response = await request(app).delete('/api/data/custom-fields/attack_scenario')
        expect(response.status).toBe(401)
      })
    })

    describe('Testing Unauthenticated Company routes', () => {
      it('should return 401 Unauthorized', async () => {
        var response = await request(app).get('/api/companies')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/companies')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/companies/FSociety')
        expect(response.status).toBe(401)

        response = await request(app).delete('/api/companies/FSociety')
        expect(response.status).toBe(401)
      })
    })

    describe('Testing Unauthenticated Client routes', () => {
      it('should return 401 Unauthorized', async () => {
        var response = await request(app).get('/api/clients')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/clients')
        expect(response.status).toBe(401)

        // put /api/clients/{id}
        response = await request(app).put('/api/clients/test@example.com')
        expect(response.status).toBe(401)

        response = await request(app).delete('/api/clients/test@example.com')
        expect(response.status).toBe(401)
      })
    })

    describe('Testing Unauthenticated Template routes', () => {
      it('should return 401 Unauthorized', async () => {
        var response = await request(app).get('/api/templates')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/templates')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/templates/1234')
        expect(response.status).toBe(401)

        response = await request(app).delete('/api/templates/1234')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/templates/download/1234')
        expect(response.status).toBe(401)
      })
    })

    describe('Testing Unauthenticated Images routes', () => {
      it('should return 401 Unauthorized', async () => {
        // get /api/images/{imageId}
        var response = await request(app).get('/api/images/1')
        expect(response.status).toBe(401)

        // delete /api/images/{imageId}
        response = await request(app).delete('/api/images/1')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/images')
        expect(response.status).toBe(401)

        // get /api/images/download/{imageId}
        response = await request(app).get('/api/images/download/1')
        expect(response.status).toBe(401)
      })
    })

    describe('Testing Unauthenticated Settings routes', () => {
      it('should return 401 Unauthorized', async () => {
        var response = await request(app).get('/api/settings')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/settings')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/settings/public')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/settings/revert')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/settings/export')
        expect(response.status).toBe(401)
      })
    })

    describe('Testing Unauthenticated Vulnerability routes', () => {
      it('should return 401 Unauthorized', async () => {
        var response = await request(app).get('/api/vulnerabilities')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/vulnerabilities')
        expect(response.status).toBe(401)

        response = await request(app).delete('/api/vulnerabilities')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/vulnerabilities/export')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/vulnerabilities/1234')
        expect(response.status).toBe(401)

        response = await request(app).delete('/api/vulnerabilities/1234')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/vulnerabilities/en')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/vulnerabilities/finding/en')
        expect(response.status).toBe(401)

        response = await request(app).get('/api/vulnerabilities/updates/1234')
        expect(response.status).toBe(401)

        response = await request(app).put('/api/vulnerabilities/merge/1234')
        expect(response.status).toBe(401)
      })
    })

    describe('Testing Unauthenticated Audit routes', () => {
      it('should return 401 Unauthorized', async () => {
        var response = await request(app).get('/api/audits')
        expect(response.status).toBe(401)

        response = await request(app).post('/api/audits')
        expect(response.status).toBe(401)

        // delete /api/audits/{auditId}
        response = await request(app).delete('/api/audits/1234')
        expect(response.status).toBe(401)

        // get /api/audits/{auditId}
        response = await request(app).get('/api/audits/1234')
        expect(response.status).toBe(401)

        // get /api/audits/{auditId}/general
        response = await request(app).get('/api/audits/1234/general')
        expect(response.status).toBe(401)

        // put /api/audits/{auditId}/general
        response = await request(app).put('/api/audits/1234/general')
        expect(response.status).toBe(401)

        // get /api/audits/{auditId}/network
        response = await request(app).get('/api/audits/1234/network')
        expect(response.status).toBe(401)

        // put /api/audits/{auditId}/network
        response = await request(app).put('/api/audits/1234/network')
        expect(response.status).toBe(401)

        // post /api/audits/{auditId}/findings
        response = await request(app).post('/api/audits/1234/findings')
        expect(response.status).toBe(401)

        // get /api/audits/{auditId}/findings/{findingId}
        response = await request(app).get('/api/audits/1234/findings/1234')
        expect(response.status).toBe(401)

        // put /api/audits/{auditId}/findings/{findingId}
        response = await request(app).put('/api/audits/1234/findings/1234')
        expect(response.status).toBe(401)

        // delete /api/audits/{auditId}/findings/{findingId}
        response = await request(app).delete('/api/audits/1234/findings/1234')
        expect(response.status).toBe(401)

        // get /api/audits/{auditId}/sections/{sectionId}
        response = await request(app).get('/api/audits/1234/sections/1234')
        expect(response.status).toBe(401)

        // put /api/audits/{auditId}/sections/{sectionId}
        response = await request(app).put('/api/audits/1234/sections/1234')
        expect(response.status).toBe(401)

        // get /api/audits/{auditId}/generate
        response = await request(app).get('/api/audits/1234/generate')
        expect(response.status).toBe(401)

        // put /api/audits/{auditId}/sortfindings
        response = await request(app).put('/api/audits/1234/sortfindings')
        expect(response.status).toBe(401)

        // put /api/audits/{auditId}/movefinding
        response = await request(app).put('/api/audits/1234/movefinding')
        expect(response.status).toBe(401)

        // put /api/audits/{auditId}/toggleApproval
        response = await request(app).put('/api/audits/1234/toggleApproval')
        expect(response.status).toBe(401)

        // put /api/audits/{auditId}/updateReadyForReview
        response = await request(app).put('/api/audits/1234/updateReadyForReview')
        expect(response.status).toBe(401)
      })
    })
  })
}
