#!/bin/bash
###########################################
#        OneFirewall Alliance LTD         #
###########################################

mkdir -p ~/.onefirewall/
mkdir -p /opt/onefirewall/acl/
docker pull onefirewall/wcf-agent:latest
wget https://raw.githubusercontent.com/onefirewall/WCF-Agent/master/docker-compose.yml
echo "WCF-Agent installation completed"
