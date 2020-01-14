import { Notify } from 'quasar';

import Breadcrumb from 'components/breadcrumb';

import VulnService from '@/services/vulnerability';
import AuditService from '@/services/audit';
import DataService from '@/services/data';

export default {
    data: () => {
        return {
            // **** Findings ****
            AuditService: AuditService,

            finding: {},
            findingTitle: '',
            // List of vulnerabilities from knowledge base
            vulnerabilities: [],
            // Headers for vulnerabilities datatable
            dtVulnHeaders: [
                {name: 'title', label: 'Title', field: row => row.detail.title, align: 'left', sortable: true},
                {name: 'vulnType', label: 'Type', field: row => row.detail.vulnType, align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Pagination for vulnerabilities datatable
            vulnPagination: {
                page: 1,
                rowsPerPage: 20,
                sortBy: 'title'
            },
            // Search filter for vulnerabilities datatable
            searchVuln: '',
            
            // Vulnerabilities languages
            languages: [],
            dtLanguage: "",
            currentExpand: -1
        }
    },

    components: {
        Breadcrumb
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.getLanguages();
        this.dtLanguage = AuditService.audit.locale;
        this.getVulnerabilities();

        this.$socket.emit('menu', {menu: 'addFindings', room: this.auditId});

        // this.getVulnerabilities();
    },

    methods: {
        // Get available languages
        getLanguages: function() {
            DataService.getLanguages()
            .then((data) => {
                this.languages = data.data.datas;
                // if (this.languages.length > 0) {
                //     this.dtLanguage = this.languages[0].locale;
                //     this.getVulnerabilities();
                // }
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get vulnerabilities by language
        getVulnerabilities: function() {
            VulnService.getVulnByLanguage(this.dtLanguage)
            .then((data) => {
                this.vulnerabilities = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        getDtTitle: function(row) {
            var index = row.details.findIndex(obj => obj.locale === this.dtLanguage.locale);
            if (index < 0)
                return "Not defined for this language yet";
            else
                return row.details[index].title;         
        },

        addFinding: function(vuln) {
            var finding = null;
            if (vuln) {
                finding = {
                    title: vuln.detail.title,
                    vulnType: vuln.detail.vulnType,
                    description: vuln.detail.description,
                    observation: vuln.detail.observation,
                    remediation: vuln.detail.remediation,
                    remediationComplexity: vuln.remediationComplexity,
                    priority: vuln.priority,
                    references: vuln.references,
                    cvssv3: vuln.cvssv3,
                    cvssScore: (vuln.cvssScore)?vuln.cvssScore:"0",
                    cvssSeverity: (vuln.cvssSeverity)?vuln.cvssSeverity:"None",
                };
            }
            else if (this.findingTitle){
                finding = {
                    title: this.findingTitle,
                    vulnType: "",
                    description: "",
                    observation: "",
                    remediation: "",
                    remediationComplexity: "",
                    priority: "",
                    references: [],
                    cvssv3: "",
                    cvssScore: 0,
                    cvssSeverity: "None",
                };
            }

            if (finding) {
                AuditService.createFinding(this.auditId, finding)
                .then(() => {
                    this.findingTitle = "";
                    Notify.create({
                        message: 'Finding created successfully',
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                })
                .catch((err) => {
                    Notify.create({
                        message: err.response.data.datas,
                        color: 'negative',
                        textColor:'white',
                        position: 'top-right'
                    })
                })
            }
        }
    }
}