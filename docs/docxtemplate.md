# Docx Template

Pwndoc uses the nodejs library docxtemplater to generate a docx report. Specific documentation can be found on the official site documentation: https://docxtemplater.readthedocs.io/en/v3.1.0/tag_types.html 

Check the [Default Template](https://github.com/pwndoc/pwndoc/tree/master/backend/report-templates) for better understanding.

## Different Tags

There can be different tags depending on the value. In the following examples `data` is the object passed to the docxtemplater engine.

### Value

```
data = {key1: value1, key2: value2, key3: value3}
-> {key1} {key2} {key3}
```

### Array

```
// Simple Array
data = { array: ['value1', 'value2', 'value3'] }
-> {#array}{.}{/array}

// Array of objects
data = { array: [{name: 'value1'}, {name: 'value2'}, {name: 'value3'}]}
-> {#array}{name}{/array}
```

### Condition

```
data = {findings: [{title: 'vuln1', cvssSeverity: 'Critical'}, {title: 'vuln2', cvssSeverity: 'High'}, {title: 'vuln3', cvssSeverity: 'Medium'}]}
-> // List Vulnerabilities with cvssSeverity Critical
{#findings}
{#cvssSeverity == 'Critical'}
{title} : {cvssSeverity}
{/cvssSeverity == 'Critical'}
{/findings}
```

### HTML values (from text editors)

There is a tag filter *convertHTML* that convert HTML to open office XML for direct use in the docx template.  
To handle images, HTML values with images are converted into an array of text and images

```
// HTML without images (eg: affected scope in finding)
-> {@affected | convertHTML} // this must be the only thing in the paragraph

// HTML with images (eg: poc in a finding)
-> 
{-w:p poc}{@text | convertHTML}
                                            {-w:p images}{%image}
                                    Image 1 - {caption}{/images}{/poc}
```

## Audit Object

Docxtemplater requires an object containing data that will be used in the template document.

### name
Name of the audit
> Use in template document: `{name}`

### auditType
Type of the audit. See [Custom Data](/data?id=audit-types)
> Use in template document: `{auditType}`

### location
Location of the audit
> Use in template document: `{location}`

### date
Redacting date
> Use in template document: `{date}`

### date_start
Start date of the test
> Use in template document: `{date_start}`

### date_end
End date of the test
> Use in template document: `{date_end}`

### language
Locale of Audit. [Custom Data](/data?id=languages)

> Use in template document
>```
// Example with conditional tag
{#language == 'en'}English{/language == 'en'}
>```

### company
Object containing:
* **company.name**
* **company.logo** (max width 400px)
* **company.logo_small** (height 37px)

> Use in template document
>```
{company.name}
// Image tags must be the only thing in the paragraph
{%company.logo} // OK
Image: {%company.logo} // NOT OK
>```

### client
Object containing:
* **client.email**
* **client.firstname**
* **client.lastname**
* **client.phone**
* **client.cell**
* **client.title**

> Use in template document
>```
Email: {client.email}
Name: {client.firstname} {client.lastname}
>```

### collaborators
Array of Objects:
* **collaborators[i].username**
* **collaborators[i].firstname**
* **collaborators[i].lastname**
* **collaborators[i].role**

> Use in template document
>```
List of collaborators:
{#collaborators}
Name: {firstname} {lastname}
{/collaborators}
>```

### creator
Object:
* **creator.username**
* **creator.firstname**
* **creator.lastname**
* **creator.role**

> Use in template document
>```
Creator: {creator.firstname} {creator.lastname}
>```

### scope
Array of Objects:
* **scope[i].name**
* **scope[i].hosts**

> Use in template document
>```
Audit Scope:
{-w:p scope}{name}{/scope}
>  
Network Scan:
{#scope}{#hosts}
{hostname} {ip} {os} :
{#services}
{port} {protocol} {name} {product} {version}
{/services}
{/hosts}{/scope}
>```

### findings
List of findings. Array of Objects:
* **findings[i].title**
* **findings[i].vulnType**
* **findings[i].description** (HTML with images)
* **findings[i].observation** (HTML with images)
* **findings[i].remediation** (HTML with images)
* **findings[i].remediationComplexity** (Number 1-3)
* **findings[i].priority** (Number 1-4)
* **findings[i].references** (Array of String)
* **findings[i].cvssv3**
* **findings[i].cvssScore**
* **findings[i].cvssSeverity**
* **findings[i].cvssObj** (Object of cvss Criterias)
* **findings[i].poc** (HTML with images)
* **findings[i].affected** (HTML without images)
* **findings[i].status** (Number 0:done, 1:redacting)
* **findings[i].category**
* **findings[i].identifier**

Identifier consists on a sequential id for the reported vulnerability pre-pended with 'IDX-'. Ex: IDX-001.
You can replace the prefix by using the filter ```changeID```

Additional fields will also be added to the findings Array. The key will be lowercase + strip sapces of the label.  
Eg. if Custom Field label is `Aggravating Factors` it will be added to the array as `findings[i].aggravatingfactors`.

> Use in template document
>```
List of Findings{#findings}
{identifier | changeID: 'PROJ1-'}    {title}    {vulnType}
>  
Severity: {cvssSeverity}    Score: {cvssScore}
Attack Vector: cvssObj.AV               Scope: cvssObj.S
Attack Complexity: cvssObj.AC           Confidentiality: cvssObj.C
Required Privileges: cvssObj.PR         Integrity: cvssObj.I
User Interaction: cvssObj.UI            Availability: cvssObj.A
>  
Affected Scope 
{@affected | convertHTML}
>  
Description
{-w:p description}{@text | convertHTML}
                                            {-w:p images}{%image}
                                    Image 1 - {caption}{/images}{/description}
{/findings}
>```

### Custom Sections

Additional Sections can be added to an Audit. They are accessible in the docx template with the specific Field defined in [Custom Sections](/data?id=custom-sections)

> Use in template document
> ```
// Example with a Cleanup Section: {name: 'Cleanup', field: 'cleanup', text: 'Default text for Cleanup Section'}
CLEANUP SECTION (or use {cleanup.name} as title)
{-w:p cleanup.text}{@text | convertHTML}
                                            {-w:p images}{%image}
                                    Image 1 - {caption}{/images}{/cleanup.text}
> ```

## Styles

Styles for simple text can be defined and applied directly in the Docx Template.

But in order to apply styles to the data from HTML editors, they must be defined in the Docx Template according to this :

| HTML Style | Docx Style    |
|:----------:|:----------:   |
| paragraph  | HTMLTextStyle |
| H1         | Heading1      |
| H2         | Heading2      |
| H3         | Heading3      |
| H4         | Heading4      |
| H5         | Heading5      |
| H6         | Heading6      |
| code (<>)  | CodeChar      |
| code block | Code          |

For `bullet list` and `ordered list` they must be correctly set in the *numbering.xml* file of the Docx Template.

Open the file with an archive manager

![Docx Archive](/_images/docx_archive.png)

The *numbering.xml* file contains definitions of numbering lists.  
`<w:abstractNum w:abstractNumId=0>...</w:abstractNum>` tags represent the definition of a numbering with its different levels.  
`<w:num w:numId="1"><w:abstractNumId w:val="0" /></w:num>` tags associate the effective `Id` used in the document with the `abstract Id` of the definition.

Pwndoc uses `numId="1"` for `bullet list` and `numId="2"` for `ordered list`. So the only thing to change in the file is the value of the abstractNumId associated with those numId.

If there is no abstractNum definitions, this means that no numbering has been used in the document: open the document with Word, add bullet and ordered list, save, delete bullet and ordered list, save.  
There should now be abstractNum definition for each one.

## Filters

Filters allow to apply functions on Audit data values.

### changeID

Replaces the default identifier prefix (IDX-) by the supplied prefix
> Use in template document
>```
{identifier | changeID: 'PROJ1-'}
>```

### convertDate

Convert Date to proper format. Must be used on values with date format.

> Use in template document
>```
// Example with {date_start: '2020-10-29'}
{date_start | convertDate: 'short'} -> 10/29/2020
{date_start | convertDate: 'full'} -> Thursday, October 29, 2020
>```

### formatDate

format date gives you more control on how to display a date.
It provides a set of placeholder that can be used for formatting a date value:

%YY   - year (2 digits)
%YYYY - year (4 digits)
%M    - month
%MM   - month (2 digits always)
%m    - english month description
%D    - day, 
%DD   - day (2 digits always)
%w    - english day of week
%W    - day of week (number)

You can supply as a parameter a string with the format you want. The placeholder will be replaced by the respective values.

> Use in template document
// Example with {date_start: '2020-10-29'}
{date_start | formatDate: '%MM/%DD/%YYYY'} -> 10/29/2020
{date_start | formatDate: '%w, %m %DD, %YYYY'} -> Thursday, October 29, 2020
>```

### convertDateLocale

Convert Date to proper format using locale. Must be used on values with date format.

> Use in template document
>```
// Example with {date_start: '2020-10-29'}
{date_start | convertDateLocale: 'de-DE':'short'} -> 29.10.2020
{date_start | convertDateLocale: 'fr':'full'} -> Jeudi 29 Octobre 2020
>```

### convertHTML

Convert HTML values to OOXML format. See [HTML values](docxtemplate.md?id=html-values-from-text-editors) for usage.

> Use in template document
>```
{@value | convertHTML}
>```

### count 

Count the number of vulnerabilities by CVSS severity.

> Use in template document
>```
// Example counting 'Critical' vulnerabilities
{findings | count: 'Critical'}
>```

Custom filters can also be created in `backend/src/lib/custom-generator.js`. As an example there are 2 filters defined for french reports.

### convertDateFR (custom)

Convert Date to proper format in French. Must be used on values with date format.

> Use in template document
>```
// Example with {date_start: '2020-10-29'}
{date_start | convertDateFR: 'short'} -> 29/10/2020
{date_start | convertDateFR: 'full'} -> Jeudi 29 Octobre 2020
>```

### criteriaFR (custom)

Convert cvss Criteria to French.

> Use in template document
>```
// Example with cvssObj.AV === 'Network'
{cvssObj.AV | criteriaFR} -> Réseau
>```