

#sshpass -p "$3" ssh $2@$1

#tr=$(ssh root@malta.simasware.com -t 'ls onefirewall')
#echo $tr

#if [ -f "onefirewall" ]; then  echo "installed" else echo "not-install" fi

while IFS= read -r line; do
    echo "set static-route $line/32 off"
done < batch.txt