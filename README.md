# World Crime Feeds (WCF) - Agent
### By OneFirewall Alliance


![OneFirewall Logo](images/agent-onefirewall.png "OneFirewall Agent")

## Obtain OneFirewall Certificate
1. Login at https://app.onefirewall.com
2. Generate a config.json file which hold a certificate for accessing the world crime feeds

*The use of the WCF Database can be obtained via a certificate which is provided for Threat Intelligence Feeds older than 7 days (community edition), for commercial use please see the [subscriptions plans](https://onefirewall.com/get-started/index.html?tag=github)*


## Pre Install
    1. sudo apt-get install zip
    2. curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    3. sudo apt-get install -y nodejs

## Install
    1. wget -O - https://raw.githubusercontent.com/onefirewall/WCF-Agent/master/install.sh | bash

## Run
    1. node app reset $(pwd)/config.json    # To reset WCF locally
    2. node app ips $(pwd)/config.json      # To download the latest Threat Feeds
    3. node app ids $(pwd)/config.json      # To push security events from local IDSs
    4. node app db $(pwd)/config.json       # To view the Level DB locally

[onefirewall.com](https://onefirewall.com?tag=github-wcf-agent)
