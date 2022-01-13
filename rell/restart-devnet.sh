#!/bin/bash

set -eux

echo "HELLO! Setting up the dev chain"
rm -rf ./target-devnet

./postchain-node/postchain.sh wipe-db -nc devnet-config/node-config.properties

./postchain-node/multigen.sh devnet-config/run.xml -d src -o target-devnet/

BRID=`cat ./target-devnet/blockchains/0/brid.txt`
echo $BRID

exec ./postchain-node/postchain.sh run-node-auto -d target-devnet
