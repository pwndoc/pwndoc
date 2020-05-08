import { Notify, Dialog } from 'quasar';

import Breadcrumb from 'components/breadcrumb';

import AuditService from '@/services/audit';

import Draggable from 'vuedraggable';


export default {
    data: () => {
        return {
            // **** Global ****
            AuditService: AuditService,

            // Set audit ID
            auditId: null,
            section: {},
            sectionOrig: {},
            uploadedImages: [{folder: 'Screenshots', images: []}],
            sideWidth: 0         
        }
    },

    components: {
        Breadcrumb,
        Draggable
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.sectionId = this.$route.params.sectionId;
        this.getSection();

        this.uploadedImages = JSON.parse(localStorage.getItem('uploadedImages')) || [{folder: 'Screenshots', images: []}];

        this.$socket.emit('menu', {menu: 'editSection', section: this.sectionId, room: this.auditId});

        // save on ctrl+s
        // var lastSave = 0;
        document.addEventListener('keydown', this._listener, false)

        this.sideWidth = (this.$refs.screenshotsContainer.clientWidth - 16) + "px"

    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
    },

    beforeRouteLeave (to, from , next) {
        if (this.$_.isEqual(this.section, this.sectionOrig))
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
        if (this.$_.isEqual(this.section, this.sectionOrig))
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

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                this.updateSection();
            }
        },

        // Get Section
        getSection: function() {
            AuditService.getSection(this.auditId, this.sectionId)
            .then((data) => {
                this.section = data.data.datas;
                if (this.section.paragraphs.length === 0)
                    this.section.paragraphs = [{text: "", images: []}]
                this.sectionOrig = this.$_.cloneDeep(this.section);                
            })
            .catch((err) => {
                console.log(err)
            })
        },


        // Update Section
        updateSection: function() {
            AuditService.updateSection(this.auditId, this.sectionId, this.section)
            .then(() => {
                this.sectionOrig = this.$_.cloneDeep(this.section);
                Notify.create({
                    message: 'Section updated successfully',
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

        deleteSection: function() {
            Dialog.create({
                title: 'Delete current Section ?',
                message: `This action can't be cancelled`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => {
                AuditService.deleteSection(this.auditId, this.sectionId)
                .then(() => {
                    Notify.create({
                        message: 'Section deleted successfully',
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

        // Add Paragraph for specific section
        addParagraph: function() {
            var paragraph = {text: "", images: []};
            var pLength = this.section.paragraphs.length - 1;
            if (this.section.paragraphs[pLength].text !== "" || this.section.paragraphs[pLength].images.length > 0)
                this.section.paragraphs.push(paragraph);
        },
    
        // Remmove specified paragraph for specific section
        removeParagraph: function(paragraph) {
            Dialog.create({
                title: 'Remvove Paragraph ?',
                message: `This Paragraph will be permanently removed`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => this.section.paragraphs.splice(this.section.paragraphs.indexOf(paragraph), 1))
        },

        removeImage: function(images, index) {
            images.splice(index,1);
        },
    }
}