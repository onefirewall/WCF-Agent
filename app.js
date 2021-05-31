/*
    Author: OneFirewall Alliance LTD 2018-2021
*/

console.log("\
┌───────────────┬──────────────────────────────────────────────────────────────┐\n\
│ Name          │ World Crime Feeds (WCF) Agent                                │\n\
├───────────────┼──────────────────────────────────────────────────────────────┤\n\
│ Version       │ 2021.05.03                                                   │\n\
├───────────────┼──────────────────────────────────────────────────────────────┤\n\
│ Author        │ OneFirewall Alliance LTD 2018-2021                           │\n\
├───────────────┼──────────────────────────────────────────────────────────────┤\n\
│ More info     │ https://onefirewall.com/info                                 │\n\
└───────────────┴──────────────────────────────────────────────────────────────┘\
")

var level = require('level'); 

var IPS = require('./app/IPS/IPS.js')
var IDS = require('./app/IDS/IDS.js')

var config = null

var options = {
    keyEncoding: 'utf-8',
    valueEncoding: 'json'
}

var ips = new IPS()
var ids = new IDS()

var args = process.argv.slice(0)

function reset_function(){

    var db = level("./db/mydb", options)
    
    db.createReadStream().on('data', function (data) {
        db.del(data.key, function (err) {
            if (err) console.log(err)
        })
    }).on('error', function (err) {
    }).on('close', function () {
        console.log('IPS DB cleaned!')
        db.close()
    }).on('end', function () {
    })


    var db_ids = level("./db/mydb_ids", options)
    
    db_ids.createReadStream().on('data', function (data) {
        db_ids.del(data.key, function (err) {
            if (err) console.log(err)
        })
    }).on('error', function (err) {
    }).on('close', function () {
        console.log('IDS DB cleaned!')
        db_ids.close()
    }).on('end', function () {
    })

    var db_config = level("./db/db_config", options)

    db_config.createReadStream().on('data', function (data) {
        db_config.del(data.key, function (err) {
            if (err) console.log(err)
        })
    }).on('error', function (err) {
    }).on('close', function () {
        console.log('DB db_config cleaned!')
        db_config.close()
    }).on('end', function () {
    })
}


function db_call(){
   
    var db = level("./db/mydb", options)
    db.createReadStream().on('data', function (data) {
        console.log(data.key, '=', data.value)
    }).on('error', function (err) {
        console.error('error')
    }).on('close', function () {
        //console.log('Stream closed mydb')
        db.close()
    }).on('end', function () {
        //console.log('Stream ended')
    })
    
    console.log('======================')

    var db_ids = level("./db/mydb_ids", options)
    db_ids.createReadStream().on('data', function (data) {
        console.log(data.key, '=', data.value)
    }).on('error', function (err) {
        console.error('error')
    }).on('close', function () {
        console.log('Stream closed db_ids')
        db_ids.close()
    }).on('end', function () {
        //console.log('Stream ended')
    })

    var db_config = level("./db/db_config", options)
    db_config.createReadStream().on('data', function (data) {
        console.log(data.key, '=', data.value)
    }).on('error', function (err) {
        console.error('error')
    }).on('close', function () {
        console.log('Stream closed db_config')
        db_config.close()
    }).on('end', function () {
        //console.log('Stream ended')
    })

}


function ips_call(){
    
    var db = level("./db/mydb", options)
    var db_config = level("./db/db_config", options)

    var ts_todo = 0;
    //var latest_read_ts = keep_ts_updated()
    //console.log("latest_read_ts " + latest_read_ts)
    if(config.start_from != undefined && !isNaN(config.start_from) && config.start_from >= 0){
        ts_todo = Math.round((new Date(config.start_from)).getTime() / 1000)
    }

    db_config.get('config', function (err, value) {
        
        var ts_now = Math.round((new Date()).getTime() / 1000)
        ts_now -=60
        db_config.put('config', {ts: ts_now}).then(function () {  }).catch(function (err) { console.error("c" + err) })

        if (!err){
            ts_todo = value.ts
            console.log("Last Saved: " + new Date(ts_todo * 1000))
        }
        
        var at_least_one_ip_active = false
        for(ip_obj in config.ips){
            if(config.ips[ip_obj].active==true){
                at_least_one_ip_active = true
            }
        }
    
        if (at_least_one_ip_active ){
            console.log("INFO: IPS Enabled")
            //console.log("Current Run time: " + new Date(ts_todo * 1000))
            var input_obj = { config, db, ts_todo }
            ips.init(input_obj)
        }else{
            console.log("INFO: IPS NOT Enabled")
            return
        }

    })
}


function ids_call(){
    //var db = level("./db/mydb", options)
    console.log("INFO: IDS Enabled")
    var db = level("./db/mydb_ids", options)
    var input_obj = {
        config, db
    }
    ids.init(input_obj)
}


function no_selection(){
    console.log("################################################################")
    console.log("\treset $(pwd)/config.json")
    console.log("\tdb $(pwd)/config.json")
    console.log("\tids $(pwd)/config.json")
    console.log("\tips $(pwd)/config.json")
    console.log("################################################################")
}


if(args[2]==="test"){
    console.log("Works!")
}else{
    try{
        config = require(args[3]);
    }catch(er){
        console.error("ERROR: config.json file is missing")
        process.exit(1)
    }
    
    if(args[2]==="reset")
        reset_function()
    
    else if(args[2]==="ips")
        ips_call()
    
    else if(args[2]==="ids")
        ids_call()
    
    else if(args[2]==="db")
        db_call()
    
    else if(args[2]==="test")
        test_selection()
    
    else
        no_selection()
    
}
