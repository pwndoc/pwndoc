# DOCX Template Variables for PwnDocX

This document describes the variables available in DOCX templates for both legacy pentest reports and new assurance reports.

## General Audit Information

```
{name}                  - Audit name
{auditType}             - Audit type name (translated)
{date}                  - Audit date
{date_start}            - Start date
{date_end}              - End date
{language}              - Report language
```

## Company Information

```
{company.name}          - Company full name
{company.shortName}     - Company short name
{company.logo}          - Company logo (large, max 250px height or 400px width)
{company.logo_small}    - Company logo (small, max 37px height)
```

## Client Information

```
{client.email}          - Client email
{client.firstname}      - Client first name
{client.lastname}       - Client last name
{client.phone}          - Client phone
{client.cell}           - Client cell phone
{client.title}          - Client title
```

## Team Members

```
{#collaborators}
  {username}            - Username
  {firstname}           - First name
  {lastname}            - Last name
  {email}               - Email address
  {phone}               - Phone number
  {role}                - User role
{/collaborators}

{#reviewers}
  {username}            - Username
  {firstname}           - First name
  {lastname}            - Last name
  {email}               - Email address
  {phone}               - Phone number
  {role}                - User role
{/reviewers}
```

## Creator Information

```
{creator.username}      - Creator username
{creator.firstname}     - Creator first name
{creator.lastname}      - Creator last name
{creator.email}         - Creator email
{creator.phone}         - Creator phone
{creator.role}          - Creator role
```

## Network Scope (Legacy Pentest)

```
{#scope}
  {name}                - Scope name
  {#hosts}
    {hostname}          - Host name
    {ip}                - IP address
    {os}                - Operating system
    {#services}
      {port}            - Port number
      {protocol}        - Protocol (tcp/udp)
      {name}            - Service name
      {product}         - Product name
      {version}         - Product version
    {/services}
  {/hosts}
{/scope}
```

---

## Legacy Findings (Pentest Reports)

### Individual Findings

```
{#findings}
  {identifier}          - Finding ID (e.g., "IDX-001")
  {title}               - Finding title
  {vulnType}            - Vulnerability type (translated)
  {category}            - Category name (translated)

  {#description}
    {text}              - Description text paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/description}

  {#observation}
    {text}              - Observation/proof paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/observation}

  {#remediation}
    {text}              - Remediation paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/remediation}

  {#poc}
    {text}              - Proof of concept paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/poc}

  {remediationComplexity} - Fix complexity (1-3)
  {priority}              - Priority level (1-4)
  {affected}              - Affected scope
  {status}                - Finding status (0=done, 1=redacting)
  {retestStatus}          - Retest status (ok/ko/unknown/partial)

  {#references}
    {.}                 - Reference URL/text (loop through array)
  {/references}

  {cvss.vectorString}           - CVSS v3 vector
  {cvss.baseMetricScore}        - Base score (0-10)
  {cvss.baseSeverity}           - Severity (None/Low/Medium/High/Critical)
  {cvss.temporalMetricScore}    - Temporal score
  {cvss.temporalSeverity}       - Temporal severity
  {cvss.environmentalMetricScore} - Environmental score
  {cvss.environmentalSeverity}  - Environmental severity
  {cvss.cellColor}              - XML color code for table cell

  {cvss4.vectorString}          - CVSS v4 vector
  {cvss4.baseMetricScore}       - Base score (0-10)
  {cvss4.baseSeverity}          - Severity (None/Low/Medium/High/Critical)
  {cvss4.cellColor}             - XML color code for table cell
{/findings}
```

### Findings Grouped by Category

```
{#categories}
  {categoryName}        - Category name
  {#categoryFindings}
    ... (same as individual findings)
  {/categoryFindings}
{/categories}
```

---

## NEW: Observations (Assurance Reports) - POC

### Individual Observations

```
{#observations}
  {identifier}          - Observation ID (e.g., "OBS-001")
  {title}               - Observation title
  {observationType}     - Observation type name
  {category}            - Category name (translated)

  {#description}
    {text}              - Description paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/description}

  {#evidence}
    {text}              - Evidence/proof paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/evidence}

  {#impact}
    {text}              - Business/technical impact paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/impact}

  {#recommendation}
    {text}              - Recommendation paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/recommendation}

  {#poc}
    {text}              - Proof of concept paragraph
    {#images}
      {image}           - Base64 image data
      {caption}         - Image caption
    {/images}
  {/poc}

  {effortLevel}         - Implementation effort (1-3: Low/Medium/High)
  {priority}            - Priority level (1-4: Urgent/High/Medium/Low)
  {affected}            - Affected systems/scope
  {status}              - Status (0=done, 1=redacting)
  {verificationStatus}  - Verification status (verified/not_verified/partial/not_applicable)

  {#references}
    {.}                 - Reference URL/text (loop through array)
  {/references}

  {riskScore.method}    - Scoring method (cvss3/cvss4/matrix/custom/none)
  {riskScore.score}     - Calculated risk score (0-10)
  {riskScore.severity}  - Risk severity (None/Low/Medium/High/Critical)
  {riskScore.vector}    - CVSS vector string (if applicable)
  {riskScore.cellColor} - XML color code for table cell

  ... (custom fields are dynamically added based on field label)
{/observations}
```

### Observations Grouped by Category

```
{#observationsCategories}
  {categoryName}        - Category name
  {#categoryObservations}
    ... (same as individual observations)
  {/categoryObservations}
{/observationsCategories}
```

---

## Custom Sections

```
{sections.executive_summary.name}       - Section name (translated)
{#sections.executive_summary.text}
  {text}                                - Section text paragraph
  {#images}
    {image}                             - Base64 image data
    {caption}                           - Image caption
  {/images}
{/sections.executive_summary.text}

... (custom fields in sections follow same pattern as findings)
```

---

## Special Template Functions

### Page Break (Except Last)

```
{$pageBreakExceptLast}
```
Inserts a page break after each item in a loop, except after the last item. Useful for putting each finding/observation on its own page.

---

## Example Templates

### Simple Assurance Report Template

```
ASSURANCE REPORT

Audit: {name}
Type: {auditType}
Date: {date}

Prepared for:
{client.firstname} {client.lastname}
{client.email}

OBSERVATIONS

{#observationsCategories}
Category: {categoryName}

{#categoryObservations}
{identifier}. {title}

Risk Level: {riskScore.severity} ({riskScore.score}/10)
Priority: {priority}

Description:
{#description}{text}{/description}

Evidence:
{#evidence}{text}{/evidence}

Impact:
{#impact}{text}{/impact}

Recommendation:
{#recommendation}{text}{/recommendation}

{$pageBreakExceptLast}
{/categoryObservations}
{/observationsCategories}

---
Report prepared by: {creator.firstname} {creator.lastname}
```

### Hybrid Report (Pentests + Observations)

For migration period, you can use both findings and observations in the same template:

```
{#findings.length}
SECURITY FINDINGS (Legacy)
{#categories}
... findings template ...
{/categories}
{/findings.length}

{#observations.length}
OBSERVATIONS (New)
{#observationsCategories}
... observations template ...
{/observationsCategories}
{/observations.length}
```

---

## Color Codes

Risk severity colors are configurable in Settings but default to:

- **None**: #4A86E8 (Blue)
- **Low**: #008000 (Green)
- **Medium**: #F9A009 (Orange)
- **High**: #FE0000 (Red)
- **Critical**: #212121 (Black)

Cell colors use the raw hex value without the # prefix.

---

## Template Filters

Use filters in expressions to transform values:

```
{name|uppercase}              - Convert to uppercase
{name|lowercase}              - Convert to lowercase
{name|capitalize}             - Capitalize first letter
```

---

## Creating a New Template

1. Create a DOCX file in Microsoft Word or LibreOffice
2. Insert template variables using `{variable}` syntax
3. Use loops with `{#array}...{/array}` syntax
4. Save the file to `/backend/report-templates/YourTemplateName.docx`
5. Create a Template entry in PwnDocX admin panel with matching name
6. Assign template to audit types as needed

---

## Testing Your Template

1. Create a test audit with observations
2. Generate report
3. Check for errors in backend logs
4. Verify all variables are replaced correctly
5. Adjust template as needed

For detailed docxtemplater syntax, see: https://docxtemplater.readthedocs.io/
