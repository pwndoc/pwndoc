# Audits

Audits represent the core of the application.  
To create an Audit, it must have a Language and a Template, so they must be first created in the [Custom Data](/data?id=custom-data) menu.  

Audits can be edited by multiple users. Users that opened the Audit are listed at the bottom of the Sections sidebar and you can see the section they are on.  
If 2 users are editing the same section, the last one to save will be effective so be carefull not to edit the same section at the same time.

| <span style="color:green">You can safely edit</span>  | <span style="color:red">You are stepping on each other toe</span> |
|:-----------------------------------------------------:|:-----------------------------------------------------------------:| 
| ![Multi-User](/_images/audit_multiuser_different.png) | ![Multi-User](/_images/audit_multiuser_same.png)                  |

## General Information

This section is about all information relative to the Audit.

![General Information](/_images/audits_general.png)

It's possible to add Collaborators to an Audit, this will give write access to all Collaborators selected.

## Network Scan

This section allows to import Nmap/Nessus Scans (only port scan).

![Network Scan](/_images/audits_network.png)

## Findings

### Create

Findings can be added either from saved Vulnerablities or by creating a new one.
![Finding add](/_images/finding_add.png)

Findings are ordered by Severity and grouped by Category. There are 3 Tabs in a Finding :

**DEFINITION**

General definition of the vulnerability and custom fields of a specific Category if any.

**PROOFS**

Proof of Concept / Exploitation of the vulnerability.

**DETAILS**

Other details like affected assets, CVSS, etc.

### Actions

Toggle the `Completed` checkbox will mark the finding as done.

![Finding Completed](/_images/finding_completed.png)

The ![Propose Creation / Update in Vulnerability Database](/_images/finding_update_vuln_button.png) button will request creation of the finding as a Vulnerability if the Title don't exist or request a modification on the existing Vulnerability (based on the Title). It doesn't directly change the Vulnerability, so feel free to use it. The goal is to make it easier to improve the Vulnerability Database.

Saving can be done with the upper right button or by the most acclaimed feature: <kbd>Ctrl</kbd>+<kbd>S</kbd> or <kbd>&#8984;</kbd>+<kbd>S</kbd>

## Executive Summary

Executive Summary of the Audit

## Custom Sections

Add any Custom Section previously defined in [Custom Data](/data?id=custom-sections).

![Custom Sections](/_images/audit_custom_section_add.png)