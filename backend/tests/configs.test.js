/*

*/

module.exports = function(request) {
    describe('Application configs', () => {
      var options = {headers: {}}
      beforeAll(async done => {
        var response = await request.post('/api/users/token', {username: 'admin', password: 'admin2'})
        options.headers.Cookie = `token=${response.data.datas.token}` // Set header Cookie for next requests
        done()
      })

      it('Get configs', async done => {
          const expected = {
              mandatoryReview: false,
              minReviewers: 1,
              removeApprovalsUponUpdate: false
          };
          var response = await request.get('/api/configs', options);
      
          expect(response.status).toBe(200);
          expect(response.data.datas).toEqual(expected);
          done();
      })

      it('Edit configs', async done => {
        const original = {
            mandatoryReview: false,
            minReviewers: 1,
            removeApprovalsUponUpdate: false
        };
        const modified = {
            mandatoryReview: true,
            minReviewers: 5,
            removeApprovalsUponUpdate: true
        };
        var response = await request.put('/api/configs', modified, options);
        expect(response.status).toBe(200);

        var response = await request.get('/api/configs', options);
        expect(response.status).toBe(200);
        expect(response.data.datas).toEqual(modified);

        var response = await request.put('/api/configs', original, options);
        expect(response.status).toBe(200);

        var response = await request.get('/api/configs', options);
        expect(response.status).toBe(200);
        expect(response.data.datas).toEqual(original);
        done();
    })

    })
  }