var mongoose = require('mongoose');//.set('debug', true);
const cvss = require('ae-cvss-calculator');
var Schema = mongoose.Schema;

var Paragraph = {
    text:   String,
    images: [{image: String, caption: String}]
}

var customField = {
    _id:        false,
    customField: {type: Schema.Types.Mixed, ref: 'CustomField'},
    text:       Schema.Types.Mixed
}

var Finding = {
    id:                     Schema.Types.ObjectId,
    identifier:             Number, //incremental ID to be shown in the report
    title:                  String,
    vulnType:               String,
    description:            String,
    observation:            String,
    remediation:            String,
    remediationComplexity:  {type: Number, enum: [1,2,3]},
    priority:               {type: Number, enum: [1,2,3,4]},
    references:             [String],
    cvssv3:                 String,
    cvssv4:                 String,
    paragraphs:             [Paragraph],
    poc:                    String,
    scope:                  String,
    status:                 {type: Number, enum: [0,1], default: 1}, // 0: done, 1: redacting
    category:               String,
    customFields:           [customField],
    retestStatus:           {type: String, enum: ['ok', 'ko', 'unknown', 'partial']},
    retestDescription:      String
}

var Service = {
    port:       Number,
    protocol:   {type: String, enum: ['tcp', 'udp']},
    name:       String,
    product:    String,
    version:    String
}

var Host = {
    hostname:   String,
    ip:         String,
    os:         String,
    services:   [Service]
}

var SortOption = {
    _id:        false,
    category:   String,
    sortValue:  String,
    sortOrder:  {type: String, enum: ['desc', 'asc']},
    sortAuto:   Boolean
}

var Reply = new Schema ({
    author:     {type: Schema.Types.ObjectId, ref: 'User'},
    text:       {type: String, default: ""}
}, {timestamps: true})

var Comment = new Schema ({
    findingId:      {type: Schema.Types.ObjectId, ref: 'Finding', default: null},
    sectionId:      {type: Schema.Types.ObjectId, ref: 'Section', default: null},
    fieldName:      {type: String, default: ""},
    author:         {type: Schema.Types.ObjectId, ref: 'User'},
    text:           {type: String, default: ""},
    replies:        [Reply],
    resolved:       {type: Boolean, default: false}         
}, {timestamps: true})

var AuditSchema = new Schema({
    name:               {type: String, required: true},
    auditType:          String,
    date:               String,
    date_start:         String,
    date_end:           String,
    summary:            String,
    company:            {type: Schema.Types.ObjectId, ref: 'Company'},
    client:             {type: Schema.Types.ObjectId, ref: 'Client'},
    collaborators:      [{type: Schema.Types.ObjectId, ref: 'User'}],
    reviewers:          [{type: Schema.Types.ObjectId, ref: 'User'}],
    language:           {type: String, required: true},
    scope:              [{_id: false, name: String, hosts: [Host]}],
    findings:           [Finding],
    template:           {type: Schema.Types.ObjectId, ref: 'Template'},
    creator:            {type: Schema.Types.ObjectId, ref: 'User'},
    sections:           [{field: String, name: String, text: String, customFields: [customField]}], // keep text for retrocompatibility
    customFields:       [customField],
    sortFindings:       [SortOption],
    state:              { type: String, enum: ['EDIT', 'REVIEW', 'APPROVED'], default: 'EDIT'},
    approvals:          [{type: Schema.Types.ObjectId, ref: 'User'}],
    type:               {type: String, enum: ['default', 'multi', 'retest'], default: 'default'},
    parentId:           {type: Schema.Types.ObjectId, ref: 'Audit'},
    comments:           [Comment],

    // New fields for observations support (POC)
    reportType:         {type: String, enum: ['pentest', 'audit', 'compliance', 'risk', 'vendor', 'custom'], default: 'pentest'},
    useLegacyFindings:  {type: Boolean, default: true}  // Feature flag for backward compatibility
}, {timestamps: true});

/*
*** Statics ***
*/

// Get all audits (admin)
AuditSchema.statics.getAudits = (isAdmin, userId, filters) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.find(filters)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        query.populate('creator', 'username')
        query.populate('collaborators', 'username')
        query.populate('reviewers', 'username firstname lastname')
        query.populate('approvals', 'username firstname lastname')
        query.populate('company', 'name')
        query.select('id name auditType language creator collaborators company createdAt state type parentId')
        query.exec()
        .then((rows) => {
            resolve(rows)
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Get Audit with ID to generate report
AuditSchema.statics.getAudit = (isAdmin, auditId, userId) => {
    return new Promise((resolve, reject) => {
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        query.populate('template')
        query.populate('creator', 'username firstname lastname email phone role')
        query.populate('company')
        query.populate('client')
        query.populate('collaborators', 'username firstname lastname email phone role')
        query.populate('reviewers', 'username firstname lastname role')
        query.populate('approvals', 'username firstname lastname role')
        query.populate('customFields.customField', 'label fieldType text')
        query.populate({
            path: 'findings',
            populate: {
                path: 'customFields.customField',
                select: 'label fieldType text'
            }
        })
        query.populate('comments.author', 'username firstname lastname')
        query.populate('comments.replies.author', 'username firstname lastname')
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            resolve(row)
        })
        .catch((err) => {
            if (err.name === "CastError")
                reject({fn: 'BadParameters', message: 'Bad Audit Id'})
            else
                reject(err)
        })
    })
}

AuditSchema.statics.getAuditChildren = (isAdmin, auditId, userId) => {
    return new Promise((resolve, reject) => {
        var query = Audit.find({parentId: auditId})
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        query.exec()
        .then((rows) => {
            if (!rows)
                throw({fn: 'NotFound', message: 'Children not found or Insufficient Privileges'})
            resolve(rows)
        })
        .catch((err) => {
            if (err.name === "CastError")
                reject({fn: 'BadParameters', message: 'Bad Audit Id'})
            else
                reject(err)
        })
    })
}

// Get Audit Retest
AuditSchema.statics.getRetest = (isAdmin, auditId, userId) => {
    return new Promise((resolve, reject) => {
        var query = Audit.findOne({parentId: auditId})

        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'No retest found for this audit'})
            else {
                resolve(row)
            }
        })
        .catch((err) => {
            reject(err)
        })         
    })
}

// Create Audit Retest
AuditSchema.statics.createRetest = (isAdmin, auditId, userId, auditType) => {
    return new Promise((resolve, reject) => {
        var audit = {}
        audit.creator = userId
        audit.type = 'retest'
        audit.parentId = auditId
        audit.auditType = auditType
        audit.findings = []
        audit.sections = []
        audit.customFields = []

        var auditTypeSections = []
        var customSections = []
        var customFields = []
        var AuditType = mongoose.model('AuditType')

        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        query.exec()               
        .then(async (row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            else {
                var retest = await Audit.findOne({parentId: auditId}).exec()
                if (retest)
                    throw({fn: 'BadParameters', message: 'Retest already exists for this Audit'})
                audit.name = row.name
                audit.company = row.company
                audit.client = row.client
                audit.collaborators = row.collaborators
                audit.reviewers = row.reviewers
                audit.language = row.language
                audit.scope = row.scope
                audit.findings = row.findings
                // row.findings.forEach(finding => {
                //     var tmpFinding = {}
                //     tmpFinding.title = finding.title
                //     tmpFinding.identifier = finding.identifier
                //     tmpFinding.cvssv3 = finding.cvssv3
                //     tmpFinding.vulnType = finding.vulnType
                //     tmpFinding.category = finding.category
                //     audit.findings.push(tmpFinding)
                // })
                return AuditType.getByName(auditType)
            }
        })
        .then((row) => {
            if (row) {
                auditTypeSections = row.sections
                var auditTypeTemplate = row.templates.find(e => e.locale === audit.language)
                if (auditTypeTemplate)
                    audit.template = auditTypeTemplate.template
                var Section = mongoose.model('CustomSection')
                var CustomField = mongoose.model('CustomField')
                var promises = []
                promises.push(Section.getAll())
                promises.push(CustomField.getAll())
                return Promise.all(promises)
            }
            else
                throw({fn: 'NotFound', message: 'AuditType not found'})
        })
        .then(resolved => {
            customSections = resolved[0]
            customFields = resolved[1]

            customSections.forEach(section => { // Add sections with customFields (and default text) to audit
                var tmpSection = {}
                if (auditTypeSections.includes(section.field)) {
                    tmpSection.field = section.field
                    tmpSection.name = section.name
                    tmpSection.customFields = []

                    customFields.forEach(field => {
                        field = field.toObject()
                        if (field.display === 'section' && field.displaySub === tmpSection.name) {
                            var fieldText = field.text.find(e => e.locale === audit.language)
                            if (fieldText)
                                fieldText = fieldText.value
                            else
                                fieldText = ""
                            
                            delete field.text
                            tmpSection.customFields.push({customField: field, text: fieldText})
                        }
                    })
                    audit.sections.push(tmpSection)
                }
            })

            customFields.forEach(field => { // Add customFields (and default text) to audit
                field = field.toObject()
                if (field.display === 'general') {
                    var fieldText = field.text.find(e => e.locale === audit.language)
                    if (fieldText)
                        fieldText = fieldText.value
                    else
                        fieldText = ""

                    delete field.text
                    audit.customFields.push({customField: field, text: fieldText})
                }
            })

            return new Audit(audit).save()
        })
        .then((rows) => {
            resolve(rows)
        })
        .catch((err) => {
            console.log(err)
            if (err.name === "ValidationError")
                reject({fn: 'BadParameters', message: 'Audit validation failed'})
            else
                reject(err)
        })
    })
}

// Create audit
AuditSchema.statics.create = (audit, userId) => {
    return new Promise((resolve, reject) => {
        audit.creator = userId
        audit.sections = []
        audit.customFields = []

        var auditTypeSections = []
        var customSections = []
        var customFields = []
        var AuditType = mongoose.model('AuditType')
        AuditType.getByName(audit.auditType)
        .then((row) => {
            if (row) {
                auditTypeSections = row.sections
                var auditTypeTemplate = row.templates.find(e => e.locale === audit.language)
                if (auditTypeTemplate)
                    audit.template = auditTypeTemplate.template
                var Section = mongoose.model('CustomSection')
                var CustomField = mongoose.model('CustomField')
                var promises = []
                promises.push(Section.getAll())
                promises.push(CustomField.getAll())
                return Promise.all(promises)
            }
            else
                throw({fn: 'NotFound', message: 'AuditType not found'})
        })
        .then(resolved => {
            customSections = resolved[0]
            customFields = resolved[1]

            customSections.forEach(section => { // Add sections with customFields (and default text) to audit
                var tmpSection = {}
                if (auditTypeSections.includes(section.field)) {
                    tmpSection.field = section.field
                    tmpSection.name = section.name
                    tmpSection.customFields = []

                    customFields.forEach(field => {
                        field = field.toObject()
                        if (field.display === 'section' && field.displaySub === tmpSection.name) {
                            var fieldText = field.text.find(e => e.locale === audit.language)
                            if (fieldText)
                                fieldText = fieldText.value
                            else
                                fieldText = ""
                            
                            delete field.text
                            tmpSection.customFields.push({customField: field, text: fieldText})
                        }
                    })
                    audit.sections.push(tmpSection)
                }
            })

            customFields.forEach(field => { // Add customFields (and default text) to audit
                field = field.toObject()
                if (field.display === 'general') {
                    var fieldText = field.text.find(e => e.locale === audit.language)
                    if (fieldText)
                        fieldText = fieldText.value
                    else
                        fieldText = ""

                    delete field.text
                    audit.customFields.push({customField: field, text: fieldText})
                }
            })

            var VulnerabilityCategory = mongoose.model('VulnerabilityCategory')
            return VulnerabilityCategory.getAll()
        })
        .then((rows) => {
            // Add default sort options for each vulnerability category
            audit.sortFindings = []
            rows.forEach(e => {
                audit.sortFindings.push({
                    category: e.name,
                    sortValue: e.sortValue,
                    sortOrder: e.sortOrder,
                    sortAuto: e.sortAuto
                })
            })

            return new Audit(audit).save()
        })
        .then((rows) => {
            resolve(rows)
        })
        .catch((err) => {
            console.log(err)
            if (err.name === "ValidationError")
                reject({fn: 'BadParameters', message: 'Audit validation failed'})
            else
                reject(err)
        })
    })
}

// Delete audit
AuditSchema.statics.delete = (isAdmin, auditId, userId) => {
    return new Promise((resolve, reject) => {
        var query = Audit.findOneAndDelete({_id: auditId})
        if (!isAdmin)
            query.or([{creator: userId}])
        return query.exec()               
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            
            resolve(row)
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Get audit general information
AuditSchema.statics.getGeneral = (isAdmin, auditId, userId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId);
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        query.populate({
            path: 'client', 
            select: 'email firstname lastname', 
            populate: {
                path: 'company', 
                select: 'name'}
            });
        query.populate('creator', 'username firstname lastname')
        query.populate('collaborators', 'username firstname lastname')
        query.populate('reviewers', 'username firstname lastname')
        query.populate('company')
        query.select('name auditType date date_start date_end client collaborators language scope.name template customFields')
        query.lean().exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'});

            var formatScope = row.scope.map(item => {return item.name})
            for (var i=0;i<formatScope.length;i++) {
                row.scope[i] = formatScope[i]
            }
            resolve(row)
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Update audit general information
AuditSchema.statics.updateGeneral = (isAdmin, auditId, userId, update) => {
    return new Promise(async(resolve, reject) => { 
        if (update.company && update.company.name) {
            var Company = mongoose.model("Company");
            try {
                update.company = await Company.create({name: update.company.name})
            } catch (error) {
                console.log(error)
                delete update.company
            }
        }
        var query = Audit.findByIdAndUpdate(auditId, update)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then(row => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            
            resolve("Audit General updated successfully")
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Get audit Network information
AuditSchema.statics.getNetwork = (isAdmin, auditId, userId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        query.select('scope')
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            
            resolve(row)
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Update audit Network information
AuditSchema.statics.updateNetwork = (isAdmin, auditId, userId, scope) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findByIdAndUpdate(auditId, scope)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then(row => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})

            resolve("Audit Network updated successfully")
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Create finding
AuditSchema.statics.createFinding = (isAdmin, auditId, userId, finding) => {
    return new Promise((resolve, reject) => { 
        Audit.getLastFindingIdentifier(auditId)
        .then(identifier => {
            finding.identifier = ++identifier
            
            var query = Audit.findByIdAndUpdate(auditId, {$push: {findings: finding}})
            if (!isAdmin)
                query.or([{creator: userId}, {collaborators: userId}])
            return query.exec()
        .then(row => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            else {
                var sortOption = row.sortFindings.find(e => e.category === (finding.category || 'No Category'))
                if ((sortOption && sortOption.sortAuto) || !sortOption) // if sort is set to automatic or undefined then we sort (default sort will be applied to undefined sortOption)
                    return Audit.updateSortFindings(isAdmin, auditId, userId, null)
                else // if manual sorting then we do not sort
                    resolve("Audit Finding created succesfully")
            }
        })
        .then(() => {
            resolve("Audit Finding created successfully")
        })
        .catch((err) => {
            reject(err)
        })
    })
})
}

AuditSchema.statics.getLastFindingIdentifier = (auditId) => {
    return new Promise((resolve, reject) => {
        var query = Audit.aggregate([{ $match: {_id: new mongoose.Types.ObjectId(auditId)} }])
        query.unwind('findings')
        query.sort({'findings.identifier': -1})
        query.exec()
        .then(row => {
            if (!row)
                throw ({ fn: 'NotFound', message: 'Audit not found' })
            else if (row.length === 0 || !row[0].findings.identifier)
                resolve(0)
            else
                resolve(row[0].findings.identifier);
        })
        .catch((err) => {
            reject(err)
        })
    })
};

// Get finding of audit
AuditSchema.statics.getFinding = (isAdmin, auditId, userId, findingId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        query.select('findings')
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})

            var finding = row.findings.id(findingId)
            if (finding === null) 
                throw({fn: 'NotFound', message: 'Finding not found'})
            else 
                resolve(finding)
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Update finding of audit
AuditSchema.statics.updateFinding = (isAdmin, auditId, userId, findingId, newFinding) => {
    return new Promise((resolve, reject) => { 
        var sortAuto = true

        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})

            var finding = row.findings.id(findingId)
            if (finding === null)
                reject({fn: 'NotFound', message: 'Finding not found'})         
            else {
                var sortOption = row.sortFindings.find(e => e.category === (newFinding.category || 'No Category'))
                if (sortOption && !sortOption.sortAuto)
                    sortAuto = false

                Object.keys(newFinding).forEach((key) => {
                    finding[key] = newFinding[key]
                })
                return row.save({ validateBeforeSave: false }) // Disable schema validation since scope changed from Array to String
            } 
        })
        .then(() => {
            if (sortAuto)
                return Audit.updateSortFindings(isAdmin, auditId, userId, null)
            else
                resolve("Audit Finding updated successfully")
        })
        .then(() => {
            resolve("Audit Finding updated successfully")        
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Delete finding of audit
AuditSchema.statics.deleteFinding = (isAdmin, auditId, userId, findingId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.select('findings')
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})

            var finding = row.findings.id(findingId)
            if (finding === null) reject({fn: 'NotFound', message: 'Finding not found'})
            else {
                row.findings.pull(findingId)
                return row.save()
            }
        })
        .then(() => {
            resolve("Audit Finding deleted successfully")
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Create section
AuditSchema.statics.createSection = (isAdmin, auditId, userId, section) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findOneAndUpdate({_id: auditId, 'sections.field': {$ne: section.field}}, {$push: {sections: section}})
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Section already exists or Insufficient Privileges'})
            
            resolve('Audit Section created successfully')
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Get section of audit
AuditSchema.statics.getSection = (isAdmin, auditId, userId, sectionId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])

        query.select('sections')
        query.exec()
        .then((row) => {
            if (!row)
            throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})

            var section = row.sections.id(sectionId);
            if (section === null) 
                throw({fn: 'NotFound', message: 'Section id not found'});
            else 
                resolve(section);
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Update section of audit
AuditSchema.statics.updateSection = (isAdmin, auditId, userId, sectionId, newSection) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            
            var section = row.sections.id(sectionId)
            if (section === null)
                throw({fn: 'NotFound', message: 'Section not found'})          
            else {
                Object.keys(newSection).forEach((key) => {
                    section[key] = newSection[key]
                })
                return row.save()
            } 
        })
        .then(() => {
            resolve('Audit Section updated successfully')        
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Delete section of audit
AuditSchema.statics.deleteSection = (isAdmin, auditId, userId, sectionId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.select('sections')
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})

            var section = row.sections.id(sectionId)
            if (section === null) throw({fn: 'NotFound', message: 'Section not found'})
            else {
                row.sections.pull(sectionId)
                return row.save()
            }
        })
        .then(() => {
            resolve('Audit Section deleted successfully')
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Update audit sort options for findings and run the sorting. If update param is null then just run sorting
AuditSchema.statics.updateSortFindings = (isAdmin, auditId, userId, update) => {
    return new Promise(async (resolve, reject) => {
        var Settings = mongoose.model('Settings');
        var settings = await Settings.getAll();

        var audit = {} 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then(row => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            else {
                audit = row
                if (update) // if update is null then we only sort findings (no sort options saving)
                    audit.sortFindings = update.sortFindings // saving sort options to audit

                var VulnerabilityCategory = mongoose.model('VulnerabilityCategory')
                return VulnerabilityCategory.getAll()
                
            }            
        })
        .then(row => {
            var _ = require('lodash')
            var findings = []
            var categoriesOrder = row.map(e => e.name)
            categoriesOrder.push("undefined") // Put uncategorized findings at the end

            // Group findings by category
            var findingList = _
            .chain(audit.findings)
            .groupBy("category")
            .toPairs()
            .sort((a,b) => categoriesOrder.indexOf(a[0]) - categoriesOrder.indexOf(b[0]))
            .fromPairs()
            .map((value, key) => {
                if (key === 'undefined') key = 'No Category'
                var sortOption = audit.sortFindings.find(option => option.category === key) // Get sort option saved in audit
                if (!sortOption) // no option for category in audit
                    sortOption = row.find(e => e.name === key) // Get sort option from default in vulnerability category
                if (!sortOption) // no default option or category don't exist
                    sortOption = {sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true} // set a default sort option

                return {category: key, findings: value, sortOption: sortOption}
            })
            .value()

            findingList.forEach(group => {
                var order = -1 // desc
                if (group.sortOption.sortOrder === 'asc') order = 1

                var tmpFindings = group.findings
                .sort((a,b) => {
                    var cvssA = null;
                    var cvssB = null;

                    if (settings.report.public.scoringMethods.CVSS4 && a.cvssv4) {
                        var cvssA = new cvss.Cvss4P0(a.cvssv4).createJsonSchema()

                        // Fix for the CVSS 4 -> CVSS 3.1 value mappings
                        cvssA.temporalScore = cvssA.threatScore
                    } else if (settings.report.public.scoringMethods.CVSS3 && a.cvssv3) {
                        var cvssA = new cvss.Cvss3P1(a.cvssv3).createJsonSchema()
                    }

                    if (settings.report.public.scoringMethods.CVSS4 && b.cvssv4) {
                        var cvssB = new cvss.Cvss4P0(b.cvssv4).createJsonSchema()

                        // Fix for the CVSS 4 -> CVSS 3.1 value mappings
                        cvssB.temporalScore = cvssB.threatScore
                    } else if (settings.report.public.scoringMethods.CVSS3 && b.cvssv3) {
                        var cvssB = new cvss.Cvss3P1(b.cvssv3).createJsonSchema()
                    }

                    // Get built-in value (findings[sortValue])
                    var left = a[group.sortOption.sortValue]

                    // If sort value is a CVSS Score calculate it
                    if (cvssA) {
                        if (!isNaN(cvssA.baseScore) && group.sortOption.sortValue === 'cvssScore')
                            left = cvssA.baseScore
                        else if (!isNaN(cvssA.temporalScore) && group.sortOption.sortValue === 'cvssTemporalScore')
                            left = cvssA.temporalScore
                        else if (!isNaN(cvssA.environmentalScore) && group.sortOption.sortValue === 'cvssEnvironmentalScore')
                            left = cvssA.environmentalScore
                    }

                    // Not found then get customField sortValue
                    if (!left) {
                        left = a.customFields.find(e => e.customField.label === group.sortOption.sortValue)
                        if (left)
                            left = left.text
                    }
                    // Not found then set default to 0
                    if (!left)
                        left = 0
                    // Convert to string in case of int value
                    left = left.toString()
                    
                    // Same for right value to compare
                    var right = b[group.sortOption.sortValue]

                    if (cvssB) {
                        if (!isNaN(cvssB.baseScore) && group.sortOption.sortValue === 'cvssScore')
                            right = cvssB.baseScore
                        else if (!isNaN(cvssB.temporalScore) && group.sortOption.sortValue === 'cvssTemporalScore')
                            right = cvssB.temporalScore
                        else if (!isNaN(cvssB.environmentalScore) && group.sortOption.sortValue === 'cvssEnvironmentalScore')
                            right = cvssB.environmentalScore
                    }

                    if (!right) {
                        right = b.customFields.find(e => e.customField.label === group.sortOption.sortValue)
                        if (right)
                            right = right.text
                    }
                    if (!right)
                        right = 0
                    right = right.toString()
                    return left.localeCompare(right, undefined, {numeric: true}) * order
                })

                findings = findings.concat(tmpFindings)
            })

            audit.findings = findings

            return audit.save()
        })
        .then(() => {
            resolve("Audit findings sorted successfully")
        })
        .catch((err) => {
            console.log(err)
            reject(err)
        })
    })
},

// Move finding from move.oldIndex to move.newIndex
AuditSchema.statics.moveFindingPosition = (isAdmin, auditId, userId, move) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            
            var tmp = row.findings[move.oldIndex]
            row.findings.splice(move.oldIndex, 1)
            row.findings.splice(move.newIndex, 0, tmp)

            row.markModified('findings')
            return row.save()
        })
        .then((msg) => {
            resolve('Audit Finding moved successfully') 
        })
        .catch((err) => {
            reject(err)
        })
    })
}

AuditSchema.statics.updateApprovals = (isAdmin, auditId, userId, update) => {
    return new Promise(async (resolve, reject) => {
        var Settings = mongoose.model('Settings');
        var settings = await Settings.getAll();

        if (update.approvals.length >= settings.reviews.public.minReviewers) {
            update.state = "APPROVED";
        } else {
            update.state = "REVIEW";
        }
        
        var query = Audit.findByIdAndUpdate(auditId, update)
        query.nor([{creator: userId}, {collaborators: userId}]);
        if (!isAdmin)
            query.or([{reviewers: userId}]);
        
        query.exec()
        .then(row => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'});
            
            resolve("Audit approvals updated successfully");
        })
        .catch((err) => {
            reject(err)
        })
    });
}

// Update audit parent
AuditSchema.statics.updateParent = (isAdmin, auditId, userId, parentId) => {
    return new Promise(async(resolve, reject) => { 
        var query = Audit.findByIdAndUpdate(auditId, {parentId: parentId})
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then(row => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            
            resolve("Audit Parent updated successfully")
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Delete audit parent
AuditSchema.statics.deleteParent = (isAdmin, auditId, userId) => {
    return new Promise(async(resolve, reject) => { 
        var query = Audit.findByIdAndUpdate(auditId, {parentId: null})
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then(row => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            
            resolve(row)
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Create Comment
AuditSchema.statics.createComment = (isAdmin, auditId, userId, comment) => {
    return new Promise(async(resolve, reject) => {
        var query = Audit.findByIdAndUpdate(auditId, {$push: {comments: comment}}, {new: true})
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then(row => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})
            else
                resolve(row.comments[row.comments.length - 1]);
        })
        .catch((err) => {
            reject(err);
        })
    })
}

// Delete Comment
AuditSchema.statics.deleteComment = (isAdmin, auditId, userId, commentId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.select('comments')
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})

            var comment = row.comments.id(commentId)
            if (comment === null) reject({fn: 'NotFound', message: 'Comment not found'})
            else {
                row.comments.pull(commentId)
                return row.save()
            }
        })
        .then(() => {
            resolve("Audit Comment deleted successfully")
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Update comment of audit
AuditSchema.statics.updateComment = (isAdmin, auditId, userId, commentId, newComment) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId)
        if (!isAdmin)
            query.or([{creator: userId}, {collaborators: userId}])
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Audit not found or Insufficient Privileges'})

            var comment = row.comments.id(commentId)
            if (comment === null)
                reject({fn: 'NotFound', message: 'Comment not found'})         
            else {
                Object.keys(newComment).forEach((key) => {
                    comment[key] = newComment[key]
                })
                return row.save()
            } 
        })
        .then(() => {
            resolve("Audit Comment updated successfully")
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Get images from audit ID list (mainly for backup purposes)
AuditSchema.statics.getAuditsImages = (auditsIds = []) => {
    return new Promise((resolve, reject) => {
        var imgRegex = new RegExp(/img src=["']([0-9a-f]{24})["']/)
        var matchFilter = {
            $or: [
                {"customFields.text": {$regex: imgRegex}},
                {"sections.customFields.text": {$regex: imgRegex}},
                {"findings.description": {$regex: imgRegex}},
                {"findings.observation": {$regex: imgRegex}},
                {"findings.poc": {$regex: imgRegex}},
                {"findings.remediation": {$regex: imgRegex}},
                {"findings.retestDescription": {$regex: imgRegex}},
                {"findings.customFields.text": {$regex: imgRegex}}
            ]
        }
        if (auditsIds.length > 0)
            matchFilter['_id'] = {$in: auditsIds.map(e => new mongoose.Types.ObjectId(e))}
        var query = Audit.aggregate([{$match: matchFilter}])
        query.unwind({path: '$customFields', preserveNullAndEmptyArrays: true})
        query.unwind('$sections')
        query.unwind('$sections.customFields')
        query.unwind('$findings')
        query.unwind({path: '$findings.customFields', preserveNullAndEmptyArrays: true})
        query.addFields({
            imageFields: {
            $concat: [
                {$cond: [{$eq: [{$type: "$customFields.text"}, "string"]}, "$customFields.text", ""]},
                {$cond: [{$eq: [{$type: "$sections.customFields.text"}, "string"]}, "$sections.customFields.text", ""]},
                {$cond: [{$eq: [{$type: "$findings.description"}, "string"]}, "$findings.description", ""]},
                {$cond: [{$eq: [{$type: "$findings.observation"}, "string"]}, "$findings.observation", ""]},
                {$cond: [{$eq: [{$type: "$findings.poc"}, "string"]}, "$findings.poc", ""]},
                {$cond: [{$eq: [{$type: "$findings.remediation"}, "string"]}, "$findings.remediation", ""]},
                {$cond: [{$eq: [{$type: "$findings.retestDescription"}, "string"]}, "$findings.retestDescription", ""]},
                {$cond: [{$eq: [{$type: "$findings.customFields.text"}, "string"]}, "$findings.customFields.text", ""]},
            ],
            },
        })
        query.project({
            _id: 0,
            name: "$name",
            images: {
                $regexFindAll: {
                    input: "$imageFields",
                    regex: imgRegex,
                },
            },
        })
        query.exec()
        .then(row => {
            if (!row)
            throw ({ fn: 'NotFound', message: 'Audits not found' })
            else {
                var images = []
                row.forEach(e => e.images.forEach(img => images.push(img.captures[0])))
                var imagesUniq = [...new Set(images)]
                resolve(imagesUniq);
            }
        })
        .catch((err) => {
            reject(err)
        })
    })
}

AuditSchema.statics.backup = (path, auditsIds = []) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function exportAuditsPromise() {
            return new Promise((resolve, reject) => {
                let filters = {}
                const writeStream = fs.createWriteStream(`${path}/audits.json`)
                writeStream.write('[')

                if (auditsIds.length > 0)
                    filters = {'_id': {$in: auditsIds}}
                let audits = Audit.find(filters).cursor()
                let isFirst = true

                audits.eachAsync(async (document) => {
                    if (!isFirst) {
                        writeStream.write(',')
                    } else {
                        isFirst = false
                    }
                    writeStream.write(JSON.stringify(document, null, 2))
                    return Promise.resolve()
                })
                .then(() => {
                    writeStream.write(']');
                    writeStream.end();
                })
                .catch((error) => {
                    reject(error);
                });

                writeStream.on('finish', () => {
                    resolve('ok');
                });
            
                writeStream.on('error', (error) => {
                    reject(error);
                });
            })
        }

        function exportImagesPromise() {
            return new Promise(async (resolve, reject) => {
                const Image = mongoose.model("Image");
                const writeStream = fs.createWriteStream(`${path}/audits-images.json`)
                writeStream.write('[')

                let auditsImages = await Audit.getAuditsImages(auditsIds)
                let images = Image.find({'_id': {'$in': auditsImages}}).cursor()

                let isFirst = true
                images.eachAsync(async (document) => {
                    if (!isFirst) {
                        writeStream.write(',')
                    } else {
                        isFirst = false
                    }
                    writeStream.write(JSON.stringify(document, null, 2))
                    return Promise.resolve()
                })
                .then(() => {
                    writeStream.write(']');
                    writeStream.end();
                })
                .catch((error) => {
                    reject(error);
                });

                writeStream.on('finish', () => {
                    resolve('ok');
                });
            
                writeStream.on('error', (error) => {
                    reject(error);
                });
            })
        }

        try {
            await Promise.all([exportAuditsPromise(), exportImagesPromise()])
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Audit'})
        }
            
    })
}

AuditSchema.statics.restore = (path, mode = "upsert") => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function importAuditsPromise() {
            let documents = []
            
            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/audits.json`)
                const JSONStream = require('JSONStream')

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                jsonStream.on('data', (document) => {
                    documents.push(document)
                    if (documents.length === 10) {
                        jsonStream.pause()
                        Audit.bulkWrite(documents.map(document => {
                            return {
                                replaceOne: {
                                    filter: {_id: document._id},
                                    replacement: document,
                                    upsert: true
                                }
                            }
                        }))
                        .then(() => {
                            documents = []
                            jsonStream.resume()
                        })
                        .catch(err => {
                            reject(err)
                        })
                    }
                })
                jsonStream.on('end', () => {
                    if (documents.length > 0) {
                        Audit.bulkWrite(documents.map(document => {
                            return {
                                replaceOne: {
                                    filter: {_id: document._id},
                                    replacement: document,
                                    upsert: true
                                }
                            }
                        }))
                        .then(() => {
                            resolve()
                        })
                        .catch(err => {
                            reject(err)
                        })  
                    }
                    else
                        resolve()
                })
                jsonStream.on('error', (error) => {
                    reject(error)
                })
            })
        }

        function importImagesPromise() {
            let documents = []

            return new Promise((resolve, reject) => {
                const Image = mongoose.model("Image");
                const readStream = fs.createReadStream(`${path}/audits-images.json`)
                const JSONStream = require('JSONStream')

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                jsonStream.on('data', (document) => {
                    documents.push(document)
                    if (documents.length === 10) {
                        jsonStream.pause()
                        Image.bulkWrite(documents.map(document => {
                            return {
                                replaceOne: {
                                    filter: {_id: document._id},
                                    replacement: document,
                                    upsert: true
                                }
                            }
                        }))
                        .then(() => {
                            documents = []
                            jsonStream.resume()
                        })
                        .catch(err => {
                            reject(err)
                        })
                    }
                })
                jsonStream.on('end', () => {
                    if (documents.length > 0) {
                        Image.bulkWrite(documents.map(document => {
                            return {
                                replaceOne: {
                                    filter: {_id: document._id},
                                    replacement: document,
                                    upsert: true
                                }
                            }
                        }))
                        .then(() => {
                            resolve()
                        })
                        .catch(err => {
                            reject(err)
                        })
                    }
                    else
                        resolve()
                })
                jsonStream.on('error', (error) => {
                    reject(error)
                })
           })
        }

        try {
            if (mode === "revert")
                await Audit.deleteMany()
            await importAuditsPromise()
            await importImagesPromise()
            // await Promise.all([importAuditsPromise(), importImagesPromise()])
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Audit'})
        }
    })
}



/*
*** Methods ***
*/

var Audit = mongoose.model('Audit', AuditSchema);
// Audit.syncIndexes()
module.exports = Audit;