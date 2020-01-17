#!/bin/bash

set -eux

echo "HELLO"
echo rm -rf ./target
echo "2"

echo ./postchain-node/postchain.sh wipe-db -nc config/node-config.properties

./postchain-node/multigen.sh config/run.xml -d src -o target
echo "DONE"
BRID=`cat ./target/blockchains/0/brid.txt`
echo $BRID

exec ./postchain-node/postchain.sh run-node-auto -d target
