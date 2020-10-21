var fs = require('fs')
const exec = require('child_process').exec
var CALC = require('../../utils/calc.js')
var DBCleanUP = require('../DBCleanUP.js')
var plugin = "pflist"

var PFlist = function (){
    var to_block = []
    var calc = new CALC()
    var something_changed = false
    var dbcleanup = new DBCleanUP()

    this.init = function(input_obj, callback_array){
        console.log("INFO: PFList START")
        var batchOps = []
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
                to_block.push(data.value.ip)
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
                    if (err) return console.log("ERROR during PFList batch operation " + err);
                });

                //clean batchOps
                batchOps = []
            }

        }).on('error', function (err) {
            console.error('ERROR: PFList ' + err)
        }).on('close', function () {
            input_obj.db.batch(batchOps, function(err) {
                if (err) return console.log("ERROR during PFList batch operation " + err);

                if(callback_array[0]){
                    callback_function = callback_array[0]
                    callback_function(input_obj, callback_array.slice(1))
                }
            });
        }).on('end', function () {
            if(something_changed){
                update_file(input_obj.config.ips.pflist.ofa_ips_txt, 
                            to_block, 
                            input_obj.config.ips.pflist.pflist_reload_command)
            }
            console.log("INFO: PFList END")
        })

    }

    function update_file(ip_files, to_block, pflist_reload_command){
        var ip_regx = new RegExp("^(([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\/([0-9]|[0-2][0-9]|3[0-2])|([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5])))$");

        var lined_to_block = ""
        for(i=0; i<to_block.length; i++){
            if(ip_regx.test(to_block[i])){
                lined_to_block += to_block[i].replace("\r", "").replace("\n", "") + "\r\n"
            }
        }

        fs.writeFile(ip_files, lined_to_block, function (err) {
            if (err) throw err;
            reload_pflist(pflist_reload_command)
            console.log('INFO: File IPs updated!');
        })
        
    }

    function reload_pflist(pflist_reload_command){
        try{
            var child = exec(pflist_reload_command,
                            (error, stdout, stderr) => {
                                    //console.log(`stdout: ${stdout}`);
                                    console.error(`stderr: ${stderr}`);
                                    if (error !== null) {
                                        console.error(`ERROR: exec error: ${error}`);
                                    }
                            });
        }catch(err){
            console.error(err)
        }
    }

 }
 
 module.exports = PFlist
 