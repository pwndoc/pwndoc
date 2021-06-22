import { Notify, Dialog } from 'quasar';

import Breadcrumb from 'components/breadcrumb';

import AuditService from '@/services/audit';
import Utils from '@/services/utils';

export default {
    props: {
        frontEndAuditState: Number,
        parentState: String,
        parentApprovals: Array
    },
    data: () => {
        return {
            auditId: null,
            audit: {
                // scope: []
            },
            auditOrig: {},
            // List of available targets for select options
            targetsOptions: [],
            // List of selected targets
            selectedTargets: [],
            // Current Host to display detail of open services
            currentHost: null,
            // Datatable headers for displaying host
            dtHostHeaders: [
                {name: 'port', label: 'Port', field: 'port', align: 'left', sortable: true, sort: (a, b) => parseInt(a, 10) - parseInt(b, 10)},
                {name: 'protocol', label: 'Protocol', field: 'protocol', align: 'left', sortable: true},
                {name: 'name', label: 'Service', field: 'name', align: 'left', sortable: true},
                {name: 'version', label: 'Version', field: 'version', align: 'left', sortable: true}
            ],
            // Datatable pagination for displaying host
            hostPagination: {
                page: 1,
                rowsPerPage: 20,
                sortBy: 'port'
            },
            AUDIT_VIEW_STATE: Utils.AUDIT_VIEW_STATE
        }
    },

    components: {
        Breadcrumb
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.getAuditNetwork();
        this.$socket.emit('menu', {menu: 'network', room: this.auditId});

        // save on ctrl+s
        var lastSave = 0;
        document.addEventListener('keydown', this._listener, false)

    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
    },

    beforeRouteLeave (to, from , next) {
        if (this.$_.isEqual(this.audit, this.auditOrig))
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
        selectHostsLabel: function() {
            if (this.targetsOptions && this.targetsOptions.length > 0)
                return 'Select Host'
            else
                return 'Import Hosts first'
        }
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                this.updateAuditNetwork();
            }
        },

        // Get Audit datas from uuid
        getAuditNetwork: function() {
            AuditService.getAuditNetwork(this.auditId)
            .then((data) => {
                this.audit = data.data.datas;
                // Object.assign(this.audit, data.data.datas);
                this.auditOrig = this.$_.cloneDeep(this.audit);
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Save Audit
        updateAuditNetwork: function() {
            AuditService.updateAuditNetwork(this.auditId, this.audit)
            .then(() => {
                this.auditOrig = this.$_.cloneDeep(this.audit);
                Notify.create({
                    message: 'Audit updated successfully',
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

        // Import Network scan
        importNetworkScan: function(files, type) {
            var file = files[0];
            var fileReader = new FileReader();

            fileReader.onloadend = (e) => {
                if (type === 'nmap')
                    this.parseXmlNmap(fileReader.result);
                else if (type === 'nessus')
                    this.parseXmlNessus(fileReader.result)
            }

            fileReader.readAsText(file);
        },

        updateScopeHosts: function(scope) {
            for (var i=0; i<this.selectedTargets[scope.name].length; i++) {
                scope.hosts.push(this.selectedTargets[scope.name][i].host);
            }
        },

        // Function for helping parsing Nmap XML
        getXmlElementByAttribute: function(elmts, attr, val) {
            for (var i=0; i<elmts.length; i++) {
                if (elmts[i].getAttribute(attr) === val) {
                    return elmts[i];
                }
            }
            return null;
        },

        // Parse imported Nmap xml
        parseXmlNmap: function(data) {
            console.log('Starting Nmap parser');
            var parser = new DOMParser();
            var xmlData = parser.parseFromString(data, "application/xml");
            try {
                var hosts = xmlData.getElementsByTagName("host");
                if (hosts.length == 0) throw("Parsing Error: No 'host' element");
                var hostsRes = [];
                for (var i=0; i<hosts.length; i++) {
                    if (hosts[i].getElementsByTagName("status")[0].getAttribute("state") === "up") {
                        var host = {};
                        var addrElmt = hosts[i].getElementsByTagName("address")[0];
                        if (typeof(addrElmt) == "undefined") throw("Parsing Error: No 'address' element in host number " + i);
                        host["ip"] = addrElmt.getAttribute("addr");
    
                        var osElmt = hosts[i].getElementsByTagName("os")[0];
                        if (typeof(osElmt) !== "undefined") {
                            var osClassElmt = osElmt.getElementsByTagName("osclass")[0];
                            if (typeof(osClassElmt) == "undefined") {
                                host["os"] = "";
                            }
                            else {
                                host["os"] = osClassElmt.getAttribute("osfamily");
                            }
                        }
                        var hostnamesElmt = hosts[i].getElementsByTagName("hostnames")[0];
                        if (typeof(hostnamesElmt) === "undefined") {
                            host["hostname"] = "Unknown";
                        }
                        else {
                            var dnElmt = this.getXmlElementByAttribute(hostnamesElmt.getElementsByTagName("hostname"), "type", "PTR");
                            host["hostname"] = dnElmt ? dnElmt.getAttribute("name") : "Unknown";
                        }
    
                        var portsElmt = hosts[i].getElementsByTagName("ports")[0];
                        if (typeof(portsElmt) === "undefined") throw("Parsing Error: No 'ports' element in host number " + i);
                        var ports = portsElmt.getElementsByTagName("port");
                        host["services"] = [];
                        for (var j=0; j<ports.length; j++) {
                            var service = {};
                            service["protocol"] = ports[j].getAttribute("protocol");
                            service["port"] = ports[j].getAttribute("portid");
                            service["state"] = ports[j].getElementsByTagName("state")[0].getAttribute("state");
                            var service_details = ports[j].getElementsByTagName("service")[0];
                            if (typeof(service_details) === "undefined") {
                                service["product"]  = "Unknown";
                                service["name"]     = "Unknown";
                                service["version"]  = "Unknown";
                            } else {
                                service["product"]  = service_details.getAttribute("product")   || "Unknown";
                                service["name"]     = service_details.getAttribute("name")      || "Unknown";
                                service["version"]  = service_details.getAttribute("version")   || "Unknown";
                            }
                            console.log('Service found: ' + JSON.stringify(service));
    
                            if (service["state"] === "open") {
                                host["services"].push(service);
                            }
                        }
    
                        hostsRes.push({label: host.ip, value: host.ip, host: host});
                    }
                }
                this.targetsOptions = hostsRes;
                Notify.create({
                    message: `Successfully imported ${hostsRes.length} hosts`,
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            }
            catch (err) {
                console.log(err)
                Notify.create({
                    message: 'Error parsing Nmap',
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            }
        },

        // Parse imported Nessus
        parseXmlNessus: function(data) {
            console.log('Starting Nessus parser');
            var parser = new DOMParser();
            var hostsRes = [];
            var xmlData = parser.parseFromString(data, "application/xml");
    
            try {
                var hosts = xmlData.getElementsByTagName("ReportHost");
                if (hosts.length == 0) throw("Parsing Error: No 'ReportHost' element");
                for (var i = 0; i < hosts.length; i++) {
                var host = {};
                var properties = hosts[i].getElementsByTagName("HostProperties")[0];
                var tags = properties.getElementsByTagName("tag");
        
                for (var j=0; j < tags.length; j++) {
                    var tag = tags[j];
                    var tag_name = tag.getAttribute("name");
                    var tag_content = tag.innerHTML;
                    if (tag_name === "host-ip") {
                    host["ip"] = tag_content;
                    }
                    if (tag_name === "operating-system") {
                    host["os"] = tag_content;
                    }
        
                    if (tag_name === "host-fqdn") {
                    host["hostname"] = tag_content;
                    }
                    if (tag_name === "netbios-name" && !host["hostname"]) {
                    host["hostname"] = tag_content;
                    }
        
                }
        
                if (!host["ip"]) {
                    host["ip"] = hosts[i].getAttribute("name") || "n/a";
                }
        
                var reports = hosts[i].getElementsByTagName("ReportItem");
                host["services"] = [];
                for (var j = 0; j < reports.length; j++) {
                    var port = reports[j].getAttribute('port');
                    var protocol = reports[j].getAttribute('protocol');
                    var svc_name = reports[j].getAttribute('svc_name');
                    var product = reports[j].getAttribute('svc_product');
                    var version = reports[j].getAttribute('svc_version');
        
                    if (port !== "0") {
                    var prev = host["services"].filter(function(service){
                        return (service.port == port);
                    });
        
                    var service = prev.length == 0 ? {} : prev[0];
        
                    service["protocol"] = protocol;
                    service["port"] = port;
                    service["name"] = svc_name || "n/a";
                    service["product"]  = product || "n/a";
                    service["version"]  = version || "n/a";
        
                    if (prev.length == 0) {
                        host["services"].push(service);
                    }
                    }
                    console.log('Service found: ' + JSON.stringify(service));
                }
                console.log(host);
                hostsRes.push({label: host.ip, value: host.ip, host: host});
                }
        
                this.targetsOptions = hostsRes;
                Notify.create({
                    message: `Successfully imported ${hostsRes.length} hosts`,
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            }
            catch (err) {
                console.log(err)
                Notify.create({
                    message: 'Error parsing Nessus',
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            }
        }
    }
}
