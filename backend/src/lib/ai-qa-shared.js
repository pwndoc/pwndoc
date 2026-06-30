const QA_SEVERITIES = ['error', 'warning', 'info'];
const QA_CATEGORIES = ['completeness', 'redaction', 'customer', 'instructions', 'references', 'imageCaptions', 'duplicates', 'aiDuplicates', 'other'];

const stripHtml = (value) => {
    return String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const isEmptyContent = (value) => {
    if (value === null || value === undefined)
        return true;
    if (Array.isArray(value))
        return value.length === 0 || value.every((entry) => !String(entry || '').trim());
    return !stripHtml(value);
};

const normalizeIssue = (issue = {}, source = 'structural') => {
    const severity = QA_SEVERITIES.includes(issue.severity) ? issue.severity : 'warning';
    const category = QA_CATEGORIES.includes(issue.category) ? issue.category : 'other';

    return {
        severity: severity,
        category: category,
        title: String(issue.title || 'Issue').trim(),
        message: String(issue.message || '').trim(),
        location: String(issue.location || 'report').trim() || 'report',
        source: source
    };
};

const summarizeCustomFields = (customFields = []) => {
    return (customFields || [])
        .map((field) => {
            const label = field?.customField?.label || field?.label || 'Custom field';
            const fieldType = field?.customField?.fieldType || field?.fieldType || 'text';
            if (fieldType === 'space')
                return null;

            let textValue = field?.text;
            if (Array.isArray(textValue))
                textValue = textValue.join('\n');
            else if (textValue && typeof textValue === 'object')
                textValue = JSON.stringify(textValue);

            const content = stripHtml(textValue);
            if (!content)
                return null;

            return {
                label: label,
                fieldType: fieldType,
                content: content.slice(0, 4000)
            };
        })
        .filter(Boolean);
};

module.exports = {
    QA_SEVERITIES,
    QA_CATEGORIES,
    stripHtml,
    isEmptyContent,
    normalizeIssue,
    summarizeCustomFields
};
