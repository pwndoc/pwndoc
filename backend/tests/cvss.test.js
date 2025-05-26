module.exports = function(request, app) {
  describe('CVSS Suite Tests', () => {
    var userToken = '';
    var auditId = null;

    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token

      var response = await request(app).get('/api/audits')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
    
      expect(response.status).toBe(200)
      auditId = response.body.datas[0]._id

      // Add a finding with CVSS 3.1 and 4.0 to the audit
      var vuln = {
        title: 'Vulnerability French 1',
        vulnType: 'Internal',
        description: 'French vuln description',
        observation: 'French vuln observation',
        remediation: 'French vuln remediation',
        references: ['Reference 1', 'Reference 2'],
        cvssv3: "CVSS3.0:/AV:A/AC:H/PR:N/UI:N/S:C/C:L/I:L/A:L/E:X/RL:X/RC:X/CR:X/IR:X/AR:X/MAV:X/MAC:X/MPR:X/MUI:X/MS:X/MC:X/MI:X/MA:X",
        cvssv4: "CVSS:4.0/AV:A/AC:H/AT:P/PR:H/UI:N/VC:L/VI:N/VA:H/SC:H/SI:N/SA:L/E:A/CR:H/IR:L/AR:M/MAV:N/MAC:H/MAT:P/MPR:L/MUI:A/MVC:H/MVI:L/MVA:H/MSC:H/MSI:S/MSA:L/S:P/AU:N/R:I/V:C/RE:M/U:Clear",
      }

      console.log(auditId);
      var response = await request(app).post(`/api/audits/${auditId}/findings`)
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        .send(vuln)

        expect(response.status).toBe(200)
    })

    describe('CVSS Checks', () => {
      it('Get audit CVSS with both 3.1 and 4.0', async () => {
        // Ensure the instance only supports CVSS 3.1
        const partialModification = {
          "report": {
            "public": {
              "scoringMethods": {
                "CVSS3": true,
                "CVSS4": true,
              }
            }
          }
        };
        var response = await request(app).put('/api/settings')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
          .send(partialModification);
        expect(response.status).toBe(200);
        expect(response.body.datas.report.public.scoringMethods.CVSS3).toEqual(true);
        expect(response.body.datas.report.public.scoringMethods.CVSS4).toEqual(true);

        // Create a vulnerability in the Audit
        var response = await request(app).get(`/api/audits/${auditId}`)
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas.findings[0].cvssv3).not.toBeNull()
        expect(response.body.datas.findings[0].cvssv4).not.toBeNull()
      })
    })
  })
}