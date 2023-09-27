#!/bin/bash

LOG_LEVEL=${LOG_LEVEL:-"DEBUG"}

NUM_BLOCKCHAINS=3
POSTGRES_PORT=5432
NODE_PORT=9870
API_PORT=7740

NODE_VERSION='3.11.2'
DIRECTORY_CHAIN_VERSION='1.9.2'

BASE_CONFIG_DIR="rell/config/jest-test/multichain"
DEPENDENCIES_PATH="rell/dep"
PMC_CONFIG="$BASE_CONFIG_DIR/.pmc/config"
PMC_CONFIG_TEMPLATE="$BASE_CONFIG_DIR/pmc-config.template"

DOCKER=${DOCKER:-docker}
DOCKER_POSTGRES_NAME='ft4-multichain-test-postgres'
DOCKER_NODE_NAME='ft4-multichain-test-node'

log() {
    printf "\033[32m[INFO]\033[0m %s\n" "$1"  # Green
}

err() {
    printf "\033[31m[ERROR]\033[0m %s\n" "$1"  # Red
}

debug() {
    if [ "$LOG_LEVEL" == "DEBUG" ]; then
        printf "\033[34m[DEBUG]\033[0m %s\n" "$1"  # Blue
    fi
}

forceexit() {
    log "Forcing exit. Please remember to clean up manually."
    exit 2
}

# Clean exit function
exitfn() {
    trap "forceexit" 2

    log 'Stopping and cleaning up. Hit Ctrl+C to force quit.'
    $DOCKER stop $DOCKER_POSTGRES_NAME $DOCKER_NODE_NAME > /dev/null
    $DOCKER rm $DOCKER_POSTGRES_NAME $DOCKER_NODE_NAME > /dev/null

    # If we are in interactive mode, return the exit code
    if echo "$-" | grep -q "i"; then
        return $return_code
    else
        exit $return_code
    fi
}

trap "exitfn" EXIT 2

debug "Checking for required commands..."
if ! command -v pmc &> /dev/null || ! command -v chr &> /dev/null
then
    err "pmc and chr commands must be installed."

    # Check if the system is macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "You are running macOS. If you haven't installed pmc and chr, please do so using:"
        echo "% brew tap chromia/core https://gitlab.com/chromaway/core-tools/homebrew-chromia.git"
        echo "% brew install pmc"
    fi

    # TODO: Add some more instructions for Linux
    # ...

    exit 1
fi

log "Running Postgres container..."
$DOCKER run \
    --name $DOCKER_POSTGRES_NAME \
    -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 --lc-ctype=C.UTF-8 --encoding=UTF-8" \
    -e POSTGRES_PASSWORD=postchain \
    -e POSTGRES_USER=postchain \
    -p $POSTGRES_PORT:5432 \
    -d postgres > /dev/null

debug "Creating PMC config..."

# Create the directory for PMC config if it doesn't exist
PMC_CONFIG_DIR=$(dirname $PMC_CONFIG)
mkdir -p $PMC_CONFIG_DIR

# Copy the PMC config template to the destination path
cp $PMC_CONFIG_TEMPLATE $PMC_CONFIG
if [ $? -ne 0 ]; then
    err "Failed to create PMC config. Check if the template and destination directories are correct."
    exit 1
else
    log "Successfully created PMC config."
fi

log "Cloning Directory Chain dependency..."
mkdir -p $DEPENDENCIES_PATH

if [ -d "$DEPENDENCIES_PATH/directory-chain" ]; then
    log "Directory Chain already installed."
else
    git clone \
        -c advice.detachedHead=false \
        --branch $DIRECTORY_CHAIN_VERSION \
        --single-branch \
        --depth 1 \
        https://gitlab.com/chromaway/core/directory-chain.git $DEPENDENCIES_PATH/directory-chain

    if [ $? -ne 0 ]; then
        log "Failed to install Directory Chain. Check your network or repository URL."
        exit 1
    fi
fi

log "Building Directory Chain..."
chr build --settings $DEPENDENCIES_PATH/directory-chain/config.yml

debug  "Copy ft library dependency to source folder"
rm -rf "$DEPENDENCIES_PATH/multichain"
mkdir -p "$DEPENDENCIES_PATH/multichain/"
cp -R "rell/src/lib" "$DEPENDENCIES_PATH/multichain/lib/"

log "Building Multichain dApp Chains..."
for chain_num in $(seq -f "%02g" 0 $((NUM_BLOCKCHAINS-1)))
do
    # Generate the YML filename and module name
    yml_filename="$DEPENDENCIES_PATH/multichain-test-$chain_num.yml"
    module_name="app_module$chain_num"

    # Write the YML content to the file
    sed "s/{module_name}/${module_name}/;s/{chain_number}/${chain_num}/" \
        configs/multichain-jesttest.yml.template > ${yml_filename}

    # Create the corresponding RELL file with unique content
    rell_filepath="$DEPENDENCIES_PATH/multichain/$module_name.rell"

    mkdir -p $(dirname $rell_filepath)

    echo "module;" > $rell_filepath
    echo "import lib.ft4.ft4_basic_dev.*;" >> $rell_filepath
    echo "operation empty_op() {}" >> $rell_filepath
    echo "/* This is a dummy app module for multichain$chain_num */" >> $rell_filepath

    debug "Generated $yml_filename and $rell_filepath"

    # Build the Multichain dApp Chain for each blockchain
    chr build -s $yml_filename > /dev/null
done

log "Running node container..."
$DOCKER run \
    --name $DOCKER_NODE_NAME \
    --restart unless-stopped \
    --mount type=bind,source="$(pwd)/$BASE_CONFIG_DIR",target=/config,readonly \
    --mount type=bind,source="$(pwd)/$DEPENDENCIES_PATH/directory-chain/build",target=/build,readonly \
    -e JAVA_TOOL_OPTIONS="-Xmx16g" \
    -e POSTCHAIN_DEBUG=true \
    -e POSTCHAIN_CONFIG=/config/config.0.properties \
    -e POSTCHAIN_BLOCKCHAIN_CONFIG=/build/manager.xml \
    -p $NODE_PORT:9870/tcp \
    -p 127.0.0.1:$API_PORT:7740/tcp \
    registry.gitlab.com/chromaway/postchain-chromia/chromaway/chromia-server:$NODE_VERSION \
    run-node > logs/multichain-postchain.log &

debug "Fetching manager chain BRID..."
BRID=""
retry_count=0

# Loop until BRID receives a non-empty value or until 10 tries
while [ -z "$BRID" ] && [ $retry_count -lt 1000 ]; do
  # Attempt to fetch the value
  BRID=$(curl -s http://localhost:7740/brid/iid_0)
  
  # Increment retry counter
  ((retry_count++))
  
  # Wait for the correct BRID
  if [ ${#BRID} -ne 64 ]; then
    BRID=""
    sleep 1
  fi
done

log "Got manager chain BRID: $BRID"

debug "Saving manager chain BRID to PMC config"
pmc config --file $PMC_CONFIG --set brid="$BRID"

log "Initializing the network..."
pmc network initialize \
    --system-anchoring-config $DEPENDENCIES_PATH/directory-chain/build/system_anchoring.xml \
    --cluster-anchoring-config $DEPENDENCIES_PATH/directory-chain/build/cluster_anchoring.xml \
    -cfg $PMC_CONFIG

sleep 1
debug "Verifying the network"
VERIFY_OUTPUT=$(pmc network verify -cfg $PMC_CONFIG)

if [[ ! "$VERIFY_OUTPUT" =~ "OK" || "$VERIFY_OUTPUT" =~ "null" ]]; then
    err "Verification failed. Exiting."
    exit 1
fi

log "Network verified successfully."

debug "Adding container for the multichain test blockchains"
pmc container add \
    --name ft4_multichain_test \
    --cluster system \
    --pubkeys $(pmc config --get pubkey --file $PMC_CONFIG) \
    -cfg $PMC_CONFIG

log "Adding blockchains to the container..."
for chain_num in $(seq -f "%02g" 0 $((NUM_BLOCKCHAINS-1)))
do
    MULTICHAIN_DAPP_BRID=$(
        pmc blockchain add \
            --quiet \
            --name multichain$chain_num \
            --container ft4_multichain_test \
            --blockchain-config rell/out/ft4_multichain_test_$chain_num.xml \
            -cfg $PMC_CONFIG
    )

    debug "Added multichain$chain_num with BRID: $MULTICHAIN_DAPP_BRID"
done

log "Running Jest tests..."
if [[ "$1" == "-f" || "$1" == "--file" ]]; then
    FILE_OPTION="--runTestsByPath $2"
else
    FILE_OPTION=""
fi

npx jest \
    --config=jest.config.multichain.js \
    --maxWorkers=1 \
    --testPathPattern=__multichain__ \
    $FILE_OPTION
