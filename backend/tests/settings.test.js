module.exports = function(request, app) {
    describe('Application settings', () => {
      var userToken = '';
      beforeAll(async () => {
        var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
        userToken = response.body.datas.token
      })

      const defaultPublicSettings = {
        "report": {
            "enabled": true,
            "public": {
              "captions": [
                "Figure",
              ],
              "cvssColors": {
                "criticalColor": "#212121",
                "highColor": "#fe0000",
                "lowColor": "#008000",
                "mediumColor": "#f9a009",
                "noneColor": "#4a86e8",
              },
              "highlightWarning": false,
              "highlightWarningColor": "#ffff25",
              "requiredFields": {
                "company": false,
                "client": false,
                "dateStart": false,
                "dateEnd": false,
                "dateReport": false,
                "findingType": false,
                "scope": false,
                "findingDescription": false,
                "findingObservation": false,
                "findingReferences": false,
                "findingProofs": false,
                "findingAffected": false,
                "findingRemediationDifficulty": false,
                "findingPriority": false,
                "findingRemediation": false
              }
            },
          },
        "reviews": {
          "enabled": false,
          "public": {
            "mandatoryReview": false,
            "minReviewers": 1,
          },
        },
      }

      const defaultSettings = {
        "report": {
            "enabled": true,
            "private": {
              "defaultDataRetentionDays": 0,
              "imageBorder": false,
              "imageBorderColor": "#000000",
            },
            "public": {
              "captions": [
                "Figure",
              ],
              "cvssColors": {
                "criticalColor": "#212121",
                "highColor": "#fe0000",
                "lowColor": "#008000",
                "mediumColor": "#f9a009",
                "noneColor": "#4a86e8",
              },
              "highlightWarning": false,
              "highlightWarningColor": "#ffff25",
              "requiredFields": {
                "company": false,
                "client": false,
                "dateStart": false,
                "dateEnd": false,
                "dateReport": false,
                "findingType": false,
                "scope": false,
                "findingDescription": false,
                "findingObservation": false,
                "findingReferences": false,
                "findingProofs": false,
                "findingAffected": false,
                "findingRemediationDifficulty": false,
                "findingPriority": false,
                "findingRemediation": false
              }
            },
          },
        "reviews": {
          "enabled": false,
          "private": {
            "removeApprovalsUponUpdate": false,
          },
          "public": {
            "mandatoryReview": false,
            "minReviewers": 1,
          },
        },
      };

      it('Get settings', async () => {
          var response = await request(app).get('/api/settings')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ]);
      
          expect(response.status).toBe(200);
          expect(response.body.datas).toEqual(defaultSettings);
      })

      it('Get public settings', async () => {
          var response = await request(app).get('/api/settings/public')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ]);
      
          expect(response.status).toBe(200);
          expect(response.body.datas).toEqual(defaultPublicSettings);
      })

      it('Edit settings', async () => {
        const fullModification = {
          "report": {
              "enabled": false,
              "private": {
                "defaultDataRetentionDays": 10,
                "imageBorder": true,
                "imageBorderColor": "#123456",
              },
              "public": {
                "captions": [
                  "Figure",
                  "Test",
                ],
                "cvssColors": {
                  "criticalColor": "#123456",
                  "highColor": "#123456",
                  "lowColor": "#123456",
                  "mediumColor": "#123456",
                  "noneColor": "#123456",
                },
                "highlightWarning": true,
                "highlightWarningColor": "#123456",
                "requiredFields": {
                  "company": true,
                  "client": false,
                  "dateStart": true,
                  "dateEnd": true,
                  "dateReport": false,
                  "findingType": false,
                  "scope": true,
                  "findingDescription": false,
                  "findingObservation": false,
                  "findingReferences": false,
                  "findingProofs": false,
                  "findingAffected": false,
                  "findingRemediationDifficulty": false,
                  "findingPriority": false,
                  "findingRemediation": false
                }
                
              },
            },
          "reviews": {
            "enabled": true,
            "private": {
              "removeApprovalsUponUpdate": true,
            },
            "public": {
              "mandatoryReview": true,
              "minReviewers": 2,
            },
          },
        };
        var response = await request(app).put('/api/settings')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(fullModification);
        expect(response.status).toBe(200);

        var response = await request(app).get('/api/settings')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ]);
        expect(response.status).toBe(200);
        expect(response.body.datas).toEqual(fullModification);

        const partialModification = {
          "reviews": {
            "public": {
              "mandatoryReview": false,
              "minReviewers": 5,
            }
          }
        };
        var response = await request(app).put('/api/settings')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(partialModification);
        expect(response.status).toBe(200);

        var response = await request(app).get('/api/settings')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ]);
        expect(response.status).toBe(200);

        expect(response.body.datas.reviews.public.mandatoryReview).toEqual(false);
        expect(response.body.datas.reviews.public.minReviewers).toEqual(5);
        expect(response.body.datas.report.private.imageBorderColor).toEqual("#123456");
    })

    it('Revert settings', async () => {
      var response = await request(app).put('/api/settings/revert')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ]);
      expect(response.status).toBe(200);

      var response = await request(app).get('/api/settings')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ]);
      expect(response.status).toBe(200);
      expect(response.body.datas).toEqual(defaultSettings);
    })

    it('Export settings', async () => {
      var response = await request(app).get('/api/settings/export')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ]);
      expect(response.status).toBe(200);
      expect(response.type).toEqual('application/json');
      expect(response.headers['content-disposition'].indexOf('attachment; filename=')).toBe(0);
    })

    })
  }