#!/bin/bash
###########################################
#        OneFirewall Alliance LTD         #
###########################################

wget https://github.com/onefirewall/WCF-Agent/archive/latest.zip
unzip latest.zip
cd WCF-Agent-latest

# Remove not neccessary files
rm -rf .github/
rm -rf images/
rm -rf test/
rm -rf .gitignore
rm -rf README.md

npm install
node app test
