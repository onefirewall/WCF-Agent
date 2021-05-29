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
CONNECTIONS=$2
CON_PASSWORD=$3

echo $FILE
pwd

if [ -f "$FILE" ]; then
    echo "$FILE exists"
    
    IFS=','

    read -a strarr <<< "$CONNECTIONS"
    for val in "${strarr[@]}";
    do

        connection_password=$CON_PASSWORD
        connection_end_point=$val

        echo "$connection_end_point: Enable SecureXL..."
        sshpass -p "$connection_password" ssh "$connection_end_point" "fwaccel on && fwaccel dos config set --enable-blacklists && fwaccel dos config set --enable-internal"
        if [ $? -eq 0 ]
        then
            echo -e "DONE\n"
        else
            exit 1
        fi


        echo "$connection_end_point: File transfer $FILE"
        sshpass -p "$connection_password" scp "$FILE" "$connection_end_point":~/"$FILE"
        if [ $? -eq 0 ]
        then
            echo -e "DONE\n"
        else
            exit 1
        fi

        echo "$connection_end_point: Flush and load"
        sshpass -p "$connection_password" ssh "$connection_end_point" "fwaccel dos blacklist -F && fwaccel dos blacklist -l ~/$FILE"
        if [ $? -eq 0 ]
        then
            echo -e "DONE\n"
        else
            exit 1
        fi

        #rm -rf "$FILE"
    done
    rm -rf "$FILE"
else
    echo "$FILE does NOT exists"
    exit 3
fi
