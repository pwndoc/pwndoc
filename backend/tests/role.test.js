module.exports = function(request, app) {
  describe('Roles Suite Tests', () => {

    describe('User Roles', () => {
      it('Get the users init state', async done => {
        var response = await request(app).get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toBe(false)
        done()
      })
    })

    describe('Report Roles', () => {
      it('Get the users init state', async done => {
        var response = await request(app).get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toBe(false)
        done()
      })
    })

    describe('Admin Roles', () => {
      it('Get the users init state', async done => {
        var response = await request(app).get('/api/users/init')
      
        expect(response.status).toBe(200)
        expect(response.data.datas).toBe(false)
        done()
      })
    })
  })
}