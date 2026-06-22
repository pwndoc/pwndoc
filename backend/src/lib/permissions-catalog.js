const catalog = [
    {
        key: 'audits',
        label: 'Audits',
        permissions: [
            {scope: 'audits:create', core: true},
            {scope: 'audits:read', core: true},
            {scope: 'audits:update', core: true},
            {scope: 'audits:delete', core: true},
            {scope: 'audits:read-all', core: false},
            {scope: 'audits:update-all', core: false},
            {scope: 'audits:delete-all', core: false},
            {scope: 'audits:review', core: false},
            {scope: 'audits:review-all', core: false},
            {scope: 'audits:users-connected', core: false},
            {scope: 'audits:comments:create', core: true},
            {scope: 'audits:comments:update', core: true},
            {scope: 'audits:comments:delete', core: true},
            {scope: 'audits:comments:create-all', core: false},
            {scope: 'audits:comments:update-all', core: false},
            {scope: 'audits:comments:delete-all', core: false}
        ]
    },
    {
        key: 'images',
        label: 'Images',
        permissions: [
            {scope: 'images:create', core: true},
            {scope: 'images:read', core: true},
            {scope: 'images:delete', core: false}
        ]
    },
    {
        key: 'clients',
        label: 'Clients',
        permissions: [
            {scope: 'clients:create', core: true},
            {scope: 'clients:read', core: true},
            {scope: 'clients:update', core: true},
            {scope: 'clients:delete', core: true}
        ]
    },
    {
        key: 'companies',
        label: 'Companies',
        permissions: [
            {scope: 'companies:create', core: true},
            {scope: 'companies:read', core: true},
            {scope: 'companies:update', core: true},
            {scope: 'companies:delete', core: true}
        ]
    },
    {
        key: 'templates',
        label: 'Templates',
        permissions: [
            {scope: 'templates:create', core: false},
            {scope: 'templates:read', core: true},
            {scope: 'templates:update', core: false},
            {scope: 'templates:delete', core: false}
        ]
    },
    {
        key: 'vulnerabilities',
        label: 'Vulnerabilities',
        permissions: [
            {scope: 'vulnerabilities:create', core: false},
            {scope: 'vulnerabilities:read', core: true},
            {scope: 'vulnerabilities:update', core: false},
            {scope: 'vulnerabilities:delete', core: false},
            {scope: 'vulnerabilities:delete-all', core: false},
            {scope: 'vulnerability-updates:create', core: true}
        ]
    },
    {
        key: 'users',
        label: 'Users',
        permissions: [
            {scope: 'users:create', core: false},
            {scope: 'users:read', core: true},
            {scope: 'users:update', core: false}
        ]
    },
    {
        key: 'roles',
        label: 'Roles',
        permissions: [
            {scope: 'roles:create', core: false},
            {scope: 'roles:read', core: true},
            {scope: 'roles:update', core: false},
            {scope: 'roles:delete', core: false}
        ]
    },
    {
        key: 'settings',
        label: 'Settings',
        permissions: [
            {scope: 'settings:read-public', core: true},
            {scope: 'settings:read', core: false},
            {scope: 'settings:update', core: false}
        ]
    },
    {
        key: 'backups',
        label: 'Backups',
        permissions: [
            {scope: 'backups:create', core: false},
            {scope: 'backups:read', core: false},
            {scope: 'backups:update', core: false},
            {scope: 'backups:delete', core: false}
        ]
    },
    {
        key: 'custom-data',
        label: 'Custom Data',
        permissions: [
            {scope: 'languages:create', core: false},
            {scope: 'languages:read', core: true},
            {scope: 'languages:update', core: false},
            {scope: 'languages:delete', core: false},
            {scope: 'audit-types:create', core: false},
            {scope: 'audit-types:read', core: true},
            {scope: 'audit-types:update', core: false},
            {scope: 'audit-types:delete', core: false},
            {scope: 'vulnerability-types:create', core: false},
            {scope: 'vulnerability-types:read', core: true},
            {scope: 'vulnerability-types:update', core: false},
            {scope: 'vulnerability-types:delete', core: false},
            {scope: 'vulnerability-categories:create', core: false},
            {scope: 'vulnerability-categories:read', core: true},
            {scope: 'vulnerability-categories:update', core: false},
            {scope: 'vulnerability-categories:delete', core: false},
            {scope: 'sections:create', core: false},
            {scope: 'sections:read', core: true},
            {scope: 'sections:update', core: false},
            {scope: 'sections:delete', core: false},
            {scope: 'custom-fields:create', core: false},
            {scope: 'custom-fields:read', core: true},
            {scope: 'custom-fields:update', core: false},
            {scope: 'custom-fields:delete', core: false}
        ]
    },
    {
        key: 'proofing',
        label: 'Proofing',
        permissions: [
            {scope: 'spellcheck:read', core: true},
            {scope: 'spellcheck:create', core: true},
            {scope: 'spellcheck:delete', core: false},
            {scope: 'proofing-rules:create', core: false},
            {scope: 'proofing-rules:read', core: false},
            {scope: 'proofing-rules:update', core: false},
            {scope: 'proofing-rules:delete', core: false}
        ]
    }
]

const flatten = () => catalog.flatMap(group => group.permissions.map(permission => permission.scope))
const core = () => catalog.flatMap(group => group.permissions.filter(permission => permission.core).map(permission => permission.scope))

module.exports = {
    catalog,
    flatten,
    core
}
