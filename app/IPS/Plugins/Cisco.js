var CiscoPlugin = require('../../lib/CiscoPlugin.js')
var DBCleanUP = require('../DBCleanUP.js')
var CALC = require('../../utils/calc.js')
var plugin = "cisco"

var Cisco = function (){
    var calc = new CALC()
    var dbcleanup = new DBCleanUP()

    this.init = function(input_obj, callback_array){
        console.log("INFO: IPS Cisco START")
        var batchOps = []
        var to_block = []
    	var ipList = []
    	var ifc
    	var port
        evalScore = new Function('scoreTimeZero', 'current_time', input_obj.eval)
        now = Math.round((new Date()).getTime() / 1000);
        
        input_obj.db.createReadStream().on('data', function (data) {
            //we evaluate the score just one time for each db entry
            var score = evalScore(data.value.score, now - data.value.ts);
            var something_change_in_one_roule = calc.something_change_in_one_roule(data, plugin, input_obj, score)
            
            if(something_change_in_one_roule.changed){
                data.value[plugin].blocked = something_change_in_one_roule.how_changed
            }

            if(data.value[plugin] && data.value[plugin].blocked===true){
                //console.log("INFO: Cisco IPS TO_BLOCK " + data.value.ip)
                to_block.push(data.key)
                ipList.push(convertWildCards(data.value.ip))
            }else if(data.value[plugin] && data.value[plugin].blocked===false){
                //console.log("INFO: Cisco IPS TO_UNBLOCK " + data.value.ip)
                if(ifc === undefined) {
                    ifc = data.value.ifc
                }
                if(port === undefined) {    
                    port = data.value.port;
                }
                data.value[plugin].blocked = false
                data.value[plugin].events = []
                unblockIP( [ convertWildCards(data.value.ip) ], ifc, port, input_obj)
            }

            if(dbcleanup.isEleToBeRemoved(input_obj, data, score)){
                    batchOps.push({ type: 'del', key: data.key});
            }else{
                //if we don't need to delete it we can update local value
                batchOps.push({type: 'put', key: data.key, value: data.value});
            }

            //we cant store to much operation, memory is precious
            if(batchOps.length == 1000){
                input_obj.db.batch(batchOps, function(err) {
                    if (err) return console.log("ERROR during Cisco batch operation " + err);
                });

                //clean batchOps
                batchOps = []
            }

        }).on('error', function (err) {
            console.error("ERROR: Cisco IPS generic error: " + err)

        }).on('close', function () {
            input_obj.db.batch(batchOps, function(err) {
                if (err) return console.log("ERROR during HAProxy batch operation " + err);
                update_id_for_blocked(to_block, ipList, ifc, port, input_obj, callback_array)
            });

        }).on('end', function () {
            console.log("INFO: IPS Cisco END")
        })

    }


 }
 
 function convertWildCards(address) {
     if(address.indexOf("/") != -1) {
        //convert here
        var wildCard;
        switch(parseInt(address.split("/")[1])) {
            case 32:
                wildCard = " 0.0.0.0";
                break;
            case 24:
                wildCard = " 0.0.0.255";
                break;
            case 16:
                wildCard = " 0.0.255.255";
                break;
            case 8:
                wildCard = " 0.255.255.255";
                break;
            case 31:
                wildCard = " 0.0.0.1";
                break;
            case 30:
                wildCard = " 0.0.0.3";
                break;
            case 29:
                wildCard = " 0.0.0.7";
                break;
            case 28:
                wildCard = " 0.0.0.15";
                break;
            case 27:
                wildCard = " 0.0.0.31";
                break;
            case 26:
                wildCard = " 0.0.0.63";
                break;
            case 25:
                wildCard = " 0.0.0.127";
                break;
            case 23:
                wildCard = " 0.0.1.255";
                break;
            case 22:
                wildCard = " 0.0.3.255";
                break;
            case 21:
                wildCard = " 0.0.7.255";
                break;
            case 20:
                wildCard = " 0.0.15.255";
                break;
            case 19:
                wildCard = " 0.0.31.255";
                break;
            case 18:
                wildCard = " 0.0.63.255";
                break;
            case 17:
                wildCard = " 0.0.127.255";
                break;
            case 15:
                wildCard = " 0.1.255.255";
                break;
            case 14:
                wildCard = " 0.3.255.255";
                break;
            case 13:
                wildCard = " 0.7.255.255";
                break;
            case 12:
                wildCard = " 0.15.255.255";
                break;
            case 11:
                wildCard = " 0.31.255.255";
                break;
            case 10:
                wildCard = " 0.63.255.255";
                break;
            case 9:
                wildCard = " 0.127.255.255";
                break;
            case 7:
                wildCard = " 1.255.255.255";
                break;
            case 6:
                wildCard = " 3.255.255.255";
                break;
            case 5:
                wildCard = " 7.255.255.255";
                break;
            case 4:
                wildCard = " 15.255.255.255";
                break;
            case 3:
                wildCard = " 31.255.255.255";
                break;
            case 2:
                wildCard = " 63.255.255.255";
                break;
            case 1:
                wildCard = " 127.255.255.255";
                break;
            case 0:
                wildCard = " 255.255.255.255";
                break;
            default:
                wildCard = "";
        }
        address = address.split("/")[0].concat(wildCard);
     }
     return address;
 }

 function update_id_for_blocked(gid_arrays, ipList, ifc, port, input_obj, callback_array){
    if(gid_arrays==undefined || gid_arrays.length<=0){
        if(callback_array[0]){
            callback_function = callback_array[0]
            callback_function(input_obj, callback_array.slice(1))
        }
        return
    }

     
    var libCiscoPlugin = new CiscoPlugin(
                        input_obj.config.ips.cisco.cisco_host, 
                        input_obj.config.ips.cisco.cisco_user,
			input_obj.config.ips.cisco.cisco_password)
    
    libCiscoPlugin.sshToNode(ifc, port, 1, ipList, function callback(response){

        if(response){
    	    input_obj.db.get(gid_arrays[0], function (err, value) {
                value[plugin].blocked = true
                input_obj.db.put(gid_arrays[0], value)
                            .then(function () {  })
                            .catch(function (err) { console.error("ERROR: CISCO IPS " + err) })
            })
        }else{
            console.log("cisco ips error in external plugin")
        }
    })

 }

 function unblockIP(ipListUnlock, ifc, port, input_obj){
    var libCiscoPlugin = new CiscoPlugin(
                        input_obj.config.ips.cisco.cisco_host, 
                        input_obj.config.ips.cisco.cisco_user,
			input_obj.config.ips.cisco.cisco_password)
    
    libCiscoPlugin.sshToNode(ifc, port, 2, ipListUnlock,
    	function callback (response) {
        	console.log("INFO: IPS Cisco unblock: " + response)
        }
    )

 }
 module.exports = Cisco
