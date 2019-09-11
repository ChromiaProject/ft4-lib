#!/bin/bash

ps aux | grep net.postchain.AppKt | grep -v grep | awk '{print $2}' | xargs sudo kill -9 >/dev/null 2>&1 || true || true
cd /opt/ft3/postchain/bin
nohup ./run-node.sh dev > /dev/null 2> /dev/null < /dev/null &
