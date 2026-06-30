const utils = require('./utils');

const formatFindingLocation = (finding = {}) => {
    const title = String(finding?.title || '').trim();
    if (title)
        return `finding:${title}`;
    return 'finding:Untitled finding';
};

const buildFindingTitleByIdentifier = (findings = []) => {
    const lookup = new Map();

    findings.forEach((finding) => {
        const title = String(finding?.title || '').trim() || 'Untitled finding';
        if (finding?.identifier === null || finding?.identifier === undefined)
            return;

        lookup.set(utils.lPad(finding.identifier), title);
        lookup.set(String(finding.identifier), title);
    });

    return lookup;
};

const resolveIssueLocation = (location = '', findings = []) => {
    const source = String(location || '').trim() || 'report';
    const match = source.match(/^finding:IDX-0*(\d+)(\/.*)?$/i);
    if (!match)
        return source;

    const lookup = buildFindingTitleByIdentifier(findings);
    const title = lookup.get(match[1]) || lookup.get(utils.lPad(parseInt(match[1], 10)));
    if (!title)
        return source;

    return `finding:${title}${match[2] || ''}`;
};

const normalizeAiIssueLocation = (location = '', options = {}) => {
    const value = String(location || '').trim() || 'report';
    const { entityPrefix = 'finding', defaultTitle = '' } = options;

    const fieldPathMatch = value.match(/^field path:\s*(.+)$/i);
    if (!fieldPathMatch)
        return value;

    const path = fieldPathMatch[1].trim();
    const findingFieldMatch = path.match(/^finding\.([a-zA-Z0-9_]+)/i);
    if (findingFieldMatch) {
        const field = findingFieldMatch[1];
        const title = String(defaultTitle || '').trim();
        if (title)
            return `${entityPrefix}:${title}/${field}`;
        return `field:${field}`;
    }

    const sectionMatch = path.match(/^section[.:](.+)$/i);
    if (sectionMatch) {
        const name = sectionMatch[1].trim();
        return name ? `section:${name}` : 'report';
    }

    if (['general', 'network', 'report'].includes(path.toLowerCase()))
        return path.toLowerCase();

    return `general/${path}`;
};

const normalizeIssueLocations = (issues = [], findings = []) => {
    return issues.map((issue) => ({
        ...issue,
        location: resolveIssueLocation(issue.location, findings)
    }));
};

module.exports = {
    formatFindingLocation,
    buildFindingTitleByIdentifier,
    resolveIssueLocation,
    normalizeAiIssueLocation,
    normalizeIssueLocations
};
