# Backend Route Test Template

```javascript
/*
  State after tests:
  {describe expected data state}
*/

module.exports = function(request, app) {
  describe('{Resource} Suite Tests', () => {
    var userToken = '';
    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token
    })

    describe('{Resource} CRUD operations', () => {
      var item1Id = ""

      it('Get {resources} (no existing {resources} in db)', async () => {
        var response = await request(app).get('/api/{resources}')
          .set('Cookie', [`token=JWT ${userToken}`])
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Create {resource} with required fields only', async () => {
        var item = {/* required fields from model */}
        var response = await request(app).post('/api/{resources}')
          .set('Cookie', [`token=JWT ${userToken}`])
          .send(item)
        expect(response.status).toBe(201)
        item1Id = response.body.datas._id
      })

      it('Should not create {resource} without required fields', async () => {
        var response = await request(app).post('/api/{resources}')
          .set('Cookie', [`token=JWT ${userToken}`])
          .send({})
        expect(response.status).toBe(422)
      })

      it('Get {resources} (existing {resources} in db)', async () => {
        var response = await request(app).get('/api/{resources}')
          .set('Cookie', [`token=JWT ${userToken}`])
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(1)
      })

      it('Update {resource}', async () => {
        var update = {/* updated fields */}
        var response = await request(app).put(`/api/{resources}/${item1Id}`)
          .set('Cookie', [`token=JWT ${userToken}`])
          .send(update)
        expect(response.status).toBe(200)
      })

      it('Update {resource} with nonexistent id', async () => {
        var response = await request(app).put(`/api/{resources}/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [`token=JWT ${userToken}`])
          .send({/* some fields */})
        expect(response.status).toBe(404)
      })

      it('Delete {resource}', async () => {
        var response = await request(app).delete(`/api/{resources}/${item1Id}`)
          .set('Cookie', [`token=JWT ${userToken}`])
        expect(response.status).toBe(200)
      })

      it('Delete {resource} with nonexistent id', async () => {
        var response = await request(app).delete(`/api/{resources}/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [`token=JWT ${userToken}`])
        expect(response.status).toBe(404)
      })
    })
  })
}
```
