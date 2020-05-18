import { Notify, Dialog } from 'quasar';

import Breadcrumb from 'components/breadcrumb';
import CvssCalculator from 'components/cvsscalculator'

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import VulnService from '@/services/vulnerability';

import Draggable from 'vuedraggable';

export default {
    data: () => {
        return {
            AuditService: AuditService,

            finding: {},
            findingOrig: {},
            selectedTab: "definition",
            // Uploaded Images for proofs
            uploadedImages: [{folder: 'Screenshots', images: []}],
            // Parameter to activate affix for list of screenshots
            affix: false,
            vulnTypes: []
        }
    },

    components: {
        Breadcrumb,
        CvssCalculator,
        Draggable
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.findingId = this.$route.params.findingId;
        this.getFinding();
        this.getVulnTypes();

        this.uploadedImages = JSON.parse(localStorage.getItem('uploadedImages')) || [{folder: 'Screenshots', images: []}];

        this.$socket.emit('menu', {menu: 'editFinding', finding: this.findingId, room: this.auditId});

        // save on ctrl+s
        var lastSave = 0;
        document.addEventListener('keydown', this._listener, false);
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false);
    },

    beforeRouteLeave (to, from , next) {
        if (this.$_.isEqualWith(this.finding, this.findingOrig, (value1, value2, key) => {
            return (key === "cvssv3" || (key === "cvssScore" && parseFloat(value1) == parseFloat(value2))) ? true : undefined
        }))
            next();
        else {
            Dialog.create({
                title: 'There are unsaved changes !',
                message: `Do you really want to leave ?`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => next())
        }
    },

    beforeRouteUpdate (to, from , next) {
        if (this.$_.isEqualWith(this.finding, this.findingOrig, (value1, value2, key) => {
            return (key === "cvssv3" || (key === "cvssScore" && parseFloat(value1) == parseFloat(value2))) ? true : undefined
        }))
            next();
        else {
            Dialog.create({
                title: 'There are unsaved changes !',
                message: `Do you really want to leave ?`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => next())
        }
    },

    computed: {
        vulnTypesLang: function() {
            return this.vulnTypes.filter(type => type.locale === AuditService.audit.locale);
        }
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                // if (e.timeStamp - lastSave > 5000) {
                    this.updateFinding();
                    // lastSave = e.timeStamp;
                // }
            }
        },

        // Get Vulnerabilities types
        getVulnTypes: function() {
            DataService.getVulnerabilityTypes()
            .then((data) => {
                this.vulnTypes = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Finding
        getFinding: function() {
            AuditService.getFinding(this.auditId, this.findingId)
            .then((data) => {
                this.finding = data.data.datas;
                if (this.finding.paragraphs.length === 0)
                    this.finding.paragraphs = [{text: "", images: []}]
                this.findingOrig = this.$_.cloneDeep(this.finding);                
            })
            .catch((err) => {
                if (err.response.status === 403)
                    this.$router.push({name: '403', params: {error: err.response.data.datas}})
                else if (err.response.status === 404)
                    this.$router.push({name: '404', params: {error: err.response.data.datas}})
            })
        },

        // Update Finding
        updateFinding: function() {
            AuditService.updateFinding(this.auditId, this.findingId, this.finding)
            .then(() => {
                this.findingOrig = this.$_.cloneDeep(this.finding);
                Notify.create({
                    message: 'Finding updated successfully',
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

        deleteFinding: function() {
            Dialog.create({
                title: 'Delete current Finding ?',
                message: `This action can't be cancelled`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => {
                AuditService.deleteFinding(this.auditId, this.findingId)
                .then(() => {
                    Notify.create({
                        message: 'Finding deleted successfully',
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
            })
        },

         // Backup Finding to vulnerability database
         backupFinding: function() {
            VulnService.backupFinding(AuditService.audit.locale, this.finding)
            .then((data) => {
                Notify.create({
                    message: data.data.datas,
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

        // Import Proofs images
        importImages: function(files, type) {
            var pending = 0;
            for (var i=0; i<files.length; i++) {
                ((file) => {
                    var fileReader = new FileReader();

                    fileReader.onloadend = (e) => {
                        var rand = Math.floor(Math.random() * 1001);
                        if (file.webkitRelativePath === "")
                            this.uploadedImages[0].images.push({
                                image: fileReader.result,
                                caption: file.name,
                                id: rand
                            });
                        else if (/^image\/.*/.test(file.type)){
                            var folder = file.webkitRelativePath.substring(file.webkitRelativePath.indexOf('/')+1,file.webkitRelativePath.lastIndexOf('/'));
                            var uILength = this.uploadedImages.length;
                            for (var j=0; j<uILength; j++) {
                                if (folder === this.uploadedImages[j].folder) {
                                    this.uploadedImages[j].images.push({
                                        image: fileReader.result,
                                        caption: file.name,
                                        id: rand
                                    });
                                    break;
                                }
                                    
                            }
                            if (j === uILength)
                                this.uploadedImages.push({
                                    folder: folder,
                                    images: [{image: fileReader.result, caption: file.name, id: rand}]
                                });
                        }
                        pending--;
                        if (pending === 0) localStorage.setItem('uploadedImages', JSON.stringify(this.uploadedImages));
                    }
                    fileReader.readAsDataURL(file);
                    pending++;
                })(files[i])
            }
        },

        // Add Paragraph for specific finding
        addParagraph: function() {
            var paragraph = {text: "", images: []};
            var pLength = this.finding.paragraphs.length - 1;
            if (this.finding.paragraphs[pLength].text !== "" || this.finding.paragraphs[pLength].images.length > 0)
                this.finding.paragraphs.push(paragraph);
        },
    
        // Remmove specified paragraph for specific finding
        removeParagraph: function(paragraph) {
            Dialog.create({
                title: 'Remvove Paragraph ?',
                message: `This Paragraph will be permanently removed`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => this.finding.paragraphs.splice(this.finding.paragraphs.indexOf(paragraph), 1))
        },

        removeImage: function(images, index) {
            images.splice(index,1);
        },

        imageMove: function(evt) {
            console.log(evt)

        }
    }
}