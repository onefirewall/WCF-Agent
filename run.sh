#!/bin/bash
###########################################
#######   OneFirewall Alliance LTD   ######
###########################################

INSTALLED_DIR=$(pwd)
CONFIG_JSON=config.json
LOCKFILE=lock.txt
EXEC_FILE=onefirewall-agent

cd $INSTALLED_DIR;


function check_for_update {
    exec_target_name=$(cat $CONFIG_JSON | jq -r '.exec_target_name')
    exec_target_url=$(cat $CONFIG_JSON | jq -r '.exec_target_url')
    exec_target_url_sha=$(cat $CONFIG_JSON | jq -r '.exec_target_url_sha')

    if [ ! -f $exec_target_name ]; then
        echo "File $exec_target_name NOT found" >> stdout.log;
        force_update_software
    else
        local_sha256=$(openssl sha256 $exec_target_name)
        IFS='= ' read -r -a array_sha <<< "$local_sha256"
        clean_local_sha256="${array_sha[1]}"

        remote_sha256=$(wget -qO- $exec_target_url_sha)

        if [ "$clean_local_sha256" == "$remote_sha256" ]; then
            echo "INFO: Software is updated" >> stdout.log;
        else
            echo "INFO: Software is NOT updated" >> stdout.log;
            force_update_software
        fi
    fi
}


if [ ! -f $LOCKFILE ]; then
    touch $LOCKFILE
    echo "$LOCKFILE created" >> stdout.log;

    H=$(date +%H) # hour
    M=$(date +%M) # Minute
    d=$(date +%d) # Day

    git pull

    # Reset logs on 1:00am every 1 and 15 of the months
    if (( (1 == 10#$d || 10#$d == 5 || 10#$d == 7 || 10#$d == 10 || 10#$d == 15 || 10#$d == 20 || 10#$d == 25) && (1 == 10#$H) && (0 == 10#$M) )); then 
        rm -rf stderr.log stdout.log;
    fi


    echo ".........::::::::::::::: START IDS :::::::::::::::........." >> stdout.log;
    node app ids $INSTALLED_DIR/$CONFIG_JSON >>stderr.log 2>&1 >> stdout.log;

    echo ".........::::::::::::::: START IPS :::::::::::::::........." >> stdout.log;
    node app ips $INSTALLED_DIR/$CONFIG_JSON >>stderr.log 2>&1 >> stdout.log;

    rm -rf $LOCKFILE
    echo "$LOCKFILE removed" >> stdout.log;
else
    echo "Locked " >>stderr.log 2>&1 >> stdout.log;
fi

