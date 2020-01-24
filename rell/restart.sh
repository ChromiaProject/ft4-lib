#!/bin/bash

set -eux

echo "HELLO! Setting up the dev chain"
rm -rf ./target

./postchain-node/postchain.sh wipe-db -nc config/node-config.properties

./postchain-node/multigen.sh config/run.xml -d src -o target/

BRID=`cat ./target/blockchains/0/brid.txt`
echo $BRID

exec ./postchain-node/postchain.sh run-node-auto -d target
