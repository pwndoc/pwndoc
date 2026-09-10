const mongoose = require('mongoose');

const {findOrProvisionOidcUser} = require('../src/lib/oidc-user');

function identity(overrides = {}) {
    return {
        issuer: 'https://identity.example.test/',
        subject: 'subject-123',
        username: 'alice',
        email: 'alice@example.test',
        firstname: 'Alice',
        lastname: 'Example',
        groups: ['pwndoc-users'],
        ...overrides
    };
}

function config(overrides = {}) {
    return {
        autoProvision: true,
        accountLinking: 'disabled',
        syncProfile: true,
        syncRoles: true,
        defaultRoles: ['user'],
        roleMappings: {'pwndoc-users': ['user']},
        ...overrides
    };
}

function mockModels(User, customRoles = []) {
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
        if (name === 'User')
            return User;
        if (name === 'Role')
            return {getAll: jest.fn().mockResolvedValue(customRoles)};
        throw new Error(`Unexpected model: ${name}`);
    });
}

describe('OIDC user provisioning', () => {
    afterEach(() => jest.restoreAllMocks());

    test('creates and binds a new user to the stable issuer and subject', async () => {
        class User {
            constructor(values) {
                Object.assign(this, values);
                this.save = jest.fn().mockResolvedValue(this);
            }
        }
        User.findOne = jest.fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);
        mockModels(User);

        const result = await findOrProvisionOidcUser(identity(), config());

        expect(result.isNew).toBe(true);
        expect(result.user).toEqual(expect.objectContaining({
            username: 'alice',
            oidcIssuer: 'https://identity.example.test/',
            oidcSubject: 'subject-123',
            roles: ['user']
        }));
        expect(result.user.password).not.toBe('');
        expect(result.user.save).toHaveBeenCalledTimes(1);
    });

    test('synchronizes a bound account profile and mapped roles', async () => {
        const user = {
            _id: 'user-1',
            username: 'old-name',
            firstname: 'Old',
            lastname: 'Name',
            roles: ['user'],
            enabled: true,
            oidcIssuer: 'https://identity.example.test/',
            oidcSubject: 'subject-123',
            save: jest.fn().mockResolvedValue()
        };
        const User = {
            findOne: jest.fn().mockResolvedValue(user),
            countDocuments: jest.fn()
        };
        mockModels(User, [{name: 'reviewer'}]);

        const result = await findOrProvisionOidcUser(
            identity({groups: ['reviewers']}),
            config({roleMappings: {reviewers: ['reviewer']}})
        );

        expect(result.isNew).toBe(false);
        expect(user).toEqual(expect.objectContaining({
            firstname: 'Alice',
            lastname: 'Example',
            email: 'alice@example.test',
            roles: ['reviewer']
        }));
        expect(user.save).toHaveBeenCalledTimes(1);
    });

    test('does not silently link an existing local username', async () => {
        const User = {
            findOne: jest.fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({_id: 'local-user'})
        };
        mockModels(User);

        await expect(findOrProvisionOidcUser(identity(), config())).rejects.toEqual(
            expect.objectContaining({fn: 'Forbidden'})
        );
    });

    test('prevents role synchronization from removing the last enabled admin', async () => {
        const user = {
            _id: 'admin-1',
            roles: ['admin'],
            enabled: true,
            oidcIssuer: 'https://identity.example.test/',
            oidcSubject: 'subject-123',
            save: jest.fn()
        };
        const User = {
            findOne: jest.fn().mockResolvedValue(user),
            countDocuments: jest.fn().mockResolvedValue(0)
        };
        mockModels(User);

        await expect(findOrProvisionOidcUser(identity(), config())).rejects.toEqual(
            expect.objectContaining({fn: 'Forbidden'})
        );
        expect(user.save).not.toHaveBeenCalled();
    });
});
