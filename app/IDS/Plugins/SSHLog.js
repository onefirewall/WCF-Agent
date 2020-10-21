var Insert_Entries_In_DB = require('../../lib/Insert_Entries_In_DB.js')
var SSHLog2JSON = require('../../lib/SSHLog2JSON.js')

var SSHLog = function (){

    this.init = function(input_obj, callback_array){

        var sshlog2json = new SSHLog2JSON()
        var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/++[++^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}

        sshlog2json.async(input_obj.config.ids.sshlog.ssh_log_location,
            function callback(jsonArray) {
                
                var entries_to_send = []
                console.log("SSH Logs lenght: " +jsonArray.length )
                for(i=0; i<jsonArray.length; i++){
                    //console.log('s')
                    var new_entry = {
                        ip: jsonArray[i].ip,
                        confidence: (jsonArray[i].listOfDate.length/50),
                        //lid: new Buffer("sshlog_" + jsonArray[i].ip).toString('base64'), //new Buffer(jsonArray[i].ip+"_"+jsonArray[i].listOfDate.length+"_"+jsonArray[i].typeInfo).toString('base64'),
                        //lid: Base64.encode("sshlog_" + jsonArray[i].ip.toString('base64')), //new Buffer(jsonArray[i].ip+"_"+jsonArray[i].listOfDate.length+"_"+jsonArray[i].typeInfo).toString('base64'),
                        lid: Base64.encode("sshlog_" + jsonArray[i].typeInfo + jsonArray[i].ip), //new Buffer(jsonArray[i].ip+"_"+jsonArray[i].listOfDate.length+"_"+jsonArray[i].typeInfo).toString('base64'),

                        notes: jsonArray[i].typeInfo,
                        source: "sshlog",
                        indb: false,
                        sent: false
                    }
                    entries_to_send.push(new_entry)
                }

                new Insert_Entries_In_DB().insert_entries(input_obj, entries_to_send, callback_array)

            }
        )

    }

 }
 
 module.exports = SSHLog
 