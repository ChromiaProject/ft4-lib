#!/bin/bash

# Adjustable Docker command
DOCKER=${DOCKER:-docker}

# Define paths
DEMO_PATH="examples/demo"
RELL_PATH="$DEMO_PATH/rell"
POSTGRES_CONTAINER_NAME="ft4_demo"

# Exit script on any error
set -e

forceexit() {
    echo "Forcing exit. Please remember to clean up manually."
    exit 2
}

# Clean exit function
exitfn() {
    trap "forceexit" 2

    echo 'Stopping and cleaning up Rell node and Postgres container. Hit Ctrl+C to force quit.'

    if [ ! -z "$NODE_PID" ]; then
        kill $NODE_PID || true
    fi

    $DOCKER stop $POSTGRES_CONTAINER_NAME > /dev/null
    $DOCKER rm $POSTGRES_CONTAINER_NAME > /dev/null

    # If we are in an interactive shell, return the exit code
    if [[ $- == *i* ]]; then
        return $?
    else
        exit $?
    fi
}

# Trap EXIT signal to run the cleanup function
trap exitfn EXIT

# Navigate to the Rell directory
cd $RELL_PATH

# Check if the Postgres container is already running
if [ "$($DOCKER ps -q -f name=$POSTGRES_CONTAINER_NAME)" ]; then
    echo "Postgres container already running."
else
    echo "Starting Postgres container..."
    $DOCKER run --name $POSTGRES_CONTAINER_NAME -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
        --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
        --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs -e POSTGRES_DB=postchain \
        -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres > /dev/null
fi

# Install Rell dependencies
echo "Installing Rell dependencies..."
chr install

# Generate Keypair
KEYPAIR=".admin_keypair"
if [ ! -f "$KEYPAIR" ]; then
    echo "Generating keypair..."
    chr keygen --save $KEYPAIR
    echo "Keypair generated. Remember to update the admin_pubkey field in demo/rell.config.yml."
else
    echo "Keypair already exists."
fi

echo "Generating Ethereum address and private key..."
ETH_ADDRESS=$(node -e "
    const ethers = require('ethers');
    const wallet = ethers.Wallet.createRandom();
    console.log(wallet.address);
")
echo "Ethereum address generated: $ETH_ADDRESS"

ETH_PRIVATE_KEY=$(node -e "
    const ethers = require('ethers');
    const wallet = ethers.Wallet.createRandom();
    console.log(wallet.privateKey);
")
echo "Ethereum private key generated."

# Start Node
echo "Starting the Chromia node..."
chr node start &
NODE_PID=$!
echo "Waiting for the node to initialize..."

# Wait for the node to be ready (adjust the condition as needed)
while ! nc -z localhost 7740; do   
  sleep 1
done
echo "Node started with PID: $NODE_PID"

# Navigate back to the project root
cd - > /dev/null

# TODO: Use the generated EVM address in Metamask with Cypress
# TODO: Register account and the asset and mint some to the account

# echo "Registering account with Ethereum address..."
# REGISTER_ACCOUNT_RESULT=$(chr tx ft4.admin.register_account \
#     "[0, [['A','T'], x'${ETH_ADDRESS//0x}'], null]" \
#     --await --secret $KEYPAIR)
# echo "Account registration result: $REGISTER_ACCOUNT_RESULT"

# echo "Registering test asset..."
# REGISTER_ASSET_RESULT=$(chr tx ft4.admin.register_asset \
#     TestAsset TST 6 http://url-to-asset-icon \
#     --await --secret $KEYPAIR)
# echo "Asset Registration Result: $REGISTER_ASSET_RESULT"

# echo "Minting asset to account..."
# MINT_ASSET_RESULT=$(chr tx ft4.admin.mint \
#     "<account_id>" \
#     "<asset_id>" \
#     "<amount>" --await --secret $KEYPAIR)
# echo "Mint Asset Result: $MINT_ASSET_RESULT"

echo "Backend setup and started successfully."

# Cleanup
wait $NODE_PID
exitfn
