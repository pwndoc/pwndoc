const { resolve } = require('path');

module.exports = function(app) {
    const fs = require('fs')
    const tar = require('tar-stream')
    const zlib = require('zlib')
    const diskusage = require('diskusage')

    const Response = require('../lib/httpResponse.js');
    const acl = require('../lib/auth.js').acl;
    const utils = require('../lib/utils')

    const backupPath = `${__basedir}/../backup`
    const backupTmpPath = `${backupPath}/tmpBackup`
    const restoreTmpPath = `${backupPath}/tmpRestore`
    const STATE_IDLE = 'idle'
    const STATE_BACKUP_STARTED = 'backup_started'
    const STATE_DUMPING_DATABASE = 'dumping_database'
    const STATE_BUILDING_DATA = 'building_data'
    const STATE_ENCRYPTING_DATA = 'encrypting_data'
    const STATE_BUILDING_ARCHIVE = 'building_archive'
    const STATE_BACKUP_ERROR = 'backup_error'
    const STATE_RESTORE_STARTED = 'restore_started'
    const STATE_EXTRACTING_INFO = 'extracting_info'
    const STATE_DECRYPTING_DATA = 'decrypting_data'
    const STATE_EXTRACTING_DATA = 'extracting_data'
    const STATE_RESTORING_DATA = 'restoring_data'
    const STATE_RESTORE_ERROR = 'restore_error'

    const Audit = require('mongoose').model('Audit');
    const AuditType = require('mongoose').model('AuditType');
    const Client = require('mongoose').model('Client');
    const Company = require('mongoose').model('Company');
    const CustomField = require('mongoose').model('CustomField');
    const CustomSection = require('mongoose').model('CustomSection');
    const Language = require('mongoose').model('Language');
    const Settings = require('mongoose').model('Settings');
    const Template = require('mongoose').model('Template');
    const User = require('mongoose').model('User');
    const Vulnerability = require('mongoose').model('Vulnerability');
    const VulnerabilityCategory = require('mongoose').model('VulnerabilityCategory');
    const VulnerabilityType = require('mongoose').model('VulnerabilityType');
    const VulnerabilityUpdate = require('mongoose').model('VulnerabilityUpdate');
 
    function getBackupState() {
        try {
            const state = fs.readFileSync(`${backupPath}/.state`, 'utf8')
            if (state.split('\n').length > 1)
                return {state: state.split('\n')[0].trim(), message: state.split('\n').slice(1).join('\n').trim()}
            else
                return {state: state, message: ''}
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

    function setBackupState(state, message = null) {
        if (message)
            fs.writeFileSync(`${backupPath}/.state`, state + '\n' + message)
        else
            fs.writeFileSync(`${backupPath}/.state`, state)
    }

    function readBackupInfo(file) {
        return new Promise((resolve, reject) => {
            const fileStats = fs.statSync(`${backupPath}/${file}`)

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
                            const keys = ['name', 'date', 'slug', 'type', 'protected', 'data']
                            if (keys.every(e => Object.keys(jsonData).includes(e))) {
                                jsonData.filename = file
                                jsonData.size = fileStats.size
                                resolve(jsonData)
                            }
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
            .on('error', err => reject(new Error('Wrong backup file')))
            .pipe(extract)
            .on('error', err => reject(new Error('Wrong backup file')))
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

    function getBackupFilename(slug) {
        return new Promise((resolve, reject) => {
            const filenames = fs.readdirSync(backupPath)
            let promises = []
            filenames.forEach(file => {
                if (file.endsWith('.tar')) {
                    promises.push(readBackupInfo(file))
                }
            })
            Promise.allSettled(promises)
            .then(results => {
                const result = results.find(e => e.status === 'fulfilled' && e.value.slug === slug)
                resolve(result.value.filename)
            })
        })
    }

    // Get Backups list
    app.get("/api/backups", acl.hasPermission('backups:read'), async function(req, res) {
        const msg = await getBackupList()
        Response.Ok(res, msg)
    });

    // Get Backups status - return backup state
    app.get("/api/backups/status", acl.hasPermission('backups:read'), function(req, res) {
        const state = getBackupState()
        let response = {operation: 'idle', state: state.state, message: state.message}
        if ([
            STATE_BACKUP_STARTED, 
            STATE_DUMPING_DATABASE, 
            STATE_BUILDING_DATA, 
            STATE_ENCRYPTING_DATA, 
            STATE_BUILDING_ARCHIVE,
            
        ].includes(state.state))
            response.operation = 'backup'
        else if ([
            STATE_RESTORE_STARTED,
            STATE_EXTRACTING_INFO,
            STATE_DECRYPTING_DATA,
            STATE_EXTRACTING_DATA,
            STATE_RESTORING_DATA,
        ].includes(state.state))
            response.operation = 'restore'
        else if ([
            STATE_BACKUP_ERROR,
            STATE_RESTORE_ERROR
        ].includes(state.state)) 
            response.operation = 'idle'

        Response.Ok(res, response)
    });

    // Download backup file
    app.get("/api/backups/download/:slug", acl.hasPermission('backups:read'), async function(req, res) {
        const filenames = fs.readdirSync(backupPath)
        let found = false
        const { resolve } = require('path')

        const filename = await getBackupFilename(req.params.slug)
        filenames.forEach(file => {
            if (file === `${filename}`) {
                found = true
                const filePath = `${backupPath}/${filename}`
                const fileStats = fs.statSync(filePath)
                const fileSize = fileStats.size

                const fileStream = fs.createReadStream(resolve(filePath))
                res.setHeader('Content-Length', fileSize)
                res.setHeader('Content-Type', 'application/octet-stream')
                res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
                fileStream.pipe(res)
            }
        })
        if (!found) {
            Response.NotFound(res, 'Backup File not found')
        }
    });

    
    // Upload backup file
    app.post("/api/backups/upload", acl.hasPermission('backups:create'), function(req, res) {
        const fileSize = req.headers['content-length'] || 0
        const diskUsage = diskusage.checkSync('/')
        const maxFileSize = diskUsage.available - (1024 * 1024 * 1024) // Free space - 1GB
        if (fileSize > maxFileSize) {
            Response.BadParameters(res, 'Backup too large. Not enough space on disk')
            return
        }

        const multer = require('multer');
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, `${backupPath}/`);
            },
            filename: (req, file, cb) => {
                cb(null, file.originalname);
            },
        });
        const upload = multer({
            storage: storage,
            fileFilter: (req, file, cb) => {
                if (file.mimetype === 'application/x-tar' && file.originalname.endsWith('.tar'))
                    cb(null, true);
                else
                    cb(new Error('Only .tar archives are allowed'));
            },
            limits: {
                fileSize: maxFileSize
            }    
        }).single('file')
        
        upload(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                Response.BadParameters(res, err);
            }
            else if (err) {
                Response.Internal(res, err);
            }
            else {
                // Check if file is a valid backup file
                readBackupInfo(req.file.originalname)
                .then(result => {
                    Response.Created(res, result)
                })
                .catch(error => {
                    fs.rmSync(`${backupPath}/${req.file.originalname}`, {force: true})
                    Response.BadParameters(res, error.message)
                })
            }
        })
    });

    // Delete Backup
    app.delete("/api/backups/:slug", acl.hasPermission('backups:delete'), async function(req, res) {
        const filenames = fs.readdirSync(backupPath)
        let deleted = false
        const filename = await getBackupFilename(req.params.slug)
        filenames.forEach(file => {
            if (file === `${filename}`) {
                fs.rmSync(`${backupPath}/${file}`, {force: true})
                deleted = true
            }
        })
        if (deleted)
            Response.Ok(res, 'Backup deleted successfully')
        else
            Response.NotFound(res, 'Backup not found')
    });

    // Create Backup
    app.post("/api/backups", acl.hasPermission('backups:create'), function(req, res) {
        if (![STATE_IDLE, STATE_BACKUP_ERROR, STATE_RESTORE_ERROR].includes(getBackupState().state)) {
            Response.Processing(res, 'Operation already in progress')
            return
        }

        setBackupState(STATE_BACKUP_STARTED)
        console.log('backup started')
        const date = new Date()
        const [filename] = date.toISOString().replaceAll('-','').replaceAll(':','').split('.')
        const allData = [
            "Audits",
            "Vulnerabilities",
            "Vulnerabilities Updates",
            "Users",
            "Clients",
            "Companies",
            "Templates",
            "Audit Types",
            "Custom Fields",
            "Custom Sections",
            "Vulnerability Types",
            "Vulnerability Categories",
            "Settings",
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
            Language.backup(backupTmpPath)
        ]
        backup.data.forEach(e => {
            // Audits
            if (e === "Audits") {
                backupPromises.push(Audit.backup(backupTmpPath))
            }

            // Vulnerabilities
            if (e === "Vulnerabilities") {
                backupPromises.push(Vulnerability.backup(backupTmpPath))
            }
            if (e === "Vulnerabilities Updates") {
                backupPromises.push(VulnerabilityUpdate.backup(backupTmpPath))
            }

            // Users
            if (e === "Users") {
                backupPromises.push(User.backup(backupTmpPath))
            }

            // Customers
            if (e === "Clients") {
                backupPromises.push(Client.backup(backupTmpPath))
            }
            if (e === "Companies") {
                backupPromises.push(Company.backup(backupTmpPath));
            }
            
            // Templates
            if (e === "Templates") {
                backupPromises.push(Template.backup(backupTmpPath))
            }
            
            // Custom Data
            if (e === "Audit Types") {
                backupPromises.push(AuditType.backup(backupTmpPath))
            }
            if (e === "Custom Fields") {
                backupPromises.push(CustomField.backup(backupTmpPath))
            }
            if (e === "Custom Sections") {
                backupPromises.push(CustomSection.backup(backupTmpPath))
            }
            if (e === "Vulnerability Types") {
                backupPromises.push(VulnerabilityType.backup(backupTmpPath))
            }
            if (e === "Vulnerability Categories") {
                backupPromises.push(VulnerabilityCategory.backup(backupTmpPath))
            }
            
            // Settings
            if (e === "Settings") {
                backupPromises.push(Settings.backup(backupTmpPath))
            }
        })

        if (!fs.existsSync(backupTmpPath))
            fs.mkdirSync(backupTmpPath)

        setBackupState(STATE_DUMPING_DATABASE)
        console.log('Dumping database')

        Promise.allSettled(backupPromises)
        .then(async results => {
            setBackupState(STATE_BUILDING_DATA)
            console.log('Building data archive')
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

                outputArchiveData.on('close', async function() {
                    console.log('archive data closed');

                    // Create final archive
                    console.log('Creating final archive')
                    const outputArchive = fs.createWriteStream(`${backupPath}/${filename}.tar`)
                    const archive = archiver('tar', {gzip: true})
                    archive.pipe(outputArchive)
                    archive.append(JSON.stringify(backup, null, 2), {name: 'backup.json'})
                    if (req.body.password) {
                        setBackupState(STATE_ENCRYPTING_DATA)
                        console.log('starting data archive encryption')
                        const crypto = require('crypto')

                        const salt = crypto.randomBytes(8)
                        const secret = crypto.pbkdf2Sync(req.body.password, salt, 10000, 48, 'sha256')
                        const key = secret.subarray(0, 32)
                        const iv = secret.subarray(32, 48)
                        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
                        
                        const writeStream = fs.createWriteStream(`${backupPath}/data.tar.gz.enc`)
                        writeStream.write(Buffer.concat([Buffer.from('Salted__', 'utf8'), salt]))
                        fs.createReadStream(`${backupPath}/data.tar.gz`)
                        .pipe(cipher)
                        .pipe(writeStream)
                        .on('close', function() {
                            setBackupState(STATE_BUILDING_ARCHIVE)
                            console.log('data archive encryption  ed')
                            writeStream.end()
                            archive.file((`${backupPath}/data.tar.gz.enc`), {name: 'data.tar.gz.enc'})
                            archive.finalize()
                            console.log('archive finale finalized')
                        })
                    }
                    else {
                        setBackupState(STATE_BUILDING_ARCHIVE)
                        console.log('building final archive')
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
                setBackupState(STATE_BACKUP_ERROR)
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
            let filesExtracted = []
            const directories = files.filter(e => e.endsWith('/'))
            console.log(directories)

            extract.on('entry', (header, stream, next) => {
                console.log('entry: ', header.name)
                if (
                    files.length === 0 || 
                    files.includes(header.name) || 
                    directories.some(e => header.name.startsWith(e))
                ) {
                    if (header.type === "directory") {
                        try {
                            console.log(`Creating directory ${destPath}/${header.name}`)
                            fs.mkdirSync(`${destPath}/${header.name}`)
                            filesExtracted.push(header.name)
                            next()
                        } catch (error) {
                            reject(error)
                        }
                        
                    }
                    else {
                        console.log('extracting')
                        const writeStream = fs.createWriteStream(`${destPath}/${header.name}`)

                        stream.on('data', (chunk) => {
                            writeStream.write(chunk)
                        })

                        stream.on('end', () => {
                            console.log('stream end: ', header.name)
                            writeStream.end()
                            filesExtracted.push(header.name)
                            next()
                        })

                        stream.on('error', (error) => {
                            console.log('stream error')
                            reject(error)
                        })
                    }
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
                const missingFiles = files.filter(x => !filesExtracted.includes(x))
                console.log(filesExtracted.length)
                console.log(files)
                console.log(missingFiles)
                if (filesExtracted.length === 0 )
                    reject(new Error('No files were extracted from the Archive'))
                else if (missingFiles.length > 0)
                    reject(new Error(`Missing files in the archive: ${missingFiles.toString()}`))
                else
                    resolve()
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

    function decryptArchive(encryptedPath, decryptedPath, password) {
        const crypto = require('crypto')

        return new Promise(async (resolve, reject) => {
            const readStream = fs.createReadStream(encryptedPath)
            const writeStream = fs.createWriteStream(decryptedPath)
            let salt

            readStream.once('readable', () => {
                let chunk;
                while (null !== (chunk = readStream.read(16))) {
                    if (!salt) {
                        salt = chunk.slice(8); // Skip the first 8 bytes ('Salted__') and get the salt
                        const secret = crypto.pbkdf2Sync(password, salt, 10000, 48, 'sha256')
                        const key = secret.subarray(0, 32)
                        const iv = secret.subarray(32, 48)
                        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

                        readStream
                        .pipe(decipher)
                        .on('error', (err) => reject({
                            fn: 'BadParameters', 
                            message: 'Decryption failed. Wrong password or corrupted file'
                        }))
                        .pipe(writeStream)
                        .on('finish', () => {
                            console.log('Decryption finished')
                            resolve()
                        })
                        .on('error', (err) => reject({
                            fn: 'BadParameters', 
                            message: 'Decryption failed. Wrong password or corrupted file'
                        }))

                        break
                    }
                }
            })
        })
    }

    function processPromisesSequentially(promises) {
        return new Promise(async (resolve, reject) => {
            const results = [];
            for (const promise of promises) {
                console.log((results.length + 1) + ' / ' + promises.length)
                try {
                    const result = await promise;
                    results.push({ status: 'fulfilled', value: result });
                } catch (error) {
                    console.log(error)
                    results.push({ status: 'rejected', reason: error });
                }
            }
            resolve(results);
        })
        
    }

    // Restore Backup
    app.post("/api/backups/:slug/restore", acl.hasPermission('backups:update'), async function(req, res) {
        if (![STATE_IDLE, STATE_BACKUP_ERROR, STATE_RESTORE_ERROR].includes(getBackupState().state)) {
            Response.Processing(res, 'Operation already in progress')
            return
        }

        const allData = [
            "Audits",
            "Vulnerabilities",
            "Vulnerabilities Updates",
            "Users",
            "Clients",
            "Companies",
            "Templates",
            "Audit Types",
            "Custom Fields",
            "Custom Sections",
            "Vulnerability Types",
            "Vulnerability Categories",
            "Settings",
        ]
        let backupData = []
        let info = {}
        let files = ['languages.json']
        let restoreMode = "upsert"

        if (!utils.validFilename(req.params.slug)) {
            Response.BadParameters(res, 'Invalid characters in slug')
            return
        }

        const filename = await getBackupFilename(req.params.slug)
        if (!filename || !fs.existsSync(`${backupPath}/${filename}`)) {
            Response.NotFound(res, 'Backup File not found')
            return
        }

        const diskUsage = diskusage.checkSync('/')
        const maxFileSize = diskUsage.available - (1024 * 1024 * 1024) // Free space - 1GB
        const fileSize = fs.statSync(`${backupPath}/${filename}`).size
        if ((fileSize * 3) > maxFileSize) {
            Response.BadParameters(res, 'Not enough space on disk for restauration')
            return
        }

        setBackupState(STATE_RESTORE_STARTED)
        console.log('restore started')

        // Params
        if (req.body.data && Array.isArray(req.body.data))
            backupData = allData.filter(e => req.body.data.includes(e))
        if (backupData.length === 0)
            backupData = allData
        if (req.body.mode && req.body.mode === 'revert')
            restoreMode = "revert"

        readBackupInfo(`${filename}`)
        .then(result => {
            setBackupState(STATE_EXTRACTING_INFO)
            console.log('restore extracting info')

            info = result
            
            if (info.protected && !req.body.password)
                throw ({fn: 'BadParameters', message: 'Backup is protected, password is required'})
            else if (info.protected)
                return extractFiles(`${backupPath}/${filename}`, backupPath, ['data.tar.gz.enc'])
            else
                return extractFiles(`${backupPath}/${filename}`, backupPath, ['data.tar.gz'])
        })
        .then(async () => {
            if (info.protected) {
                setBackupState(STATE_DECRYPTING_DATA)
                console.log('decrypting data')
                await decryptArchive(`${backupPath}/data.tar.gz.enc`, `${backupPath}/data.tar.gz`, req.body.password)
            }
            // Extract files in data.tar.gz
            setBackupState(STATE_EXTRACTING_DATA)
            console.log('extracting data')

            // Audits
            if (info.data.includes('Audits') && backupData.includes('Audits')) {
                files.push('audits.json')
                files.push('audits-images.json')
            }

            // Vulnerabilities
            if (info.data.includes('Vulnerabilities') && backupData.includes('Vulnerabilities')) {
                files.push('vulnerabilities.json')
                files.push('vulnerabilities-images.json')
            }

            // Vulnerabilities Updates
            if (info.data.includes('Vulnerabilities Updates') && backupData.includes('Vulnerabilities Updates')) {
                files.push('vulnerabilityUpdates.json')
                files.push('vulnerabilityUpdates-images.json')
            }

            // Users
            if (info.data.includes('Users') && backupData.includes('Users')) {
                files.push('users.json')
            }

            // Customers
            if (info.data.includes('Clients') && backupData.includes('Clients')) {
                files.push('clients.json')
            }
            if (info.data.includes('Companies') && backupData.includes('Companies')) {
                files.push('companies.json')
            }

            // Templates
            if (info.data.includes('Templates') && backupData.includes('Templates')) {
                files.push('templates.json')
                files.push('report-templates/')
            }

            // Custom Data
            if (info.data.includes('Audit Types') && backupData.includes('Audit Types')) {
                files.push('auditTypes.json')
            }
            if (info.data.includes('Custom Fields') && backupData.includes('Custom Fields')) {
                files.push('customFields.json')
            }
            if (info.data.includes('Custom Sections') && backupData.includes('Custom Sections')) {
                files.push('customSections.json')
            }
            if (info.data.includes('Vulnerability Types') && backupData.includes('Vulnerability Types')) {
                files.push('vulnerabilityTypes.json')
            }
            if (info.data.includes('Vulnerability Categories') && backupData.includes('Vulnerability Categories')) {
                files.push('vulnerabilityCategories.json')
            }

            // Settings
            if (info.data.includes('Settings') && backupData.includes('Settings')) {
                files.push('settings.json')
            }

            if (!fs.existsSync(restoreTmpPath))
                fs.mkdirSync(restoreTmpPath)

            if (files.length === 0)
                throw new Error('Requested Data not in Backup file')
            else
                return extractFiles(`${backupPath}/data.tar.gz`, restoreTmpPath, files)
        })
        .then(() => {
            // Restore Data
            setBackupState(STATE_RESTORING_DATA)
            console.log('restoring data')

            let restorePromises = [Language.restore(restoreTmpPath)]
            // Audits
            if (info.data.includes('Audits') && backupData.includes('Audits')) {
                restorePromises.push(Audit.restore(restoreTmpPath))
            }

            // Vulnerabilities
            if (info.data.includes('Vulnerabilities') && backupData.includes('Vulnerabilities')) {
                restorePromises.push(Vulnerability.restore(restoreTmpPath, restoreMode))
            }

            // Vulnerabilities Updates
            if (info.data.includes('Vulnerabilities Updates') && backupData.includes('Vulnerabilities Updates')) {
                restorePromises.push(VulnerabilityUpdate.restore(restoreTmpPath, restoreMode))
            }

            // Users
            if (info.data.includes('Users') && backupData.includes('Users')) {
                restorePromises.push(User.restore(restoreTmpPath, restoreMode))
            }

            // Customers
            if (info.data.includes('Clients') && backupData.includes('Clients')) {
                restorePromises.push(Client.restore(restoreTmpPath, restoreMode))
            }
            if (info.data.includes('Companies') && backupData.includes('Companies')) {
                restorePromises.push(Company.restore(restoreTmpPath, restoreMode))
            }

            // Templates
            if (info.data.includes('Templates') && backupData.includes('Templates')) {
                restorePromises.push(Template.restore(restoreTmpPath, restoreMode))
            }

            // Custom Data
            if (info.data.includes('Audit Types') && backupData.includes('Audit Types')) {
                restorePromises.push(AuditType.restore(restoreTmpPath, restoreMode))
            }
            if (info.data.includes('Custom Fields') && backupData.includes('Custom Fields')) {
                restorePromises.push(CustomField.restore(restoreTmpPath, restoreMode))
            }
            if (info.data.includes('Custom Sections') && backupData.includes('Custom Sections')) {
                restorePromises.push(CustomSection.restore(restoreTmpPath, restoreMode))
            }
            if (info.data.includes('Vulnerability Types') && backupData.includes('Vulnerability Types')) {
                restorePromises.push(VulnerabilityType.restore(restoreTmpPath, restoreMode))
            }
            if (info.data.includes('Vulnerability Categories') && backupData.includes('Vulnerability Categories')) {
                restorePromises.push(VulnerabilityCategory.restore(restoreTmpPath, restoreMode))
            }

            // Settings
            if (info.data.includes('Settings') && backupData.includes('Settings')) {
                restorePromises.push(Settings.restore(restoreTmpPath))
            }
            
            
            // return Promise.allSettled(restorePromises)
            return processPromisesSequentially(restorePromises)
        })
        .then(results => {
            let errors = []
            results.forEach(e => {
                if (e.status === 'rejected')
                    errors.push(e.reason)
            })

            if (errors.length === 0){
                setBackupState(STATE_IDLE)
                console.log('restore successfull')
            }
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
            setBackupState(STATE_RESTORE_ERROR, err.message)
            console.log(err)
        })
        .finally(() => {
            fs.rmSync(`${backupPath}/data.tar.gz`, {force: true})
            fs.rmSync(`${backupPath}/data.tar.gz.enc`, {force: true})
            fs.rmSync(restoreTmpPath, {recursive: true, force: true})
        })
        
        Response.Ok(res, 'Restore request submitted')
    })

    // Reset backup state if server was restarted during backup
    setBackupState(STATE_IDLE)
}
