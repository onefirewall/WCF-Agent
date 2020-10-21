var PFlist = require('./Plugins/PFlist.js')
var ModSec = require('./Plugins/ModSec.js')
var HAProxy = require('./Plugins/HAProxy.js')
var CSV_Export = require('./Plugins/CSV_Export.js')
var IPTables = require('./Plugins/IPTables.js')
var CloudFlare = require('./Plugins/CloudFlareIPS.js')
var Cisco = require('./Plugins/Cisco.js')
var AWSWAF = require('./Plugins/AwsIPS.js')
var DBCleanUP = require('./DBCleanUP.js')
var Remote_Read = require('../Remote/Remote_Read.js')

var IPS = function (){
    var pflist = new PFlist()
    var modsec = new ModSec()
    var cloudflare = new CloudFlare()
    var cisco = new Cisco()
    var haProxy = new HAProxy()
    var csv_export = new CSV_Export()

    var ipTables = new IPTables()
    var awsWaf = new AWSWAF()

    var dbcleanup = new DBCleanUP()
    var remote_read = new Remote_Read()

    this.init = function(input_obj){

        var isPluginEnabled = false;
        var callback_array = []

        callback_array.push(remote_read.init)

        if(input_obj.config.ips.pflist.active===true){ // MacOS
            console.log("INFO: IPS PFList Enabled")
            callback_array.push(pflist.init)
            isPluginEnabled = true;
        }

        if(input_obj.config.ips.modsec.active===true){ // ModSec
            console.log("INFO: IPS ModSec Enabled")
            callback_array.push(modsec.init)
            isPluginEnabled = true;
        }

        if(input_obj.config.ips.cloudflare.active===true){ // CloudFlare
            console.log("INFO: IPS CloudFlare Enabled")
            callback_array.push(cloudflare.init)
            isPluginEnabled = true;
        }

        if(input_obj.config.ips.cisco.active===true){ // Cisco
            console.log("INFO: IPS Cisco Enabled")
            callback_array.push(cisco.init)
            isPluginEnabled = true;
        }

        if(input_obj.config.ips.haproxy.active===true){ // HAProxy
            console.log('INFO: IPS HAProxy Enabled')            
            callback_array.push(haProxy.init)
            isPluginEnabled = true;
        }

        if(input_obj.config.ips.csv.active===true){ // csv_export
            console.log('INFO: IPS csv_export Enabled')            
            callback_array.push(csv_export.init)
            isPluginEnabled = true;
        }
        
        if(input_obj.config.ips.iptables.active===true){ // iptables
            console.log('INFO: IPS iptables Enabled')            
            callback_array.push(ipTables.init)
            isPluginEnabled = true;
        }

        if(input_obj.config.ips.aws.active===true){ // AWS WAF
            console.log('INFO: IPS AWS WAF Enabled')            
            callback_array.push(awsWaf.init)
            isPluginEnabled = true;
        }

        if(!isPluginEnabled){
            callback_array.push(dbcleanup.init)
        }

        var fist_function = callback_array[0]
        
        fist_function(input_obj, callback_array.slice(1))
        
    }

 }

 module.exports = IPS
