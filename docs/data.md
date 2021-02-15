# Data

> Pwndoc uses different kinds of data to improve and mutualize user experience. This allows to have reusable and customizable information across audits.

![Data](_images/collaborators.png)


## Collaborators

Collaborators are users of the application and can be part of an audit either as the creator or as a collaborative user.

A Collaborator is defined by:

- Username
- Lastname
- Firstname
- Role
- Password

There are 3 different roles:

**user**

- Read/Write on created and collaboration Audits
- Readonly on Vulnerabilities
- Read/Write on *Companies* and *Clients* Data

**report**

- Inherit from user role
- \+ Read/Write on all Audits

**admin**

- Read/Write on everything


## Companies

Companies that order an Audit.

A Company is defined by:

- Name
- Logo


## Clients

Specific clients of companies. Generally the point of contact during a mandate.

A Client is defined by:

- Company
- Lastname
- Firstname
- Email
- Function
- Phone
- Cell

## Templates

Templates are Word documents with special tags that are filled with Audit data when generating the report. See [Docx Template](/docxtemplate.md) section.

A Template is defined by:

- Name
- File

## Custom Data

Custom Data represent a way to fully customize Audits and Vulnerabilities. They are editable and their order can be changed to personalize how they will be displayed for users.

!> Values must match this regex:  `/^[A-zÀ-ú0-9 \[\]\'()_-]+$/`

### Languages

Pwndoc can handle multiple Languages when it comes to Custom Data or Vulnerabilities. It's one of the first things to create before being able to start an Audit.

A Language is defined by:

- Language: the displayed name in the application
- Locale: the value used to identify a language in API calls

> Example
> ```
Language: English   Locale: en
Language: French    Locale: fr
> ```

### Audit Types

Audit Types represent the nature of an Audit. They are multilinguale.

An Audit Type is defined by:

- Name

> Example
>```
English
    Name: Internal,
    Name: Web Application
French
    Name: Interne
    Name: Application Web
> ```

### Vulnerability Types

Vulnerability Types represent the nature of a Vulnerability. They are multilinguale.

A Vulnerability Type is defined by:

- Name

> Example
>```
English
    Name: Wireless,
    Name: Mobile Application
French
    Name: Réseau Sans Fil
    Name: Application Mobile
> ```

### Vulnerability Categories

Vulnerability Categories are used to categorize a Vulnerability. It can add custom fields to a vulnerability

A Vulnerability Category is defined by:

- Name

> Example
>```
Name: Nessus Scan
> ```

### Custom Fields

Custom Sections allow to have additionnal Sections in the Audit. They are multilingual.

A Section is defined by:

- Type: [input = simple string], [text = editor]
- Label: displayed value in the GUI (lowercase + strip spaces to use in the docx template)
- Display in Vulnerability: Custom Field will be displayed in Vulnerabilities AND Findings
- Display in Finding: Custom Field will be displayed only in Findings
- Display for Categories: Custom Field will be displayed only for selected Categories

> Example
> ```
Type: input
Label: Id
Display in Vulnerability: true
Display in Finding: false
Display for Categories: false
>  
-> This will display an additional «Id» field in vulnerabilities that will also be displayed in findings
>```

### Custom Sections

Custom Sections allow to have additionnal Sections in the Audit. They are multilingual.

A Section is defined by:

- Name
- Field (used in docx template)
- Default Text
- icon

> Example
> ```
Name: Cleanup
Field: cleanup
Default Text: "This is the cleanup part.
               Here are all elements impacted during the test"
icon: mdi-broom
>```
