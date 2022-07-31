import { Dialog, Notify } from 'quasar'
import Vue from 'vue'
import YAML from 'js-yaml'

import VulnerabilityService from '@/services/vulnerability'
import UserService from '@/services/user'

import { $t } from '@/boot/i18n'

export default {
    data: () => {
        return {
            UserService: UserService,
            vulnerabilities: [],
        }
    },

    mounted: function() {
        
    },

    methods: {
        getVulnerabilities: function() {
            this.vulnerabilities = [];
            VulnerabilityService.exportVulnerabilities()
            .then((data) => {
                this.vulnerabilities = data.data.datas;
                this.downloadVulnerabilities();
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

        createVulnerabilities: function() {
            VulnerabilityService.createVulnerabilities(this.vulnerabilities)
            .then((data) => {
                var message = "";
                var color = "positive";
                if (data.data.datas.duplicates === 0) {
                    message = $t('importVulnerabilitiesOk',[data.data.datas.created]);
                }
                else if (data.data.datas.created === 0 && data.data.datas.duplicates > 0) {
                    message = $t('importVulnerabilitiesAllExists',[data.data.datas.duplicates.length]);
                    color = "negative";
                }
                else {
                    message = $t('importVulnerabilitiesPartial',[data.data.datas.created,data.data.datas.duplicates.length]);
                    color = "orange";
                }
                Notify.create({
                    message: message,
                    html: true,
                    closeBtn: 'x',
                    color: color,
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        importVulnerabilities: function(files) {
            this.vulnerabilities = [];
            var pending = 0;
            for (var i=0; i<files.length; i++) {
                ((file) => {
                    var fileReader = new FileReader();
                    fileReader.onloadend = (e) => {
                        var vulnFile;
                        var ext = file.name.split('.').pop();
                        if (ext === "yml") {
                            try {
                                vulnFile = YAML.safeLoad(fileReader.result);
                                if (typeof vulnFile === 'object') {
                                    if (Array.isArray(vulnFile)) {
                                        vulnFile.forEach(vuln => {
                                            if (Array.isArray(vuln.references) && vuln.references.length > 0) {
                                                vuln.details.forEach(d => {
                                                    if (!Array.isArray(d.references) || d.references.length == 0) {
                                                        d.references = vuln.references
                                                    }
                                                })
                                            }
                                        })
                                        this.vulnerabilities = vulnFile;
                                    }
                                    else
                                        this.vulnerabilities.push(vulnFile);
                                }
                                else
                                    throw new Error ($t('invalidYamlFormat'))
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.mark) errMsg = $t('err.parsingError2',[err.mark.line,err.mark.column]);                              
                                Notify.create({
                                    message: errMsg,
                                    color: 'negative',
                                    textColor: 'white',
                                    position: 'top-right'
                                })
                                return;
                            }
                        }
                        else if (ext === "json") {
                            try {
                                vulnFile = JSON.parse(fileReader.result);
                                if (typeof vulnFile === 'object') {
                                    if (Array.isArray(vulnFile)) {
                                        if (vulnFile.length > 0 && vulnFile[0].id)
                                            this.vulnerabilities = this.parseSerpico(vulnFile);
                                        else
                                            this.vulnerabilities = vulnFile;
                                    }
                                    else
                                        this.vulnerabilities.push(vulnFile);
                                }
                                else
                                    throw new Error ($t('err.invalidJsonFormat'))
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.message) errMsg = $t('err.parsingError1',[err.message]);
                                Notify.create({
                                    message: errMsg,
                                    color: 'negative',
                                    textColor: 'white',
                                    position: 'top-right'
                                })
                                return;
                            }
                        }
                        else
                            console.log('Bad Extension')
                        pending--;
                        if (pending === 0) this.createVulnerabilities();
                    }
                    pending++;
                    fileReader.readAsText(file);
                })(files[i])
            }
        },

        parseSerpico: function(vulnerabilities) {
            var result = [];
            vulnerabilities.forEach(vuln => {
                var tmpVuln = {};
                tmpVuln.cvssv3 = vuln.c3_vs || null;
                tmpVuln.priority = null;
                tmpVuln.remediationComplexity = null;
                var details = {};
                details.locale = this.formatSerpicoText(vuln.language) || 'en';
                details.title = this.formatSerpicoText(vuln.title);
                details.vulnType = this.formatSerpicoText(vuln.type);
                details.description = this.formatSerpicoText(vuln.overview);
                details.observation = this.formatSerpicoText(vuln.poc);
                details.remediation = this.formatSerpicoText(vuln.remediation);
                details.references = []
                if (vuln.references && vuln.references !== "") {
                    vuln.references = vuln.references.replace(/<paragraph>/g, '')
                    details.references = vuln.references.split('</paragraph>').filter(Boolean)
                }
                tmpVuln.details = [details];
                
                result.push(tmpVuln);
            });
            
            return result;
        },

        formatSerpicoText: function(str) {
            if (!str) return null
            if (str === 'English') return 'en'
            if (str === 'French') return 'fr'

            var res = str
            // Headers (used as bold in Serpico)
            res = res.replace(/<h4>/g, '<b>')
            res = res.replace(/<\/h4>/g, '</b>')
            // First level bullets
            res = res.replace(/<paragraph><bullet>/g, '<li><p>')
            res = res.replace(/<\/bullet><\/paragraph>/g, '</p></li>')
            // Nested bullets (used as first level bullets)
            res = res.replace(/<paragraph><bullet1>/g, '<li><p>')
            res = res.replace(/<\/bullet1><\/paragraph>/g, '</p></li>')
            // Replace the paragraph tags and simply add linebreaks
            res = res.replace(/<paragraph>/g, '<p>')
            res = res.replace(/<\/paragraph>/g, '</p>')
            // Indented text
            res = res.replace(/<indented>/g, '    ')
            res = res.replace(/<\/indented>/g, '')
            // Italic
            res = res.replace(/<italics>/g, '<i>')
            res = res.replace(/<\/italics>/g, '</i>')
            // Code
            res = res.replace(/\[\[\[/g, '<pre><code>')
            res = res.replace(/]]]/g, '</code></pre>')
            // Apostroph
            res = this.$_.unescape(res)

            res = res.replace(/\n$/, '')

            return res
        },

        downloadVulnerabilities: function() {
            var data = YAML.safeDump(this.vulnerabilities);
            var blob = new Blob([data], {type: 'application/yaml'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = "vulnerabilities.yml";
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        },

        deleteAllVulnerabilities: function() {
            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: $t('msg.allVulnerabilitesDeleteNotice'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => {
                VulnerabilityService.deleteAllVulnerabilities()
                .then(() => {
                    Notify.create({
                        message: $t('msg.allVulnerabilitesDeleteOk'),
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                })
                .catch((err) => {
                    Notify.create({
                        message: err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
            })
        }
    }
}