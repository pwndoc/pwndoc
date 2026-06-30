const { formatFindingLocation } = require('./ai-qa-location');

const IMAGE_FILENAME_PATTERN = /\.(jpe?g|png|gif|webp|bmp|tiff?|svg)$/i;

const isFilenameLikeCaption = (caption = '') => {
    const value = String(caption || '').trim();
    if (!value)
        return false;
    return IMAGE_FILENAME_PATTERN.test(value);
};

const unescapeHtmlAttribute = (value = '') => {
    return String(value || '')
        .replace(/&quot;/gi, '"')
        .replace(/&#0*39;/g, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');
};

const extractFilenameLikeCaptionsFromHtml = (html = '') => {
    const source = String(html || '');
    if (!source)
        return [];

    const matches = [];
    const patterns = [
        { element: 'image', regex: /<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi },
        { element: 'legend', regex: /<legend\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi }
    ];

    patterns.forEach(({ element, regex }) => {
        let match = null;
        while ((match = regex.exec(source)) !== null) {
            const caption = unescapeHtmlAttribute(match[1]).trim();
            if (isFilenameLikeCaption(caption)) {
                matches.push({
                    element: element,
                    caption: caption
                });
            }
        }
    });

    return matches;
};

const getHtmlFieldValue = (value) => {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value))
        return value.join('\n');
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
};

const scanHtmlField = (html, { location, fieldLabel }) => {
    return extractFilenameLikeCaptionsFromHtml(html).map((entry) => ({
        location: location,
        fieldLabel: fieldLabel,
        caption: entry.caption,
        element: entry.element
    }));
};

const scanCustomFields = (customFields = [], locationPrefix) => {
    const matches = [];

    (customFields || []).forEach((field) => {
        const fieldType = field?.customField?.fieldType || field?.fieldType || 'text';
        if (fieldType === 'space')
            return;

        const fieldLabel = String(field?.customField?.label || field?.label || 'Custom field').trim();
        const html = getHtmlFieldValue(field?.text);
        if (!html)
            return;

        matches.push(...scanHtmlField(html, {
            location: `${locationPrefix}/${fieldLabel}`,
            fieldLabel: fieldLabel
        }));
    });

    return matches;
};

const buildCaptionIssue = (match = {}) => {
    const fieldLabel = String(match.fieldLabel || 'field').trim();
    const caption = String(match.caption || '').trim();
    const elementLabel = match.element === 'legend' ? 'Caption' : 'Image';

    return {
        severity: 'warning',
        category: 'imageCaptions',
        title: 'Missing image caption',
        message: `${elementLabel} in "${fieldLabel}" still uses the imported filename "${caption}". Replace it with a descriptive caption.`,
        location: String(match.location || 'report').trim() || 'report',
        source: 'structural'
    };
};

const runImageCaptionChecks = (audit = {}) => {
    const matches = [];

    const findingFields = [
        { key: 'description', label: 'Description' },
        { key: 'observation', label: 'Observation' },
        { key: 'poc', label: 'Proof of concept' },
        { key: 'remediation', label: 'Remediation' },
        { key: 'retestDescription', label: 'Retest description' }
    ];

    (audit.findings || []).forEach((finding) => {
        const findingLocation = formatFindingLocation(finding);

        findingFields.forEach((field) => {
            const html = getHtmlFieldValue(finding?.[field.key]);
            if (!html)
                return;

            matches.push(...scanHtmlField(html, {
                location: `${findingLocation}/${field.key}`,
                fieldLabel: field.label
            }));
        });

        matches.push(...scanCustomFields(
            finding?.customFields,
            findingLocation
        ));
    });

    (audit.sections || []).forEach((section) => {
        const sectionName = String(section?.name || section?.field || 'Section').trim();
        const sectionLocation = `section:${sectionName}`;

        matches.push(...scanHtmlField(section?.text, {
            location: sectionLocation,
            fieldLabel: sectionName
        }));

        matches.push(...scanCustomFields(
            section?.customFields,
            sectionLocation
        ));
    });

    matches.push(...scanCustomFields(audit?.customFields, 'general'));

    return matches.map((match) => buildCaptionIssue(match));
};

module.exports = {
    IMAGE_FILENAME_PATTERN,
    isFilenameLikeCaption,
    extractFilenameLikeCaptionsFromHtml,
    runImageCaptionChecks
};
