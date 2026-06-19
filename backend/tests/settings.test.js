module.exports = function(request, app) {
    describe('Application settings', () => {
      var userToken = '';
      var Settings = require('mongoose').model('Settings')
      const { sanitizeSettingsForClient } = require('../src/lib/settings-secrets')
      beforeAll(async () => {
        var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
        userToken = response.body.datas.token
      })

      const defaultAiDeliverySettings = () => ({
        "delivery": "inline",
        "content": "",
        "bedrockPromptCache": {
          "cacheReference": "",
          "region": ""
        }
      })

      const defaultAiPublicSettings = {
        "enabled": true,
        "defaultProvider": "openai",
        "redactionGuidelines": defaultAiDeliverySettings(),
        "qaInstructions": defaultAiDeliverySettings(),
        "qaChecks": {
          "completeness": true,
          "references": true,
          "imageCaptions": true,
          "duplicates": true,
          "aiDuplicates": true,
          "redaction": true,
          "customer": true,
          "instructions": true
        }
      }

      const defaultAiPrivateSettings = {
        "openaiApiKey": "",
        "openaiBaseUrl": "https://api.openai.com/v1",
        "openaiModel": "gpt-5.4-mini",
        "anthropicApiKey": "",
        "anthropicBaseUrl": "https://api.anthropic.com/v1",
        "anthropicModel": "claude-opus-4.8",
        "anthropicVersion": "2023-06-01",
        "deepseekApiKey": "",
        "deepseekBaseUrl": "https://api.deepseek.com/v1",
        "deepseekModel": "deepseek-v4-flash",
        "ollamaApiKey": "",
        "ollamaBaseUrl": "http://localhost:11434/v1",
        "ollamaModel": "llama3.1",
        "bedrockApiKey": "",
        "bedrockAccessKeyId": "",
        "bedrockSecretAccessKey": "",
        "bedrockSessionToken": "",
        "bedrockRegion": "us-east-1",
        "bedrockModel": "global.anthropic.claude-opus-4-8"
      }

      const defaultPublicSettings = {
        "ai": {
          "public": {
            "enabled": true
          },
        },
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
              "enableSpellCheck": false,
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
              },
              "scoringMethods": {
                "CVSS3": true,
                "CVSS4": false,
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
      };

      const defaultSettings = sanitizeSettingsForClient({
        "ai": {
          "private": defaultAiPrivateSettings,
          "public": defaultAiPublicSettings,
        },
        "report": {
            "enabled": true,
            "private": {
              "imageBorder": false,
              "imageBorderColor": "#000000",
              "languageToolUrl": "",
              "languageToolApiKey": "",
              "languageToolUsername": "",
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
              "enableSpellCheck": false,
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
              },
              "scoringMethods": {
                "CVSS3": true,
                "CVSS4": false,
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
      });

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
          "ai": {
            "private": defaultAiPrivateSettings,
            "public": defaultAiPublicSettings,
          },
          "report": {
              "enabled": false,
              "private": {
                "imageBorder": true,
                "imageBorderColor": "#123456",
                "languageToolUrl": "",
                "languageToolApiKey": "",
                "languageToolUsername": "",
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
                "enableSpellCheck": true,
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
                },
                "scoringMethods": {
                  "CVSS3": true,
                  "CVSS4": true,
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
        expect(response.body.datas).toEqual(sanitizeSettingsForClient(fullModification));

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
      expect(response.body.ai.private.openaiApiKey).toBe('');
      expect(response.body.ai.private.openaiApiKeyConfigured).toBe(false);
    })

    it('Does not return stored API keys to clients', async () => {
      await Settings.update({
        ai: {
          private: {
            ...defaultAiPrivateSettings,
            openaiApiKey: 'super-secret-openai-key'
          },
          public: defaultAiPublicSettings
        },
        report: {
          enabled: true,
          private: {
            imageBorder: false,
            imageBorderColor: '#000000',
            languageToolUrl: 'http://lt:8020',
            languageToolApiKey: 'super-secret-lt-key',
            languageToolUsername: ''
          },
          public: defaultSettings.report.public
        },
        reviews: defaultSettings.reviews
      });

      const response = await request(app).get('/api/settings')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ]);

      expect(response.status).toBe(200);
      expect(response.body.datas.ai.private.openaiApiKey).toBe('');
      expect(response.body.datas.ai.private.openaiApiKeyConfigured).toBe(true);
      expect(response.body.datas.report.private.languageToolApiKey).toBe('');
      expect(response.body.datas.report.private.languageToolApiKeyConfigured).toBe(true);
      expect(JSON.stringify(response.body.datas)).not.toContain('super-secret-openai-key');
      expect(JSON.stringify(response.body.datas)).not.toContain('super-secret-lt-key');
    })

    it('Preserves stored API keys when clients submit empty values', async () => {
      await Settings.update({
        ai: {
          private: {
            ...defaultAiPrivateSettings,
            openaiApiKey: 'persisted-openai-key'
          },
          public: defaultAiPublicSettings
        },
        report: defaultSettings.report,
        reviews: defaultSettings.reviews
      });

      const response = await request(app).put('/api/settings')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        .send({
          ai: {
            private: {
              ...defaultAiPrivateSettings,
              openaiApiKey: ''
            },
            public: defaultAiPublicSettings
          },
          report: defaultSettings.report,
          reviews: defaultSettings.reviews
        });

      expect(response.status).toBe(200);

      const stored = await Settings.getAll();
      expect(stored.ai.private.openaiApiKey).toBe('persisted-openai-key');
    })

    it('Returns internal error when loading full settings fails', async () => {
      var spy = jest.spyOn(Settings, 'getAll').mockRejectedValueOnce(new Error('getAll failed'))
      var response = await request(app).get('/api/settings')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
      expect(response.status).toBe(500)
      spy.mockRestore()
    })
    
    it('Returns internal error when loading public settings fails', async () => {
      var spy = jest.spyOn(Settings, 'getPublic').mockRejectedValueOnce(new Error('getPublic failed'))
      var response = await request(app).get('/api/settings/public')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
      expect(response.status).toBe(500)
      spy.mockRestore()
    })

    it('Returns internal error when settings update fails', async () => {
      var spy = jest.spyOn(Settings, 'update').mockRejectedValueOnce(new Error('update failed'))
      var response = await request(app).put('/api/settings')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        .send({ reviews: { public: { minReviewers: 2 } } })
      expect(response.status).toBe(500)
      spy.mockRestore()
    })

    it('Returns internal error when restoring defaults fails', async () => {
      var spy = jest.spyOn(Settings, 'restoreDefaults').mockRejectedValueOnce(new Error('restore failed'))
      var response = await request(app).put('/api/settings/revert')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
      expect(response.status).toBe(500)
      spy.mockRestore()
    })

    it('Returns internal error when exporting settings fails', async () => {
      var spy = jest.spyOn(Settings, 'getAll').mockRejectedValueOnce(new Error('export failed'))
      var response = await request(app).get('/api/settings/export')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
      expect(response.status).toBe(500)
      spy.mockRestore()
    })

    })
  }
