module.exports = function(request, app) {

  describe('Backup Suite Tests', () => {
    let userToken = ''
    beforeAll(async () => {
      const response = await request(app).post('/api/users/token').send({username: 'admin', password: 'Admin123'})
      userToken = response.body.datas.token
    })

    describe('Backup CRUD operations', () => {
      // Variable to store the a backup to be used in the download test
      let backupDownload = ''
      // Variable to store a backup to be used in the restore test
      let backupRestore = ''
      // Variable to store a backup to be used in the upload test
      let backupUpload = ''
      // Function to wait for backup or restore to be finished
      const waitForStatusIdle = async (timeout = 30000, interval = 1000) => {
        const startTime = Date.now()
        
        while (Date.now() - startTime < timeout) {
          const response = await request(app).get('/api/backups/status')
            .set('Cookie', [
              `token=JWT ${userToken}`
            ])
          
          if (response.body.datas.operation === "idle") {
            return true // Backup is complete
          }
          
          // Wait for the specified interval before checking again
          await new Promise(resolve => setTimeout(resolve, interval))
        }

        throw new Error('Backup did not complete within the timeout period')
      }

      it('Get Backups (no existing backup yet)', async () => {
        const response = await request(app).get('/api/backups')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(0)
      })

      it('Get Backups status (idle)', async () => {
        const response = await request(app).get('/api/backups/status')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        
        const expectedResponse = {operation:"idle", state:"idle", message:""}
        expect(response.status).toBe(200)
        expect(response.body.datas).toEqual(expectedResponse)
      })

      it('Should create full backup without POST data', async () => {
        const response = await request(app).post('/api/backups')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        const response2 = await request(app).get('/api/backups/status')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        
        expect(response.status).toBe(200)
        expect(response2.body.datas).toMatchObject({operation: "backup"})
        await waitForStatusIdle()
      }, 30000) // set 30s timeout for this test case

      it('Should create full backup with POST data', async () => {
        const data = {
          name: "Full Backup",
          password: "pass123",
          data: ["inexistantData"]
        }

        const response = await request(app).post('/api/backups')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        .send(data)

        const response2 = await request(app).get('/api/backups/status')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        
        expect(response.status).toBe(200)
        expect(response2.body.datas).toMatchObject({operation: "backup"})
        await waitForStatusIdle()
      }, 30000) // set 30s timeout for this test case

      it('Should create partial backup', async () => {
        const data = {
          name: "Partial Backup",
          data: ["Audits", "Users"]
        }

        const response = await request(app).post('/api/backups')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        .send(data)

        const response2 = await request(app).get('/api/backups/status')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        
        expect(response.status).toBe(200)
        expect(response2.body.datas).toMatchObject({operation: "backup"})
        await waitForStatusIdle()
      }, 30000) // set 30s timeout for this test case

      it('Should be 3 Backups', async () => {
        const response = await request(app).get('/api/backups')
          .set('Cookie', [
            `token=JWT ${userToken}`
          ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(3)
        expect(response.body.datas[1].name).toBe("Full Backup")
        expect(response.body.datas[1].type).toBe("full")
        expect(response.body.datas[1].protected).toBe(true)
        expect(response.body.datas[1].data).toHaveLength(13)
        expect(response.body.datas[2].name).toBe("Partial Backup")
        expect(response.body.datas[2].type).toBe("partial")
        expect(response.body.datas[2].protected).toBe(false)
        expect(response.body.datas[2].data).toEqual(["Audits", "Users"])

        backupRestore = response.body.datas[0]
        backupDownload = response.body.datas[1]
        backupUpload = response.body.datas[2]
      })

      it('Should Download backup', async () => {
        const response = await request(app).get(`/api/backups/download/${backupDownload.slug}`)
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])

        const expectedResponseHeaders = {
          "content-disposition": `attachment filename=${backupDownload.filename}`,
          "content-type": "application/octet-stream",
          "content-length": backupDownload.size.toString()
        }
        expect(response.status).toBe(200)
      })

      it('Should Delete backup', async () => {
        const response = await request(app).delete(`/api/backups/${backupDownload.slug}`)
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        
        expect(response.status).toBe(200)
      })

      it('Should be 2 Backups', async () => {
        const response = await request(app).get('/api/backups')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(2)
        expect(response.body.datas[0].type).toBe("full")
        expect(response.body.datas[0].protected).toBe(false)
        expect(response.body.datas[0].data).toHaveLength(13)
        expect(response.body.datas[1].name).toBe("Partial Backup")
        expect(response.body.datas[1].type).toBe("partial")
        expect(response.body.datas[1].protected).toBe(false)
        expect(response.body.datas[1].data).toEqual(["Audits", "Users"])
      })

      it('Should not upload backup with path traversal filename', async () => {
        const backupPath = `${__basedir}/../backup`

        const response = await request(app).post('/api/backups/upload')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        .attach('file', `${backupPath}/${backupUpload.filename}`, {filename: '../../../../etc/passwd'})

        expect(response.status).toBe(422)
        expect(response.body.datas).toEqual("Invalid characters in filename")
      })

      it('Should not upload backup with wrong extension', async () => {
        const backupPath = `${__basedir}/../backup`

        const response = await request(app).post('/api/backups/upload')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        .attach('file', `${backupPath}/${backupUpload.filename}`, {filename: 'backup-uploaded.tar.jpg'})
        
        expect(response.status).toBe(422)
        expect(response.body.datas).toEqual("Only .tar archives are allowed")
      })

      it('Should Upload backup', async () => {
        const backupPath = `${__basedir}/../backup`

        // Read the backup file

        const response = await request(app).post('/api/backups/upload')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
        .attach('file', `${backupPath}/${backupUpload.filename}`, {filename: 'backup-uploaded.tar'})

        expect(response.status).toBe(201)
      })

      it('Should be 3 Backups', async () => {
        const response = await request(app).get('/api/backups')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])
      
        expect(response.status).toBe(200)
        expect(response.body.datas).toHaveLength(3)
        expect(response.body.datas[0].type).toBe("full")
        expect(response.body.datas[0].protected).toBe(false)
        expect(response.body.datas[0].data).toHaveLength(13)
        expect(response.body.datas[1].name).toBe("Partial Backup")
        expect(response.body.datas[1].type).toBe("partial")
        expect(response.body.datas[1].protected).toBe(false)
        expect(response.body.datas[1].data).toEqual(["Audits", "Users"])
        expect(response.body.datas[2].name).toBe("Partial Backup")
        expect(response.body.datas[2].type).toBe("partial")
        expect(response.body.datas[2].protected).toBe(false)
        expect(response.body.datas[2].data).toEqual(["Audits", "Users"])
      })

      it('Should Restore backup', async () => {
        const mongoose = require('mongoose')

        async function takeSnapshot() {
          const collections = await mongoose.connection.db.listCollections().toArray()
          const snapshot = {}

          for (const collection of collections) {
            const collectionName = collection.name
            const data = await mongoose.connection.db.collection(collectionName).find({}).toArray()
            snapshot[collectionName] = data
          }

          return snapshot
        }

        async function validateSnapshot(snapshot) {
          for (const [collectionName, expectedData] of Object.entries(snapshot)) {
            const currentData = await mongoose.connection.db.collection(collectionName).find({}).toArray()

            // remove refreshTokens from users
            if (collectionName === 'users') {
              expectedData.forEach(user => {
                user.refreshTokens = []
              })
            }

            expect(currentData).toHaveLength(expectedData.length)
            expect(currentData).toEqual(expectedData)
          }
        }
        
        // Snapshot the current state of the database and clear it
        const snapshot = await takeSnapshot()
        await mongoose.connection.dropDatabase()

        // Restore the backup
        const response = await request(app).post(`/api/backups/${backupRestore.slug}/restore`)
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])

        const response2 = await request(app).get('/api/backups/status')
        .set('Cookie', [
          `token=JWT ${userToken}`
        ])

        expect(response.status).toBe(200)
        expect(response2.body.datas).toMatchObject({operation: "restore"})
        await waitForStatusIdle()

        // Validate the restored state of the database
        await validateSnapshot(snapshot)
      }, 30000) // set 30s timeout for this test case

      /**
       * TODO: 
       * Add test for restore with password
       * Add tests for partial restore
       */
    })
  })
}