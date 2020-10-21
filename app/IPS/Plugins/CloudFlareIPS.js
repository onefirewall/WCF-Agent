var CloudFlareOFA = require('../../lib/CloudFlareOFA.js')
var CALC = require('../../utils/calc.js')
var DBCleanUP = require('../DBCleanUP.js')
var plugin = "cloudflare"

var CloudFlareIPS = function (){
    var calc = new CALC()
    var dbcleanup = new DBCleanUP()

    this.init = function(input_obj, callback_array){
        console.log("INFO: IPS CloudFlare START")
        var batchOps = []
        var to_block = []
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
                //console.log("INFO: IPS TO_BLOCK " + data.value.ip)
                to_block.push(data.key)
            }else if(data.value[plugin] && data.value[plugin].blocked===false){
                //console.log("INFO: IPS TO_UNBLOCK " + data.value.ip)
                unblockIP(data.value, input_obj)
                //data.value[plugin].blocked = false
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
                    if (err) return console.log("ERROR during IPS CloudFlare batch operation " + err);
                });

                //clean batchOps
                batchOps = []
            }

        }).on('error', function (err) {
            console.error("ERROR: IPS " + err)

        }).on('close', function () {
            input_obj.db.batch(batchOps, function(err) {
                if (err) return console.log("ERROR during IPS CloudFlare batch operation " + err);
                update_id_for_blocked(to_block, input_obj, callback_array)
            });
        }).on('end', function () {
            console.log("INFO: IPS CloudFlare END")
        })

    }


 }
 
 function update_id_for_blocked(gid_arrays, input_obj, callback_array){
    if(gid_arrays==undefined || gid_arrays.length<=0){
        if(callback_array[0]){
            callback_function = callback_array[0]
            callback_function(input_obj, callback_array.slice(1))
        }
        return
    }

     
    var libcloudflareOFA = new CloudFlareOFA(
                        input_obj.config.ids.cloudflare.cloudflare_x_auth_key, 
                        input_obj.config.ids.cloudflare.cloudflare_x_auth_email)
    
    input_obj.db.get(gid_arrays[0], function (err, value) {

        if(!err){
            libcloudflareOFA.addNewIP(value.ip, "block", function callback(statusCode, id){
                value[plugin].blocked = true
                value[plugin].events.push(id)
                input_obj.db.put(gid_arrays[0], value)
                            .then(function () {  })
                            .catch(function (err) { console.error("ERROR: IPS " + err) })

                
                update_id_for_blocked(gid_arrays.slice(1), input_obj, callback_array)
            })
        }else{
            console.error("Fuck")
            update_id_for_blocked(gid_arrays.slice(1), input_obj, callback_array)
        }
    })

 }

 function unblockIP(roule, input_obj){
    var libcloudflareOFA = new CloudFlareOFA(
                input_obj.config.ids.cloudflare.cloudflare_x_auth_key, 
                input_obj.config.ids.cloudflare.cloudflare_x_auth_email)

    for(i=0; i<roule[plugin].events.length; i++){
        var e_id = roule[plugin].events[i]
        libcloudflareOFA.deleteIP(e_id,
            function callback (response) {
                //console.log("INFO: IPS Cloudflare unblock: " + roule.ip + " - " + response)
            }
        )
    }

 }
 module.exports = CloudFlareIPS
 