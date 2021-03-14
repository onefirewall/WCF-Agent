# World Crime Feeds (WCF) - Agent
### By OneFirewall Alliance


![OneFirewall Logo](images/agent-onefirewall.png "OneFirewall Agent")

## Obtain OneFirewall Certificate
*The use of the WCF Database can be obtained via a certificate which is provided for Threat Intelligence Feeds older than 7 days (community edition), for commercial use please see the [subscriptions plans](https://onefirewall.com/get-started/index.html?tag=github)*
1. Install docker
2. Install docker-compose
3. Use Linux x64

## Build
```
docker build . -t onefirewall/wcf-agent:latest
```

## Deploy
```
docker push onefirewall/wcf-agent:latest
```

## Install
Generate a config.json file from https://app.onefirewall.com store it in ~/.onefirewall/config.json
```
wget -O - https://raw.githubusercontent.com/onefirewall/WCF-Agent/master/install.sh | bash
```

## Tests
```
docker run onefirewall/wcf-agent:latest node app test
```

## Run
```
docker-compose up -d
```

## Stop
```
docker kill wcf-agent_onefirewall-wcf-agent_1
```

[onefirewall.com](https://onefirewall.com?tag=github-wcf-agent)
