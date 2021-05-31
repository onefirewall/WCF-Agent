// var request = require('request')
// var levelup = require('levelup')
// var level = require('level')

var DBCleanUP = function (){

    this.init = function(input_obj, callback_array){
        var batchOps = [];
        //evalScore = new Function('now', 'rule_delay', 'rule_ts', 'rule_dec', 'score', input_obj.eval)
        evalScore = new Function('scoreTimeZero', 'current_time', input_obj.eval)

        now = Math.round((new Date()).getTime() / 1000);
        input_obj.db.createReadStream().on('data', function (data) {
            //var score = new Function(data.value.eval)()
            //var score = evalScore(now, data.value.delay, data.value.ts, data.value.dec, data.value.score);
            var score = evalScore(data.value.score, now - data.value.ts);

            if(doIsEleToBeRemoved(input_obj, data, score)) batchOps.push({ type: 'del', key: data.key});

        }).on('error', function (err) {
            console.error("ERROR: IPS " + err)
        }).on('close', function () {
            //console.log("INFO: IPS DB Closed")

            //removing ip from db in batch mode
            input_obj.db.batch(batchOps, function(err) {
                if (err) return console.log("ERROR: IPS " + err)
                input_obj.db.close()
                if(callback_array[0]){
                    callback_function = callback_array[0]
                    callback_function(input_obj, callback_array.slice(1))
                }
            });
        }).on('end', function () {
            //console.info("INFO: DB Closed")
        })
        
    }

    this.isEleToBeRemoved = function(input_obj, data, score){
        return doIsEleToBeRemoved(input_obj, data, score);
    }

    var doIsEleToBeRemoved = function(input_obj, data, score){
        //var score = new Function(data.value.eval)()
        
        var delete_this = false;

        if(score<input_obj.config.score_threshold){
            var delete_this = true;
            for (var key in input_obj.config.ips) {
                if(data.value[key]!=undefined && data.value[key].blocked===true){
                    delete_this = false
                    break
                }
            }
        }

        return delete_this;
    }
 }
 
 module.exports = DBCleanUP
 