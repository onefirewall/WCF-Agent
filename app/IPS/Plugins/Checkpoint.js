var fs = require('fs')
var request = require('request')
//const exec = require('child_process').exec
var CALC = require('../../utils/calc.js')
var DBCleanUP = require('../DBCleanUP.js')
var plugin = "checkpoint"
var ELK_Logs = require('../../logs/ELK_Logs.js')

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

var Checkpoint = function() {
    var calc = new CALC()
    var dbcleanup = new DBCleanUP()

    this.init = function(input_obj, callback_array) {
        var batchOps = [];
        var something_changed = false
        var ts_now3 = new Date().getTime()
        console.log('INFO: Starting plugin: ' + plugin )
        now = Math.round((new Date()).getTime() / 1000)


        evalScore = new Function('scoreTimeZero', 'current_time', input_obj.eval)

        var ipsToBlock = []
        var ipsToUnBlock = []

        input_obj.db.createReadStream().on('data', function(data) {

            //we evaluate the score just one time for each db entry
            var score = evalScore(data.value.score, now - data.value.ts);

            var something_change_in_one_roule = calc.something_change_in_one_roule(data, plugin, input_obj, score)
            
            if (something_change_in_one_roule.changed) {
                data.value[plugin].blocked = something_change_in_one_roule.how_changed
                something_changed = true

                if(something_change_in_one_roule.how_changed){
                    ipsToBlock.push(data.value.ip)
                    console.log("ADD HOST", data.value.ip)
                }else{
                    ipsToUnBlock.push(data.value.ip)
                    console.log("REMOVE HOST", data.value.ip)
                }
            }

            if (dbcleanup.isEleToBeRemoved(input_obj, data, score)) {
                batchOps.push({ type: 'del', key: data.key });
                //console.log("Del", data.value.ip)
            } else {
                batchOps.push({ type: 'put', key: data.key, value: data.value });
                //console.log("put", data.value.ip)
            }

            

            
            
        }).on('error', function(err) {
            console.error('ERROR: ' + err)
        }).on('close', function() {
            input_obj.db.batch(batchOps, function(err) {
                if (err) {
                    new ELK_Logs().send_logs(input_obj,0,0,{"m": "ERROR during Checkpoint batch operation " + err}, "ERROR")
                    return console.log("ERROR during Checkpoint batch operation " + err);
                }
                if (callback_array[0]) {
                    callback_function = callback_array[0]
                    callback_function(input_obj, callback_array.slice(1))
                }
            });

        }).on('end', function() {

            console.log('Stop checkpoint - >' + (new Date().getTime() - ts_now3) + ' ms');
            if (something_changed) {
                console.log("To Block", ipsToBlock)
                console.log("To UnBlock", ipsToUnBlock)
                publish_and_install(input_obj, ipsToBlock, ipsToUnBlock )
            }
        })
    }

    var json_actions = {}

    function generate_checkpoint_json(input_obj, ipsToBlock, ipsToUnBlock){
        json_actions = {
            login: {
                posta_data: {
                    'user': input_obj.config.ips.checkpoint.username,
                    'password': input_obj.config.ips.checkpoint.password,
                    'session-timeout': 3600
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                path: input_obj.config.ips.checkpoint.address + "/web_api/login"
            },
            publish: {
                posta_data: {
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-chkp-sid': null
                },
                path: input_obj.config.ips.checkpoint.address + "/web_api/publish"
            },
            showtask: {
                posta_data: {
                    'task-id': null
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-chkp-sid': null
                },
                path: input_obj.config.ips.checkpoint.address + "/web_api/show-task"
            },
            install: {
                posta_data: {
                    'policy-package': "standard",
                    'access': true,
                    'targets': input_obj.config.ips.checkpoint.gateways.split(",")
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-chkp-sid': null
                },
                path: input_obj.config.ips.checkpoint.address + "/web_api/install-policy"
            },
            rules: [ ]
        }

        ipsToBlock.forEach(element => {
            json_actions.rules.push(
                {
                    posta_data: {
                        'name': "ofa_h_" + element,
                        'ipv4-address': element,
                        'comments': "OneFirewall Malicious IP",
                        'tags': ["OneFirewall", "WCF Server"],
                        'groups': [input_obj.config.ips.checkpoint.group]
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        'X-chkp-sid': null
                    },
                    path: input_obj.config.ips.checkpoint.address + "/web_api/add-host"
                }
            )
        });
        ipsToUnBlock.forEach(element => {
            json_actions.rules.push(
                {
                    posta_data: {
                        'name': "ofa_h_" + element,
                        'ignore-errors': true
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        'X-chkp-sid': null
                    },
                    path: input_obj.config.ips.checkpoint.address + "/web_api/delete-host"
                }
            )
        });
        return json_actions
    }

    function publish_and_install(input_obj, ipsToBlock, ipsToUnBlock) {
        generate_checkpoint_json(input_obj, ipsToBlock, ipsToUnBlock)
        checkpoint_login()
    }


    function checkpoint_login(){
        console.log("Login")
        request({
            headers: json_actions.login.headers,
            uri: json_actions.login.path,
            body: JSON.stringify(json_actions.login.posta_data),
            method: 'POST'
        }, function(err, res, body) {

            if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
                try {
                    var server_data = JSON.parse(res.body)
                    var sid = server_data['sid']

                    json_actions.publish.headers['X-chkp-sid'] = sid
                    json_actions.install.headers['X-chkp-sid'] = sid
                    json_actions.showtask.headers['X-chkp-sid'] = sid

                    for(i=0;i<json_actions.rules.length;i++){
                        json_actions.rules[i].headers['X-chkp-sid'] = sid
                    }

                    checkpoint_rules(0)

                } catch (e) {
                    console.error("ERROR1: Remote Read " + e)
                }
            } else {
                console.log(err)
                console.log('Ops3')
            }
        })
    }

    function checkpoint_publish(){
        console.log("Publish...")
        request({
            headers: json_actions.publish.headers,
            uri: json_actions.publish.path,
            body: JSON.stringify(json_actions.publish.posta_data),
            method: 'POST'
        }, function(err, res, body) {
    
            if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
                try {
                    
                    var server_data = JSON.parse(res.body)
                    json_actions.showtask.posta_data['task-id'] = server_data['task-id']
    
                    console.log("Waiting for publishing to complete...")
                    checkpoint_wait_publish()
                } catch (e) {
                    console.error("ERROR_p: Remote Read " + e)
                }
            } else {
                console.log(err)
                console.log('Ops1')
            }
        })
    }
    
    function checkpoint_wait_publish(){
    
        request({
            headers: json_actions.showtask.headers,
            uri: json_actions.showtask.path,
            body: JSON.stringify(json_actions.showtask.posta_data),
            method: 'POST'
        }, function(err, res, body) {
    
            if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
                try {
                    
                    var server_data = JSON.parse(res.body)
                    status_task = server_data['tasks'][0]['status']
                    if(status_task=="succeeded"){
                        checkpoint_install()
                    }else{
                        console.log(server_data['tasks'][0]['progress-percentage'], "%")
                        setTimeout(checkpoint_wait_publish, 3000)
                    }
    
                } catch (e) {
                    console.error("ERROR_p: Remote Read " + e)
                }
            } else {
                console.log(err)
                console.log('Ops1')
            }
        })
    }
    
    function checkpoint_install(){
        console.log("Install")
        request({
            headers: json_actions.install.headers,
            uri: json_actions.install.path,
            body: JSON.stringify(json_actions.install.posta_data),
            method: 'POST'
        }, function(err, res, body) {
    
            if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
                try {
    
                    var server_data = JSON.parse(res.body)
                    json_actions.showtask.posta_data['task-id'] = server_data['task-id']
                    console.log("Waiting for install to complete...")
                    checkpoint_wait_install()
    
                } catch (e) {
                    console.error("ERROR4: Remote Read " + e)
                }
            } else {
                console.log(err)
                console.log('Ops5')
            }
        })
    }
    
    function checkpoint_wait_install(){
        
        request({
            headers: json_actions.showtask.headers,
            uri: json_actions.showtask.path,
            body: JSON.stringify(json_actions.showtask.posta_data),
            method: 'POST'
        }, function(err, res, body) {
    
            if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
                try {
                    
                    var server_data = JSON.parse(res.body)
                    status_task = server_data['tasks'][0]['status']
                    if(status_task=="succeeded"){
                        console.log("ALL DONE")
                    }else{
                        console.log(server_data['tasks'][0]['progress-percentage'], "%")
                        setTimeout(checkpoint_wait_install, 3000)
                    }
    
                } catch (e) {
                    console.error("ERROR_p: Remote Read " + e)
                }
            } else {
                console.log(err)
                console.log('Ops1')
            }
        })
    }
    
    function checkpoint_rules(index_rule){
        
        if( json_actions.rules[index_rule] == undefined ){
            console.log("End of the rules")
            checkpoint_publish()
            return
        }
        console.log("Rule ", index_rule)
    
        request({
            headers: json_actions.rules[index_rule].headers,
            uri: json_actions.rules[index_rule].path,
            body: JSON.stringify(json_actions.rules[index_rule].posta_data),
            method: 'POST'
        }, function(err, res, body) {
    
            
    
            if (!err && (res.statusCode == 200 || res.statusCode == 201 || res.statusCode == 409 || res.statusCode == 400)) {
                try {
                    checkpoint_rules(index_rule+1)
                } catch (e) {
                    console.error("ERROR: Remote Read " + e)
                }
            } else {
                console.log(err)
                console.log('Ops-rule')
            }
        })
    }
    

}

module.exports = Checkpoint