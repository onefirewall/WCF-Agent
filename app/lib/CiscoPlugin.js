
var CiscoPlugin = function(host, user, psw) {

this.host = host;
this.user = user;
this.psw = psw;


// *********************  connection parameters  ************

var readyTimeout = 45000;   // 45 seconds.
var idleTimeout = 1200000;   // 20 minutes.

var verboseStatus = false;
var debugStatus = false;

var customStandardPrompt = "#)(";   // default prompt

var arrayOfKex = [
                'diffie-hellman-group1-sha1',
                'ecdh-sha2-nistp256',
                'ecdh-sha2-nistp384',
                'ecdh-sha2-nistp521',
                'diffie-hellman-group-exchange-sha256',
                'diffie-hellman-group14-sha1'];

var arrayOfCipher = [
                'aes128-ctr',
                'aes192-ctr',
                'aes256-ctr',
                'aes128-gcm',
                'aes128-gcm@openssh.com',
                'aes256-gcm',
                'aes256-gcm@openssh.com',
                'aes256-cbc' ];

/*
***************************
*****All-in internal method
***************************
*/
var connectViaSSH = function(host, user, psw, opsType, ipList, ifc, port, callback) {
    var accessListName = "OneFirewall";
    var mountPoint = "flash";
    var commandFile = "commands.cfg";
    var fsLib = require('fs');
    //Not available on ASA routers, there commands must be executed via ssh directly
    var fileExecution = [ "tclsh " + mountPoint + ":" + commandFile, "delete /force "  + mountPoint + ":" + commandFile ];
    var cmdList;

    switch(opsType) {
        
      case 1:
        cmdList = "conf t\ninterface " + ifc + "\nno ip access-group " + accessListName + " in\nend\nconf t\nip access-list standard " + accessListName + "\nno permit any\ndeny IP_ENTRY\npermit any\nend\nconf t\ninterface " + ifc + "\nip access-group " + accessListName + " in\nend";

        console.log("ADD operation, parsing ip list");
        var i=0;
        while(i<ipList.length) {
                cmdList = cmdList.replace("IP_ENTRY", ipList[i]+"\ndeny IP_ENTRY");
                i++;
        }
        cmdList = cmdList.replace("deny IP_ENTRY\n", "");

        break;

      case 2:
        cmdList = "conf t\nip access-list standard "+ accessListName + "\nno deny IP_ENTRY\nend";

        console.log("DELETE operation, parsing ip list");
        var i=0;
        while (i<ipList.length) {
                cmdList = cmdList.replace("IP_ENTRY", ipList[i]+"\nno deny IP_ENTRY");
                i++;
        }
        cmdList = cmdList.replace("no deny IP_ENTRY\n", "");

        break;
 
      case 3:

        cmdList = "conf t\ninterface " + ifc +"\nno ip access-group "+ accessListName + " in\nend\nconf t\nno ip access-list standard "+ accessListName + "\nend";

        console.log("CLEAR operation");
  
        break;

      default:
        console.log("Unsupported type of operation");
        return;

    }

    //Writing commands to file to be sent via scp
    fsLib.writeFile('./'+commandFile, cmdList, function (err) {
      if (err) throw err;
      console.log(commandFile + ' saved!');
    });

    var hostConfig = {
        server: {
            host: host,
            port: port,
            userName: user,
            password: psw,
            hashMethod: "md5", 
            readyTimeout: readyTimeout,
            tryKeyboard: true,
            algorithms: {
                kex: arrayOfKex,
                cipher: arrayOfCipher
                }
            },

            standardPrompt: customStandardPrompt,
            commands: fileExecution,
            verbose: verboseStatus,
            debug: debugStatus,
            idleTimeOut: idleTimeout,
            ["keyboard-interactive"]: function(name, instructions, instructionsLang, prompts, finish){
                console.log('Connection :: keyboard-interactive');
                finish([password]);
            },
            onCommandTimeout: function( command, response, stream, connection ) {
                console.log("onCommandTimeout with - \n command: '" + command + "' \n response: '" + response + "'");
                stream.end();
                connection.end();
            },

            onEnd: function( sessionText, sshObj ) {
                sshObj.msg.send("reached 'onEnd'");
                callback(0,sessionText);
            }

        };

   //Commands execution
  
  var exec = require('child_process').exec;
  var SSH2Shell = require ('ssh2shell');
  var SSH = new SSH2Shell(hostConfig);
  
  var scpScript = "./app/lib/expectScp.sh " + port + " " + commandFile + " " + user + " " + host + " " + mountPoint + " " + psw;
  exec(scpScript, function (err, stdout, stderr) {
    if (err)  {
      console.log("Could not secure copy file: "+err);
      throw new Error(err);
    }
    SSH.connect();
  });

}


/*
********************
*****Exported method
********************
*/
this.sshToNode = function(ifc, port, mode, ipList, callback){

    console.log("CiscoPlugin module");
    if(ipList === undefined || ( !ipList.length && (opsType == 1 || opsType == 2))) {
      console.log("IP list cannot be empty when ADD or DELETE operations are called")
      return;
    }

    if(port === undefined || port === null) {
        port=22;
    }
    if(ifc === undefined || ifc === null) {
        ifc='vlan1';
    }

    connectViaSSH(this.host, this.user, this.psw, mode, ipList, ifc, port,
        function(err, data){
	    if(err) { 
		callback(err);
	    }
	    else {
		callback(data);
            }
	}
    );

}


}

module.exports = CiscoPlugin;

