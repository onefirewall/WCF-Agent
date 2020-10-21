var ModSecLog2JSON = require('../../lib/ModSecLog2JSON.js')
var Insert_Entries_In_DB = require('../../lib/Insert_Entries_In_DB.js')

var ip_regx = new RegExp("^(([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\/([0-9]|[0-2][0-9]|3[0-2])|([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5]))\.([0-9]|[1-9][0-9]|1([0-9][0-9])|2([0-4][0-9]|5[0-5])))$");
var ip_pattern = /\d{1,3}(\.\d{1,3}){3}/

var ModSec = function (){

    this.init = function(input_obj, callback_array){
        
        var log2json = new ModSecLog2JSON()
        
        log2json.async(input_obj.config.ids.modsec.modsec_logs,
            function callback(jsonArray){

                var entries_to_send = []

                for(i=0;i<jsonArray.length;i++){
                    
                    if(jsonArray[i] && jsonArray[i].ResponseHeader && jsonArray[i].ResponseHeader.status==="403"){

                        var ip = null
                        var ip1 = null
                        var ip0 = jsonArray[i].RequestHeader.headers['CF-Connecting-IP']
                        try{
                            var ip1_a = jsonArray[i].RequestHeader.headers['X-Forwarded-For']
                            var ip1 = ip1_a.split(",")[0]
                        }catch(e){

                        }

                        var ip2 = jsonArray[i]['src_ip']
                        
                        if(ip0 && ip0.match(ip_pattern) && ip_regx.test(ip0.match(ip_pattern)[0])){
                            ip = ip0.match(ip_pattern)[0]

                        }else if(ip1 && ip1.match(ip_pattern) && ip_regx.test(ip1.match(ip_pattern)[0])){
                            ip = ip1.match(ip_pattern)[0]

                        }else if(ip2 && ip2.match(ip_pattern) && ip_regx.test(ip2.match(ip_pattern)[0])){
                            ip = ip2.match(ip_pattern)[0]

                        }else{
                            continue
                        }
                        
                        var lid = jsonArray[i].id1 + "_" + jsonArray[i].id2
                        lid = lid.replace(/\s/g, '')

                        var notes = ""
                        try{
                            notes = jsonArray[i].AuditLogTrailer.metadata.Messages[0].data.message   
                        }catch(err){

                        }
                        var found = false

                        for(x=0; x<entries_to_send.length; x++){
                            if(entries_to_send[x].ip && entries_to_send[x].ip===ip){
                                var found = true
                                entries_to_send[x].confidence += 0.1
                                entries_to_send[x].notes += notes + ", "
                                break
                            }
                        }

                        if(found===false){
                            var new_entry = {
                                ip: ip,
                                confidence: 0.1,
                                lid: lid,
                                notes: notes,
                                source: "modsec",
                                indb: false,
                                sent: false
                            }
                            entries_to_send.push(new_entry)
                        }
                    }
                }
                new Insert_Entries_In_DB().insert_entries(input_obj, entries_to_send, callback_array)
            }
        )
    }
 }
 
 module.exports = ModSec
 