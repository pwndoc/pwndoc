# Vulnerabilities

> Pwndoc can manage Vulnerabilities in order to simplify redaction of an Audit. They can be added when editing an Audit as a Finding.<br>
> Each vulnerability can have multiple languages. 

## Create

When creating a Vulnerability, a Category must be selected (or No Category)

A Vulnerability is defined by:

- Title
- Type
- Language
- Description
- Observation
- CVSS
- Remediation
- Remediation Complexity
- Remediation Priority
- References
- Category
- (Additional fields from Category)

!> Title must be unique since it's used for another functionality allowing users to request creation/modification of vulnerabilities when redacting an Audit.

There is also the possibility to search Audits containing the Vulnerability in its findings (search by Title) :<br> 
![Search in Audits](/_images/action_buttons.png)

## Import/Export

Vulnerabilities can be exported/imported in Data menu.

The export format is yaml.

**Example**
```
- references: 
    - reference1
    - reference2
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

For import, the Serpico format is also accepted allowing easier transition or just to have a default set of vulnerabilities.

## Merge

It's possible to merge vulnerabilities for cases where 2 different vulnerabilities exist for 2 different languages. The goal is to avoid duplicates and better multilanguage management.

![Merge Vulns](/_images/merge_vulns.png)

When both languages have been selected, only Vulnerabilities that don't have the other column language will be displayed.  
In this example :
- In the left column only Vulnerabilities having English language AND no French language are displayed
- In the right column only Vulnerabilities having French language AND no English language are displayed

The language details from the Vulnerability of the right column will be moved to the Vulnerability of the left column. So this is *CVSS*, *references*, *etc* of the left column that will be kept.

## Validate

All users can request creation or modifications on a vulnerability when redacting findings in an Audit. Users with admin role can see and validate those modifications in Vulnerabilities menu.

![Validate](/_images/new_updates_vulns.png)

**New**

![New vuln](/_images/new_vuln.png)

Before approving, it's possible to make changes to the Vulnerability including adding Languages.

**Updates**

![Updates vuln](/_images/updates_vuln.png)

The left side is the current Vulnerability

The right side has multiple tabs, each representing change requests made by users. There is syntax highlighting to make it easier to spot differences.

The admin user must manually make changes in the left side with what he wants from the right side. When clicking the Update button the left side will be saved and all update requests from the right side will be deleted.
