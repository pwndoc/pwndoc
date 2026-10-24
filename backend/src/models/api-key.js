const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const ApiKeySchema = new Schema({
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roles: [String],
    enabled: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    lastUsed: { type: Date, default: null }
}, { timestamps: true });

/*
*** Statics ***
*/

// Generate a new API Key for a user
ApiKeySchema.statics.generateKey = async function(userId, { name, expiresAt, roles }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw { fn: 'BadParameters', message: 'Name is required' };
    }

    const owner = await mongoose.model('User').findById(userId).select('roles enabled').lean();
    const acl = require('../lib/auth').acl;
    if (!owner || owner.enabled === false)
        throw { fn: 'Unauthorized', message: 'Account disabled or user not found' };
    const ownerRoles = (owner.roles || []).filter(role => Object.hasOwn(acl.roles, role));
    const assignedRoles = roles === undefined ? ownerRoles : roles;
    if (!Array.isArray(assignedRoles) || assignedRoles.length === 0 ||
        assignedRoles.some(role => typeof role !== 'string' || !ownerRoles.includes(role)))
        throw { fn: 'BadParameters', message: 'Key roles must be a nonempty subset of current user roles' };

    let parsedExpiresAt = null;
    if (expiresAt) {
        parsedExpiresAt = new Date(expiresAt);
        if (isNaN(parsedExpiresAt.getTime()) || parsedExpiresAt <= new Date()) {
            throw { fn: 'BadParameters', message: 'Expiration date must be a valid future date' };
        }
    }

    // Generate high-entropy secret key: 'pwn_' + 32 random bytes (64 hex characters)
    const randomHex = crypto.randomBytes(32).toString('hex');
    const rawKey = `pwn_${randomHex}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = `pwn_${randomHex.substring(0, 6)}...${randomHex.slice(-4)}`;

    const keyDoc = new this({
        name: name.trim(),
        keyHash,
        prefix,
        user: userId,
        roles: [...new Set(assignedRoles)],
        enabled: true,
        expiresAt: parsedExpiresAt
    });

    await keyDoc.save();

    return {
        _id: keyDoc._id,
        name: keyDoc.name,
        apiKey: rawKey, // Plaintext returned ONLY once upon creation!
        prefix: keyDoc.prefix,
        roles: keyDoc.roles,
        enabled: keyDoc.enabled,
        expiresAt: keyDoc.expiresAt,
        createdAt: keyDoc.createdAt
    };
};

// Validate a provided API Key string
ApiKeySchema.statics.validateKey = async function(rawKey) {
    if (typeof rawKey !== 'string' || !/^pwn_[a-f0-9]{64}$/.test(rawKey)) {
        return null;
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyDoc = await this.findOne({ keyHash }).select('-keyHash')
        .populate('user', 'username firstname lastname roles enabled');

    if (!keyDoc) {
        return { error: 'Invalid API Key', status: 401 };
    }

    if (!keyDoc.enabled) {
        return { error: 'API Key is disabled', status: 401 };
    }

    if (keyDoc.expiresAt && keyDoc.expiresAt <= new Date()) {
        return { error: 'API Key has expired', status: 401 };
    }

    if (!keyDoc.user || keyDoc.user.enabled === false) {
        return { error: 'Account disabled or user not found', status: 401 };
    }

    // Fire-and-forget update of lastUsed
    this.updateOne({ _id: keyDoc._id }, { lastUsed: new Date() }).exec().catch(err => {
        console.error('Failed to update API key lastUsed:', err);
    });

    return { apiKey: keyDoc, user: keyDoc.user };
};

// Get API keys for a specific user (never exposing keyHash)
ApiKeySchema.statics.getByUser = async function(userId) {
    return this.find({ user: userId })
        .select('-keyHash')
        .sort({ createdAt: -1 });
};

// Get all API keys (read-all permission enforced by the route, never exposing keyHash)
ApiKeySchema.statics.getAll = async function() {
    return this.find()
        .populate('user', 'username firstname lastname')
        .select('-keyHash')
        .sort({ createdAt: -1 });
};

// Revoke/Delete an API key
ApiKeySchema.statics.revoke = async function(keyId, userId, isAdmin = false) {
    const query = { _id: keyId };
    if (!isAdmin) {
        query.user = userId;
    }
    const result = await this.findOneAndDelete(query);
    if (!result) {
        throw { fn: 'NotFound', message: 'API Key not found or access denied' };
    }
    return { message: 'API Key revoked successfully' };
};

// Toggle enabled status
ApiKeySchema.statics.toggle = async function(keyId, userId, isAdmin = false) {
    const query = { _id: keyId };
    if (!isAdmin) {
        query.user = userId;
    }
    const keyDoc = await this.findOneAndUpdate(query,
        [{ $set: { enabled: { $not: ['$enabled'] } } }],
        { new: true, updatePipeline: true, projection: { name: 1, enabled: 1, prefix: 1 } });
    if (!keyDoc) {
        throw { fn: 'NotFound', message: 'API Key not found or access denied' };
    }
    return {
        _id: keyDoc._id,
        name: keyDoc.name,
        enabled: keyDoc.enabled,
        prefix: keyDoc.prefix
    };
};

const ApiKey = mongoose.model('ApiKey', ApiKeySchema);
module.exports = ApiKey;
