import { Dialog, Notify } from 'quasar'
import Vue from 'vue'
import YAML from 'js-yaml'

import VulnerabilityService from '@/services/vulnerability'
import UserService from '@/services/user'

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
                console.log(err)
            })
        },

        createVulnerabilities: function() {
            VulnerabilityService.createVulnerabilities(this.vulnerabilities)
            .then((data) => {
                var message = "";
                var color = "positive";
                if (data.data.datas.duplicates === 0) {
                    message = `All <strong>${data.data.datas.created}</strong> vulnerabilities created`;
                }
                else if (data.data.datas.created === 0 && data.data.datas.duplicates > 0) {
                    message = `All <strong>${data.data.datas.duplicates}</strong> vulnerabilities title already exist`;
                    color = "negative";
                }
                else {
                    message = `<strong>${data.data.datas.created}</strong> vulnerabilities created<br /><strong>${data.data.datas.duplicates}</strong> vulnerabilities title already exist`;
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
                                        this.vulnerabilities = vulnFile;
                                    }
                                    else
                                        this.vulnerabilities.push(vulnFile);
                                }
                                else
                                    throw new Error ('Invalid YAML format detected')
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.mark) errMsg = `Parsing Error: line ${err.mark.line}, column: ${err.mark.column}`;
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
                                        this.vulnerabilities = vulnFile;
                                    }
                                    else
                                        this.vulnerabilities.push(vulnFile);
                                }
                                else
                                    throw new Error ('Invalid JSON format detected')
                            }
                            catch(err) {
                                console.log(err);
                                var errMsg = err;
                                if (err.message) errMsg = `Parsing Error: ${err.message}`;
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

        downloadVulnerabilities: function() {
            var data = YAML.safeDump(this.vulnerabilities);
            var blob = new Blob([data], {type: 'application/yaml'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = "vulnerabilities.yml";
            a.click();
            URL.revokeObjectURL(url);
            
        }
    }
}