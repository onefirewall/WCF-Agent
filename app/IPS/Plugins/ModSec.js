var fs = require('fs')
const exec = require('child_process').exec
var CALC = require('../../utils/calc.js')
var DBCleanUP = require('../DBCleanUP.js')
var plugin = "modsec"

var ModSec = function (){
    var calc = new CALC()
    var dbcleanup = new DBCleanUP()

    this.init = function(input_obj, callback_array){
        console.log("INFO: ModSec START")
        var batchOps = []
        var all_to_block = []
        var something_changed = false
        evalScore = new Function('scoreTimeZero', 'current_time', input_obj.eval)
        now = Math.round((new Date()).getTime() / 1000);
        input_obj.db.createReadStream().on('data', function (data) {

            //we evaluate the score just one time for each db entry
            var score = evalScore(data.value.score, now - data.value.ts);
            var something_change_in_one_roule = calc.something_change_in_one_roule(data, plugin, input_obj, score)
            if(something_change_in_one_roule.changed){
                data.value[plugin].blocked = something_change_in_one_roule.how_changed
                something_changed = true
            }

            if(data.value[plugin] && data.value[plugin].blocked===true){
                //TODO WHAT IS THIS all_ips? MAYBE AN ERROR
                //all_ips.push(data.value.ip) 
                all_to_block.push(data.value.ip)
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
                    if (err) return console.log("ERROR during ModSec batch operation " + err);
                });

                //clean batchOps
                batchOps = []
            }


        }).on('error', function (err) {
            console.error('ERROR: ' + err)
        }).on('close', function () {
            //send the last batch operation
            input_obj.db.batch(batchOps, function(err) {
                if (err) return console.log("ERROR during ModSec batch operation " + err);

                if(callback_array[0]){
                    callback_function = callback_array[0]
                    callback_function(input_obj, callback_array.slice(1))
                }
            });            
        }).on('end', function () {
            if(something_changed){
                update_rules(input_obj.config.ips.modsec.ruleset,
                             all_to_block,
                             input_obj.config.ips.modsec.modsec_reload_command )
                
            }
            console.log("INFO: ModSec END")
        })
        

    }


    function update_rules(rulset_file, to_block, modsec_reload_command){
        var ip_regx = new RegExp("^(([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\/([0-9]|[0-2][0-9]|3[0-2])|([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5])))$");

        var lined_to_block = ""
        for(i=0; i<to_block.length; i++){
            if(ip_regx.test(to_block[i])){
                var this_ip = to_block[i].replace("\r", "").replace("\n", "")
                var id = (i+500000)
                lined_to_block += "SecRule REQUEST_URI \"@contains /\" \"id:'00000" + id +"',phase:1,log,deny,status:403,chain\"\r\n"
                lined_to_block += "SecRule REQUEST_HEADERS:CF-Connecting-IP \"@ipMatch "+this_ip+"\"\r\n\r\n"
                //console.log("INFO: ModSec Block " + this_ip)
            }
        }

        fs.writeFile(rulset_file, lined_to_block, function (err) {
            if (err) throw err;
            reload_rules(modsec_reload_command)
        })
        
    }

    function reload_rules(modsec_reload_command){
        try{
            console.log("INFO: Execute Command: " + modsec_reload_command)

            var child = exec(modsec_reload_command,
                        (error, stdout, stderr) => {
                                //console.log(`stdout: ${stdout}`);
                                //console.log(`stderr: ${stderr}`);
                                if (error !== null) {
                                    console.error(`exec error: ${error}`);
                                }
                        });
        }catch(err){
            console.error(err)
        }
    }

 }
 
 module.exports = ModSec
 