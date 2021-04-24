#!/bin/bash
###########################################
#        OneFirewall Alliance LTD         #
###########################################

cd /opt/onefirewall/WCF-Agent-latest
INSTALLED_DIR=$(pwd)
CONFIG_JSON=config.json
LOCKFILE=lock.txt
EXEC_FILE=onefirewall-agent

#cd $INSTALLED_DIR;

H=$(date +%H) # Hour
M=$(date +%M) # Minute
d=$(date +%d) # Day

# Reset logs
if (( (1 == 10#$d || 10#$d == 5 || 10#$d == 7 || 10#$d == 10 || 10#$d == 15 || 10#$d == 20 || 10#$d == 25) && (1 == 10#$H) && (0 == 10#$M) )); then 
    rm -rf stderr.log stdout.log;
fi

if [ ! -f $LOCKFILE ]; then
    touch $LOCKFILE
    echo "$LOCKFILE created" >> stdout.log;

    echo ".........::::::::::::::: START OneFirewall IDS :::::::::::::::........." >> stdout.log;
    node app ids $INSTALLED_DIR/$CONFIG_JSON >>stderr.log 2>&1 >> stdout.log;

    echo ".........::::::::::::::: START OneFirewall IPS :::::::::::::::........." >> stdout.log;
    node app ips $INSTALLED_DIR/$CONFIG_JSON >>stderr.log 2>&1 >> stdout.log;

    rm -rf $LOCKFILE
    echo "$LOCKFILE removed" >> stdout.log;
else
    date >>stderr.log 2>&1 >> stdout.log;
    echo "Locked " >>stderr.log 2>&1 >> stdout.log;
fi

