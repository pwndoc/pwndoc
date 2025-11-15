/**
 * Test Script for Observation Model & Report Generation POC
 *
 * This script tests the complete workflow:
 * 1. Create test audit
 * 2. Create sample observations with different risk scoring methods
 * 3. Generate DOCX report
 * 4. Verify output
 *
 * Usage: node backend/tests/poc-test.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Set global basedir (required by models)
global.__basedir = path.join(__dirname, '..');

// Load environment variables
process.env.DB_SERVER = process.env.DB_SERVER || 'localhost';
process.env.DB_NAME = process.env.DB_NAME || 'pwndoc';

// Connect to database and wait for connection
async function connectDB() {
    await mongoose.connect(`mongodb://${process.env.DB_SERVER}:27017/${process.env.DB_NAME}`, {});
    console.log('✓ Connected to MongoDB');
}

// Load all models AFTER connection
function loadModels() {
    require('../src/models/user');
    require('../src/models/audit');
    require('../src/models/company');
    require('../src/models/client');
    require('../src/models/template');
    require('../src/models/observation');
    require('../src/models/observation-type');
    require('../src/models/language');
    require('../src/models/audit-type');
    require('../src/models/vulnerability-type');
    require('../src/models/vulnerability-category');
    require('../src/models/custom-section');
    require('../src/models/custom-field');
    require('../src/models/image');
    require('../src/models/settings');
    console.log('✓ Models loaded');
}

let Audit, Observation, ObservationType, User, Company, Client, Template, Language, AuditType, reportGenerator;

// Test data
const testData = {
    observations: [
        {
            title: "Insufficient Access Controls",
            category: "Access Management",
            description: "<p>Administrative functions are accessible to non-admin users without proper authorization checks.</p>",
            evidence: "<p>During testing, regular user account 'testuser' was able to access the /admin panel and view sensitive configuration settings.</p>",
            impact: "<p>Unauthorized users could modify critical system settings, potentially leading to data breaches or system compromise.</p>",
            recommendation: "<p>Implement role-based access control (RBAC) for all administrative functions. Ensure proper authorization checks are in place before granting access to sensitive areas.</p>",
            priority: 2, // High
            effortLevel: 2, // Medium
            riskScore: {
                method: "custom",
                customScore: 7.5
            },
            references: [
                "OWASP Top 10 - Broken Access Control",
                "CWE-284: Improper Access Control"
            ]
        },
        {
            title: "Weak Password Policy",
            category: "Authentication",
            description: "<p>The system allows users to set weak passwords without complexity requirements.</p>",
            evidence: "<p>Successfully created account with password '123456'. No minimum length, complexity, or dictionary check enforced.</p>",
            impact: "<p>Weak passwords are susceptible to brute force attacks, potentially allowing unauthorized access to user accounts.</p>",
            recommendation: "<p>Implement strong password policy requiring minimum 12 characters, uppercase, lowercase, numbers, and special characters. Consider implementing password strength meter and blocking common passwords.</p>",
            priority: 2, // High
            effortLevel: 1, // Low
            riskScore: {
                method: "matrix",
                likelihood: "High",
                impact: "High"
            },
            references: [
                "NIST SP 800-63B - Digital Identity Guidelines",
                "CWE-521: Weak Password Requirements"
            ]
        },
        {
            title: "Missing Security Headers",
            category: "Security Configuration",
            description: "<p>Web application does not implement recommended security headers.</p>",
            evidence: "<p>HTTP response analysis shows missing Content-Security-Policy, X-Frame-Options, and Strict-Transport-Security headers.</p>",
            impact: "<p>Missing security headers increase vulnerability to XSS attacks, clickjacking, and man-in-the-middle attacks.</p>",
            recommendation: "<p>Implement recommended security headers:\n- Content-Security-Policy: default-src 'self'\n- X-Frame-Options: DENY\n- Strict-Transport-Security: max-age=31536000\n- X-Content-Type-Options: nosniff</p>",
            priority: 3, // Medium
            effortLevel: 1, // Low
            riskScore: {
                method: "cvss3",
                vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N"
            },
            references: [
                "OWASP Secure Headers Project",
                "CWE-1021: Improper Restriction of Rendered UI Layers"
            ]
        },
        {
            title: "Outdated Dependencies",
            category: "Software Composition",
            description: "<p>Application uses outdated third-party libraries with known vulnerabilities.</p>",
            evidence: "<p>Package.json shows jQuery 2.1.4 (current: 3.6+), lodash 4.17.15 (current: 4.17.21+). Both versions have published CVEs.</p>",
            impact: "<p>Known vulnerabilities in dependencies could be exploited by attackers to compromise the application.</p>",
            recommendation: "<p>Update all dependencies to latest stable versions. Implement automated dependency scanning in CI/CD pipeline. Consider using tools like npm audit or Snyk.</p>",
            priority: 3, // Medium
            effortLevel: 2, // Medium
            riskScore: {
                method: "cvss4",
                vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N"
            },
            references: [
                "CVE-2020-11022 (jQuery XSS)",
                "CVE-2020-8203 (lodash prototype pollution)",
                "OWASP A06:2021 - Vulnerable and Outdated Components"
            ]
        },
        {
            title: "Information Disclosure in Error Messages",
            category: "Information Disclosure",
            description: "<p>Detailed error messages expose sensitive system information.</p>",
            evidence: "<p>SQL error messages reveal database table structure and query details. Stack traces show internal file paths and framework versions.</p>",
            impact: "<p>Information disclosure aids attackers in reconnaissance and vulnerability exploitation.</p>",
            recommendation: "<p>Implement generic error messages for end users. Log detailed errors server-side only. Configure production environment to suppress debug information.</p>",
            priority: 4, // Low
            effortLevel: 1, // Low
            riskScore: {
                method: "custom",
                customScore: 3.5
            },
            references: [
                "OWASP A05:2021 - Security Misconfiguration",
                "CWE-209: Information Exposure Through Error Messages"
            ]
        }
    ]
};

async function runTests() {
    console.log('\n=== POC Test Suite: Observation Model & Report Generation ===\n');

    try {
        // Connect to DB and load models
        await connectDB();
        loadModels();

        // Get models
        Audit = mongoose.model('Audit');
        Observation = mongoose.model('Observation');
        ObservationType = mongoose.model('ObservationType');
        User = mongoose.model('User');
        Company = mongoose.model('Company');
        Client = mongoose.model('Client');
        Template = mongoose.model('Template');
        Language = mongoose.model('Language');
        AuditType = mongoose.model('AuditType');
        reportGenerator = require('../src/lib/report-generator');

        // Step 1: Find or create test user
        console.log('\nStep 1: Setting up test user...');
        let testUser = await User.findOne({username: 'poc-test-user'});
        if (!testUser) {
            testUser = await User.create({
                username: 'poc-test-user',
                password: 'test123',
                firstname: 'POC',
                lastname: 'Tester',
                email: 'poc@test.com',
                role: 'admin',
                enabled: true
            });
            console.log('✓ Created test user:', testUser.username);
        } else {
            console.log('✓ Using existing test user:', testUser.username);
        }

        // Step 2: Find or create test company
        console.log('\nStep 2: Setting up test company...');
        let testCompany = await Company.findOne({name: 'POC Test Company'});
        if (!testCompany) {
            testCompany = await Company.create({
                name: 'POC Test Company',
                shortName: 'PTC'
            });
            console.log('✓ Created test company:', testCompany.name);
        } else {
            console.log('✓ Using existing test company:', testCompany.name);
        }

        // Step 3: Find or create test client
        console.log('\nStep 3: Setting up test client...');
        let testClient = await Client.findOne({email: 'client@poc-test.com'});
        if (!testClient) {
            testClient = await Client.create({
                email: 'client@poc-test.com',
                firstname: 'John',
                lastname: 'Doe',
                company: testCompany._id
            });
            console.log('✓ Created test client:', testClient.email);
        } else {
            console.log('✓ Using existing test client:', testClient.email);
        }

        // Step 4: Find template
        console.log('\nStep 4: Finding report template...');
        let template = await Template.findOne({name: 'Default Template'});
        if (!template) {
            template = await Template.create({
                name: 'Default Template',
                ext: 'docx'
            });
            console.log('✓ Created default template');
        } else {
            console.log('✓ Using template:', template.name);
        }

        // Step 5: Create or update observation types
        console.log('\nStep 5: Setting up observation types...');
        const obsTypes = [
            {name: 'Security Finding', locale: 'en', order: 1},
            {name: 'Compliance Gap', locale: 'en', order: 2},
            {name: 'Best Practice', locale: 'en', order: 3}
        ];

        for (const typeData of obsTypes) {
            await ObservationType.findOneAndUpdate(
                {name: typeData.name, locale: typeData.locale},
                typeData,
                {upsert: true, new: true}
            );
        }
        console.log(`✓ Created/updated ${obsTypes.length} observation types`);

        // Step 6: Create test audit
        console.log('\nStep 6: Creating test audit...');
        const testAudit = await Audit.create({
            name: 'POC Assurance Report Test',
            auditType: 'Internal Audit',
            language: 'en',
            date: new Date().toISOString().split('T')[0],
            date_start: '2025-01-01',
            date_end: '2025-01-15',
            company: testCompany._id,
            client: testClient._id,
            creator: testUser._id,
            collaborators: [testUser._id],
            template: template._id,
            reportType: 'audit', // New field for POC
            useLegacyFindings: false, // Use observations, not findings
            scope: [],
            findings: [], // Empty for POC test
            sections: [
                {
                    field: 'executive_summary',
                    name: 'Executive Summary',
                    text: '<p>This report presents the findings from the internal security assessment conducted between January 1-15, 2025. The assessment identified 5 observations across various security domains.</p>'
                }
            ],
            customFields: []
        });
        console.log('✓ Created test audit:', testAudit._id);

        // Step 7: Create observations
        console.log('\nStep 7: Creating observations...');
        const createdObservations = [];
        for (let i = 0; i < testData.observations.length; i++) {
            const obsData = testData.observations[i];
            const observation = await Observation.create({
                auditId: testAudit._id,
                ...obsData,
                creator: testUser._id,
                lastModifiedBy: testUser._id
            });

            // Calculate risk score
            observation.calculateRiskScore();
            await observation.save();

            createdObservations.push(observation);
            console.log(`  ✓ Created observation ${i + 1}/${testData.observations.length}: ${observation.title} (${observation.riskScore.method})`);
        }

        // Step 8: Verify observations
        console.log('\nStep 8: Verifying observations...');
        const allObservations = await Observation.getByAudit(testAudit._id);
        console.log(`✓ Retrieved ${allObservations.length} observations from database`);

        // Display risk scores
        console.log('\nRisk Score Summary:');
        allObservations.forEach((obs, idx) => {
            console.log(`  ${idx + 1}. ${obs.title}`);
            console.log(`     Method: ${obs.riskScore.method}`);
            console.log(`     Score: ${obs.riskScore.score || 'N/A'}`);
            console.log(`     Severity: ${obs.riskScore.severity}`);
        });

        // Step 9: Generate report
        console.log('\nStep 9: Generating DOCX report...');
        const fullAudit = await Audit.getAudit(true, testAudit._id, testUser._id);
        fullAudit.observations = allObservations; // Attach observations

        const Settings = mongoose.model('Settings');
        let settings = await Settings.getAll();
        if (!settings) {
            // Create default settings if none exist
            settings = await Settings.create({
                report: {
                    enabled: true,
                    public: {
                        cvssColors: {
                            noneColor: '#4A86E8',
                            lowColor: '#008000',
                            mediumColor: '#F9A009',
                            highColor: '#FE0000',
                            criticalColor: '#212121'
                        },
                        scoringMethods: {
                            CVSS3: true,
                            CVSS4: true
                        }
                    },
                    private: {
                        imageBorder: false
                    }
                },
                reviews: {
                    enabled: false
                }
            });
        }

        const reportBuffer = await reportGenerator.generateDoc(fullAudit);
        console.log(`✓ Report generated successfully (${reportBuffer.length} bytes)`);

        // Step 10: Save report to disk
        console.log('\nStep 10: Saving report to disk...');
        const outputDir = path.join(__dirname, '..', 'test-output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, {recursive: true});
        }

        const outputPath = path.join(outputDir, `POC_AssuranceReport_${testAudit._id}.docx`);
        fs.writeFileSync(outputPath, reportBuffer);
        console.log(`✓ Report saved to: ${outputPath}`);

        // Step 11: Verify file
        console.log('\nStep 11: Verifying output file...');
        const stats = fs.statSync(outputPath);
        console.log(`  ✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  ✓ File exists: ${fs.existsSync(outputPath)}`);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`✓ Test Audit ID: ${testAudit._id}`);
        console.log(`✓ Observations Created: ${createdObservations.length}`);
        console.log(`✓ Report Generated: Yes (${(reportBuffer.length / 1024).toFixed(2)} KB)`);
        console.log(`✓ Output File: ${outputPath}`);
        console.log('\nRisk Scoring Methods Tested:');
        const methods = [...new Set(allObservations.map(o => o.riskScore.method))];
        methods.forEach(method => {
            const count = allObservations.filter(o => o.riskScore.method === method).length;
            console.log(`  - ${method}: ${count} observation(s)`);
        });
        console.log('\nSeverity Distribution:');
        const severities = allObservations.reduce((acc, o) => {
            acc[o.riskScore.severity] = (acc[o.riskScore.severity] || 0) + 1;
            return acc;
        }, {});
        Object.entries(severities).forEach(([severity, count]) => {
            console.log(`  - ${severity}: ${count} observation(s)`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('NEXT STEPS:');
        console.log('='.repeat(60));
        console.log('1. Open the generated DOCX file in Microsoft Word');
        console.log('2. Verify observation placeholders are populated:');
        console.log('   - Search for "OBS-001" through "OBS-005"');
        console.log('   - Check risk scores and severities');
        console.log('   - Verify description, evidence, impact, recommendation sections');
        console.log('3. Check for any unpopulated {variables}');
        console.log('4. If template needs updates, modify and re-run test');
        console.log('\n✓ All tests completed successfully!\n');

        process.exit(0);

    } catch (error) {
        console.error('\n✗ Test failed with error:');
        console.error(error);
        process.exit(1);
    }
}

// Run tests
runTests();
