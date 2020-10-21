var AWS = require('aws-sdk');

/******************
** Get token used for each call, GET excluded
** If requested but not used it will retain its value next time AWS APIs are called
******************/
let getChangeToken = (waf, callback) => {
    waf.getChangeToken({}, (err, data) => {
        if (err) {
            console.log("Error getChangeToken for AWS WAF!: " +err+" with stack: "+err.stack);
            callback(false)
        } 
        else  {
            console.log("Success getChangeToken: "+data.ChangeToken);
            /* Response example
              data = {
                ChangeToken: "abcd12f2-46da-4fdb-b8d5-fbd4c466928f"
            }*/
            callback(data);
        }
        
      });
}

/******************
** Given name an IPSet is created and its ID is returned.
** Note that sets with same name can be created
******************/
let createIPSet = (waf, name, callback) => {
    getChangeToken(waf, (data) => {
        if(data) {
            let params = {
                ChangeToken: data.ChangeToken, //which is generated for each change
                Name: name //name of the creating IPSet EX: MyIP
            }

            waf.createIPSet(params, function(err, data) {
                if (err) {
                    console.log("Error in createIPSet: "+err+" and stack error: "+err.stack);
                    callback(false, err);
                } else {
                    console.log("Success in createIPSet: "+JSON.stringify(data));
                    /*Response example
                      data = {
                        ChangeToken: <generated token>, 
                        IPSet: {
                        IPSetDescriptors: [
                            {
                            Type: "IPV4", 
                            Value: "192.0.2.44/32"
                        }
                        ], 
                        IPSetId: <IPSet generated>, 
                        Name: "MyIP"
                        }
                    }*/
                    callback(data)
                }
            });
        }
    })
}

/******************
** Get the set given its ID
******************/
let getIPSet = (waf, ip, callback) => {
    let params = {
        IPSetId: ip
    }

    waf.getIPSet(params, (err, data) => {
        if (err) {
            console.log("Error in getIPSet"+err+" and stack is: "+err.stack);
            callback(false, err);
        } else {
            console.log("Success in getIPSet "+JSON.stringify(data));
            /*Response example
              data = [{
                "IPSet": { 
                    "IPSetDescriptors": [ 
                        { 
                            "Type": "string",
                            "Value": "string"
                        }
                    ],
                    "IPSetId": "string",
                    "Name": "string"
                }
            }]*/
            callback(data)
        }})    
}

/******************
** Add or remove single/multiple IP/s given set ID
******************/
let updateIPSet = (waf, ipsetId, ipArray, callback) => {
    getChangeToken(waf, (data) => {
        if(data) {
            let params = {
                ChangeToken: data.ChangeToken,
                IPSetId: ipsetId,
                Updates: ipArray 
                /***** 
                ** array of updates (might be more than one), with the following format:
                ** [
                **  {
                **   Action: "INSERT", //or DELETE
                **   IPSetDescriptor: {
                **       Type: "IPV4", //or IPV6
                **       Value: "192.0.2.44/32"
                **   }
                **  }
                ** ]
                *****/
            }

            waf.updateIPSet(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack);
                    callback(false, err);
                } else {
                    console.log("Success in updateIPSet, response: "+JSON.stringify(data));
                    /* Response example 
                    * data = { ChangeToken: <generated token> }
                    */
                    callback(data)
                }
            });
        }
   })
}

/******************
** Delete ipSet given ID
** Note that it will fail if set is not emptied first
******************/
let deleteIPSet = (waf, ipsetId, callback) => {
    getChangeToken(waf, (data) => {
        if(data) {
            let params = {
                ChangeToken: data.ChangeToken,
                IPSetId: ipsetId
            }

            waf.deleteIPSet(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack);
                    callback(false, err);
                } else {
                    console.log("Success in deleteIPSet, response: "+JSON.stringify(data));
                    /* Response example 
                    * data = { ChangeToken: <generated token> }
                    */
                    callback(data)
                }
            });
        }
   })
}

/********
** Main Object
*********/
var AWSWAF = function(userAuth) {

    //Constructor for access control config
    AWS.config = new AWS.Config();
    AWS.config.accessKeyId = userAuth.accessKeyId;
    AWS.config.secretAccessKey = userAuth.secretAccessKey;
    AWS.config.region = userAuth.region;
    this.waf = new AWS.WAF();
    this.ipSetId = userAuth.ipSetId;
 
    this.createIPSet = (name, callback) => {
        createIPSet(this.waf, name, callback)
    }

    this.getIPSet = (callback) => {
        getIPSet(this.waf, this.ipSetId, callback)
    }

    this.updateIPSet = (ipArray, callback) => {
        updateIPSet(this.waf, this.ipSetId, ipArray, callback)
    }

    this.deleteIPSet = (callback) => {
        deleteIPSet(this.waf, this.ipSetId, callback)
    }
}

module.exports = AWSWAF;
