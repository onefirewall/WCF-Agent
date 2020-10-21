var CloudFlareOFA = require('../../lib/CloudFlareOFA.js')
var Insert_Entries_In_DB = require('../../lib/Insert_Entries_In_DB.js')

var CloudFlare = function (){

    this.init = function(input_obj, callback_array){

        var cloudflareOFA = new CloudFlareOFA(
                                    input_obj.config.ids.cloudflare.cloudflare_x_auth_key, 
                                    input_obj.config.ids.cloudflare.cloudflare_x_auth_email)
        
        var entries_to_send = []

        //console.log("1")
        cloudflareOFA.getAllZones( 
            function callback(zones){
                //console.log("zones: " + zones)
                cloudflareOFA.getIPs_For_ALL_Zones(zones, function(returnArray){
                    //console.log("INFO: IDS Cloudflare Entries " + returnArray.length)

                    for(i=0; i<returnArray.length; i++){
                        var pre_confidence = 0

                        if(returnArray[i].mode==="block"){
                            pre_confidence = 1
                        }else if(returnArray[i].mode==="challenge" || returnArray[i].mode==="js_challenge"){
                            pre_confidence = 0.5
                        }

                        var new_entry = {
                            ip: returnArray[i].ip,
                            confidence: pre_confidence,
                            lid: returnArray[i].id,
                            notes: returnArray[i].notes,
                            source: "cloudflare",
                            indb: false,
                            sent: false
                        }

                        if(new_entry.confidence>0 && ( new_entry.notes===null || new_entry.notes!="OneFirewall")){
                            entries_to_send.push(new_entry)
                        }
                        
                    }

                    new Insert_Entries_In_DB().insert_entries(input_obj, entries_to_send, callback_array)
                })
            }
        )

    }

 }
 
 module.exports = CloudFlare
 