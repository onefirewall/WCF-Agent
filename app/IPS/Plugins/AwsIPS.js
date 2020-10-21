var AWSWAF = require('../../lib/AWSWAF.js')
var CALC = require('../../utils/calc.js')
var DBCleanUP = require('../DBCleanUP.js')
var plugin = "aws"

var AwsIPS = function (){
    var calc = new CALC()
    var dbcleanup = new DBCleanUP()

    this.init = function(input_obj, callback){
        console.log("INFO: IPS AWS WAF START")
        var batchOps = []
        var jsonIPs = []
        var to_update = []
        evalScore = new Function('scoreTimeZero', 'current_time', input_obj.eval)
        now = Math.round((new Date()).getTime() / 1000);
        input_obj.db.createReadStream().on('data', function (data) {
            //we evaluate the score just one time for each db entry
            var score = evalScore(data.value.score, now - data.value.ts);
            var something_change_in_one_roule = calc.something_change_in_one_roule(data, plugin, input_obj, score)
            
            //otherwise seen as invalid CIDR block
            if(!data.value.ip.includes("/")) {
                data.value.ip=data.value.ip.concat("/32");
            }
            
            if(something_change_in_one_roule.changed){
                data.value[plugin].blocked = something_change_in_one_roule.how_changed
            }

            if(data.value[plugin] && data.value[plugin].blocked===true){
                //console.log("INFO: IPS TO_BLOCK " + data.value.ip)
                to_update.push(data.key)
                jsonIPs.push({Action: "INSERT", IPSetDescriptor: {Type: "IPV4", Value: data.value.ip}});
            }else if(data.value[plugin] && data.value[plugin].blocked===false){
                //console.log("INFO: IPS TO_UNBLOCK " + data.value.ip)
                to_update.push(data.key)
                jsonIPs.push({Action: "DELETE", IPSetDescriptor: {Type: "IPV4", Value: data.value.ip}});
                data.value[plugin].events = []
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
                    if (err) return console.log("ERROR during IPS AWS WAF batch operation " + err);
                });

                //clean batchOps
                batchOps = []
            }

        }).on('error', function (err) {
            console.error("ERROR: IPS " + err)

        }).on('close', function () {
            input_obj.db.batch(batchOps, function(err) {
                if (err) return console.log("ERROR during IPS AWS WAF batch operation " + err);
                update_id_for_blocked(jsonIPs,to_update, input_obj, callback)
            });
        }).on('end', function () {
            console.log("INFO: IPS AWS WAF END")
        })

    }


 }
 
 function update_id_for_blocked(jsonIPs, gid_arrays, input_obj, callback){
    if(gid_arrays===undefined || gid_arrays.length<=0){
        if(callback[0]){
            callback_function = callback[0]
            callback_function(input_obj, callback.slice(1))
        }
        return
    }

    const BATCH_SIZE = 999;
    const ratio = Math.ceil(jsonIPs.length / BATCH_SIZE);
    let waf = new AWSWAF(input_obj.config.ips.aws)
    for (let i=0; i<ratio; i++) {
        let upperLimit = BATCH_SIZE*(i+1);
        if(i+1 >= ratio) {
            upperLimit = jsonIPs.length;
        }
        waf.updateIPSet(jsonIPs.slice(BATCH_SIZE*i, upperLimit), function callbackUpdate(response, err, callback) {
           if (response) {
               gid_arrays.forEach(function(key) {
                input_obj.db.get(key, function (err, value) {
                    if(value && value[plugin]) {
                        value[plugin].blocked = !value[plugin].blocked;
                        input_obj.db.put(key, value)
                            .catch(function (err) { console.error("ERROR: AWS WAF IPS for key "+ key +" error " + err) })
                    }
                 })
               });
            } else if (err) {
             console.log("aws waf ips error in external plugin, error details: "+err)
            }
        })
    }

 }

module.exports = AwsIPS
