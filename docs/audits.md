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

Before importing a scan at least one Audit scope must be defined.
Once the scope is created it will appear on Network Scan page.
At this point you may follow these steps: 

1. Import nmap/nessus scan
2. Select all the hosts associated with the scope
3. Click the + symbol to effectively associate hosts with the scope
4. Save

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

## Custom Sections

Add any Custom Section previously defined in [Custom Data](/data?id=custom-sections).

![Custom Sections](/_images/audit_custom_section_add.png)

## Reviews

To be able to use the review process, the feature must first be activated in the settings. A role with the `audits:review` permission should also be added. This new role will be able to review audits and approve them. The roles page gives more details on the permissions of the application. During the whole audit review life cycle, the states, given that the user has enough permissions, can be changed using buttons located on the top left of the audit edit page. 

Once this is done, a reviewer can be added to an audit by the creator or a collaborator. This reviewer will then be able to read the content of the audit. The creator and the collaborators can also mark the audit as ready to be reviewed. This action will change the state of the audit from `EDIT` to `REVIEW`.

![Adding a reviewer](/_images/adding_reviewer.png)

![Marking as ready for review](/_images/mark_for_review.png)

When an audit is in the `REVIEW` state, a reviewer can give his approval of an audit. The minimal number of approvals before an audit is approved is set in the application's settings page. To know who already approved an audit and how far along it is to be approved, it is possible to hover the mouse over the audit state icon. A tooltip will appear, giving you details on the audit's state. 

![Approving an audit](/_images/approving_report.png)

The tooltip giving information on the audit's current state. Here, two approvals are needed for an audit to be approved. The audit is still in the review phase, even if one person approved it already. 

![Information in the tooltip](/_images/audit_state_tooltip.png)

Once enough approvals are given for an audit to be approved, the audit passes to the `APPROVED` state. In this state, the report is ready to be downloaded and sent to the client. 

![Audit is now approved](/_images/approved_audit.png)

The states of the audits can also be seen from the audit list page. 

![Audit list page](/_images/audit_list_states.png)

The audit edit page, when then review mode is activated, follows the following state machine diagram. Different states show different UI elements. Keep in mind that the Report role here is viewing a report for which he is neither a the creator nor collaborator. Otherwise, on his own reports, his graph would be similar to the Collaborator shown here. Also, the reviewer role, here, has only `audits:review` permission, and not `audits:review-all`. 

![Audit edit view state diagram](/_images/edit_state_graph.png)