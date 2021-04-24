var fs = require('fs')
const exec = require('child_process').exec
var CALC = require('../../utils/calc.js')
var DBCleanUP = require('../DBCleanUP.js')
var plugin = "checkpoint"
var ELK_Logs = require('../../logs/ELK_Logs.js')

var Checkpoint = function() {
    var calc = new CALC()
    var dbcleanup = new DBCleanUP()

    this.init = function(input_obj, callback_array) {
        var batchOps = [];
        var something_changed = false
        var ts_now3 = new Date().getTime();
        console.log('INFO: Starting plugin: ' + plugin );
        now = Math.round((new Date()).getTime() / 1000);

        evalScore = new Function('scoreTimeZero', 'current_time', input_obj.eval)

        var wstream = fs.createWriteStream(input_obj.config.ips.checkpoint.acl);

        input_obj.db.createReadStream().on('data', function(data) {

            //we evaluate the score just one time for each db entry
            var score = evalScore(data.value.score, now - data.value.ts);

            var something_change_in_one_roule = calc.something_change_in_one_roule(data, plugin, input_obj, score)

            if (something_change_in_one_roule.changed) {
                data.value[plugin].blocked = something_change_in_one_roule.how_changed
                something_changed = true
            }

            if (data.value[plugin] && data.value[plugin].blocked === true) {
                wstream.write(data.value.ip + "\n");
            }

            if (dbcleanup.isEleToBeRemoved(input_obj, data, score)) {
                batchOps.push({ type: 'del', key: data.key });
            } else {
                batchOps.push({ type: 'put', key: data.key, value: data.value });
            }

            //we cant store to much operation, memory is precious
            if (batchOps.length == 1000) {
                input_obj.db.batch(batchOps, function(err) {
                    if (err){
                        new ELK_Logs().send_logs(input_obj,0,0,{"m": "ERROR during Checkpoint batch operation " + err}, "ERROR")
                        return 
                    }
                });
                batchOps = []
            }
            
        }).on('error', function(err) {
            console.error('ERROR: ' + err)
        }).on('close', function() {
            input_obj.db.batch(batchOps, function(err) {
                if (err) {
                    new ELK_Logs().send_logs(input_obj,0,0,{"m": "ERROR during Checkpoint batch operation " + err}, "ERROR")
                    return console.log("ERROR during Checkpoint batch operation " + err);
                }
                if (callback_array[0]) {
                    callback_function = callback_array[0]
                    callback_function(input_obj, callback_array.slice(1))
                }
            });

        }).on('end', function() {
            console.log('Stop checkpoint - >' + (new Date().getTime() - ts_now3) + ' ms');
            wstream.end();
            if (something_changed) {
                reload_rules(input_obj, input_obj.config.ips.checkpoint.command)
            }
        })
    }


    function reload_rules(input_obj, reload_command) {
        try {
            console.log("INFO: Execute Command: " + reload_command)
            exec(reload_command, (error, stdout, stderr) => {
                if (error !== null) {   
                    new ELK_Logs().send_logs(input_obj,0,0,{"m": `ERROR: checkpoint exec error: ${error}`}, "ERROR")
                }
            });
        } catch (err) {
            console.error(err)
        }
    }

}

module.exports = Checkpoint