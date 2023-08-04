const { resolve } = require('path');

module.exports = function(app) {
    const fs = require('fs')
    const tar = require('tar-stream')
    const zlib = require('zlib')

    const Response = require('../lib/httpResponse.js');
    const acl = require('../lib/auth.js').acl;
    const utils = require('../lib/utils')

    const backupPath = `${__basedir}/../backup`
    const backupTmpPath = `${backupPath}/tmpBackup`
    const restoreTmpPath = `${backupPath}/tmpRestore`
    const STATE_IDLE = 'idle'
    const STATE_PENDING = 'pending'
    const STATE_ERROR = 'error'

    const Audit = require('mongoose').model('Audit');
    const Vulnerability = require('mongoose').model('Vulnerability');
    const AuditType = require('mongoose').model('AuditType');
    const Client = require('mongoose').model('Client');
    const Company = require('mongoose').model('Company');
    const Settings = require('mongoose').model('Settings');
    const User = require('mongoose').model('User');
    const VulnerabilityCategory = require('mongoose').model('VulnerabilityCategory');
    const VulnerabilityType = require('mongoose').model('VulnerabilityType');
    
    // app.get("/api/backup/audits", acl.hasPermission('backup:update'), function(req, res) {
    //     Audit.backup()
    //     .then(msg => Response.Ok(res, msg))
    //     .catch(err => Response.Internal(res, err));
    // });

    // app.get("/api/restore/audits", acl.hasPermission('backup:update'), function(req, res) {
    //     Audit.restore()
    //     .then(msg => Response.Ok(res, msg))
    //     .catch(err => Response.Internal(res, err));
    // });

    // app.get("/api/backup/vulnerabilities", acl.hasPermission('backup:update'), function(req, res) {
    //     Vulnerability.backup()
    //     .then(msg => Response.Ok(res, msg))
    //     .catch(err => Response.Internal(res, err));
    // });

    // app.get("/api/restore/vulnerabilities", acl.hasPermission('backup:update'), function(req, res) {
    //     Vulnerability.restore()
    //     .then(msg => Response.Ok(res, msg))
    //     .catch(err => Response.Internal(res, err));
    // });

    app.get("/api/backup/audits", function(req, res) {
        Audit.backup()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/restore/audits", function(req, res) {
        Audit.restore()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/backup/vulnerabilities", function(req, res) {
        Vulnerability.backup()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/restore/vulnerabilities", function(req, res) {
        Vulnerability.restore()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/backup/audit-types", function(req, res) {
        AuditType.backup()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/restore/audit-types/:mode(upsert|revert)", function(req, res) {
        AuditType.restore(req.params.mode)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    function getBackupState() {
        try {
            const state = fs.readFileSync(`${backupPath}/.state`, 'utf8')
            return state.trim()
        }
        catch(error) {
            if (error.code === 'ENOENT') {
                fs.writeFileSync(`${backupPath}/.state`, STATE_IDLE)
                return STATE_IDLE
            }
            else {
                console.log(error)
                return 'error'
            }
        }
    }

    function setBackupState(state) {
        fs.writeFileSync(`${backupPath}/.state`, state)
    }

    function readBackupInfo(file) {
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(`${backupPath}/${file}`)
            const extract = tar.extract()

            extract.on('entry', (header, stream, next) => {
                if (header.name === 'backup.json') {
                    let jsonData = ''

                    stream.on('data', (chunk) => {
                        jsonData += chunk
                    })
                    
                    stream.on('end', () => {
                        try {
                            jsonData = JSON.parse(jsonData)
                            const keys = ['name', 'date', 'type', 'protected', 'data']
                            if (keys.every(e => Object.keys(jsonData).includes(e)))
                                resolve(jsonData)
                            else
                                reject(new Error('Wrong backup.json structure'))
                        }
                        catch(error) {
                            reject(new Error('Wrong JSON data in backup.json'))
                        }
                    })

                    stream.resume()
                }
                else {
                    stream.on('end', () => next())
                    stream.resume()
                }
            })

            extract.on('finish', () => {
                reject(new Error('No backup.json file found in archive'))
            })
        
            readStream
            .pipe(zlib.createGunzip())
            .on('error', err => reject(err))
            .pipe(extract)
            .on('error', err => reject(err))
        })
    }

    function getBackupList() {
        return new Promise((resolve, reject) => {
            
    
            const filenames = fs.readdirSync(backupPath)
            let backupList = []
            let promises = []
            filenames.forEach(file => {
                if (file.endsWith('.tar')) {
                    promises.push(readBackupInfo(file))
                }
            })
            Promise.allSettled(promises)
            .then(results => {
                results.forEach(e => {
                    if (e.status === 'fulfilled') {
                        backupList.push(e.value)
                    }
                })
                resolve(backupList)
            })
        })
    }

    app.get("/api/backups", async function(req, res) {
        const msg = await getBackupList()
        Response.Ok(res, msg)
    });

    app.get("/api/backups/status", function(req, res) {
        const state = getBackupState()
        if (state === 'error')
            Response.Internal(res, state)
        else
            Response.Ok(res, state)
    });

    app.post("/api/backups", function(req, res) {
        if (getBackupState() !== STATE_IDLE) {
            Response.Processing(res, 'Backup already in progress')
            return
        }

        setBackupState(STATE_PENDING)
        const date = new Date()
        const [filename] = date.toISOString().replaceAll('-','').replaceAll(':','').split('.')
        const allData = [
            "Users",
            "Customers",
            "Templates",
            "Custom Data",
            "Settings",
            "Vulnerabilities",
            "Audits"
        ]
        let backup = {
            name: 'backup',
            slug: filename,
            date: date.toISOString(),
            type: 'full',
            protected: false,
            data: allData,
        }

        // Params
        if (req.body.data && Array.isArray(req.body.data))
            backup.data = allData.filter(e => req.body.data.includes(e))
        if (backup.data.length === 0)
            backup.data = allData
        if (backup.data.length < allData.length)
            backup.type = "partial"
        if (req.body.name && utils.validFilename(req.body.name))
            backup.name = req.body.name
        else
            backup.name = `${backup.type} - ${date.toLocaleDateString("en-us", {year: "numeric", month: "short", day: "2-digit"})}`
        if (req.body.password)
            backup.protected = true

        // backup all or partial data into temporary directory
        let backupPromises = [
            // Language.backup(backupTmpPath)
        ]
        backup.data.forEach(e => {
            console.log(e)
            if (e === "Users") {
                backupPromises.push(User.backup(backupTmpPath))
            }
            if (e === "Customers") {
                backupPromises.push(Company.backup(backupTmpPath))
                backupPromises.push(Client.backup(backupTmpPath))
            }
            if (e === "Templates") {
                // backupPromises.push(Template.backup(backupTmpPath))
            }
            if (e === "Custom Data") {
                backupPromises.push(AuditType.backup(backupTmpPath))
                backupPromises.push(VulnerabilityType.backup(backupTmpPath))
                backupPromises.push(VulnerabilityCategory.backup(backupTmpPath))
                // backupPromises.push(CustomField.backup(backupTmpPath))
                // backupPromises.push(CustomSection.backup(backupTmpPath))
            }
            if (e === "Settings") {
                backupPromises.push(Settings.backup(backupTmpPath))
            }
            if (e === "Vulnerabilities") {
                backupPromises.push(Vulnerability.backup(backupTmpPath))
                // backupPromises.push(VulnerabilityUpdate.backup(backupTmpPath))
                // backupPromises.push(VulnerabilityCategory.backup(backupTmpPath))
                // backupPromises.push(VulnerabilityType.backup(backupTmpPath))
            }
            if (e === "Audits") {
                backupPromises.push(Audit.backup(backupTmpPath))
            }
        })

        if (!fs.existsSync(backupTmpPath))
            fs.mkdirSync(backupTmpPath)

        Promise.allSettled(backupPromises)
        .then(async results => {
            let errors = []
            results.forEach(e => {
                if (e.status === 'rejected')
                    errors.push(e.reason)
            })

            if (errors.length === 0) {
                const archiver = require('archiver')
                
                // Create Data archive (from tmp directory)
                const outputArchiveData = fs.createWriteStream(`${backupPath}/data.tar.gz`)
                const archiveData = archiver('tar', {gzip: true})
                archiveData.pipe(outputArchiveData)
                archiveData.directory(`${backupTmpPath}`, false)
                await archiveData.finalize()
                console.log('archive data finalized')

                outputArchiveData.on('close', async function() {
                    console.log('archive data closed');

                    // Create final archive
                    const outputArchive = fs.createWriteStream(`${backupPath}/${filename}.tar`)
                    const archive = archiver('tar', {gzip: true})
                    archive.pipe(outputArchive)
                    archive.append(JSON.stringify(backup, null, 2), {name: 'backup.json'})
                    if (req.body.password) {
                        const crypto = require('crypto')

                        const salt = crypto.randomBytes(8)
                        console.log("salt= "+salt.toString('hex'))
                        const secret = crypto.pbkdf2Sync(req.body.password, salt, 10000, 48, 'sha256')
                        const key = secret.subarray(0, 32)
                        console.log("key= "+key.toString('hex'))
                        const iv = secret.subarray(32, 48)
                        console.log("iv= "+iv.toString('hex'))
                        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
                        
                        const writeStream = fs.createWriteStream(`${backupPath}/data.tar.gz.enc`)
                        writeStream.write(Buffer.concat([Buffer.from('Salted__', 'utf8'), salt]))
                        fs.createReadStream(`${backupPath}/data.tar.gz`)
                        .pipe(cipher)
                        .pipe(writeStream)
                        .on('close', function() {
                            console.log('encryption finished')
                            writeStream.end()
                            archive.file((`${backupPath}/data.tar.gz.enc`), {name: 'data.tar.gz.enc'})
                            archive.finalize()
                            console.log('archive finale finalized')
                        })
                    }
                    else {
                        archive.file(`${backupPath}/data.tar.gz`, {name: 'data.tar.gz'})
                        await archive.finalize()
                        console.log('archive finale finalized')
                    }

                    outputArchive.on('close', function() {
                        console.log('archive final closed')
                        setBackupState(STATE_IDLE)
                        
                        fs.rmSync(backupTmpPath, {recursive: true, force: true})
                        fs.rmSync(`${backupPath}/data.tar.gz`, {force: true})
                        fs.rmSync(`${backupPath}/data.tar.gz.enc`, {force: true})
                    })
                })
            }
            else {
                errors.forEach(e => {
                    console.log(`Something went wrong with the backup ${e.model}`)
                    console.log(e.error)
                })
                setBackupState(STATE_ERROR)
                fs.rmSync(backupTmpPath, {recursive: true, force: true})
            }
        })

        Response.Ok(res, 'Backup request submitted')
    });

    function extractFiles(archivePath, destPath, files = []) {
        console.log(archivePath, destPath, files)
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(archivePath)
            const extract = tar.extract()
            let countExtracted = 0
            

            extract.on('entry', (header, stream, next) => {
                console.log('entry')
                if (files.length === 0 || files.includes(header.name)) {
                    let chunks = []

                    stream.on('data', (chunk) => {
                        chunks.push(chunk)
                    })

                    stream.on('end', () => {
                        console.log('stream end')
                        fs.writeFileSync(`${destPath}/${header.name}`, Buffer.concat(chunks))
                        countExtracted += 1
                        next()
                    })

                    stream.on('error', (error) => {
                        console.log('stream error')
                        reject(error)
                    })

                    stream.resume()
                }
                stream.on('error', error => reject(error))
                stream.on('end', () => next())
                stream.resume()
            })

            extract.on('error', error => {
                console.log(error)
                reject(error)
            })

            extract.on('finish', () => {
                console.log('finish')
                readStream.close()
                if ((countExtracted > 0 && files.length === 0) || countExtracted === files.length)
                    resolve()
                else
                    reject(new Error(`${countExtracted} files extracted on ${files.length} files`))
            })

            readStream.on('error', err => {
                reject(err)
            })

            readStream
            .pipe(zlib.createGunzip())
            .on('error', err => reject(err))
            .pipe(extract)
            .on('error', err => reject(err))
        })
    }

    app.post("/api/restore/:slug", function(req, res) {
        const allData = [
            "Users",
            "Customers",
            "Templates",
            "Custom Data",
            "Settings",
            "Vulnerabilities",
            "Audits"
        ]
        let backupData = allData
        let info = {}
        let files = []
        let restoreMode = "upsert"

        if (!utils.validFilename(req.params.slug)) {
            Response.BadParameters(res, 'Invalid characters in slug')
            return
        }

        if (!fs.existsSync(`${backupPath}/${req.params.slug}.tar`)) {
            Response.NotFound(res, 'Backup File not found')
            return
        }

        // Params
        if (req.body.data && Array.isArray(req.body.data))
            backupData = allData.filter(e => req.body.data.includes(e))
        if (backupData.length === 0)
            backupData = allData
        if (req.body.mode && req.body.mode === 'revert')
            restoreMode = "revert"

        readBackupInfo(`${req.params.slug}.tar`)
        .then(result => {
            info = result
            
            if (info.protected)
                return extractFiles(`${backupPath}/${req.params.slug}.tar`, backupPath, ['data.tar.gz.enc'])
            else
                return extractFiles(`${backupPath}/${req.params.slug}.tar`, backupPath, ['data.tar.gz'])
        })
        .then(() => {
            console.log('extracted')
            if (info.protected) {
                // decrypt archive
            }
            // Extract files in data.tar.gz
            // if (info.data.includes('Users') && backupData.includes('Users')) {
            //     files.push('users.json')
            // }
            if (info.data.includes('Customers') && backupData.includes('Customers')) {
                files.push('clients.json')
                files.push('companies.json')
            }
            // if (info.data.includes('Templates') && backupData.includes('Templates')) {
            //     files.push('templates.json')
            // }
            if (info.data.includes('Custom Data') && backupData.includes('Custom Data')) {
                files.push('auditTypes.json')
                files.push('vulnerabilityCategories.json')
                files.push('vulnerabilityTypes.json')
            }
            if (info.data.includes('Settings') && backupData.includes('Settings')) {
                files.push('settings.json')
            }
            if (info.data.includes('Vulnerabilities') && backupData.includes('Vulnerabilities')) {
                files.push('vulnerabilities.json')
                files.push('vulnerabilities-images.json')
                // restorePromises.push(Vulnerability.restore(restoreTmpPath))
            }
            if (info.data.includes('Audits') && backupData.includes('Audits')) {
                files.push('audits.json')
                files.push('audits-images.json')
                // restorePromises.push(Audit.restore(restoreTmpPath))
            }

            if (!fs.existsSync(restoreTmpPath))
                fs.mkdirSync(restoreTmpPath)

            if (files.length === 0)
                throw new Error('Requested Data not in Backup file')
            else
                return extractFiles(`${backupPath}/data.tar.gz`, restoreTmpPath, files)
        })
        .then(() => {
            console.log('extracted2')
            let restorePromises = []
            // if (info.data.includes('Users') && backupData.includes('Users')) {
            //     files.push('users.json')
            // }
            if (info.data.includes('Customers') && backupData.includes('Customers')) {
                restorePromises.push(Company.restore(restoreTmpPath, restoreMode))
                restorePromises.push(Client.restore(restoreTmpPath, restoreMode))
            }
            // if (info.data.includes('Templates') && backupData.includes('Templates')) {
            //     files.push('templates.json')
            // }
            if (info.data.includes('Custom Data') && backupData.includes('Custom Data')) {
                restorePromises.push(AuditType.restore(restoreTmpPath, restoreMode))
                restorePromises.push(VulnerabilityCategory.restore(restoreTmpPath, restoreMode))
                restorePromises.push(VulnerabilityType.restore(restoreTmpPath, restoreMode))
            }
            if (info.data.includes('Settings') && backupData.includes('Settings')) {
                restorePromises.push(Settings.restore(restoreTmpPath))
            }
            if (info.data.includes('Vulnerabilities') && backupData.includes('Vulnerabilities')) {
                restorePromises.push(Vulnerability.restore(restoreTmpPath))
            }
            if (info.data.includes('Audits') && backupData.includes('Audits')) {
                restorePromises.push(Audit.restore(restoreTmpPath))
            }
            return Promise.allSettled(restorePromises)
        })
        .then(results => {
            let errors = []
            results.forEach(e => {
                if (e.status === 'rejected')
                    errors.push(e.reason)
            })

            if (errors.length === 0)
                Response.Ok(res, 'Restoration successfull')
            else {
                let msg = "Error occured with restoration process on the following modules:"
                errors.forEach(e => {
                    console.log(`Something went wrong with the restoration ${e.model}`)
                    console.log(e.error)
                    msg += "\n"+e.model+"\n"+e.error
                })

                throw new Error(msg)
            }
        })
        .catch(err => {
            Response.Internal(res, err)
        })
        .finally(() => {
            fs.rmSync(`${backupPath}/data.tar.gz`, {force: true})
            fs.rmSync(restoreTmpPath, {recursive: true, force: true})
        })
        
    })
}
