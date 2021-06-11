import { Dialog, Notify } from 'quasar';
import Vue from 'vue'
import ConfigsService from '@/services/configs'
import Utils from '@/services/utils'
import UserService from '@/services/user'

export default {
    data: () => {
        return {
            loading: true,
            configs : {
                mandatoryReview: false,
                minReviewers: 1,
                removeApprovalsUponUpdate: true
            },
            UserService: UserService,
            canEdit: false
        }
    },

    mounted: function() {
        this.getConfigs();
        this.canEdit = this.UserService.isAllowed('configs:update');
    },

    methods: {
        getConfigs: function() {
            this.loading = true
            ConfigsService.getConfigs()
            .then((data) => {
                this.configs.mandatoryReview = data.data.datas.mandatoryReview;
                this.configs.minReviewers = data.data.datas.minReviewers;
                this.configs.removeApprovalsUponUpdate = data.data.datas.removeApprovalsUponUpdate;
                this.loading = false;
            })
            .catch((err) => {
                console.log(err);
            })
        },

        updateConfigsValue: _.debounce(function() {
            ConfigsService.updateConfigs(this.configs)
            .then(() => {
                Notify.create({
                    message: 'Configs updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                });
            })
            .catch((err) => {
                console.log(err);
            });
            
        }, 
            300
        ),
        updateConfigsValueRange: function(paramName, min, max) {
            var obj ={};
            if(this.configs[paramName] < min || this.configs[paramName] > max) {
                this.configs[paramName] = this.configs[paramName] < min ? min: max;
            }
            this.updateConfigsValue();
        }
    }
}