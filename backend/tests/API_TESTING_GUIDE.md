# API Testing Guide - Observation Model POC

This guide provides step-by-step instructions for testing the Observation Model API and report generation.

## Prerequisites

1. **Backend Running:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Backend should be running on `https://localhost:4242`

2. **MongoDB Running:**
   - Ensure MongoDB is accessible at configured host/port
   - Default: `mongodb://localhost:27017/pwndoc`

3. **Authentication:**
   - Obtain JWT token by logging in
   - Use token in `Authorization: Bearer {TOKEN}` header

---

## Test Workflow

### Step 1: Create Test Audit

**Endpoint:** `POST /api/audits`

**Request:**
```bash
curl -X POST https://localhost:4242/api/audits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k \
  -d '{
    "name": "POC Assurance Report Test",
    "language": "en",
    "auditType": "Internal Audit",
    "date": "2025-01-15",
    "date_start": "2025-01-01",
    "date_end": "2025-01-15",
    "reportType": "audit",
    "useLegacyFindings": false
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "AUDIT_ID_HERE",
    "name": "POC Assurance Report Test",
    ...
  }
}
```

**Save the `_id` for subsequent requests.**

---

### Step 2: Create Observations

Use the AUDIT_ID from Step 1 to create observations.

#### Observation 1: Custom Risk Scoring

**Endpoint:** `POST /api/audits/:auditId/observations`

```bash
curl -X POST https://localhost:4242/api/audits/AUDIT_ID/observations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k \
  -d '{
    "title": "Insufficient Access Controls",
    "category": "Access Management",
    "description": "<p>Administrative functions are accessible to non-admin users without proper authorization checks.</p>",
    "evidence": "<p>During testing, regular user account testuser was able to access the /admin panel and view sensitive configuration settings.</p>",
    "impact": "<p>Unauthorized users could modify critical system settings, potentially leading to data breaches or system compromise.</p>",
    "recommendation": "<p>Implement role-based access control (RBAC) for all administrative functions. Ensure proper authorization checks are in place before granting access to sensitive areas.</p>",
    "priority": 2,
    "effortLevel": 2,
    "riskScore": {
      "method": "custom",
      "customScore": 7.5
    },
    "references": [
      "OWASP Top 10 - Broken Access Control",
      "CWE-284: Improper Access Control"
    ]
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "OBS_ID_1",
    "identifier": 1,
    "title": "Insufficient Access Controls",
    "riskScore": {
      "method": "custom",
      "score": 7.5,
      "severity": "High"
    },
    ...
  }
}
```

#### Observation 2: Risk Matrix Scoring

```bash
curl -X POST https://localhost:4242/api/audits/AUDIT_ID/observations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k \
  -d '{
    "title": "Weak Password Policy",
    "category": "Authentication",
    "description": "<p>The system allows users to set weak passwords without complexity requirements.</p>",
    "evidence": "<p>Successfully created account with password 123456. No minimum length, complexity, or dictionary check enforced.</p>",
    "impact": "<p>Weak passwords are susceptible to brute force attacks, potentially allowing unauthorized access to user accounts.</p>",
    "recommendation": "<p>Implement strong password policy requiring minimum 12 characters, uppercase, lowercase, numbers, and special characters. Consider implementing password strength meter and blocking common passwords.</p>",
    "priority": 2,
    "effortLevel": 1,
    "riskScore": {
      "method": "matrix",
      "likelihood": "High",
      "impact": "High"
    },
    "references": [
      "NIST SP 800-63B - Digital Identity Guidelines",
      "CWE-521: Weak Password Requirements"
    ]
  }'
```

**Expected Risk Score:** Automatically calculated based on likelihood × impact

#### Observation 3: CVSS 3.1 Scoring

```bash
curl -X POST https://localhost:4242/api/audits/AUDIT_ID/observations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k \
  -d '{
    "title": "Missing Security Headers",
    "category": "Security Configuration",
    "description": "<p>Web application does not implement recommended security headers.</p>",
    "evidence": "<p>HTTP response analysis shows missing Content-Security-Policy, X-Frame-Options, and Strict-Transport-Security headers.</p>",
    "impact": "<p>Missing security headers increase vulnerability to XSS attacks, clickjacking, and man-in-the-middle attacks.</p>",
    "recommendation": "<p>Implement recommended security headers: Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options.</p>",
    "priority": 3,
    "effortLevel": 1,
    "riskScore": {
      "method": "cvss3",
      "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N"
    },
    "references": [
      "OWASP Secure Headers Project",
      "CWE-1021: Improper Restriction of Rendered UI Layers"
    ]
  }'
```

**Expected Risk Score:** Automatically calculated from CVSS vector (should be ~5.4 Medium)

#### Observation 4: CVSS 4.0 Scoring

```bash
curl -X POST https://localhost:4242/api/audits/AUDIT_ID/observations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k \
  -d '{
    "title": "Outdated Dependencies",
    "category": "Software Composition",
    "description": "<p>Application uses outdated third-party libraries with known vulnerabilities.</p>",
    "evidence": "<p>Package.json shows jQuery 2.1.4 (current: 3.6+), lodash 4.17.15 (current: 4.17.21+). Both versions have published CVEs.</p>",
    "impact": "<p>Known vulnerabilities in dependencies could be exploited by attackers to compromise the application.</p>",
    "recommendation": "<p>Update all dependencies to latest stable versions. Implement automated dependency scanning in CI/CD pipeline. Consider using tools like npm audit or Snyk.</p>",
    "priority": 3,
    "effortLevel": 2,
    "riskScore": {
      "method": "cvss4",
      "vector": "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N"
    },
    "references": [
      "CVE-2020-11022 (jQuery XSS)",
      "CVE-2020-8203 (lodash prototype pollution)",
      "OWASP A06:2021 - Vulnerable and Outdated Components"
    ]
  }'
```

**Expected Risk Score:** Automatically calculated from CVSS 4.0 vector

#### Observation 5: Low-Risk Finding

```bash
curl -X POST https://localhost:4242/api/audits/AUDIT_ID/observations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k \
  -d '{
    "title": "Information Disclosure in Error Messages",
    "category": "Information Disclosure",
    "description": "<p>Detailed error messages expose sensitive system information.</p>",
    "evidence": "<p>SQL error messages reveal database table structure and query details. Stack traces show internal file paths and framework versions.</p>",
    "impact": "<p>Information disclosure aids attackers in reconnaissance and vulnerability exploitation.</p>",
    "recommendation": "<p>Implement generic error messages for end users. Log detailed errors server-side only. Configure production environment to suppress debug information.</p>",
    "priority": 4,
    "effortLevel": 1,
    "riskScore": {
      "method": "custom",
      "customScore": 3.5
    },
    "references": [
      "OWASP A05:2021 - Security Misconfiguration",
      "CWE-209: Information Exposure Through Error Messages"
    ]
  }'
```

---

### Step 3: Retrieve Observations

**Endpoint:** `GET /api/audits/:auditId/observations`

```bash
curl -X GET https://localhost:4242/api/audits/AUDIT_ID/observations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k
```

**Expected Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "...",
      "identifier": 1,
      "title": "Insufficient Access Controls",
      "riskScore": {
        "method": "custom",
        "score": 7.5,
        "severity": "High"
      },
      ...
    },
    ...
  ]
}
```

**Verify:**
- All 5 observations returned
- Identifiers auto-incremented (1, 2, 3, 4, 5)
- Risk scores calculated correctly
- Severities assigned (None/Low/Medium/High/Critical)

---

### Step 4: Update Observation

**Endpoint:** `PUT /api/audits/:auditId/observations/:observationId`

```bash
curl -X PUT https://localhost:4242/api/audits/AUDIT_ID/observations/OBS_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k \
  -d '{
    "priority": 1,
    "riskScore": {
      "method": "custom",
      "customScore": 9.0
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "priority": 1,
    "riskScore": {
      "method": "custom",
      "score": 9.0,
      "severity": "Critical"
    },
    ...
  }
}
```

**Verify:**
- Risk severity updated to "Critical" (score >= 9.0)
- Socket.io event emitted (`updateAudit`)

---

### Step 5: Generate DOCX Report

**Endpoint:** `GET /api/audits/:auditId/generate`

```bash
curl -X GET https://localhost:4242/api/audits/AUDIT_ID/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k \
  --output POC_AssuranceReport.docx
```

**Expected Response:**
- HTTP 200 OK
- `Content-Type: application/octet-stream`
- `Content-Disposition: attachment; filename="POC Assurance Report Test.docx"`
- File size > 0 bytes

**Save as:** `POC_AssuranceReport.docx`

---

### Step 6: Verify DOCX Content

Open the generated DOCX file in Microsoft Word or LibreOffice and verify:

#### ✅ Observation Data Populated

Search for these identifiers and verify data is present:

- `OBS-001` - Insufficient Access Controls
- `OBS-002` - Weak Password Policy
- `OBS-003` - Missing Security Headers
- `OBS-004` - Outdated Dependencies
- `OBS-005` - Information Disclosure

#### ✅ Risk Scores Displayed

Verify risk scoring information appears:

| Observation | Method | Score | Severity |
|-------------|--------|-------|----------|
| OBS-001 | Custom | 7.5 | High |
| OBS-002 | Matrix | ~6.7 | High |
| OBS-003 | CVSS3 | ~5.4 | Medium |
| OBS-004 | CVSS4 | ~5.0 | Medium |
| OBS-005 | Custom | 3.5 | Medium |

#### ✅ Content Sections Present

For each observation, verify these sections render:

- **Description** - Issue explanation
- **Evidence** - Proof/details
- **Impact** - Business/technical impact
- **Recommendation** - How to address

#### ✅ Formatting

- Risk severity uses color-coded table cells:
  - Critical: Black (#212121)
  - High: Red (#FE0000)
  - Medium: Orange (#F9A009)
  - Low: Green (#008000)
  - None: Blue (#4A86E8)

- References appear as bulleted lists
- Images (if any) display correctly
- Text formatting preserved (bold, italic, paragraphs)

#### ✅ No Unpopulated Variables

Search for these patterns (should find ZERO matches):

- `{observation.` - Unpopulated observation variables
- `{riskScore.` - Unpopulated risk variables
- `{{` or `}}` - Template syntax errors

If you find any unpopulated variables, note them for template fixes.

---

### Step 7: Delete Observation

**Endpoint:** `DELETE /api/audits/:auditId/observations/:observationId`

```bash
curl -X DELETE https://localhost:4242/api/audits/AUDIT_ID/observations/OBS_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -k
```

**Expected Response:**
```json
{
  "status": "success",
  "data": "Observation deleted successfully"
}
```

**Verify:**
- Observation no longer in database
- GET request returns 404
- Socket.io event emitted

---

## Test Validation Checklist

### Backend API ✅

- [ ] POST `/api/audits/:id/observations` - Creates observation
- [ ] GET `/api/audits/:id/observations` - Lists observations
- [ ] GET `/api/audits/:id/observations/:id` - Gets single observation
- [ ] PUT `/api/audits/:id/observations/:id` - Updates observation
- [ ] DELETE `/api/audits/:id/observations/:id` - Deletes observation
- [ ] GET `/api/audits/:id/generate` - Generates DOCX report

### Risk Scoring ✅

- [ ] Custom method: Manual score → severity mapping works
- [ ] Matrix method: Likelihood × Impact → score calculation works
- [ ] CVSS3 method: Vector parsing and score calculation works
- [ ] CVSS4 method: Vector parsing and score calculation works
- [ ] Severity colors: Mapped correctly in DOCX

### Report Generation ✅

- [ ] Observations appear in generated DOCX
- [ ] Observation identifiers (OBS-001, OBS-002, etc.) formatted correctly
- [ ] Risk scores and severities display
- [ ] Description/Evidence/Impact/Recommendation sections render
- [ ] References list properly
- [ ] Images embedded correctly (if applicable)
- [ ] Table cell colors match severity
- [ ] No unpopulated {variables}

### Backward Compatibility ✅

- [ ] Existing pentests with findings still work
- [ ] Legacy finding generation unchanged
- [ ] Template can use both {findings} and {observations}
- [ ] Audit with useLegacyFindings=true uses findings
- [ ] Audit with useLegacyFindings=false uses observations

### Real-time Updates ✅

- [ ] Socket.io event emitted on create
- [ ] Socket.io event emitted on update
- [ ] Socket.io event emitted on delete
- [ ] Multiple users see updates in real-time

---

## Sample Test Data

Full test data is available in: `backend/tests/sample-observations.json`

---

## Troubleshooting

### 401 Unauthorized
**Cause:** JWT token expired or invalid
**Solution:** Re-login to get fresh token

### 403 Forbidden
**Cause:** User lacks permission
**Solution:** Ensure user has `audits:update` permission

### 404 Not Found
**Cause:** Audit ID or Observation ID invalid
**Solution:** Verify IDs from previous requests

### 500 Internal Server Error
**Cause:** Server-side issue
**Solution:** Check backend logs for error details

### Template Variables Not Populated
**Cause:** Template file doesn't have observation variables
**Solution:** Update DOCX template using `TEMPLATE_VARIABLES.md` guide

### Risk Score Not Calculated
**Cause:** Invalid CVSS vector or matrix values
**Solution:** Verify vector format or likelihood/impact values

---

## Next Steps

1. ✅ **API Testing Complete** - All endpoints validated
2. ⏳ **DOCX Template** - Create AssuranceReportTemplate.docx
3. ⏳ **Frontend UI** - Build Vue components for observation management
4. ⏳ **Automated Tests** - Create Jest/Mocha test suite

---

## Support

For issues or questions:
- Check `POC_SUMMARY.md` for overview
- Review `TEMPLATE_VARIABLES.md` for template syntax
- Examine `backend/src/models/observation.js` for model details
- See `backend/src/routes/observation.js` for API implementation
