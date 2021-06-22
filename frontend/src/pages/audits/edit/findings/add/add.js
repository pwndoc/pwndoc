import { Notify } from 'quasar';

import Breadcrumb from 'components/breadcrumb';

import VulnService from '@/services/vulnerability';
import AuditService from '@/services/audit';
import DataService from '@/services/data';
import Utils from '@/services/utils';

export default {
    props: {
        frontEndAuditState: Number,
        parentState: String,
        parentApprovals: Array
    },
    data: () => {
        return {
            audit: {},
            finding: {},
            findingTitle: '',
            // List of vulnerabilities from knowledge base
            vulnerabilities: [],
            // Loading state
            loading: true,
            // Headers for vulnerabilities datatable
            dtVulnHeaders: [
                {name: 'title', label: 'Title', field: row => row.detail.title, align: 'left', sortable: true},
                {name: 'category', label: 'Category', field: 'category', align: 'left', sortable: true},
                {name: 'vulnType', label: 'Type', field: row => row.detail.vulnType, align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Pagination for vulnerabilities datatable
            vulnPagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'title'
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            filteredRowsCount: 0,
            // Search filter
            search: {title: '', vulnType: '', category: ''},
            
            // Vulnerabilities languages
            languages: [],
            dtLanguage: "",
            currentExpand: -1,

            // Vulnerability categories
            vulnCategories: [],

            htmlEncode: Utils.htmlEncode,
            AUDIT_VIEW_STATE: Utils.AUDIT_VIEW_STATE
        }
    },

    components: {
        Breadcrumb
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.getAudit();
        this.getLanguages();
        this.dtLanguage = this.$parent.audit.language;
        this.getVulnerabilities();
        this.getVulnerabilityCategories()

        this.$socket.emit('menu', {menu: 'addFindings', room: this.auditId});
    },

    computed: {
        vulnCategoriesOptions: function() {
            return this.$_.uniq(this.$_.map(this.vulnerabilities, vuln => {
                return vuln.category || 'No Category'
            }))
        },

        vulnTypeOptions: function() {
            return this.$_.uniq(this.$_.map(this.vulnerabilities, vuln => {
                return vuln.detail.vulnType || 'Undefined'
            }))
        }
    },

    methods: {
        getAudit: async function() {
            try {
                this.audit = (await AuditService.getAuditGeneral(this.auditId)).data.datas;
            } catch(err) {
                console.error(err);
            }
        },

        // Get available languages
        getLanguages: function() {
            DataService.getLanguages()
            .then((data) => {
                this.languages = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get vulnerabilities by language
        getVulnerabilities: function() {
            this.loading = true
            VulnService.getVulnByLanguage(this.dtLanguage)
            .then((data) => {
                this.vulnerabilities = data.data.datas;
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get available vulnerability categories
        getVulnerabilityCategories: function() {
            DataService.getVulnerabilityCategories()
            .then((data) => {
                this.vulnCategories = data.data.datas;
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

        customFilter: function(rows, terms, cols, getCellValue) {
            var result = rows && rows.filter(row => {
                var title = (row.detail.title || "Not defined for this language").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                var type = (row.detail.vulnType || "Undefined").toLowerCase()
                var category = (row.category || "No Category").toLowerCase()
                var termTitle = (terms.title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                var termCategory = (terms.category || "").toLowerCase()
                var termVulnType = (terms.vulnType || "").toLowerCase()
                return title.indexOf(termTitle) > -1 && 
                type.indexOf(termVulnType) > -1 &&
                category.indexOf(termCategory) > -1
            })
            this.filteredRowsCount = result.length
            this.filteredRows = result
            return result;
        },

        addFindingFromVuln: function(vuln) {
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
                    references: vuln.detail.references,
                    cvssv3: vuln.cvssv3,
                    cvssScore: (vuln.cvssScore)?vuln.cvssScore:"0",
                    cvssSeverity: (vuln.cvssSeverity)?vuln.cvssSeverity:"None",
                    category: vuln.category,
                    customFields: Utils.filterCustomFields('finding', vuln.category, this.$parent.customFields, vuln.detail.customFields, this.$parent.audit.language)
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
        },

        addFinding: function(category) {
            var finding = null;
            if (category && this.findingTitle) {
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
                    category: category.name,
                    customFields: Utils.filterCustomFields('finding', category.name, this.$parent.customFields, [], this.$parent.audit.language)
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
                    customFields: Utils.filterCustomFields('finding', '', this.$parent.customFields, [], this.$parent.audit.language)
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