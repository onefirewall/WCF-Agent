var request = require('request')
var ELK_Logs = require('../logs/ELK_Logs.js')

var Remote_Write = function (){

    var arr_indx = 0
    var to_send = []
    
    this.send_bulk_events = function(input_obj, reports){
        console.log("INFO: REMOTE_WRITE entries: " + reports.length)
        to_send = reports
        this.send_event(input_obj, 0, this.send_event)
    }

    
    this.send_event = function(input_obj, index, callback_function){
        if(!to_send || !to_send[index]){
            return
        }

        var data_form = {
            ip: to_send[index].ip,
            confidence: to_send[index].confidence, 
            lid: to_send[index].lid,
            notes: to_send[index].notes,
            source: to_send[index].source
        }

        request({
            headers: {
                'Content-Length': JSON.stringify(data_form).length,
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': input_obj.config.api_jwt_key
            },
            uri: input_obj.config.api_url + "?gaid=" + input_obj.config.gaid,
            body: JSON.stringify(data_form),
            method: 'POST'
        }, function (err, res, body) {
            
            if(!err && ( res.statusCode == 200 || res.statusCode == 201)) {
                console.log("Send " + data_form.ip)
                try{
                    callback_function(input_obj, index+1, callback_function)
                    new ELK_Logs().send_logs(input_obj,0,0,{"idata_formp":data_form}, "REMOTE_WRITE")

                }catch(e){
                    callback_function(input_obj, index+1, callback_function)
                    new ELK_Logs().send_logs(input_obj,0,0,{"m":"ERROR: Remote Write " + e}, "ERROR")
                }
            }else{
                try{
                    new ELK_Logs().send_logs(input_obj,0,0,{"m":"ERROR: REMOTE_WRITE StatusCode 1 " + res.statusCode}, "ERROR")
                }catch(err1){
                    new ELK_Logs().send_logs(input_obj,0,0,{"m":"ERROR: REMOTE_WRITE StatusCode 2 " + err1}, "ERROR")
                }
                callback_function(input_obj, index+1, callback_function)

                //console.error("ERROR: REMOTE_WRITE StatusCode 3: " + err)
            }
            
        })

    }

 }
 
 module.exports = Remote_Write
 