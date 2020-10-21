var elasticsearch = require('elasticsearch');
var os = require('os')
var randomstring = require("randomstring");

var ELK_Logs = function (){

    this.send_logs = function(input_obj, ips_blocked, ids_found, details, log_type){

        try{
          console.log(log_type + "\t" + JSON.stringify(details))
          console.log("")
        }catch(e){
          console.error("Unable to write logs")
        }

        return

        try {

          var client = new elasticsearch.Client({
              host: [input_obj.config.elk_link],
              log: 'error'
          });

          client.index({  
              index: 'onefirewall_agent_logs',
              type: '_doc',
              id: randomstring.generate(16),
              body: {
                "ts": new Date().toISOString(),
                "hostname": os.hostname(),
                "type": os.type(),
                "uptime": os.uptime(),
                "freemom": os.freemem(),
                "ips_blocked": ips_blocked,
                "ids_found": ids_found,
                "gaid": input_obj.config.gaid,
                "score_threshold": input_obj.config.score_threshold,
                "log_type": log_type,
                "details": details
              }
            },function(err,resp,status) {
                //console.log(resp);
            });
        }catch(err) {
          console.error("ERROR: No Elk Link")
        }
      
    }
}
module.exports = ELK_Logs

