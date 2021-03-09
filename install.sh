#!/bin/bash
###########################################
#        OneFirewall Alliance LTD         #
###########################################
echo "V1"

# pre-install
rm -rf WCF-Agent-latest/
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs zip

wget https://github.com/onefirewall/WCF-Agent/archive/latest.zip
unzip latest.zip
rm -rf latest.zip
cd WCF-Agent-latest

# Remove not neccessary files
npm install
node app test
rm -rf .github/
rm -rf images/
rm -rf test/
rm -rf .gitignore
rm -rf README.md
rm -rf install.sh
cd ..

# remove previous installation
sudo rm -rf /opt/onefirewall/WCF-Agent-latest

pwd
ls
# copy folder
sudo mkdir -p /opt/onefirewall/
sudo cp -r WCF-Agent-latest /opt/onefirewall/

#(crontab -l ; echo "* * * * * cd /opt/onefirewall/WCF-Agent-latest && bash run.sh")| crontab -
