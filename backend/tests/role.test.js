module.exports = function(request, app) {
  describe('Roles Suite Tests', () => {

    describe('User Roles', () => {
      it('Get the users init state', async () => {
        var response = await request(app).get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toBe(false)
      })
    })

    describe('Report Roles', () => {
      it('Get the users init state', async () => {
        var response = await request(app).get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toBe(false)
      })
    })

    describe('Admin Roles', () => {
      it('Get the users init state', async () => {
        var response = await request(app).get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toBe(false)
      })
    })
  })
}