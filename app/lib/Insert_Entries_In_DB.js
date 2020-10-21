
var Insert_Entries_In_DB = function (){

    this.insert_entries = function(input_obj, entries, callback_array){
        
        input_obj.db.createReadStream().on('data', function (data) {

            for(i=0; i<entries.length; i++){

                if(data.key===entries[i].lid){
                    entries[i].indb = true
                    
                    if(entries[i].ip != data.value.ip || entries[i].confidence != data.value.confidence){
                        data.value.ip = entries[i].ip
                        data.value.confidence = entries[i].confidence
                        data.value.sent = false
                    }else{
                        data.value.reported_ts = Math.floor(Date.now() / 1000)
                    }

                    input_obj.db.put(data.key, data.value)
                                .then(function () {  })
                                .catch(function (err) { console.error("ERROR: " + err) })
                }

            }

        }).on('error', function (err) {
            console.error( err)
        }).on('close', function () {
            console.log("INFO: Insert Entries in DB Completed")
            if(callback_array[0]){
                callback_function = callback_array[0]
                callback_function(input_obj, callback_array.slice(1))
            }
        }).on('end', function () {
            /* INSERT */
            for(i=0; i<entries.length; i++){
                if(entries[i].indb===false){
                    entries[i].reported_ts = Math.floor(Date.now() / 1000)
                    input_obj.db.put(entries[i].lid, entries[i])
                                .then(function () {  })
                                .catch(function (err) { console.error("ERROR: " + err) })

                }
            }
        })
    }

 }
 
 module.exports = Insert_Entries_In_DB
 