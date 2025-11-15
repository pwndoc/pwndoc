var mongoose = require('mongoose');
const cvss = require('ae-cvss-calculator');
var Schema = mongoose.Schema;

var Paragraph = {
    text: String,
    images: [{image: String, caption: String}]
}

var customField = {
    _id: false,
    customField: {type: Schema.Types.Mixed, ref: 'CustomField'},
    text: Schema.Types.Mixed
}

// Flexible risk scoring object
var RiskScore = {
    _id: false,
    method: {
        type: String,
        enum: ['cvss3', 'cvss4', 'matrix', 'custom', 'none'],
        default: 'custom'
    },
    vector: String,          // CVSS vector string or custom identifier
    score: Number,           // Calculated or manual score (0-10)
    severity: {              // Risk severity level
        type: String,
        enum: ['None', 'Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    likelihood: String,      // For risk matrix: "Low", "Medium", "High"
    impact: String,          // For risk matrix: "Low", "Medium", "High"
    customScore: Number      // Custom scoring value
}

var ObservationSchema = new Schema({
    // Audit reference
    auditId: {type: Schema.Types.ObjectId, ref: 'Audit', required: true},

    // Basic information
    identifier: Number,      // Auto-increment ID shown in report
    title: {type: String, required: true},
    observationType: {type: Schema.Types.ObjectId, ref: 'ObservationType'},
    category: String,

    // Risk scoring (flexible)
    riskScore: {type: RiskScore, default: () => ({})},

    // Content fields (rich text)
    description: String,     // What is the issue/finding?
    evidence: String,        // Proof/details (formerly "observation")
    impact: String,          // Business/technical impact
    recommendation: String,  // How to fix/address (formerly "remediation")

    // Metadata
    priority: {type: Number, enum: [1, 2, 3, 4], default: 3}, // 1=Urgent, 2=High, 3=Medium, 4=Low
    effortLevel: {type: Number, enum: [1, 2, 3], default: 2}, // 1=Low, 2=Medium, 3=High (formerly remediationComplexity)
    status: {type: Number, enum: [0, 1], default: 1},         // 0: done, 1: redacting
    verificationStatus: {                                      // Follow-up/verification status (formerly retestStatus)
        type: String,
        enum: ['verified', 'not_verified', 'partial', 'not_applicable'],
        default: 'not_verified'
    },
    verificationDescription: String,

    // Supporting data
    references: [String],
    paragraphs: [Paragraph],
    poc: String,             // Proof of concept
    scope: String,           // Affected scope/systems
    contextItems: [String],  // Associated systems/controls/processes
    customFields: [customField],

    // Legacy support (for backward compatibility with migrated findings)
    cvssv3: String,
    cvssv4: String,
    remediationComplexity: Number,
    retestStatus: String,

    // Metadata
    creator: {type: Schema.Types.ObjectId, ref: 'User'},
    lastModifiedBy: {type: Schema.Types.ObjectId, ref: 'User'}
}, {timestamps: true});

// Calculate risk score based on method
ObservationSchema.methods.calculateRiskScore = function() {
    if (!this.riskScore || !this.riskScore.method) {
        return null;
    }

    switch(this.riskScore.method) {
        case 'cvss3':
            if (this.riskScore.vector || this.cvssv3) {
                try {
                    const vector = this.riskScore.vector || this.cvssv3;
                    const calc = new cvss.CVSS31();
                    const result = calc.calculateCVSSFromVector(vector);
                    this.riskScore.score = result.baseScore;
                    this.riskScore.severity = result.baseSeverity;
                    return result;
                } catch(e) {
                    console.error('CVSS3 calculation error:', e);
                    return null;
                }
            }
            break;

        case 'cvss4':
            if (this.riskScore.vector || this.cvssv4) {
                try {
                    const vector = this.riskScore.vector || this.cvssv4;
                    const calc = new cvss.CVSS40();
                    const result = calc.calculateCVSSFromVector(vector);
                    this.riskScore.score = result.baseScore;
                    this.riskScore.severity = result.baseSeverity;
                    return result;
                } catch(e) {
                    console.error('CVSS4 calculation error:', e);
                    return null;
                }
            }
            break;

        case 'matrix':
            // Risk matrix: Likelihood x Impact
            const matrixMap = {
                'Low': 1,
                'Medium': 2,
                'High': 3
            };

            if (this.riskScore.likelihood && this.riskScore.impact) {
                const l = matrixMap[this.riskScore.likelihood] || 2;
                const i = matrixMap[this.riskScore.impact] || 2;
                const score = (l * i) / 9 * 10; // Normalize to 0-10

                this.riskScore.score = Math.round(score * 10) / 10;

                // Map to severity
                if (score >= 7) this.riskScore.severity = 'Critical';
                else if (score >= 5) this.riskScore.severity = 'High';
                else if (score >= 3) this.riskScore.severity = 'Medium';
                else if (score > 0) this.riskScore.severity = 'Low';
                else this.riskScore.severity = 'None';

                return {score: this.riskScore.score, severity: this.riskScore.severity};
            }
            break;

        case 'custom':
            // Use manually entered score
            if (this.riskScore.customScore !== undefined) {
                this.riskScore.score = this.riskScore.customScore;

                // Map score to severity
                const score = this.riskScore.score;
                if (score >= 9.0) this.riskScore.severity = 'Critical';
                else if (score >= 7.0) this.riskScore.severity = 'High';
                else if (score >= 4.0) this.riskScore.severity = 'Medium';
                else if (score >= 0.1) this.riskScore.severity = 'Low';
                else this.riskScore.severity = 'None';

                return {score: this.riskScore.score, severity: this.riskScore.severity};
            }
            break;
    }

    return null;
};

// Get next identifier for an audit
ObservationSchema.statics.getNextIdentifier = function(auditId) {
    return this.find({auditId: auditId})
        .sort({identifier: -1})
        .limit(1)
        .then(observations => {
            if (observations.length === 0) return 1;
            return (observations[0].identifier || 0) + 1;
        });
};

// Create observation
ObservationSchema.statics.create = function(auditId, userId, observation) {
    return new Promise(async (resolve, reject) => {
        try {
            // Get next identifier
            const identifier = await this.getNextIdentifier(auditId);

            var item = new Observation({
                auditId: auditId,
                identifier: identifier,
                title: observation.title,
                observationType: observation.observationType,
                category: observation.category,
                description: observation.description,
                evidence: observation.evidence,
                impact: observation.impact,
                recommendation: observation.recommendation,
                priority: observation.priority,
                effortLevel: observation.effortLevel,
                status: observation.status || 1,
                verificationStatus: observation.verificationStatus || 'not_verified',
                verificationDescription: observation.verificationDescription,
                references: observation.references,
                paragraphs: observation.paragraphs,
                poc: observation.poc,
                scope: observation.scope,
                contextItems: observation.contextItems,
                customFields: observation.customFields,
                riskScore: observation.riskScore,
                creator: userId,
                lastModifiedBy: userId
            });

            // Calculate risk score if needed
            if (item.riskScore && item.riskScore.method !== 'none') {
                item.calculateRiskScore();
            }

            await item.save();
            resolve(item);
        } catch(err) {
            reject(err);
        }
    });
};

// Get all observations for an audit
ObservationSchema.statics.getByAudit = function(auditId) {
    return this.find({auditId: auditId})
        .populate('observationType', 'name')
        .populate('creator', 'username firstname lastname')
        .populate('lastModifiedBy', 'username firstname lastname')
        .populate('customFields.customField', 'label fieldType text')
        .sort({identifier: 1});
};

// Get single observation
ObservationSchema.statics.getById = function(observationId) {
    return this.findById(observationId)
        .populate('observationType', 'name')
        .populate('creator', 'username firstname lastname')
        .populate('lastModifiedBy', 'username firstname lastname')
        .populate('customFields.customField', 'label fieldType text');
};

// Update observation
ObservationSchema.statics.updateObservation = function(observationId, userId, observation) {
    return new Promise(async (resolve, reject) => {
        try {
            const item = await this.findById(observationId);
            if (!item) {
                return reject({fn: 'NotFound', message: 'Observation not found'});
            }

            // Update fields
            if (observation.title !== undefined) item.title = observation.title;
            if (observation.observationType !== undefined) item.observationType = observation.observationType;
            if (observation.category !== undefined) item.category = observation.category;
            if (observation.description !== undefined) item.description = observation.description;
            if (observation.evidence !== undefined) item.evidence = observation.evidence;
            if (observation.impact !== undefined) item.impact = observation.impact;
            if (observation.recommendation !== undefined) item.recommendation = observation.recommendation;
            if (observation.priority !== undefined) item.priority = observation.priority;
            if (observation.effortLevel !== undefined) item.effortLevel = observation.effortLevel;
            if (observation.status !== undefined) item.status = observation.status;
            if (observation.verificationStatus !== undefined) item.verificationStatus = observation.verificationStatus;
            if (observation.verificationDescription !== undefined) item.verificationDescription = observation.verificationDescription;
            if (observation.references !== undefined) item.references = observation.references;
            if (observation.paragraphs !== undefined) item.paragraphs = observation.paragraphs;
            if (observation.poc !== undefined) item.poc = observation.poc;
            if (observation.scope !== undefined) item.scope = observation.scope;
            if (observation.contextItems !== undefined) item.contextItems = observation.contextItems;
            if (observation.customFields !== undefined) item.customFields = observation.customFields;
            if (observation.riskScore !== undefined) item.riskScore = observation.riskScore;

            item.lastModifiedBy = userId;

            // Recalculate risk score if needed
            if (item.riskScore && item.riskScore.method !== 'none') {
                item.calculateRiskScore();
            }

            await item.save();
            resolve(item);
        } catch(err) {
            reject(err);
        }
    });
};

// Delete observation
ObservationSchema.statics.deleteObservation = function(observationId) {
    return this.findByIdAndDelete(observationId);
};

var Observation = mongoose.model('Observation', ObservationSchema);
module.exports = Observation;
