var request = require('request')

var CloudFlareOFA = function (x_auth_key, x_auth_email) {
    var headers =   {
                        'X-Auth-Email': x_auth_email,
                        'X-Auth-Key': x_auth_key,
                        'Content-Type': 'application/json'
                    }

    this.getAllZones = function(callback){
        getAllZonesBACKEND(headers, 1, [], callback)
    }

    this.getIPsPerZone = function(zoneID, callback){
        getIPsPerZoneBACKEND(headers, zoneID, 1, [], callback)
    }

    this.getIPs_For_ALL_Zones = function(zones, callback){

        getIPs_For_ALL_Zones(headers, 1, zones, 0, [], function getUser(returnArrayZONES){
            getParentIPsBACKEND(headers, 1, [], function callback2(returnArrayUSER){
                for(i=0;i<returnArrayUSER.length;i++){
                    returnArrayZONES.push(returnArrayUSER[i])
                }
                callback(returnArrayZONES)
            })
        })
        
    }

    this.getParentIPs = function(callback){
        getParentIPsBACKEND(headers, 1, [], callback)
    }

    this.addNewIP = function (ip, mode, callback) {
       
        var target = "ip"
        if(ip.includes("/")){
             target = "ip_range"
        }

        var action = { "mode": mode,  "configuration":{   "target": target, "value":  ip }, "notes": "OneFirewall" }

        var httpHEADER = {
            url:  "https://api.cloudflare.com/client/v4/user/firewall/access_rules/rules",
            method: 'POST',
            headers: headers,
            json: true,
            body: action
        }


        request(httpHEADER,
            function (error, response, body) {
                //console.log("Error: " + response.statusCode)
                if (error || response.statusCode !== 200) {
                    console.error(error)
                    callback(null, null)
                }else{
                    //console.log(body)
                    //console.log(body.result.id)
                    callback(response.statusCode, body.result.id)
                }
            }
        )
    }

    this.deleteIP = function (id, callback) {

        var httpHEADER = {
            url:  "https://api.cloudflare.com/client/v4/user/firewall/access_rules/rules/" + id,
            method: 'DELETE',
            headers: headers
        }
        request(httpHEADER,
            function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    console.error(error)
                    callback(null)
                }else{
                    callback(response.statusCode)
                }
                
            }
        )
    }


}

function getAllZonesBACKEND(headers, page, zones, callback){
    
    httpHEADER = {
        url: "https://api.cloudflare.com/client/v4/zones?page=" + page + "&per_page=1000",
        method: 'GET',
        headers: headers
    }

    request(httpHEADER,
        function (error, response, body) {
            if (error || response.statusCode !== 200) {
                console.error("ERROR: " + error)
                callback(null)
            }else{
                var body = JSON.parse(body)
                for(i=0;i<body.result.length;i++){
                    zones.push(body.result[i].id)
                }
                if(body.result_info.total_pages===page){
                    callback(zones)
                }else{
                    getAllZonesBACKEND(headers, page+1, zones, callback)
                }
            }
        }
    )
}

function getIPsPerZoneBACKEND(headers, zoneID, page, returnArray, callback){
    httpHEADER = {
        url: "https://api.cloudflare.com/client/v4/zones/" + zoneID + "/firewall/access_rules/rules?page=" + page + "&per_page=1000",
        method: 'GET',
        headers: headers
    }
    request(httpHEADER,
        function (error, response, body) {
            if (error || response.statusCode !== 200) {
                console.error(error)
                callback(null)
            }else{
                var body = JSON.parse(body)

                for(i=0;i<body.result.length;i++){
                    var entry = {
                        id: body.result[i].id,
                        notes: body.result[i].notes,
                        mode: body.result[i].mode
                    }
                    if(body.result[i].configuration.target==="ip" || body.result[i].configuration.target==="ip_range"){
                        entry.ip = body.result[i].configuration.value
                        returnArray.push(entry)
                    }
                    
                }
                if(body.result_info.total_pages===page){
                    callback(zoneID, returnArray)
                }else{
                    getIPsPerZoneBACKEND(headers, zoneID, page+1, returnArray, callback)
                }
            }
        }
    )
}



function getIPs_For_ALL_Zones(headers, page, zones, zone_indx, returnArray, callback){
    //callback()
    //return
    aa = []
    //console.log(aa)
    //console.log("page: " + page + " zone_indx: " + zone_indx)
    httpHEADER = {
        url: "https://api.cloudflare.com/client/v4/zones/" + zones[zone_indx] + "/firewall/access_rules/rules?page=" + page + "&per_page=1000",
        method: 'GET',
        headers: headers
    }
    request(httpHEADER,
        function (error, response, body) {
            if (error || response.statusCode !== 200) {
                console.error(error)
                callback(null)
            }else{
                var body = JSON.parse(body)
                //console.log(zone_indx + " _ " + page)
                //console.log(body.result_info)
                for(i=0;body.result && i<body.result.length ;i++){
                    var entry = {
                        id: body.result[i].id,
                        notes: body.result[i].notes,
                        mode: body.result[i].mode
                    }
                    if(body.result[i].configuration.target==="ip" || body.result[i].configuration.target==="ip_range"){
                        entry.ip = body.result[i].configuration.value
                        returnArray.push(entry)
                    }
                    
                }
                if( (((page-1)*body.result_info.per_page)+body.result_info.count)===body.result_info.total_count ||
                    body.result_info.total_pages===page){
                    if(zones[zone_indx+1]!=null && zones[zone_indx+1]!=undefined ){
                        // END OF PAGES FOR tHE CURRENT ZONE
                        getIPs_For_ALL_Zones(headers, 1, zones, zone_indx+1, returnArray, callback)
                    }else{
                        // END of ZONES and End of Pages
                        callback(returnArray)
                    }
                }else{
                    getIPs_For_ALL_Zones(headers, page+1, zones, zone_indx, returnArray, callback)
                }

            }
        }
    )
}

function getParentIPsBACKEND(headers, page, returnArray, callback){
    httpHEADER = {
        url: "https://api.cloudflare.com/client/v4/user/firewall/access_rules/rules?page=" + page + "&per_page=1000",
        method: 'GET',
        headers: headers
    }
    request(httpHEADER,
        function (error, response, body) {
            if (error || response.statusCode !== 200) {
                console.error(error)
                callback(null)
            }else{
                var body = JSON.parse(body)

                for(i=0;i<body.result.length;i++){
                    var entry = {
                        id: body.result[i].id,
                        notes: body.result[i].notes,
                        mode: body.result[i].mode
                    }
                    if(body.result[i].configuration.target==="ip" || body.result[i].configuration.target==="ip_range"){
                        entry.ip = body.result[i].configuration.value
                        returnArray.push(entry)
                    }
                    
                }
                if( (((page-1)*body.result_info.per_page)+body.result_info.count)===body.result_info.total_count ||
                    body.result_info.total_pages===page){
                    callback(returnArray)
                }else{
                    getParentIPsBACKEND(headers, page+1, returnArray, callback)
                }
            }
        }
    )
}


module.exports = CloudFlareOFA;
