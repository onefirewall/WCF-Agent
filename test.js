const exec = require('child_process').exec

console.log(1)


a = "bash artifacts/checkpoint/install-securexl.sh blacklist_onefirewall.txt ofa@192.168.1.40,ofa@192.168.1.40 admin1"
exec(a, (error, stdout, stderr) => {
    if (error !== null) {   
        console.log(error)
    }
});