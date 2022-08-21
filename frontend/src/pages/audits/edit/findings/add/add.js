import { Notify } from 'quasar';

import Breadcrumb from 'components/breadcrumb';

import VulnService from '@/services/vulnerability';
import AuditService from '@/services/audit';
import DataService from '@/services/data';
import Utils from '@/services/utils';

import { $t } from '@/boot/i18n'

export default {
    props: {
        frontEndAuditState: Number,
        parentState: String,
        parentApprovals: Array
    },
    data: () => {
        return {
            bigcheckbox: false,
            IdInSelected: [],
            selected: [],
            finding: {},
            findingTitle: '',
            // List of vulnerabilities from knowledge base
            vulnerabilities: [],
            // Loading state
            loading: true,
            // Headers for vulnerabilities datatable
            dtVulnHeaders: [
                {name: 'title', label: $t('title'), field: row => row.detail.title, align: 'left', sortable: true},
                {name: 'category', label: $t('category'), field: 'category', align: 'left', sortable: true},
                {name: 'vulnType', label: $t('vulnType'), field: row => row.detail.vulnType, align: 'left', sortable: true},
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
        this.getLanguages();
        this.dtLanguage = this.$parent.audit.language;
        this.getVulnerabilities();
        this.getVulnerabilityCategories()

        this.$socket.emit('menu', {menu: 'addFindings', room: this.auditId});
    },

    computed: {
        vulnCategoriesOptions: function() {
            return this.$_.uniq(this.$_.map(this.vulnerabilities, vuln => {
                return vuln.category || $t('noCategory')
            }))
        },

        vulnTypeOptions: function() {
            return this.$_.uniq(this.$_.map(this.vulnerabilities, vuln => {
                return vuln.detail.vulnType || $t('undefined')
            }))
        },

        nbOfSelectedVulns: function() {
            return `${$t('btn.confirm')} (${this.selected.length})`
        }
    },

    methods: {


        //If a single CheckBox is checked then toggle attribute checked
        Selected: function(props){

            var key = props.row._id;
            // If CheckBox is not checked remove attribute checked="checked"
            if (this.$refs['CheckBox-' + key].getAttribute("checked")){
                this.$refs['CheckBox-' + key].removeAttribute('checked');
                this.selected.splice('CheckBox-' + key, 1);
                this.IdInSelected.splice(props.row._id, 1);

        
            } else {
            
            // If CheckBox is checked set attribute checked="checked"
                this.$refs['CheckBox-' + key].setAttribute('checked', 'checked');
                this.selected.push(props.row);
                this.IdInSelected.push(props.row._id);

            }

        },

        //If headCheckBox is checked then toggle all visible CheckBox attribute checked
        
        SelectAll: function(){                    

                        // If SelectAll is true and we click on it then we want to uncheck all checkboxes 
                        if (this.bigcheckbox) {
                            for (const key in this.$refs) {

                                if (this.$refs[key] !== undefined) {
                                    if (this.$refs[key].getAttribute("checked") == 'checked'){
                                        this.$refs[key].click();

                                    }
                                }
                            }

                            for (const key in this.vulnerabilities) {
                                if (this.IdInSelected.includes(this.vulnerabilities[key]._id)){
                                    while(this.IdInSelected.includes(this.vulnerabilities[key]._id)){
                                        this.IdInSelected.splice(this.vulnerabilities[key]._id, 1);
                                        this.selected.splice(this.vulnerabilities[key], 1);
                                    }
                                }
                            }
                            this.bigcheckbox = false;
                        } else {
                        // If SelectAll is false and we click on it then we want to check all checkboxes 
                        for (const key in this.$refs) {
                            if (this.$refs[key] !== undefined) {
                                if (this.$refs[key].getAttribute("checked") == null) {
                                    this.$refs[key].click();

                                }
                            }
                        }
                            // To avoid getting duplicate
                            for (const key in this.vulnerabilities) {
                                if (this.vulnerabilities[key].category === this.search.category && !this.search.vulnType
                                    || this.vulnerabilities[key].detail.vulnType === this.search.vulnType && !this.search.category
                                    || this.vulnerabilities[key].category === this.search.category &&  this.vulnerabilities[key].detail.vulnType === this.search.vulnType
                                    || !this.search.category && !this.search.vulnType
                                    ){
                                 if ( !this.IdInSelected.includes(this.vulnerabilities[key]._id))
                                     this.selected.push(this.vulnerabilities[key]);
                                     this.IdInSelected.push(this.vulnerabilities[key]._id);
                                } 
                            }

                        this.bigcheckbox = true;
                    }
        },

        // Send all checked checkboxes in a single request to the server to avoid fatal error (500) 
        addSelectedFinding : function(){
            this.addAllFindingFromVuln(this.selected);
            this.unselectAll();
        },

        // Unselect all visible checkboxes 
        unselectAll : function(){

            // Unselect all visible checkboxes
            for (const key in this.$refs){
                if (this.$refs[key] !== undefined && this.$refs[key].getAttribute('checked') === 'checked' )
                this.$refs[key].click();
            }

            // Unselect all checkboxes
            for (const key in this.vulnerabilities) {
                // While is needed for vulns that are added 2 times in IdInSelected
                while(this.IdInSelected.includes(this.vulnerabilities[key]._id)){
                    this.IdInSelected.splice(this.vulnerabilities[key]._id, 1);
                    this.selected.splice(this.vulnerabilities[key], 1);
                }
            }

            if (this.bigcheckbox)
                this.bigcheckbox = false;
                
                
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
                return $t('err.notDefinedLanguage');
            else
                return row.details[index].title;         
        },

        customFilter: function(rows, terms, cols, getCellValue) {
            var result = rows && rows.filter(row => {
                var title = (row.detail.title || $t('err.notDefinedLanguage')).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                var type = (row.detail.vulnType || $t('undefined')).toLowerCase()
                var category = (row.category || $t('noCategory')).toLowerCase()
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
                    category: vuln.category,
                    customFields: Utils.filterCustomFields('finding', vuln.category, this.$parent.customFields, vuln.detail.customFields, this.$parent.audit.language)
                };
            }

            if (finding) {
                AuditService.createFinding(this.auditId, finding)
                .then(() => {
                    this.findingTitle = "";
                    Notify.create({
                        message: $t('msg.findingCreateOk'),
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



        addAllFindingFromVuln : function (selected){
            if (selected.length === 0){
                return;
            }
            

            let findings = [];

            // Create as much finding object as there are findings and push them in findings[]
            // That allow us to send only findings[] in the back instead of a request for each vulns 
            for (const key in selected){
                let row = selected[key];

                let finding = {
                        title: row.detail.title,
                        vulnType: row.detail.vulnType,
                        description: row.detail.description,
                        observation: row.detail.observation,
                        remediation: row.detail.remediation,
                        remediationComplexity: row.remediationComplexity,
                        priority: row.priority,
                        references: row.detail.references,
                        cvssv3: row.cvssv3,
                        category: row.category,
                        customFields: Utils.filterCustomFields('finding', row.category, this.$parent.customFields, row.detail.customFields, this.$parent.audit.language)
                    };

                findings.push(finding);
            }

            // Send ajax request
            AuditService.createFindings(this.auditId, findings)
            .then(() => {
                this.findingTitle = "";
                Notify.create({
                    message: $t('msg.findingCreateOk') + " ( " + findings.length + " ) ",
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
                    customFields: Utils.filterCustomFields('finding', '', this.$parent.customFields, [], this.$parent.audit.language)
                };
            }

            if (finding) {
                AuditService.createFinding(this.auditId, finding)
                .then(() => {
                    this.findingTitle = "";
                    Notify.create({
                        message: $t('msg.findingCreateOk'),
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