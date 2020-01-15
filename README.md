# PwnDoc

PwnDoc is a pentest reporting application making it simple and easy to write your findings and generate a customizable docx report.
The main goal is to have more time to Pwn and less time to Doc by mutualizing datas like vulnerabilities between users.

# Demos

#### Multi-User reporting
![Shared Audit demo gif](https://raw.githubusercontent.com/pwndoc/pwndoc/master/demos/shared_audit_demo.gif)

#### Finding edition
![Finding edit demo gif](https://raw.githubusercontent.com/pwndoc/pwndoc/master/demos/audit_finding_demo.gif)

#### Vulnerability management workflow
![Create and update demo gif](https://raw.githubusercontent.com/pwndoc/pwndoc/master/demos/create_and_update_finding.gif)

# Installation

PwnDoc uses 3 containers: the backend, the frontend and the database. They can be run all at once using the docker-compose file in this directory using the following command.

For production usage make sure to change the JWT secret in «src/lib/auth.js» and certificates in «ssl» folder.

Build and run Docker containers
```
docker-compose up -d --build
```

Stop/Start containers
```
docker-compose stop
docker-compose start
```

Remove containers
```
docker-compose down
```
Application is accessible through https://localhost:8443

For developpment purposes, specific docker-compose file can be used in each folder (backend/frontend).

# Features

## Custom datas

It's possible to customize some datas to be shared between users:
- Companies
- Clients
- Languages (for vulnerabilities and audits)
- Audit types
- Vulnerability types
- Sections (for custom paragraphs)

## Multiple language support

It's possible to define several languages that will then be available for audits and vulnerabilities sections, and also for custom datas.

## Vulnerabilities management

Vulnerabilities can be created in the «Vulnerabilities» section but can also be imported and exported in yaml format, here is an example:
```
- references: null
  cvssv3: 'CVSS:3.0/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N'
  cvssScore: '3.1'
  cvssSeverity: Low
  priority: 2
  remediationComplexity: 2
  details:
    - locale: fr
      title: Attributs des cookies
      vulnType: Application Web
      description: >-
        Les cookies permettent de stocker des informations relatives à
        l'utilisateur comme par exemple ses informations de session.

        Il est donc important qu'ils soient sécurisés au maximum afin de
        prévenir toute fuite d'informations. Pour cela il existe des «flags» à
        définir lors de la création d'un cookie:

        - le flag «Secure» indique que le cookie ne peut être transmis que si le
        canal de communication est chiffré (HTTPS)

        - le flag «HttpOnly» indique que le cookie ne peut être récupéré par du
        code JavaScript ce qui prévient sa récupération par des attaques de type
        XSS
      observation: null
      remediation: Définir les flags «Secure» et «HttpOnly» lors de la création de cookies
    - locale: en
      title: Cookie Without the HTTPOnly and Secure Flags
      vulnType: Web Application
      description: >-
        Session tokens stored in the “Cookie” headers can be protected from client-side attacks. Those protections are referred to as flags that the web server declares on each cookie it sets. 
        Among those flags, the “HTTPOnly” flag restricts access to the cookie from the JavaScript code. The “secure” flag restricts the transmission of the protected cookie on a regular HTTP channel. Those two flags were not set for some cookies used by the application.
      observation: >-
        With a successful Cross-Site Scripting (XSS) exploitation, the attacker could access the cookies using JavaScript and steal the session token of the victim to impersonate him on the application. The “HTTPOnly” flag would prevent the attacker from accessing the cookie in this scenario.
        Another strategy an attacker could exploit is eavesdropping on web traffic and wait for the client to use resources over the HTTP cleartext protocol. If the resources reside on the same domain, the vulnerable cookie will be used over this channel and captured by the attacker. Also, a "man-in-the-middle" (MITM) technique called “SSL Stripping” could be performed by the attacker to force usage of the insecure HTTP protocol. Again, the session token could be captured when the “secure” flag is not set.
      remediation: |
        Ensure the “HTTPOnly” and “secure” flags are set on each cookie that is used by the application.
```

In order to facilitate and maintain vulnerabilities management, it's possible to request creation or modification of a finding directly from the report redaction. When editing a finding in a report, clicking the «Create or Update vulnerability» will emit a create or modification request that can be reviewed and approved in the «Vulnerabilities» section by an administrator.
All approved vulnerabilities can then be easily added during reporting.

There is also a functionnality allowing to search for a specific vulnerability in all accessible audits. 

## Docx report generation

When finished redacting an audit, it's possible to generate a docx report using a previously uploaded template.

## Multi-User reporting

This application is built to support multi user collaboration. There are two different roles: admin and user.

When creating an audit, users can be added as collaborators so they can access and contribute to the report. When writing a report you can see other users that are currently editing the same report. Each user is recognizable with a color system so that you know who is editing what section and not mess with their work.

## Custom sections

It's possible to add as many custom sections as wanted, but they must be created first in the «Datas/Custom datas» section.

# Templating

This application uses the nodejs library docxtemplater to generate a docx report. Different types of tag can be found on the official site documentation: https://docxtemplater.readthedocs.io/en/v3.1.0/tag_types.html

See the «report-templates» folder for some examples.

Regarding the data to use in the template, see «src/models/audit.js» to understand the fields to use.
