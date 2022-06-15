#!/bin/bash
/usr/local/teleport/start.sh
sleep 15s
tail -f /var/log/teleport/tpweb.log
sleep 3652d