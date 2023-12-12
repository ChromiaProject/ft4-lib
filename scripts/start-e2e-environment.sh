#!/bin/bash

# Path configurations
DEMO_PATH="examples/demo"
RELL_PATH="$DEMO_PATH/rell"
FRONTEND_PATH="$DEMO_PATH/client"

# Keypair configurations
KEYPAIR=".admin_keypair"
KEYPAIR_PATH="$RELL_PATH/$KEYPAIR"

# Service ports
NODE_PORT=7740
FRONTEND_PORT=9000

# Container configurations
POSTGRES_CONTAINER_NAME="ft4_demo"

# Docker configuration
DOCKER=${DOCKER:-docker}

# Exit script on any error
set -e

start_backend() {
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
    if [ ! -f "$KEYPAIR" ]; then
        echo "Generating keypair..."
        chr keygen --save $KEYPAIR
        echo "Keypair generated. Remember to update the admin_pubkey field in demo/rell.config.yml."
    else
        echo "Keypair already exists."
    fi

    # Start Node
    echo "Starting the Chromia node..."
    chr node start --wipe &
    NODE_PID=$!

    cd - > /dev/null
    echo "Chromia node started with PID: $NODE_PID"
}

start_frontend() {
    cd $FRONTEND_PATH

    npm install
    PORT=$FRONTEND_PORT npm start &

    cd - > /dev/null
}

wait_for_services_ready() {
    # Wait for the Chromia node to be ready
    while ! nc -z localhost $NODE_PORT; do
        echo "Waiting for the Chromia node to be ready..."
        sleep 1
    done
    echo "Chromia node is up and running."

    # Wait for the React frontend to be ready
    while ! nc -z localhost $FRONTEND_PORT; do
        echo "Waiting for the React frontend to be ready on port $FRONTEND_PORT..."
        sleep 1
    done
    echo "React frontend is up and running on port $FRONTEND_PORT."
}

setup_blockchain_resources() {
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

    # TODO:
    # - Use the generated EVM address in Metamask with Cypress
    # - Register account and the asset and mint some to the account
    # Jira: https://chromaway.atlassian.net/browse/FT4-202

    # echo "Registering account with Ethereum address..."
    # REGISTER_ACCOUNT_RESULT=$(chr tx ft4.admin.register_account \
    #     "[0, [['A','T'], x'${ETH_ADDRESS:2}'], null]" \
    #     --cid 0 --await --secret $KEYPAIR_PATH)
    # echo "Account registration result: $REGISTER_ACCOUNT_RESULT"

    # echo "Registering test asset..."
    # REGISTER_ASSET_RESULT=$(chr tx ft4.admin.register_asset \
    #     TestAsset TST 6 http://url-to-asset-icon \
    #     --cid 0 --await --secret $KEYPAIR_PATH)
    # echo "Asset Registration Result: $REGISTER_ASSET_RESULT"

    # echo "Minting asset to account..."
    # MINT_ASSET_RESULT=$(chr tx ft4.admin.mint \
    #     "<account_id>" \
    #     "<asset_id>" \
    #     "<amount>" --cid 0 --await --secret $KEYPAIR)
    # echo "Mint Asset Result: $MINT_ASSET_RESULT"
}

forceexit() {
    echo "Forcing exit. Please remember to clean up manually."
    exit 2
}

cleanup() {
    echo 'Stopping and cleaning up Chromia node, Postgres container, and frontend. Please wait...'

    # Stop Chromia node
    if [ ! -z "$NODE_PID" ]; then
        echo "Stopping Chromia node with PID $NODE_PID..."

        kill -TERM $NODE_PID 2>/dev/null \
            || echo "Failed to stop Chromia node with PID $NODE_PID."

        wait $NODE_PID 2>/dev/null || true
    fi

    # Stop Postgres container
    $DOCKER stop $POSTGRES_CONTAINER_NAME > /dev/null 2>&1 \
        || echo "Failed to stop Postgres container $POSTGRES_CONTAINER_NAME."
    $DOCKER rm $POSTGRES_CONTAINER_NAME > /dev/null 2>&1 \
        || true

    # Find and stop the Frontend processes by targeting its port with a graceful shutdown
    FRONTEND_PIDS=$(lsof -t -i:$FRONTEND_PORT)
    if [ ! -z "$FRONTEND_PIDS" ]; then
        echo "Stopping Frontend processes with PIDs: $FRONTEND_PIDS..."

        kill -TERM $FRONTEND_PIDS 2>/dev/null \
            || echo "Failed to stop Frontend processes with PIDs: $FRONTEND_PIDS."

        for PID in $FRONTEND_PIDS; do
            wait $PID 2>/dev/null || true
        done
    fi

    echo 'Cleanup complete.'
}

trap cleanup EXIT INT TERM

start_backend
start_frontend

wait_for_services_ready
setup_blockchain_resources

echo "Backend and frontend services are ready. Running Cypress tests next..."

# Determine script behavior based on passed argument

case "$1" in
    --run-tests-headless)
        # Run Cypress tests in headless mode
        npx cypress run
        ;;
    --run-tests-interactive)
        # Run Cypress tests in interactive mode
        npx cypress open
        ;;
    --wait-for-node)
        # Just wait for the Chromia node process to finish
        wait $NODE_PID
        ;;
    *)
        echo "Invalid argument or no argument provided. Exiting."
        exit 1
        ;;
esac
