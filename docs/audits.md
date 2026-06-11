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

Other details like affected assets, CVSS v3, CVSS v4, etc. The scoring panels available in this tab depend on the scoring types enabled in [Settings](/settings.md#scoring-types).

### Actions

Toggle the `Completed` checkbox will mark the finding as done.

![Finding Completed](/_images/finding_completed.png)

The ![Propose Creation / Update in Vulnerability Database](/_images/finding_update_vuln_button.png) button will request creation of the finding as a Vulnerability if the Title don't exist or request a modification on the existing Vulnerability (based on the Title). It doesn't directly change the Vulnerability, so feel free to use it. The goal is to make it easier to improve the Vulnerability Database.

Saving can be done with the upper right button or by the most acclaimed feature: <kbd>Ctrl</kbd>+<kbd>S</kbd> or <kbd>&#8984;</kbd>+<kbd>S</kbd>

### Retest Audits

When an audit type uses the `retest` stage, each finding includes additional retest fields:

- **Retest Status** — Set the validation result to `ok` (Corrected), `ko` (Not corrected), `partial` (Partially corrected), or `unknown` (Not verifiable).
- **Retest Description** — Write the retest response for the finding.
- **Split View** — Toggle split view to display the original finding data in a read-only panel beside the editable retest response.

![Retest audit finding showing validation status and retest response fields](/_images/audits-retest-fields.png)

## Custom Sections

Custom Sections are configured on the selected Audit Type in [Custom Data](/data?id=audit-types). When you create an audit, every section attached to that Audit Type is added automatically.

Inside the audit edit page, custom sections appear in the left sidebar with the built-in sections. You can open them there and edit their content, but you cannot add or remove sections from the audit editor itself.

![Custom Sections](/_images/audit_custom_section_add.png)

## Comments

Each audit has a comment panel accessible from the audit edit page. Comments allow collaborators to leave notes, questions, and feedback directly on the audit without modifying its content.

![Comments panel showing an active comment thread with a reply](/_images/audits-comments-panel.png)

### Adding a Comment

Enable comment mode on the audit edit page, then select text in any editor field to attach a comment to it. Enter your comment text and submit.

### Replies

Click on a comment to focus it, then type in the reply input at the bottom of the comment card and press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to submit. Replies are threaded under the parent comment.

### Resolving and Reopening

Once a comment has been addressed, mark it as resolved. Resolved comments are visually distinct and can be filtered out of the view. Click the reopen button to reactivate a resolved comment if needed.

### Filtering

Use the filter menu in the comment panel header to show:
- **All** — active and resolved comments
- **Active** — open comments only
- **Resolved** — resolved comments only

### Permissions

| Action | Permission required |
|--------|-------------------|
| Create comments and replies | `audits:comments:create` |
| Edit comments and replies | `audits:comments:update` |
| Delete comments and replies | `audits:comments:delete` |

## Reviews

To be able to use the review process, the feature must first be activated in the settings. A role with the `audits:review` permission should also be added. This new role will be able to review audits and approve them. The roles page gives more details on the permissions of the application. During the whole audit review life cycle, the states, given that the user has enough permissions, can be changed using buttons located on the top left of the audit edit page. 

Once this is done, a reviewer can be added to an audit by the creator or a collaborator. This reviewer will then be able to read the content of the audit. The creator and the collaborators can also mark the audit as ready to be reviewed. This action will change the state of the audit from `EDIT` to `REVIEW`.

![Adding a reviewer](/_images/adding_reviewer.png)

When an audit is in the `REVIEW` state, a reviewer can give his approval of an audit. The minimal number of approvals before an audit is approved is set in the application's settings page. 

![Approving an audit](/_images/approving_report.png)

Once enough approvals are given for an audit to be approved, the audit passes to the `APPROVED` state. In this state, the report is ready to be downloaded and sent to the client. 

![Audit is now approved](/_images/approved_audit.png)

The state of the audits reviews can also be seen from the audit list page. It is possible to know who already approved an audit by hovering the mouse over the audit state icon. A tooltip will appear, giving you details on the audit's state. 

![Information in the tooltip](/_images/audit_list_review_state.png)

The audit edit page, when then review mode is activated, follows the following state machine diagram. Different states show different UI elements. Keep in mind that the Report role here is viewing a report for which he is neither a the creator nor collaborator. Otherwise, on his own reports, his graph would be similar to the Collaborator shown here. Also, the reviewer role, here, has only `audits:review` permission, and not `audits:review-all`. 

![Audit edit view state diagram](/_images/edit_state_graph.png)
