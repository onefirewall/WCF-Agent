var fs = require('fs')
const exec = require('child_process').exec
var CALC = require('../../utils/calc.js')
var Send_Feedback = require('../../Remote/Send_Feedback.js')
var Netmask = require('netmask').Netmask

var DBCleanUP = require('../DBCleanUP.js')
var plugin = "checkpoint_securexl"
var ELK_Logs = require('../../logs/ELK_Logs.js')

var CheckpointSecureXL = function() {
    var calc = new CALC()
    var dbcleanup = new DBCleanUP()
    var send_seedback = new Send_Feedback()
    blacklist_file_name = "blacklist_onefirewall.txt"

    this.init = function(input_obj, callback_array) {
        var batchOps = [];
        var something_changed = false
        var ts_now3 = new Date().getTime();
        console.log('INFO: Start Checkpoint SecureXL...');
        now = Math.round((new Date()).getTime() / 1000);

        evalScore = new Function('scoreTimeZero', 'current_time', input_obj.eval)

        var wstream = fs.createWriteStream(blacklist_file_name);
        var blacklist = []

        input_obj.db.createReadStream().on('data', function(data) {

            //we evaluate the score just one time for each db entry
            var score = evalScore(data.value.score, now - data.value.ts);

            var something_change_in_one_roule = calc.something_change_in_one_roule(data, plugin, input_obj, score)

            if (something_change_in_one_roule.changed) {
                data.value[plugin].blocked = something_change_in_one_roule.how_changed
                something_changed = true
            }

            if (data.value[plugin] && data.value[plugin].blocked === true) {
                
                try{
                    var block = new Netmask(data.value.ip);
                    block.forEach(function(ip, long, index){
                        //console.log(ip)
                        wstream.write(ip + "\n")
                    });
    
                    blacklist.push(data.value.ip)
                }catch(e){

                }

            }
            
            if (dbcleanup.isEleToBeRemoved(input_obj, data, score)) {
                batchOps.push({ type: 'del', key: data.key })
            } else {
                batchOps.push({ type: 'put', key: data.key, value: data.value })
            }

            //we cant store to much operation, memory is precious
            if (batchOps.length == 1000) {
                input_obj.db.batch(batchOps, function(err) {
                    if (err){
                        new ELK_Logs().send_logs(input_obj,0,0,{"m": "ERROR during checkpoint_securexl batch operation " + err}, "ERROR")
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
                    new ELK_Logs().send_logs(input_obj,0,0,{"m": "ERROR during checkpoint_securexl batch operation " + err}, "ERROR")
                    return console.log("ERROR during checkpoint_securexl batch operation " + err);
                }
                if (callback_array[0]) {
                    callback_function = callback_array[0]
                    callback_function(input_obj, callback_array.slice(1))
                }
            });

        }).on('end', function() {
            console.log('Stop checkpoint_securexl - >' + (new Date().getTime() - ts_now3) + ' ms');
            wstream.end();
            wstream.close();
            //comunicate_feedback(input_obj, blacklist)
            if (something_changed) {
                reload_rules(input_obj, blacklist, input_obj.config.ips.checkpoint_securexl.command)
            }else{
                send_seedback.post_results(input_obj, plugin, blacklist, -1)
            }
        })
    }


    function reload_rules(input_obj, blacklist, command) {
        try {
            console.log("INFO: Execute Command: " + command)
            full_command = command + " " + blacklist_file_name + " " + input_obj.config.ips.checkpoint_securexl.connections + " " + input_obj.config.ips.checkpoint_securexl.password
            console.log(full_command)

            exec(full_command, (error, stdout, stderr, code) => {
                if (error !== null) {   
                    console.log(stderr)
                    console.log(stdout)
                    console.log(error)
                    new ELK_Logs().send_logs(input_obj,0,0,{"m": `ERROR: checkpoint_securexl exec error: ${error}`}, "ERROR")
                }
            }).on('exit', (code) => {
                send_seedback.post_results(input_obj, plugin, blacklist, code)
            });

        } catch (err) {
            console.error(err)
        }
    }

}

module.exports = CheckpointSecureXL