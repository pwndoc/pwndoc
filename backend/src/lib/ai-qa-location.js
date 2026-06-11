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
    normalizeIssueLocations
};
