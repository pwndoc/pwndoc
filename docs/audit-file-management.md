# Audit File Management

Every audit has a **File Management** entry below General Information. Existing
audits receive the page automatically. Administrators can hide its navigation entry
per audit type under **Data → Custom Data → Audit Types → Hide Built-in Sections**
by checking **File Management**. This option is available for default, retest and
multi-audit types and applies to existing and future audits after reloading.
Unchecking it restores the menu entry. Hiding it preserves files, backup/restore,
and direct page/API access with the normal permissions; it is a navigation setting.
Existing types without `files` in their `hidden` list keep the entry visible.
For managed profiles, keep this choice in the profile so reconciliation preserves it.

Select multiple files or drop them onto the
page to upload them individually. Each successful upload is saved immediately;
failed uploads are reported individually and do not discard successful transfers.
The inventory shows filename, size, upload date, uploader and malware scan status.
Users can search the list, download the original bytes, and confirm deletion.

Files belong to one audit. They are independent of findings, custom fields, the
generated report, and external ticket delivery. A retest starts with an empty file
inventory; the original audit retains its own files. Multi-audits likewise have
their own inventory, without implicitly sharing child-audit files.

## Permissions and review state

Listing and downloading require `audits:read` and membership as audit creator,
collaborator or reviewer, or `audits:read-all`. Adding and deleting require
`audits:update` and creator/collaborator membership, or `audits:update-all`.
Read-all users can therefore download every audit's files. Every operation checks
the owning audit and scopes the file lookup to that audit, including downloads.

When reviews are enabled, uploads and deletion are allowed only in `EDIT` state.
An upload rechecks authorization and audit state after transfer/scanning before
making the file available. Download remains available in `REVIEW` and `APPROVED`.
Files do not participate in report approval or automatically reset approvals.
File upload/download/delete logs contain audit, file and actor IDs, without file
content or names.

## Storage and limits

Binary content streams into the MongoDB GridFS bucket `auditFileBlobs`; metadata
lives in `auditfiles`. Content is never base64-encoded or embedded in audit/custom
field documents. No additional storage volume is needed. Uploading files reserve
their declared size and one file slot before transfer, so simultaneous requests
cannot bypass the quotas. A short expiring lease on the audit serializes quota
reservations across backend workers. Interrupted transfers are removed on handled
errors. Hourly maintenance reclaims abandoned uploads/deletions older than 24 hours.

The backend accepts any extension, including extensionless and empty files.
Filenames are reduced to a safe basename and limited to 255 UTF-8 bytes. Download
always uses `Content-Disposition: attachment`, `application/octet-stream`,
`X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`.
File contents are not rendered or extracted. SHA-256 checksums are recorded.

Configure these environment variables on the backend (passed through the default
Compose file):

| Variable | Default | Meaning |
| --- | ---: | --- |
| `AUDIT_FILES_MAX_FILE_BYTES` | `104857600` | 100 MiB per file |
| `AUDIT_FILES_MAX_AUDIT_BYTES` | `1073741824` | 1 GiB per audit, including pending uploads |
| `AUDIT_FILES_MAX_COUNT` | `100` | File count per audit, including pending uploads |
| `AUDIT_FILES_CLAMAV_HOST` | empty | Optional ClamAV daemon host |
| `AUDIT_FILES_CLAMAV_PORT` | `3310` | ClamAV TCP port |

Quota settings must be positive integers. Lowering a quota does not delete files;
it can prevent new uploads until usage falls below the limit. Transfers time out
after 15 minutes of inactivity. Ensure reverse proxy size/time limits accommodate
the configured maximum. Size limits on the JSON parser are unrelated to these raw
binary uploads. File storage increases database size and backup/recovery time.
Use the deployment's existing transport, disk and backup encryption controls.

## Optional malware scanning

Without `AUDIT_FILES_CLAMAV_HOST`, files are explicitly labelled **Not scanned**.
There is no implied antivirus protection. To enforce scanning, configure a ClamAV
daemon reachable from the backend's private network and set its `StreamMaxLength`
at least as large as the file size limit. Use a trusted private connection; the
ClamAV INSTREAM protocol does not provide transport authentication/encryption.

When configured, the backend streams each upload to ClamAV. Only an `OK` response
makes the file downloadable; a rejection, scanner error, disconnection or timeout
removes the new content and its metadata. The client sees upload/validation until
this completes. An unavailable configured scanner blocks new uploads. Configuring
scanning does not retroactively scan existing files or files imported from trusted
administrator backups. Encrypted archives and scan limits follow the daemon's
policy; the application never claims to inspect encrypted content itself.

## Deletion, backup and restore

Deleting an audit removes its file metadata and binary chunks. Active uploads
recheck audit existence and discard their data if the audit was deleted.

Complete MongoDB logical backups include both metadata and GridFS collections.
The native PwnDoc **Audits** backup also includes files: `backup.json` advertises
`auditFilesVersion: 1`, `audits-files.json` records attachment metadata, and
`audit-files/<file-id>` contains each binary. Export/import stream content and
verify size and SHA-256. An upsert restores the same attachment IDs and replaces
content only after successful verification. A revert removes files before
restoring the audit snapshot. Old archives without attachment data remain readable;
upsert leaves existing files intact, while revert produces audits without files.
The restore source must be a trusted administrator backup.

As with the existing audit/image export, the application backup is not an online
transactional snapshot. Quiesce audit/file writers during backup or restoration
when a consistent recovery point is required. Do not write directly to the
attachment collections or GridFS bucket while transfers/maintenance are running.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/audits/:auditId/files` | Ready files, quota usage and limits |
| POST | `/api/audits/:auditId/files` | Upload one raw binary |
| GET / HEAD | `/api/audits/:auditId/files/:fileId/download` | Download original bytes / check access and metadata |
| DELETE | `/api/audits/:auditId/files/:fileId` | Delete a file |

POST requires `Content-Type: application/octet-stream`, an exact `Content-Length`,
and `X-File-Name` containing the percent-encoded UTF-8 filename. Browsers supply
Content-Length automatically for File/Blob bodies. Multiple files use individual
requests, which permits per-file progress, errors and quota checks. Unknown-length
chunked uploads and resumable transfers are not supported.

## Validation

Run the standalone integration suite against a disposable MongoDB database named
exactly `pwndoc-files-test`. The suite creates and deletes its synthetic data:

```sh
cd backend
AUDIT_FILE_TEST_URI=mongodb://127.0.0.1:27017/pwndoc-files-test npm run test:files:api
```

Frontend behavior tests run with `npm run test:run -- audit-files.test.js` from
`frontend/`. Also run the normal backend regression suite, frontend unit suite and
production build before release.
