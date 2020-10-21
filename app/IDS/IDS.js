var ModSec = require('./Plugins/ModSec.js')
var SSHLog = require('./Plugins/SSHLog.js')
var DBCleanUP = require('./DBCleanUP.js')
var CloudFlare = require('./Plugins/CloudFlare.js')

var IDS = function (){
    var modsec = new ModSec()
    var sshlog = new SSHLog()
    var dbcleanup = new DBCleanUP()
    var cloudflare = new CloudFlare()

    this.init = function(input_obj){

        var callback_array = []

        if(input_obj.config.ids.modsec.active===true){ // MODSEC
            console.log("INFO: IDS ModSec Enabled")
            callback_array.push(modsec.init)
        }

        if(input_obj.config.ids.sshlog.active===true){ // SSHLOC
            console.log("INFO: IDS SSHLog Enabled")
            callback_array.push(sshlog.init)
        }

        if(input_obj.config.ids.cloudflare.active===true){ // CloudFlare
            console.log("INFO: IDS CloudFlare Enabled")
            callback_array.push(cloudflare.init)
        }

        callback_array.push(dbcleanup.init) // DB Clean UP

        var fist_function = callback_array[0]
        fist_function(input_obj, callback_array.slice(1))

    }

 }
 
 module.exports = IDS
 