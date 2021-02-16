module.exports = function(request) {
  describe('Unhauthenticated Suite Tests', () => {
    
    describe('Testing Unauthenticated User routes', () => {
      it('should return 401 Unauthorized', async done => {
        var response = await request.get('/api/users/checktoken')
        expect(response.status).toBe(401)

        response = await request.get('/api/users')
        expect(response.status).toBe(401)

        response = await request.get('/api/users/me')
        expect(response.status).toBe(401)

        response = await request.get('/api/users/admin')
        expect(response.status).toBe(401)

        response = await request.post('/api/users')
        expect(response.status).toBe(401)

        response = await request.put('/api/users/me')
        expect(response.status).toBe(401)

        response = await request.put('/api/users/admin')
        expect(response.status).toBe(401)

        response = await request.delete('/api/users/test')
        expect(response.status).toBe(401)

        done()
      })

      it('should return 200 Ok', async done => {
        var response = await request.get('/api/users/init')
        expect(response.status).toBe(200)

        done()
      })
    })

    describe('Testing Unauthenticated Data routes', () => {
      it('should return 401 Unauthorized', async done => {
        var response = await request.get('/api/data/languages')
        expect(response.status).toBe(401)

        response = await request.post('/api/data/languages')
        expect(response.status).toBe(401)

        response = await request.delete('/api/data/languages/en')
        expect(response.status).toBe(401)

        response = await request.get('/api/data/audit-types')
        expect(response.status).toBe(401)

        response = await request.post('/api/data/audit-types')
        expect(response.status).toBe(401)

        response = await request.delete('/api/data/audit-types/Internal')
        expect(response.status).toBe(401)

        response = await request.get('/api/data/vulnerability-types')
        expect(response.status).toBe(401)

        response = await request.post('/api/data/vulnerability-types')
        expect(response.status).toBe(401)

        response = await request.delete('/api/data/vulnerability-types/Web')
        expect(response.status).toBe(401)

        response = await request.get('/api/data/sections')
        expect(response.status).toBe(401)

        response = await request.get('/api/data/sections/en')
        expect(response.status).toBe(401)

        response = await request.post('/api/data/sections')
        expect(response.status).toBe(401)

        response = await request.delete('/api/data/sections/attack_scenario/en')
        expect(response.status).toBe(401)

        done()
      })
    })

    describe('Testing Unauthenticated Company routes', () => {
      it('should return 401 Unauthorized', async done => {
        var response = await request.get('/api/companies')
        expect(response.status).toBe(401)

        response = await request.post('/api/companies')
        expect(response.status).toBe(401)

        response = await request.put('/api/companies/FSociety')
        expect(response.status).toBe(401)

        response = await request.delete('/api/companies/FSociety')
        expect(response.status).toBe(401)

        done()
      })
    })

    describe('Testing Unauthenticated Client routes', () => {
      it('should return 401 Unauthorized', async done => {
        var response = await request.get('/api/clients')
        expect(response.status).toBe(401)

        response = await request.post('/api/clients')
        expect(response.status).toBe(401)

        response = await request.put('/api/clients/test@example.com')
        expect(response.status).toBe(401)

        response = await request.delete('/api/clients/test@example.com')
        expect(response.status).toBe(401)

        done()
      })
    })

    describe('Testing Unauthenticated Template routes', () => {
      it('should return 401 Unauthorized', async done => {
        var response = await request.get('/api/templates')
        expect(response.status).toBe(401)

        response = await request.post('/api/templates')
        expect(response.status).toBe(401)

        response = await request.put('/api/templates/1234')
        expect(response.status).toBe(401)

        response = await request.delete('/api/templates/1234')
        expect(response.status).toBe(401)

        done()
      })
    })

    describe('Testing Unauthenticated Vulnerability routes', () => {
      it('should return 401 Unauthorized', async done => {
        var response = await request.get('/api/vulnerabilities')
        expect(response.status).toBe(401)

        response = await request.get('/api/vulnerabilities/export')
        expect(response.status).toBe(401)

        response = await request.post('/api/vulnerabilities')
        expect(response.status).toBe(401)

        response = await request.put('/api/vulnerabilities/1234')
        expect(response.status).toBe(401)

        response = await request.delete('/api/vulnerabilities/1234')
        expect(response.status).toBe(401)

        response = await request.delete('/api/vulnerabilities')
        expect(response.status).toBe(401)

        response = await request.get('/api/vulnerabilities/en')
        expect(response.status).toBe(401)

        response = await request.post('/api/vulnerabilities/finding/en')
        expect(response.status).toBe(401)

        response = await request.get('/api/vulnerabilities/updates/1234')
        expect(response.status).toBe(401)

        response = await request.put('/api/vulnerabilities/merge/1234')
        expect(response.status).toBe(401)

        done()
      })
    })

    describe('Testing Unauthenticated Audit routes', () => {
      it('should return 401 Unauthorized', async done => {
        var response = await request.get('/api/audits')
        expect(response.status).toBe(401)

        response = await request.post('/api/audits')
        expect(response.status).toBe(401)

        response = await request.delete('/api/audits/1234')
        expect(response.status).toBe(401)

        response = await request.get('/api/audits/1234')
        expect(response.status).toBe(401)

        response = await request.get('/api/audits/1234/general')
        expect(response.status).toBe(401)

        response = await request.put('/api/audits/1234/general')
        expect(response.status).toBe(401)

        response = await request.get('/api/audits/1234/network')
        expect(response.status).toBe(401)

        response = await request.put('/api/audits/1234/network')
        expect(response.status).toBe(401)

        response = await request.post('/api/audits/1234/findings')
        expect(response.status).toBe(401)

        response = await request.get('/api/audits/1234/findings')
        expect(response.status).toBe(401)

        response = await request.get('/api/audits/1234/findings/1234')
        expect(response.status).toBe(401)

        response = await request.put('/api/audits/1234/findings/1234')
        expect(response.status).toBe(401)

        response = await request.delete('/api/audits/1234/findings/1234')
        expect(response.status).toBe(401)

        response = await request.post('/api/audits/1234/sections')
        expect(response.status).toBe(401)

        response = await request.get('/api/audits/1234/sections/1234')
        expect(response.status).toBe(401)

        response = await request.put('/api/audits/1234/sections/1234')
        expect(response.status).toBe(401)

        response = await request.delete('/api/audits/1234/sections/1234')
        expect(response.status).toBe(401)

        response = await request.get('/api/audits/1234/generate')
        expect(response.status).toBe(401)

        done()
      })
    })
  })
}
