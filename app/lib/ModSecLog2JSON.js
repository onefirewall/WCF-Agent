SEPARATOR = /^--([0-9a-f]+)-([A-Z])--$/;

class RequestHeader {
	constructor() {
		this.headers = {};
		this.method = undefined;
		this.path = undefined;
		this.version = undefined;
	}
	
	//override append-concat
	attach(line) {
		if (!line.trim()) {
			return;
		}
			if (this.method !== undefined) {
			var tmpSplit = line.split(/:(.+)/); //split ":" in an array of 2, leaving the second part unscathed
			this.headers[tmpSplit[0]] = tmpSplit[1];
		}
			else{
			var tmpSplitted = line.split(" ");
			this.method = tmpSplitted[0];
			this.path = tmpSplitted[1];
			this.version = tmpSplitted[2];
		}
	}
}

class RequestBody {
	constructor() {
		this.data = undefined;
	}
	
	//override append-concat
	attach(line) {
		if (!line.trim()) {
			return;
		}
		this.data = line;
	}
}

class ResponseHeader {
	constructor() {
		this.headers = {};
		this.status = undefined;
		this.version = undefined;
		this.reason = undefined;
	}
	
	//override append-concat
	attach(line) {
		if (!line.trim()) {
			return;
		}
		if (this.status !== undefined) {
			var tmpSplit = line.split(/:(.+)/); //split ":" in an array of 2, leaving the second part unscathed
			this.headers[tmpSplit[0]] = tmpSplit[1];
		} else {
			var tmpSplitted = line.split(" ");
			this.version = tmpSplitted[0];
			this.status = tmpSplitted[1];
			this.reason = tmpSplitted[2];
		}
	}
}

class Message {
	constructor(line) {
		this.data = {};
		this.parse(line);
	}

	parse(line) {
		var arrayMatch = line.match(/(.+?) (\[.+\])/); //separate message (index 1) from other fields(index 2)
		var message;
		var data;
		if(arrayMatch) {
			data = arrayMatch[arrayMatch.length-1];
			message = arrayMatch[arrayMatch.length-2];
			this.data = this.parse_data(data);
		} else {
			message = line;
		}
		if(this.data['msg'] === undefined) {
			this.data['msg'] = "";
		}
		this.data['message'] = message.trim();
	}

	parse_data(line) {
		var data = {};
		//npm install StringScanner
		var StringScanner = require("StringScanner");
		var ss = new StringScanner(line);
		ss.scan(/\s*/);

		while(!ss.eos()) {
			ss.scan(/\[/);
			var key = ss.scan(/.+? /).trim();
			var value = "";
			ss.scan(/"/);

			do {
				if(ss.scan(/\\./)) {
					value += ss.match();
				} else if (ss.scan(/[^\\"]+/)) {
					value += ss.match();
				} else {
					value += "";
				}
			}
			while(!((ss.scan(/"/)) || (ss.eos())));

			ss.scan(/\]\s*/);
			data[key] = value;
		}
		return data;
	}
}

class AuditLogTrailer {
	constructor() {
		this.metadata = {'Messages':[]};
	}

	attach(line) {
		if (!line.trim()) {
			return;
		}
		var matchMsg = (line.match(/^Message: (.+)/));
		if (matchMsg) {
			this.metadata['Messages'].push(new Message(matchMsg[matchMsg.length-1]));
		} else {
			var tmpSplit = line.split(/:(.+)/); //split ":" in an array of 2, leaving the second part unscathed
			this.metadata[tmpSplit[0]] = tmpSplit[1];
		}
	}
}

var ModSecLog2JSON = function (){
	var fs = require('fs')
	var readline = require('readline')
	var outstream = new (require('stream'))()

	this.async = function(filename, callback){
			console.log("INFO: read modsec logs " + filename)
			var instream = fs.createReadStream(filename)
			var rl = readline.createInterface(instream, outstream)

			var jsonArray = []
			var transaction = undefined
			var section = undefined

			rl.on('line', function (line) {
				line = line.trim();
				var fsWrite = require('fs');
				var lineRx = line.match(SEPARATOR);
				if(lineRx) {
					var section_number = lineRx[1];
					var section_id = lineRx[2];
					
					//console.log(lineRx)
					//console.log(transaction)
					
					try{
						switch(section_id) {
							case 'A':
								transaction =  {}; //hashmap
								section = undefined;
								transaction['id1'] = section_number;
								break;
							case 'B':
								section = new RequestHeader();
								transaction['RequestHeader'] = section;
								break;
							case 'C':
								section = new RequestBody();
								transaction['RequestBody'] = section;
								break;
							case 'E':
								section = "";
								transaction['IntendedResponseBody'] = section;
								break;
							case 'F':
								section = new ResponseHeader();
								transaction['ResponseHeader'] = section;
								break;
							case 'H':
								section = new AuditLogTrailer();
								transaction['AuditLogTrailer'] = section;
								break;
							case 'Z':
							//    fsWrite.open('/tmp/convertLog.txt', 'a', (err, fd) => {
							//       if (err) throw err;
								//      fsWrite.appendFile(fd, JSON.stringify(transaction)+"\r\n", 'utf8', (err) => {
								//         fsWrite.close(fd, (err) => {
								//            if (err) throw err;
								//        });
								//       if (err) throw err;
								//     });
							//     });
								//console.log(JSON.stringify(transaction))
								jsonArray.push(transaction)
								section = undefined;
								transaction = undefined;
								break;
							default:
								section = "";
								transaction[section_id] = section
						}
					}catch(e){
						//section = "";
						//transaction[section_id] = section
					}

				} else {
					if(section !== undefined) {
						if((section instanceof RequestHeader) || section instanceof RequestBody || (section instanceof ResponseHeader) || (section instanceof AuditLogTrailer)) {
							section.attach(line);
						} else {
							section = section + line;
						}
					} else {
						//A and Z section (first and last for each block), where line is defined only in A section
						section = line;
						if(line) {
							var id_transaction = (line.split(/](.+)/)[1]).trim().split(" ")[0]; // split "]" in an array of 2, take the second part and split by " "; the id is the first element
							var src_ip = (line.split(/](.+)/)[1]).trim().split(" ")[1];
							var src_port = (line.split(/](.+)/)[1]).trim().split(" ")[2];
							var ts_unix = Date.parse((line.split(/](.+)/)[0]).substr(1).split("/").join(" ").replace(":"," "));
							var ts_date = new Date(ts_unix).toISOString();
							
							transaction['id2'] = id_transaction;
							transaction['src_ip'] = src_ip;
							transaction['src_port'] = src_port;
							transaction['ts_unix'] = ts_unix;
							transaction['ts_date'] = ts_date;
						}
					}
				}
			});
				
			rl.on('close', function (line) {
					callback(jsonArray)
			});

	}
	

 }
 
 module.exports = ModSecLog2JSON
 