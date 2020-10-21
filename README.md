# World Crime Feeds (WCF) - Agent
## By OneFirewall Alliance


![OneFirewall Logo](images/agent.png "OneFirewall Agent")

## Install
    0. sudo apt-get install zip
    1. curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
    2. sudo apt-get install -y nodejs
    3. git clone https://github.com/onefirewall/WCF-Agent.git
    4. cd WCF-Agent
    5. npm install


## Run
    1. node app reset $(pwd)/config.json 
    2. node app ips $(pwd)/config.json 
    3. node app ids $(pwd)/config.json 
    4. node app db $(pwd)/config.json 

[onefirewall.com](https://onefirewall.com?tag=github-wcf-agent)