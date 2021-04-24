### To start the feature:
```
./ip_block_activate.sh -a on -g gw_list.txt -f feeds_list.txt [-s /full_path_to/ip_block.sh]
```

### To stop the feature:
```
./ip_block_activate.sh -a off -g gw_list.txt
```

### To bypass IP addresses (add an exception list):
```
./ip_block_activate.sh -a allow -g gw_list.txt -b bypass_file.txt
```

### To remove the IP bypass list:
```
./ip_block_activate.sh -a delete_bypass -g gw_list.txt
```

### To check if feature is active on the specified Security Gateways:
```
./ip_block_activate.sh -a stat -g gw_list.txt
```

### To see the relevant logs:
```
cat $FWDIR/log/ip_block_activate.log
```
