#!/bin/bash

set -eux

echo "HELLO! Setting up the dev chain"
rm -rf ./target-testnet

./postchain-node/postchain.sh wipe-db -nc testnet-config/node-config.properties

./postchain-node/multigen.sh testnet-config/run.xml -d src -o target-testnet/

BRID=`cat ./target-testnet/blockchains/0/brid.txt`
echo $BRID

exec ./postchain-node/postchain.sh run-node-auto -d target-testnet
