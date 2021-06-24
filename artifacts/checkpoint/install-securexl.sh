#!/bin/bash
#############################################
#                                           #
#   Author: OneFirewall Alliance LTD 2021   #
#                                           #
#############################################

# Commands
# fwaccel dos blacklist -N "ofa"
# fwaccel on
# fwaccel dos config set --enable-blacklists
# fwaccel dos config set --enable-internal
# fwaccel dos blacklist -F
# fwaccel dos blacklist -l /file/path
# fwaccel dos blacklist -s


FILE=$1
CONNECTION=$2
CON_PASSWORD=$3
VSIDS=$4

echo $FILE
pwd

if [ -f "$FILE" ]; then
    echo "$FILE exists"
    
    IFS=','

    read -a strarr <<< "$VSIDS"
    for val in "${strarr[@]}";
    do

        connection_password=$CON_PASSWORD
        connection_end_point=$CONNECTION
        vsid=$val

        echo "$connection_end_point: Enable SecureXL..."
        echo "ok $vsid"
        sshpass -p "$connection_password" ssh -o ConnectTimeout=3 "$connection_end_point" "vsenv $vsid && fwaccel on && fwaccel dos config set --enable-blacklists && fwaccel dos config set --enable-internal"
        if [ $? -eq 0 ]
        then
            echo -e "Enable SecureXL - DONE\n"
        else
            exit 10
        fi


        echo "$connection_end_point: File transfer $FILE"
        sshpass -p "$connection_password" scp "$FILE" "$connection_end_point":~/"$FILE"
        if [ $? -eq 0 ]
        then
            echo -e "Transfer file - DONE\n"
        else
            exit 20
        fi

        echo "$connection_end_point: Flush and load"
        sshpass -p "$connection_password" ssh -o ConnectTimeout=3 "$connection_end_point" "vsenv $vsid && fwaccel dos blacklist -F && fwaccel dos blacklist -l ~/$FILE"
        if [ $? -eq 0 ]
        then
            echo -e "Flush and load - DONE\n"
        else
            exit 30
        fi

        #rm -rf "$FILE"
    done
    rm -rf "$FILE"
else
    echo "$FILE does NOT exists"
    exit 40
fi
