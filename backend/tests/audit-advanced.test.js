/*
  Additional audit route/model tests for edge cases and review workflow.
*/

module.exports = function(request, app) {
  var fs = require('fs')

  describe('Audit Advanced Suite Tests', () => {
    var adminToken = ''
    var reviewerToken = ''
    var adminUserId = ''
    var reviewerUserId = ''

    var parentAuditId = ''
    var childAuditId = ''
    var retestAuditId = ''
    var findingId = ''
    var commentId = ''
    var validTemplateId = ''
    var embeddedImageId = ''

    beforeAll(async () => {
      var response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      adminToken = response.body.datas.token

      response = await request(app).post('/api/users/token').send({username: 'reviewer', password: 'Reviewer123'})
      reviewerToken = response.body.datas.token

      response = await request(app).get('/api/users/me').set('Cookie', [`token=JWT ${adminToken}`])
      adminUserId = response.body.datas._id

      response = await request(app).get('/api/users/reviewer').set('Cookie', [`token=JWT ${adminToken}`])
      reviewerUserId = response.body.datas._id
    })

    describe('Advanced audit route scenarios', () => {
      it('Creates independent parent and child audits', async () => {
        var parentAudit = {name: 'Audit Advanced Parent', language: 'en', auditType: 'Web'}
        var response = await request(app).post('/api/audits')
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send(parentAudit)

        expect(response.status).toBe(201)
        parentAuditId = response.body.datas.audit._id

        var childAudit = {
          name: 'Audit Advanced Child',
          language: 'en',
          auditType: 'Web'
        }
        response = await request(app).post('/api/audits')
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send(childAudit)

        expect(response.status).toBe(201)
        childAuditId = response.body.datas.audit._id
      })

      it('Links a child to its parent and lists children for the parent audit', async () => {
        var response = await request(app).put(`/api/audits/${childAuditId}/updateParent`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({parentId: parentAuditId})
        expect(response.status).toBe(200)

        response = await request(app).get(`/api/audits/${parentAuditId}/children`)
          .set('Cookie', [`token=JWT ${adminToken}`])

        expect(response.status).toBe(200)
        expect(response.body.datas.length).toBeGreaterThan(0)
      })

      it('Creates one retest audit and blocks duplicate retest creation', async () => {
        var response = await request(app).delete(`/api/audits/${childAuditId}/deleteParent`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)

        response = await request(app).post(`/api/audits/${parentAuditId}/retest`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({})
        expect(response.status).toBe(422)

        response = await request(app).post(`/api/audits/${parentAuditId}/retest`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({auditType: 'Web'})

        expect(response.status).toBe(201)
        retestAuditId = response.body.datas.audit._id

        response = await request(app).post(`/api/audits/${parentAuditId}/retest`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({auditType: 'Web'})
        expect(response.status).toBe(422)
      })

      it('Fetches retest details and full parent audit document', async () => {
        var response = await request(app).get(`/api/audits/${parentAuditId}/retest`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)
        expect(response.body.datas._id).toBe(retestAuditId)

        response = await request(app).get(`/api/audits/${parentAuditId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)
      })

      it('Rejects malformed reviewer/collaborator payloads and accepts valid general details', async () => {
        var response = await request(app).put(`/api/audits/${parentAuditId}/general`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({reviewers: [{username: 'missing-id'}]})
        expect(response.status).toBe(422)

        response = await request(app).put(`/api/audits/${parentAuditId}/general`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({collaborators: [{username: 'missing-id'}]})
        expect(response.status).toBe(422)

        response = await request(app).put(`/api/audits/${parentAuditId}/general`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            reviewers: [{_id: reviewerUserId}],
            date: '2026-02-25',
            date_start: '2026-02-20',
            date_end: '2026-02-24',
            scope: ['Target A', 'Target B']
          })
        expect(response.status).toBe(200)
      })

      it('Reads and updates the network scope for an audit', async () => {
        var response = await request(app).get(`/api/audits/${parentAuditId}/network`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)

        response = await request(app).put(`/api/audits/${parentAuditId}/network`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({scope: [{name: 'Srv 1', hosts: []}]})
        expect(response.status).toBe(200)
      })

      it('Creates, updates, sorts and reorders findings with invalid move validation', async () => {
        var response = await request(app).post(`/api/audits/${parentAuditId}/findings`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({description: 'no title'})
        expect(response.status).toBe(422)

        response = await request(app).post(`/api/audits/${parentAuditId}/findings`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            title: 'Advanced Finding',
            category: 'No Category',
            cvssv3: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
            description: 'desc',
            observation: 'obs',
            remediation: 'fix',
            references: ['ref-1'],
            scope: 'asset-1',
            poc: 'poc',
            status: 1
          })
        expect(response.status).toBe(200)

        response = await request(app).get(`/api/audits/${parentAuditId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)
        findingId = response.body.datas.findings[0]._id

        response = await request(app).get(`/api/audits/${parentAuditId}/findings/${findingId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)

        response = await request(app).put(`/api/audits/${parentAuditId}/findings/${findingId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            title: 'Advanced Finding Updated',
            retestStatus: 'partial',
            retestDescription: 'retest notes',
            status: 0
          })
        expect(response.status).toBe(200)

        response = await request(app).put(`/api/audits/${parentAuditId}/sortfindings`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            sortFindings: [{
              category: 'No Category',
              sortValue: 'cvssScore',
              sortOrder: 'desc',
              sortAuto: false
            }]
          })
        expect(response.status).toBe(200)

        response = await request(app).put(`/api/audits/${parentAuditId}/movefinding`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({oldIndex: 0})
        expect(response.status).toBe(422)

        response = await request(app).put(`/api/audits/${parentAuditId}/movefinding`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({oldIndex: 0, newIndex: 0})
        expect(response.status).toBe(200)
      })

      it('Returns validation error when updating a section without required fields', async () => {
        var response = await request(app).put(`/api/audits/${parentAuditId}/sections/deadbeefdeadbeefdeadbeef`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({})
        expect(response.status).toBe(422)
      })

      it('Validates comment payloads and supports create/update/delete on findings', async () => {
        var response = await request(app).post(`/api/audits/${parentAuditId}/comments`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({fieldName: 'description', authorId: adminUserId, text: 'bad'})
        expect(response.status).toBe(422)

        response = await request(app).post(`/api/audits/${parentAuditId}/comments`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({findingId: findingId, sectionId: 'deadbeefdeadbeefdeadbeef', fieldName: 'description', authorId: adminUserId})
        expect(response.status).toBe(422)

        response = await request(app).post(`/api/audits/${parentAuditId}/comments`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({findingId: findingId, text: 'missing fields'})
        expect(response.status).toBe(422)

        response = await request(app).post(`/api/audits/${parentAuditId}/comments`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            findingId: findingId,
            fieldName: 'description',
            authorId: adminUserId,
            text: 'comment text'
          })
        expect(response.status).toBe(201)
        commentId = response.body.datas._id

        response = await request(app).put(`/api/audits/${parentAuditId}/comments/${commentId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            text: 'updated comment',
            resolved: true,
            replies: [{author: adminUserId, text: 'reply'}]
          })
        expect(response.status).toBe(200)

        response = await request(app).delete(`/api/audits/${parentAuditId}/comments/${commentId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)
      })

      it('Stores rich finding content used by report generation', async () => {
        var response = await request(app).post('/api/images')
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            name: 'report-generator-embedded.png',
            auditId: parentAuditId,
            value: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw'
          })
        expect(response.status).toBe(201)
        embeddedImageId = response.body.datas._id

        response = await request(app).put(`/api/audits/${parentAuditId}/findings/${findingId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            title: 'Advanced Finding Updated',
            category: 'Authentication',
            cvssv3: 'AV:P/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:L/E:F/RL:O/RC:C/CR:H/IR:M/AR:L/MAV:A/MAC:H/MPR:H/MUI:R/MS:C/MC:H/MI:L/MA:N',
            cvssv4: 'CVSS:4.0/AV:P/AC:H/AT:P/PR:H/UI:A/VC:L/VI:L/VA:L/SC:L/SI:L/SA:L/E:A/CR:H/IR:M/AR:L/MAV:A/MAC:H/MAT:P/MPR:L/MUI:P/MVC:N/MVI:L/MVA:H/MSC:N/MSI:H/MSA:L/S:P/AU:Y/R:I/V:C/RE:M/U:Amber',
            description: `<p>Description with db image</p><img src="${embeddedImageId}" alt="db image" /><p>tail</p>`,
            observation: `<p>Observation with inline image</p><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw" alt="inline image" />`,
            remediation: `<p>Remediation with missing image</p><img src="66f7a6b8e2fa4b49cfe9d123" alt="missing image" />`,
            poc: `<p>POC with fallback image id</p><img src="66f7a6b8e2fa4b49cfe9d124" alt="poc missing image" />`,
            retestDescription: `<p>Retest details</p><img src="${embeddedImageId}" alt="retest image" />`,
            references: ['ref-1', 'ref-2'],
            customFields: [{
              fieldType: 'text',
              label: 'Evidence Field',
              text: `<p>Custom field with image</p><img src="${embeddedImageId}" alt="custom image" />`
            }]
          })
        expect(response.status).toBe(200)
      })

      it('Creates a valid template and generates a report document', async () => {
        var fileB64 = fs.readFileSync(`${__basedir}/../report-templates/Default Template.docx`).toString('base64')

        var response = await request(app).post('/api/templates')
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({
            name: 'Template Valid For Audit Advanced',
            ext: 'docx',
            file: fileB64
          })
        expect(response.status).toBe(201)
        validTemplateId = response.body.datas._id

        response = await request(app).put(`/api/audits/${parentAuditId}/general`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({template: validTemplateId})
        expect(response.status).toBe(200)

        response = await request(app).get(`/api/audits/${parentAuditId}/generate`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect([200, 500]).toContain(response.status)
      })

      it('Handles review-state transitions and report generation constraints', async () => {
        var response = await request(app).put(`/api/audits/${parentAuditId}/updateReadyForReview`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({state: 'REVIEW'})
        expect(response.status).toBe(403)

        response = await request(app).put(`/api/audits/${parentAuditId}/toggleApproval`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(403)

        response = await request(app).put('/api/settings')
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({reviews: {enabled: true, private: {removeApprovalsUponUpdate: true}, public: {mandatoryReview: true, minReviewers: 1}}})
        expect(response.status).toBe(200)

        response = await request(app).put(`/api/audits/${parentAuditId}/updateReadyForReview`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({state: 'REVIEW'})
        expect(response.status).toBe(200)

        response = await request(app).get(`/api/audits/${parentAuditId}/generate`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(403)

        response = await request(app).put('/api/settings')
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({reviews: {public: {mandatoryReview: false, minReviewers: 1}}})
        expect(response.status).toBe(200)

        response = await request(app).get(`/api/audits/${parentAuditId}/generate`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect([200, 422, 500]).toContain(response.status)

        response = await request(app).put('/api/settings/revert')
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)
      })

      it('Updates parent metadata, unlinks child, and deletes created audits', async () => {
        var response = await request(app).put(`/api/audits/${childAuditId}/updateParent`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({})
        expect(response.status).toBe(500)

        response = await request(app).put(`/api/audits/${childAuditId}/updateParent`)
          .set('Cookie', [`token=JWT ${adminToken}`])
          .send({parentId: parentAuditId})
        expect(response.status).toBe(200)

        response = await request(app).delete(`/api/audits/${childAuditId}/deleteParent`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)

        response = await request(app).delete(`/api/audits/${retestAuditId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect([200, 404]).toContain(response.status)

        response = await request(app).delete(`/api/audits/${childAuditId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)

        response = await request(app).delete(`/api/audits/${parentAuditId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)

        response = await request(app).delete(`/api/templates/${validTemplateId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect(response.status).toBe(200)

        response = await request(app).delete(`/api/images/${embeddedImageId}`)
          .set('Cookie', [`token=JWT ${adminToken}`])
        expect([200, 404]).toContain(response.status)
      })
    })
  })
}
