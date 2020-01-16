var mongoose = require('mongoose');//.set('debug', true);
var Schema = mongoose.Schema;

var _ = require('lodash');

var Paragraph = {
    text:   String,
    images: [{image: String, caption: String}]
}

var Finding = {
    id:                     Schema.Types.ObjectId,
    title:                  String,
    vulnType:               String,
    description:            String,
    observation:            String,
    remediation:            String,
    remediationComplexity:  {type: Number, enum: [1,2,3]},
    priority:               {type: Number, enum: [1,2,3,4]},
    references:             [String],
    cvssv3:                 String,
    cvssScore:              String,
    cvssSeverity:           String,
    paragraphs:             [Paragraph],
    scope:                  [String],
    status:                 {type: Number, enum: [0,1], default: 1} // 0: done, 1: redacting
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

var AuditSchema = new Schema({
    name:               {type: String, required: true},
    auditType:          String,
    location:           String,
    date:               String,
    date_start:         String,
    date_end:           String,
    summary:            String,
    company:            {type: Schema.Types.ObjectId, ref: 'Company'},
    client:             {type: Schema.Types.ObjectId, ref: 'Client'},
    collaborators:      [{type: Schema.Types.ObjectId, ref: 'User'}],
    language:           {type: String, required: true},
    scope:              [{_id: false, name: String, hosts: [Host]}],
    findings:           [Finding],
    template:           {type: Schema.Types.ObjectId, ref: 'Template'},
    creator:            {type: Schema.Types.ObjectId, ref: 'User'},
    sections:           [{field: String, name: String, paragraphs: [Paragraph]}]

}, {timestamps: true});

/*
*** Statics ***
*/

// Get all audits (admin)
AuditSchema.statics.getAll = (filters) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.find(filters)
        query.populate('creator', '-_id username');
        query.populate('collaborators', '-_id username');
        query.populate('company', '-_id name');
        query.select('id name language creator collaborators company createdAt');
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get all audits for username
AuditSchema.statics.getAllForUser = (username, filters) => {
    return new Promise((resolve, reject) => {
        var User = mongoose.model('User');
        var query = User.findOne({username: username});
        query.exec()
        .then((row) => {
            if (row) {
                var query = Audit.find(filters).or([{creator: row._id}, {collaborators: row._id}]);
                query.populate('creator', '-_id username');
                query.populate('collaborators', '-_id username');
                query.populate('company', '-_id name');
                query.select('id name language creator collaborators company createdAt');
                return query.exec();
            }
            else
                reject({fn: 'BadParameters', message: 'User not found'});
        })
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get Audit with ID to generate report
AuditSchema.statics.getAudit = (auditId) => {
    return new Promise((resolve, reject) => {
        var query = Audit.findById(auditId);
        query.populate('template');
        query.populate('creator');
        query.populate('company');
        query.exec()
        .then((row) => {
            if (row)
                resolve(row);
            else
                reject({fn: 'BadParameters', message: 'Audit not found'});
        })
        .catch((err) => {
            if (err.name === "CastError")
                reject({fn: 'BadParameters', message: 'Bad Audit Id'});
            else
                reject(err);
        })
    });
}

// Get Audit with ID to generate report and check user has right to access
AuditSchema.statics.getAuditForUser = (auditId, username) => {
    return new Promise((resolve, reject) => {
        var User = mongoose.model('User');
        var query = User.findOne({username: username});
        query.exec()
        .then(row => {
            if (row) {
                var query = Audit.findById(auditId).or([{creator: row._id}, {collaborators: row._id}]);
                query.populate('template');
                query.populate('creator');
                query.populate('company');
                return query.exec();
            }
            else
                reject({fn: 'BadParameters', message: 'User not found'});
        })
        .then((row) => {
            if (row)
                resolve(row);
            else
                reject({fn: 'BadParameters', message: 'Audit not found'});
        })
        .catch((err) => {
            if (err.name === "CastError")
                reject({fn: 'BadParameters', message: 'Bad Audit Id'});
            else
                reject(err);
        })
    });
}

// Create audit
AuditSchema.statics.create = (audit, username) => {
    return new Promise((resolve, reject) => {
        var User = mongoose.model('User');
        var query = User.findOne({username: username});
        query.exec()
        .then((row) => {
            if (row) {
                var Template = mongoose.model('Template');
                var query = Template.findById(audit.template);
                audit.creator = row._id;
                return query.exec();
            }
            else
                reject({fn: 'BadParameters', message: 'User not found'});
            
        })
        .then((row) => {
            if (row) {
                return new Audit(audit).save();                
            }
            else
                reject({fn: 'BadParameters', message: 'Template not found'});
        })
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Delete audit
AuditSchema.statics.delete = (auditId, username, role) => {
    return new Promise((resolve, reject) => {
        var User = mongoose.model('User');
        var query = User.findOne({username: username});
        query.exec()
        .then((row) => {
            if (row) {
                var query = Audit.findById(auditId);
                query.populate('creator');
                return query.exec();
            }
            else
                reject({fn: 'BadParameters', message: 'User not found'});
            
        })
        .then((row) => {
            if (row && (row.creator.username === username || role === 'admin')) {
                var query = Audit.findOneAndRemove({_id: auditId});
                return query.exec();                
            }
            else if (!row)
                reject({fn: 'BadParameters', message: 'Audit not found'});
            else
                reject({fn: 'Forbidden', message: 'User is not the creator of this Audit'});
        })
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get audit general information
AuditSchema.statics.getGeneral = (id) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(id);
        query.populate({
            path: 'client', 
            select: 'email firstname lastname', 
            populate: {
                path: 'company', 
                select: 'name'}
            });
        query.populate('collaborators', 'username firstname lastname');
        query.populate('company');
        query.select('id name auditType location date date_start date_end client collaborators language scope.name template');
        query.exec()
        .then((row) => {
            var formatScope = row.scope.map(item => {return item.name});
            for (var i=0;i<formatScope.length;i++) {
                row.scope[i] = formatScope[i];
            }
            resolve(row);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Update audit general information
AuditSchema.statics.updateGeneral = (id, update) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findByIdAndUpdate(id, update);
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get audit Network information
AuditSchema.statics.getNetwork = (id) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(id);
        query.select('id scope');
        query.exec()
        .then((row) => {
            resolve(row);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Update audit Network information
AuditSchema.statics.updateNetwork = (id, scope) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findByIdAndUpdate(id, scope);
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create finding
AuditSchema.statics.createFinding = (auditId, finding) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findByIdAndUpdate(auditId, {$push: {findings: {$each: [finding], $sort: {cvssScore: -1}}}});
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get findings list titles
AuditSchema.statics.getFindings = (auditId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId);
        query.select('-_id findings._id findings.title findings.cvssSeverity findings.cvssScore');
        query.sort({'findings.cvssScore': -1})
        query.exec()
        .then((row) => {
            resolve(row);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get finding of audit
AuditSchema.statics.getFinding = (auditId, findingId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId);
        query.select('findings')
        query.exec()
        .then((row) => {
            var finding = row.findings.id(findingId);
            if (finding === null) reject({fn: 'BadParameters', message: 'Finding id not found'});
            else resolve(finding);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Update finding of audit
AuditSchema.statics.updateFinding = (auditId, findingId, newFinding) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId);
        query.exec()
        .then((row) => {
            var finding = row.findings.id(findingId);
            if (finding === null)
                reject({fn: 'BadParameters', message: 'Finding id not found'});           
            else {
                Object.keys(newFinding).forEach((key) => {
                    finding[key] = newFinding[key]
                })
                return row.save()
            } 
        })
        .then(() => {
            return Audit.findByIdAndUpdate(auditId, {$push: {findings: {$each: [], $sort: {cvssScore: -1}}}});
        })
        .then(() => {
            resolve();            
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Delete finding of audit
AuditSchema.statics.deleteFinding = (auditId, findingId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId);
        query.select('findings')
        query.exec()
        .then((row) => {
            var finding = row.findings.id(findingId);
            if (finding === null) reject({fn: 'BadParameters', message: 'Finding id not found'});
            else {
                row.findings.pull(findingId);
                return row.save();
            }
        })
        .then(() => {
            resolve();
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get audit Summary
AuditSchema.statics.getSummary = (id) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(id);
        query.select('id summary');
        query.exec()
        .then((row) => {
            resolve(row);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Update audit Summary
AuditSchema.statics.updateSummary = (id, update) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findByIdAndUpdate(id, update);
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create section
AuditSchema.statics.createSection = (auditId, section) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findOneAndUpdate({_id: auditId, 'sections.field': {$ne: section.field}}, {$push: {sections: section}});
        query.exec()
        .then((row) => {
            if (row)
                resolve(row);
            else
                reject({fn: 'BadParameters', message: 'Section already exists'})
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get section of audit
AuditSchema.statics.getSection = (auditId, sectionId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId);
        query.select('sections')
        query.exec()
        .then((row) => {
            var section = row.sections.id(sectionId);
            if (section === null) reject({fn: 'BadParameters', message: 'Section id not found'});
            else resolve(section);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Update section of audit
AuditSchema.statics.updateSection = (auditId, sectionId, newSection) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId);
        query.exec()
        .then((row) => {
            var section = row.sections.id(sectionId);
            if (section === null)
                reject({fn: 'BadParameters', message: 'Section id not found'});           
            else {
                Object.keys(newSection).forEach((key) => {
                    section[key] = newSection[key]
                })
                return row.save()
            } 
        })
        .then(() => {
            resolve();            
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Delete section of audit
AuditSchema.statics.deleteSection = (auditId, sectionId) => {
    return new Promise((resolve, reject) => { 
        var query = Audit.findById(auditId);
        query.select('sections')
        query.exec()
        .then((row) => {
            var section = row.sections.id(sectionId);
            if (section === null) reject({fn: 'BadParameters', message: 'Section id not found'});
            else {
                row.sections.pull(sectionId);
                return row.save();
            }
        })
        .then(() => {
            resolve();
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Search audits (admin)
AuditSchema.statics.search = () => {
    return new Promise((resolve, reject) => { 
        var query = Audit.find()
        query.populate('creator', '-_id username');
        query.populate('collaborators', '-_id username');
        query.populate('company', '-_id name');
        query.select('id name language creator collaborators company createdAt');
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Search audits for username
AuditSchema.statics.searchForUser = (username) => {
    return new Promise((resolve, reject) => {
        var User = mongoose.model('User');
        var query = User.findOne({username: username});
        query.exec()
        .then((row) => {
            if (row) {
                var query = Audit.find().or([{creator: row._id}, {collaborators: row._id}]);
                query.populate('creator', '-_id username');
                query.populate('collaborators', '-_id username');
                query.populate('company', '-_id name');
                query.select('id name language creator collaborators company createdAt');
                return query.exec();
            }
            else
                reject({fn: 'BadParameters', message: 'User not found'});
        })
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

/*
*** Methods ***
*/

var Audit = mongoose.model('Audit', AuditSchema);
// Audit.syncIndexes()
module.exports = Audit;