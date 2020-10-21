// var request = require('request')
// var levelup = require('levelup')
// var level = require('level')

var Remote_Write = require('../Remote/Remote_Write.js')

var DBCleanUP = function (){

    this.init = function(input_obj, callback_array){

        var remote_write = new Remote_Write()
        var reports = []
        
        input_obj.db.createReadStream().on('data', function (data) {

            var current_ts = Math.floor(Date.now() / 1000)

            if( !data.value.reported_ts || data.value.reported_ts===undefined || (current_ts-data.value.reported_ts)>(60*60)){
                // DELETE OLD Entries
                input_obj.db.del(data.key, function (err) { if (err) console.error("ERROR: " + err) })

            }else if( data.value.sent===false || data.value.sent_ts===undefined || (current_ts-data.value.sent_ts)>(60*60*24)){
                reports.push(data.value)
                data.value.sent = true
                data.value.sent_ts = current_ts
                
                input_obj.db.put(data.key, data.value)
                            .then(function () {  })
                            .catch(function (err) { console.error("ERROR: " + err) })

            }

        }).on('error', function (err) {
            console.error("ERROR: IDS" + err)
        }).on('close', function () {
            //console.log("INFO: IDS DB Closed")
            input_obj.db.close()
            if(callback_array[0]){
                callback_function = callback_array[0]
                callback_function(input_obj, callback_array.slice(1))
            }
        }).on('end', function () {
            remote_write.send_bulk_events(input_obj, reports)
        })
           
    }

}
 
module.exports = DBCleanUP
 