var request = require('request')
var ELK_Logs = require('../logs/ELK_Logs.js')
var os = require("os")

var Send_Feedback = function (){

    var to_send = []
    
    this.post_results = function(input_obj, plugin, blacklist, code){
        post_body = {
            agid: input_obj.config.gaid,
            plugin: plugin,
            hostname: os.hostname(),
            code: code,
            score_threshold: input_obj.config.score_threshold,
            blacklist: blacklist
        }

        //console.log(post_body)

        request({
            headers: {
                'Content-Length': JSON.stringify(post_body).length,
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': input_obj.config.api_jwt_key
            },
            uri: input_obj.config.api_url_feedback,
            body: JSON.stringify(post_body),
            method: 'POST'
        }, function (err, res, body) {
            
            if(!err && ( res.statusCode == 200 || res.statusCode == 201)) {
                console.log("Feedback sent")
            }else{
                console.error("Feedback was not send")
            }
            
        })

    }

 }
 
 module.exports = Send_Feedback
 