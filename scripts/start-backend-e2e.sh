#!/bin/bash

# Adjustable Docker command
DOCKER=${DOCKER:-docker}

# Define paths
DEMO_PATH="examples/demo"
RELL_PATH="$DEMO_PATH/rell"
POSTGRES_CONTAINER_NAME="ft4_demo"

# Exit script on any error
set -e

# Clean exit function
exitfn() {
    trap "forceexit" 2

    echo 'Stopping and cleaning up. Hit Ctrl+C to force quit.'
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

# Start Node
echo "Starting the Rell node..."
chr node start

echo "Backend setup and started successfully."

# Navigate back to the project root
cd - > /dev/null
