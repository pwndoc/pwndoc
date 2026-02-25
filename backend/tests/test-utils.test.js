module.exports = function(request, app) {
  describe('Test Utilities API', () => {
    describe('POST /api/__test__/reset-db', () => {
      it('Resets the test database and recreates default settings', async () => {
        var response = await request(app)
          .post('/api/__test__/reset-db')

        expect(response.status).toBe(204)
      })
    })
  })
}
