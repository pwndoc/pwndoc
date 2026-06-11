const AI_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'ollama'];
const AI_DEFAULT_PROVIDER = 'openai';

const AI_PROVIDER_DEFAULTS = {
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4.1-mini',
        timeoutMs: 30000
    },
    anthropic: {
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-3-5-sonnet-latest',
        timeoutMs: 30000,
        version: '2023-06-01'
    },
    deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        timeoutMs: 30000
    },
    ollama: {
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.1',
        timeoutMs: 60000
    }
};

const BUILTIN_FINDING_FIELDS = [
    {
        entityType: 'finding',
        fieldKey: 'description',
        fieldLabel: 'Description',
        outputType: 'html',
        defaultPrompt: 'Write a technical finding description for "{title}" in the "{vulnType}" category. Explain what is vulnerable and the business/security impact.'
    },
    {
        entityType: 'finding',
        fieldKey: 'observation',
        fieldLabel: 'Observation',
        outputType: 'html',
        defaultPrompt: 'Write a clear observation for "{title}" using available evidence. Include exploitation path and realistic attacker impact.'
    },
    {
        entityType: 'finding',
        fieldKey: 'remediation',
        fieldLabel: 'Remediation',
        outputType: 'html',
        defaultPrompt: 'Write practical remediation for "{title}" with prioritized, concrete actions and verification guidance.'
    },
    {
        entityType: 'finding',
        fieldKey: 'references',
        fieldLabel: 'References',
        outputType: 'array',
        defaultPrompt: 'Provide concise references for "{title}" in "{vulnType}". Include standards or authoritative guidance when possible.'
    },
    {
        entityType: 'finding',
        fieldKey: 'poc',
        fieldLabel: 'Proofs',
        outputType: 'html',
        defaultPrompt: 'Write a concise proof-of-concept section for "{title}" with reproducible steps and expected/observed behavior.'
    }
];

const CUSTOM_FIELD_OUTPUT_TYPES = {
    text: 'html',
    input: 'text',
    date: 'text',
    select: 'text',
    radio: 'text',
    'select-multiple': 'array',
    checkbox: 'array'
};

const normalizePromptValue = (value) => {
    if (value === null || value === undefined)
        return '';
    return String(value).trim();
}

const toCustomFieldKey = (customFieldId) => `custom-field:${customFieldId}`;

const toPromptCompositeKey = (entityType, fieldKey) => `${entityType}::${fieldKey}`;

const getDefaultPromptForField = (fieldLabel, outputType) => {
    if (outputType === 'array') {
        return `Generate concise entries for "${fieldLabel}" from the provided context. Return practical, non-duplicated items.`;
    }

    if (outputType === 'html') {
        return `Write content for "${fieldLabel}" using HTML paragraphs (<p>...</p>) based on the provided context.`;
    }

    return `Write concise text for "${fieldLabel}" based on the provided context.`;
}

const buildCustomFieldCatalog = (customFields = [], entityType, displayFilter, labelPrefix) => {
    return (customFields || [])
    .filter((field) => displayFilter.includes(String(field?.display || '')))
    .map((field) => {
        const outputType = CUSTOM_FIELD_OUTPUT_TYPES[field?.fieldType];
        if (!outputType)
            return null;

        return {
            entityType: entityType,
            fieldKey: toCustomFieldKey(field._id),
            fieldLabel: `${labelPrefix}: ${field.label}`,
            outputType: outputType,
            defaultPrompt: getDefaultPromptForField(field.label, outputType),
            source: 'custom-field',
            customFieldId: String(field._id),
            customFieldType: String(field.fieldType || '')
        };
    })
    .filter(Boolean)
    .sort((a, b) => a.fieldLabel.localeCompare(b.fieldLabel));
}

const buildFindingFieldCatalog = (customFields = []) => {
    return [
        ...BUILTIN_FINDING_FIELDS.map((field) => ({
            ...field,
            source: 'builtin',
            customFieldId: null,
            customFieldType: null
        })),
        ...buildCustomFieldCatalog(customFields, 'finding', ['finding', 'vulnerability'], 'Finding Custom Field')
    ];
}

const buildSectionFieldCatalog = (customFields = []) => {
    return buildCustomFieldCatalog(customFields, 'section', ['section'], 'Section Custom Field');
}

const buildAiFieldCatalog = (customFields = []) => {
    return [
        ...buildFindingFieldCatalog(customFields),
        ...buildSectionFieldCatalog(customFields)
    ];
}

const buildPromptMappings = (fieldCatalog = [], promptRows = []) => {
    const promptByCompositeKey = new Map(
        (promptRows || []).map((row) => {
            const entityType = String(row.entityType || '').trim();
            const fieldKey = String(row.fieldKey || '').trim();
            return [toPromptCompositeKey(entityType, fieldKey), row];
        })
    );

    return fieldCatalog.map((field) => {
        const promptRow = promptByCompositeKey.get(toPromptCompositeKey(field.entityType, field.fieldKey));
        const configuredPrompt = normalizePromptValue(promptRow?.prompt);
        return {
            entityType: field.entityType,
            fieldKey: field.fieldKey,
            fieldLabel: field.fieldLabel,
            outputType: field.outputType,
            source: field.source,
            customFieldId: field.customFieldId,
            customFieldType: field.customFieldType,
            enabled: typeof promptRow?.enabled === 'boolean' ? promptRow.enabled : true,
            prompt: configuredPrompt || field.defaultPrompt
        };
    });
}

module.exports = {
    AI_PROVIDERS,
    AI_DEFAULT_PROVIDER,
    AI_PROVIDER_DEFAULTS,
    BUILTIN_FINDING_FIELDS,
    CUSTOM_FIELD_OUTPUT_TYPES,
    normalizePromptValue,
    toCustomFieldKey,
    toPromptCompositeKey,
    buildFindingFieldCatalog,
    buildSectionFieldCatalog,
    buildAiFieldCatalog,
    buildPromptMappings
};
