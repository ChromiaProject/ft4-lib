#!/bin/bash

LOG_LEVEL=${LOG_LEVEL:-"DEBUG"}

NUM_BLOCKCHAINS=3
POSTGRES_PORT=5432
NODE_PORT=9870
API_PORT=7740

CHROMIA_NODE_VERSION='3.16.0'
DIRECTORY_CHAIN_VERSION='1.28.0'

BASE_CONFIG_DIR="rell/config/jest-test/multichain"
DEPENDENCIES_PATH="rell/dep"

PMC_CONFIG="$BASE_CONFIG_DIR/.pmc/config"
PMC_CONFIG_TEMPLATE="$BASE_CONFIG_DIR/pmc-config.template"

# DOCKER=${DOCKER:-docker}
DOCKER=docker
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

fatal_error() {
    err "$1"
    exit 1
}

prepare_dapp_folder() {
    chain_num="$1"

    # Generate the YML filename and module name
    yml_filename="$DEPENDENCIES_PATH/multichain-test-$chain_num.yml"
    module_name="app_module$chain_num"

    # Create the RELL filename
    rell_filepath="$DEPENDENCIES_PATH/multichain/$module_name.rell"
    mkdir -p $(dirname $rell_filepath)

    # Write the YML content to the file
    sed "s/{module_name}/${module_name}/;s/{chain_number}/${chain_num}/" \
        configs/multichain-jesttest.yml.template > "${yml_filename}_"
    
    # Insert module args
    # sed or awk might be more efficient, but this is more readable
    line=$(grep -n '{module_args}' "${yml_filename}_" | cut -d ":" -f 1)
    { 
        head -n $(($line-1)) "${yml_filename}_";
        cat "configs/multichain-module-args/module-args$chain_num.yml.template";
        tail -n +$(($line+1)) "${yml_filename}_";
    } > "${yml_filename}"

    rm "${yml_filename}_"

    # Create the corresponding RELL file with unique content
    cp configs/multichain-module.rell.template ${rell_filepath}
    echo "" >> $rell_filepath
    echo "/* This is a dummy app module for multichain$chain_num */" >> $rell_filepath
    
    # remove pieces of rell not to be included here
    for other_chain_num in $(bash scripts/chain-numbers.sh $NUM_BLOCKCHAINS)
    do
        if [ "$chain_num" != "$other_chain_num" ]; then
            sed -i.bak "s|^.*//${other_chain_num}\s*$||" $rell_filepath
        fi
    done

    debug "Generated $yml_filename and $rell_filepath"

    # Build the Multichain dApp Chain for each blockchain
    chr install -s $yml_filename > /dev/null
}

include_brids() {
    chain_num="$1"

    yml_filename="$DEPENDENCIES_PATH/multichain-test-$chain_num.yml"

    for loop_chain_num in $(bash scripts/chain-numbers.sh $NUM_BLOCKCHAINS)
    do
        grep -l "{chain${loop_chain_num}_rid}" $yml_filename > /dev/null
        contains_rid=$?

        if [ "$contains_rid" -eq 0 ]; then
            if [ "$loop_chain_num" -lt "$chain_num" ]; then
                # if it needs the brid of an already-launched chain, use it
                chain_rid=$(eval "echo \${MULTICHAIN${loop_chain_num}_BRID}")
                sed -i.bak "s/{chain${loop_chain_num}_rid}/${chain_rid}/" $yml_filename
            else
                # if the chain has not yet been lauched, throw an error
                fatal_error "Chain ${chain_num} requires the brid of chain ${loop_chain_num}, which has not yet been launched. Please ensure that chains only depend on brids of chains with a lower number"
            fi
        fi
    done

    chr build -s $yml_filename > /dev/null
}

run_main_logic() {
    debug "Checking for required commands..."

    mkdir -p $DEPENDENCIES_PATH

    if ! command -v chr &> /dev/null; then
        err "chr command must be installed."

        # Check if the system is macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "You are running macOS. If you haven't installed chr, please do so using:"
            echo "% brew tap chromia/core https://gitlab.com/chromaway/core-tools/homebrew-chromia.git"
            echo "% brew install chromia/core/chr"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "You are running Linux. If you haven't installed chr, please do so using:"
            echo '% wget -q -O - https://apt.chromia.com/chromia.gpg > /usr/share/keyrings/chromia.gpg'
            echo '% echo "deb [arch=amd64 signed-by=/usr/share/keyrings/chromia.gpg] https://apt.chromia.com stable main" >/etc/apt/sources.list.d/chromia.list'
            echo '% apt update'
            echo '% apt install -y chr'
        fi

        exit 1
    fi

    if ! command -v pmc &> /dev/null; then
        err "pmc command must be installed."

        # Check if the system is macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "You are running macOS. If you haven't installed pmc, please do so using:"
            echo "% brew tap chromia/core https://gitlab.com/chromaway/core-tools/homebrew-chromia.git"
            echo "% brew install chromia/core/pmc"
        fi

        # TODO: Add some more instructions for Linux (PMC is not available in apt yet).

        exit 1
    fi

    docker network create -d bridge test_network

    if $postgres; then
      log "Running Postgres container..."
      $DOCKER run \
          --name $DOCKER_POSTGRES_NAME \
          --network test_network \
          -e POSTGRES_PASSWORD=postchain \
          -e POSTGRES_USER=postchain \
          -p $POSTGRES_PORT:5432 \
          --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs \
          -d postgres:14.9-alpine3.18 > /dev/null
    fi

    docker ps
    docker inspect $DOCKER_POSTGRES_NAME
    

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

    log "Installing Directory Chain dependencies..."
    chr install --settings $DEPENDENCIES_PATH/directory-chain/chromia.yml > /dev/null

    log "Building Directory Chain..."
    chr build --settings $DEPENDENCIES_PATH/directory-chain/chromia.yml

    debug "Copying FT library dependency to source folder..."

    rm -rf "$DEPENDENCIES_PATH/multichain"
    mkdir -p "$DEPENDENCIES_PATH/multichain/"

    cp -R "rell/src/lib" "$DEPENDENCIES_PATH/multichain/"
    cp -R "rell/src/tests" "$DEPENDENCIES_PATH/multichain/"

    log "Preparing Multichain dApp Chains..."
    for chain_num in $(bash scripts/chain-numbers.sh $NUM_BLOCKCHAINS)
    do
        prepare_dapp_folder "$chain_num"
    done

    log "Running node container..."
    $DOCKER -H $DOCKER_HOST network create -d bridge localnet
    $DOCKER run --privileged \
        --name $DOCKER_NODE_NAME \
        --network test_network \
        --restart unless-stopped \
        -v "$(pwd)/$BASE_CONFIG_DIR:/config" \
        -v "$(pwd)/$DEPENDENCIES_PATH/directory-chain/build:/build" \
        -e JAVA_TOOL_OPTIONS="-Xmx16g" \
        -e POSTCHAIN_DEBUG=true \
        -e POSTCHAIN_CONFIG=/config/config.0.properties \
        -e POSTCHAIN_BLOCKCHAIN_CONFIG=/build/manager.xml \
        -p $NODE_PORT:9870/tcp \
        -p 127.0.0.1:$API_PORT:7740/tcp \
        registry.gitlab.com/chromaway/postchain-chromia/chromaway/chromia-server:${CHROMIA_NODE_VERSION} \
        run-node > ./multichain-postchain.log &

    debug "Fetching manager chain BRID..."
    BRID=""
    retry_count=0

    # Loop until BRID receives a non-empty value or until 10 tries
    while [ -z "$BRID" ] && [ $retry_count -lt 500 ]; do
      # Attempt to fetch the value
      BRID=$(curl -s http://172.19.0.3:7740/brid/iid_0)
      debug $BRID
      if [ $retry_count -gt 300 ]; then
        docker ps  
        docker inspect $DOCKER_NODE_NAME
      fi
      # Increment retry counter
      ((retry_count++))
      
      # Wait for the correct BRID
      if [ ${#BRID} -ne 64 ]; then
        BRID=""
        sleep 1
      fi
    done

    log "Got manager chain BRID: $BRID"
    export MULTICHAIN_D1_BRID=$BRID

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

    log "Building and adding blockchains to the container..."
    for chain_num in $(bash scripts/chain-numbers.sh $NUM_BLOCKCHAINS)
    do
        include_brids $chain_num

        MULTICHAIN_DAPP_BRID=$(
            pmc blockchain add \
                --quiet \
                --name multichain$chain_num \
                --container ft4_multichain_test \
                --blockchain-config rell/out/ft4_multichain_test_$chain_num.xml \
                -cfg $PMC_CONFIG
        )

        export_var="MULTICHAIN${chain_num}_BRID"
        export $export_var="$MULTICHAIN_DAPP_BRID"

        debug "Added multichain$chain_num with BRID: $MULTICHAIN_DAPP_BRID"
    done
}

forceexit() {
    log "Forcing exit. Please remember to clean up manually."
    exit 2
}

# Clean exit function
exitfn() {
    trap "forceexit" 2

    log 'Stopping and cleaning up. Hit Ctrl+C to force quit.'
    $DOCKER stop $DOCKER_NODE_NAME > /dev/null
    $DOCKER rm $DOCKER_NODE_NAME > /dev/null

    if $postgres; then
      $DOCKER stop $DOCKER_POSTGRES_NAME > /dev/null
      $DOCKER rm $DOCKER_POSTGRES_NAME > /dev/null
    fi

    # If we are in interactive mode, return the exit code
    if echo "$-" | grep -q "i"; then
        return $return_code
    else
        exit $return_code
    fi
}

trap "exitfn" EXIT 2

run_main_logic "$@"
