var request = require('request')
//var levelup = require('levelup')
//var level = require('level')
//const fs = require('fs');
var ELK_Logs = require('../logs/ELK_Logs.js')


var Remote_Read = function() {

    this.init = function(input_obj, callback_array) {
        console.log("INFO Read time stamp: " + new Date(input_obj.ts_todo * 1000))
        //input_obj.page_remote_server = 0
        var totalElementReaded = 0
        //console.log('Start Remote_Read...'+(new Date().getTime()) + ' ms');
        read_all_from_server(input_obj, callback_array, totalElementReaded)

    }

}


function read_all_from_server(input_obj, callback_array, totalElementReaded) {
    //console.log('Start Remote_Read...');

    //console.log(">> " + input_obj.page_remote_server)
    if (input_obj.ts_todo < 0) {
        if (callback_array[0]) {
            callback_function = callback_array[0]
            callback_function(input_obj, callback_array.slice(1))
        }
        return
    }
    
    request({
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': input_obj.config.api_jwt_key
        },
        uri: input_obj.config.api_url + "?gaid=" + input_obj.config.gaid + "&ts=" + input_obj.ts_todo,// + "&page_size=10000",
        method: 'GET'
    }, function(err, res, body) {

        if (!err && (res.statusCode == 200 || res.statusCode == 201)) {

            try {
                var server_data = JSON.parse(res.body)
                input_obj.rules_ram = server_data.body //rules.concat(server_data.body)
                input_obj.eval = server_data.header.eval

                if( server_data.body.length <= 0){
                    new ELK_Logs().send_logs(input_obj,0,0,{"totalElementReaded":totalElementReaded}, "LAST_REMOTE_READ")

                    input_obj.ts_todo = -1
                } else {
                                        
                    if(input_obj.rules_ram != undefined && input_obj.rules_ram.length != 0){
                        last_ts = input_obj.rules_ram[input_obj.rules_ram.length-1].ts
                        input_obj.ts_todo = last_ts
                        totalElementReaded+= input_obj.rules_ram.length
                    }
                    console.log("INFO: Remote Read: Ip readed " + server_data.body.length + "/Total " + totalElementReaded)
                }

                //input_obj.tik_tok = new Date().getTime()

                callback_array.unshift(read_all_from_server) // PUT in the START callback array
                write_to_db(input_obj, callback_array, totalElementReaded)

            } catch (e) {
                console.error("ERROR: Remote Read " + e)
                if (callback_array[0]) {
                    callback_function = callback_array[0]
                    callback_function(input_obj, callback_array.slice(1))
                }
            }
        } else {
            try {
                new ELK_Logs().send_logs(input_obj,0,0,{"m":`ERROR: Remote Read: statusCode: ${res.statusCode}`}, "ERROR")
                if(res.statusCode==502){
                    a = 1
                    for(i=0; i<(1000 * 1000 * 1000); i++){
                        a +=1
                    }
                    read_all_from_server(input_obj, callback_array, totalElementReaded)
        
                }else{
                    if (callback_array[0]) {
                        callback_function = callback_array[0]
                        callback_function(input_obj, callback_array.slice(1))
                    }
                }
            } catch (eee) {
                new ELK_Logs().send_logs(input_obj,0,0,{"m":`ERROR: Remote Read: statusCode: ${eee}`}, "ERROR")
                read_all_from_server(input_obj, callback_array, totalElementReaded)
            }


        }
    })
}

function write_to_db(input_obj, callback_array, totalElementReaded) {
    server_data = input_obj.rules_ram

    var batchOps = [];
    //new ELK_Logs().send_logs(input_obj,0,0,{"totalElementReaded":totalElementReaded}, "WRITE_TO_DB")
    recursive_write_to_db(input_obj, server_data, 0, batchOps, callback_array, totalElementReaded);
}

function recursive_write_to_db(input_obj, server_data, index, batchOps, callback_array, totalElementReaded){

    // Base Case reached
    if(server_data.length == index){
         input_obj.db.batch(batchOps, function(err) {
                if (err){
                    new ELK_Logs().send_logs(input_obj,0,0,{"m":"Error during batch write into write_to_db"}, "ERROR")
                    return
                }
                if (callback_array[0]) {
                    //console.log('Stop Remote_Read - >' +(new Date().getTime()) + ' ms');
                    callback_function = callback_array[0]
                    callback_function(input_obj, callback_array.slice(1), totalElementReaded)
                }
            })
         return;
    }

    k = server_data[index].gid;
    v =  server_data[index];

    input_obj.db.get(k, function(err, val) {
        if (err) {
            if (err.notFound) {
                // if not exists insert into the database
                for (var key in input_obj.config.ips) {
                    v[key] = { blocked: false, events: [] }
                }
                batchOps.push({ type: 'put', key: k, value: v })
                recursive_write_to_db(input_obj, server_data, ++index, batchOps, callback_array, totalElementReaded);
            }else{
                new ELK_Logs().send_logs(input_obj,0,0,{"m":"Error during do_write_to_db", "e": e}, "ERROR")

                recursive_write_to_db(input_obj, server_data, ++index, batchOps, callback_array, totalElementReaded);
            }
        }else {
                //if exists update the db value (val) with the remote info (v)
                val.eval = v.eval;
                val.events = v.events;
                val.decision = v.decision;
                batchOps.push({ type: 'put', key: k, value: val })
                recursive_write_to_db(input_obj, server_data, ++index, batchOps, callback_array, totalElementReaded);
            }
    })

}

module.exports = Remote_Read