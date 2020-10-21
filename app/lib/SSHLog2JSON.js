REGULAR_EXP_IPV4 = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
TIME_STAMP_EXP = /([A-Za-z]{3}) ([0-9 ]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/gi;
var _ = require('underscore');

var SSHLog2JSON = function () {
    var fs = require('fs'),
        readline = require('readline'),
        outstream = new (require('stream'))();

    this.async = function (filename, callback) {
        var instream = fs.createReadStream(filename),
            rl = readline.createInterface(instream, outstream),
            jsonArray = [];

        rl.on('line', function (line) {
             line = line.trim();
             var fsWrite = require('fs'),
                 lineIp = line.match(REGULAR_EXP_IPV4);
             
             if (lineIp) {
                //console.log(lineIp)
                var lineTimeStamp = line.match(TIME_STAMP_EXP),
                    isIPPresent = false;
                //console.log(lineTimeStamp)
                if (lineTimeStamp && !_.isEmpty(jsonArray)) {
                    //console.log(lineTimeStamp)

                    _.map(jsonArray, function (item) {
                        if (lineIp[0] == item.ip) {  
                            if (!_.contains(item.listOfDate, lineTimeStamp[0])) {
                                try{
                                    item.listOfDate.push(lineTimeStamp[0]);
                                }catch(e){

                                }
                            }
                            isIPPresent = true;
                        }
                    });
                }

                if (!isIPPresent) {
                    jsonArray.push({
                        ip: lineIp[0],
                        listOfDate: lineTimeStamp,
                        typeInfo: lineIp.input
                    });
                }
            }
        });

        rl.on('close', function (line) {
            //console.log(JSON.stringify(jsonArray))

            callback(validateJsonArray(jsonArray));
        });
    }
};

function validateJsonArray(arrayList) {
    var validElements = [];
    _.map(arrayList, function (item) {
        if (item.listOfDate && item.listOfDate.length > 5) {
            validElements.push(item);
        }
    });
    return validElements;
};

module.exports = SSHLog2JSON;
