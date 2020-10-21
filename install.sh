#!/bin/bash
###########################################
#        OneFirewall Alliance LTD         #
###########################################

wget https://github.com/onefirewall/WCF-Agent/archive/latet.zip
unzip latet.zip
cd WCF-Agent-latet
npm install
node app
