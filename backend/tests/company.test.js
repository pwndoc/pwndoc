/*
  At the end
  1 Company: {name: 'Company 1', logo: 'fsociety logo'}
*/

module.exports = function(request, app) {
  describe('Company Suite Tests', () => {
    var userToken = '';
    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token
    })

    describe('Company CRUD operations', () => {
      var logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAUp0lEQVR4nO2dBZAjtxKG+yCcC9MFKsx4YWZm5qTCzMy5MDMzMzNzLgwXZmZmplefyr2lnTc8tiR7/Fe5dtc7nhlLrVb33zB9Bg4c+J90UVv09X0DXfhFVwBqjq4A1BxdAag5ugJQc3QFoOboCkDN0RWAmqMrADVHVwBqjv6+b8A1+vTp0/MC//3Xmwnn7+h7nYyOFIC+ffvKJJNMItNMM41MOeWU5vcJJphAxhlnHBlttNFkpJFGkmGHHdYc++eff5qf//77r/z+++/y888/y7fffitffvmlfPLJJ/LBBx/I22+/LW+88YZ8/vnnnr9Z89GnE4JB/fv3l5lnnlnmn39+mWuuuWTQoEEyyiij9KzyZgCt8MUXX8jzzz8vTz31lAwZMkReffVVIzjtjLYVAFbwAgssIMsvv7wstthiMuaYY/b8r5kTHwfdIhCIe+65R2699VZ54okn5K+//mrpdVuBthOAqaaaStZZZx1ZZZVVZOyxxzbvtXrCs4BAfPrpp3LttdfKFVdcIR9++KHX+ymCthAA9vT55ptPttpqK7PqUfmhApvijjvukNNPP11eeukl37eTiaAFgJXNvr7bbrvJbLPN1st6DxW6Pfz9999GEI444ghjSIaKYAVg6qmnlv32208WWWQRowHaFXgVJ5xwgpxzzjlGKEJDcAIw3HDDyY477mjUPb9LAHt8FahGwGvge3322We+b6kXghKAiSee2Oyds8wyS1tPehwQBCZ/iy22kOeee8737fQgGN0655xzys0332x8+E6bfGlosfHHH1+uvPJK47aGgiAEYKGFFpJLL71UxhprLN+30nKMPPLIcvbZZ8uSSy7p+1YMvAsAzB0DwsB04sqPwwgjjGC2unnnndf3rfi1AeDoUft1WPlxIOaw8sorm1iDL3jTAMMPP7yceeaZvSjcumGMMcaQs846y2g/X/AmALvvvrvMNNNMtVH7SSBiecghh3gbBy8CwMRvuummPi4dJFZffXVZaqmlvFzbuQAg6TB8wwwzjOtLBwnGA6bzoIMO8rIVOBeAWWed1Vi/dVf9NhiLiSaayIS2XcO5AMw444xtze23EriHruFlC+giHHSXYs3RFYCAoAmqLtFvwIABg11e8JtvvpF7771XPv74Y8MEquVb163hn3/+MaHi0047Ta677jrnOQNeqeABAwbIwQcfLGuuuWYtBYDwMNlODzzwgLd78J4P0K9fPxMJJCKYBGLpv/76qzz22GPy9NNPy+uvvy5ff/21yQ2ETp100klNDgHpY/zdCmHSgpGffvpJHnzwQXnmmWfkzTfflB9//NFcjwTVySabzISzF1xwQRl11FHN55LuhZqD1VZbzXsCqffsSlTgiSee2EsA7Moc8umIGdx4441msNNAqjhh1h122EFmmGGGyvdm3wdZv0Twrr76avnll19SP4c7t+yyy8q2225rUtskRhCOPfZY75MvIWgAaUwcK8qOCn7//fdmkC655JLC+fZolU022UT23ntvE3QqCwQAASWf77jjjjNaqOh9rL322rLPPvvI6KOP3vM+xSQkwCBU0eO5nks4FwCyYlCjvGxcddVVJuWbwUHF7rrrrqbwwgZqdvHFFzeCcuedd8pbb72Vei1YR3INBg4cWHhbYPK/++47k8d33333pR473njjyXLLLSd//PGH3H///f83seOOO64cc8wxJhOI8yLQxEN0DNjKSH4dccQR5aabbip0n1Xh3A1ERbPasXrZKxUMGoODqt944417TT776hlnnCFPPvmk0Qp77bWX3H333bLTTjuZVZMEcu9WWGEFefzxxwsXfb744ovms1mTT5HKQw89ZIzZo48+2lzrwgsvNN9NhY7vstFGG5mtjPfQeNQngmmnnVauueYaOf/883tpCVdwrgGo4eOLvvPOO6YAk1UDGLQ55phD5p577p6VgbYYPHiwLL300rHFIEzoLbfcIjvvvLP89ttvidfks+uuu66xDdAGkmCccT6My4svvtgIKMWiaedkiyHJE2o7ej402SOPPGLU/3vvvWfeIwCGhsBoJR6iNgCfJxZAPaPrYpIgbABw8sknm1VBmJhVTYj0wAMPNNW8aWDShg4dKltuuaXhFtKAPYA2IRppZx5rxu6hhx4qd911V6owASz8k046SZZYYonErUW1DXUBaAaECtXPd0Kg0RAh1BIGIwDU+h1wwAFmC8Cdm2666XLv2ww22gQhoHI3C6xA1LZqFT6/xhprGDczC5BXqOsk6z7u3sC7775rti3sAFQ+GiYEOBcAij3U0kVNank1/juThyFUFqxcVC4GZRrQMPAJGG96H1NMMUWqygfzzDOP2ccxQqtwDQjB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"
      var company1Id = ""
      var company2Id = ""
      it('Get companies (no existing companies in db)', async () => {
        var response = await request(app).get('/api/companies')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create company with name only', async () => {
        var company = {name: "Company 1"}
        var response = await request(app).post('/api/companies')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(company)

        expect(response.status).toBe(201)
        company1Id = response.body.datas._id
      })

      it('Create company with name and logo', async () => {
        var company = {name: "Company 2", logo: "VGVzdCBpbWFnZQ=="}
        var response = await request(app).post('/api/companies')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(company)

        expect(response.status).toBe(201)
        company2Id = response.body.datas._id
      })

      it('Should not create company with existing name', async () => {
        var company = {name: "Company 1"}
        var response = await request(app).post('/api/companies')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(company)

        expect(response.status).toBe(422)
      })

      it('Get companies (existing companies in db)', async () => {
        const expected = [
          {name: "Company 1"},
          {name: "Company 2", logo: "VGVzdCBpbWFnZQ=="}
        ]
        var response = await request(app).get('/api/companies')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas.map(t => {return {name: t.name, logo: t.logo}})).toEqual(expect.arrayContaining(expected))
      })

      it('Update company with logo only', async () => {
        var company = {logo: logo}
        var response = await request(app).put(`/api/companies/${company1Id}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(company)
        expect(response.status).toBe(200)
      })

      it('Update company with nonexistent id', async () => {
        var company = {name: "company Updated"}

        var response = await request(app).put(`/api/companies/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(company)
        expect(response.status).toBe(404)
      })

      it('Delete company', async () => {
        var response = await request(app).delete(`/api/companies/${company2Id}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(200)

        response = await request(app).get('/api/companies')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.body.datas).toHaveLength(1)
      })

      it('Delete company with nonexistent id', async () => {
        var response = await request(app).delete(`/api/companies/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
        expect(response.status).toBe(404)
      })
    })
  })
}