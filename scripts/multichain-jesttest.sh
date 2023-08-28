#!/bin/bash

NUM_BLOCKCHAINS=3
PMC_CONFIG="rell/config/jest-test/multichain/.pmc/config"

forceexit() {
    echo "Forcing exit. Please remember to clean up manually."
    exit 2
}

exitfn() {
    trap "forceexit" 2
    echo 'Stopping and cleaning up. Hit Ctrl+C to force quit.'
    docker stop ft4-multichain-test-postgres ft4-multichain-test-node
    docker rm ft4-multichain-test-postgres ft4-multichain-test-node
    exit 2
}

trap "exitfn" 2

# Check if pmc and chr commands are installed
if ! command -v pmc &> /dev/null || ! command -v chr &> /dev/null
then
    echo "pmc and chr commands must be installed."

    # Check if the system is macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "You are running macOS. If you haven't installed pmc and chr, please do so using:"
        echo "% brew tap chromia/core https://gitlab.com/chromaway/core-tools/homebrew-chromia.git"
        echo "% brew install pmc"
    fi

    exit 1
fi

# Run Postgres
docker run \
    --name ft4-multichain-test-postgres \
    -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 --lc-ctype=C.UTF-8 --encoding=UTF-8" \
    -e POSTGRES_PASSWORD=postchain \
    -e POSTGRES_USER=postchain \
    -p 5432:5432 \
    -d postgres

# Clone Directory Chain dependency
mkdir -p rell/dep

if [ -d "rell/dep/directory-chain" ]; then
  echo "'directory-chain' directory already exists. Skipping the cloning operation."
else
    git clone \
        -c advice.detachedHead=false \
        --branch 1.9.2 \
        --single-branch \
        --depth 1 \
        https://gitlab.com/chromaway/core/directory-chain.git rell/dep/directory-chain
  if [ $? -ne 0 ]; then
    echo "Failed to clone the repository. Please check your network connection or repository URL."
    exit 1
  fi
fi

# Build Directory Chain
chr build --settings rell/dep/directory-chain/config.yml

# Build Multichain dApps

for (( i=0; i<$NUM_BLOCKCHAINS; i++ )); do
    chain_num=$(printf "%02d" $i)

    # Generate the YML filename and module name
    yml_filename="./rell/dep/multichain-test-$chain_num.yml"
    module_name="multichain.app_module$chain_num"

    # Write the YML content to the file
    cat <<- EOM > $yml_filename
blockchains:
    ft4_multichain_test_$chain_num:
        module: $module_name
compile:
    source: ./
    target: ../out
EOM

    # Create the corresponding RELL file with unique content
    rell_filepath="./rell/dep/multichain/app_module$chain_num.rell"

    mkdir -p $(dirname $rell_filepath)

    echo "module;" > $rell_filepath
    echo "/* This is a dummy app module for multichain$chain_num */" >> $rell_filepath

    echo "Generated $yml_filename and $rell_filepath"

    # Build the Multichain dApp Chain for each blockchain
    chr build -s $yml_filename > /dev/null
done

exitfn
# Run the node
docker run \
    --name ft4-multichain-test-node \
    --restart unless-stopped \
    --mount type=bind,source="$(pwd)/rell/config/jest-test/multichain",target=/config,readonly \
    --mount type=bind,source="$(pwd)/rell/dep/directory-chain/build",target=/build,readonly \
    -e JAVA_TOOL_OPTIONS="-Xmx16g" \
    -e POSTCHAIN_DEBUG=true \
    -e POSTCHAIN_CONFIG=/config/config.0.properties \
    -e POSTCHAIN_BLOCKCHAIN_CONFIG=/build/manager.xml \
    -p 9870:9870/tcp \
    -p 127.0.0.1:7740:7740/tcp \
    -d \
    registry.gitlab.com/chromaway/postchain-chromia/chromaway/chromia-server:3.11.2 \
    run-node

# Get the manager chain BRID
BRID=$(curl http://localhost:7740/brid/iid_0)
echo "BRID: $BRID"

# Save the BRID to the config
pmc config --file $PMC_CONFIG --set brid="$BRID"

# Initialize the network
pmc network initialize --system-anchoring-config rell/dep/directory-chain/build/system_anchoring.xml --cluster-anchoring-config rell/dep/directory-chain/build/cluster_anchoring.xml -cfg $PMC_CONFIG

# Verify the network
VERIFY_OUTPUT=$(pmc network verify -cfg $PMC_CONFIG)
echo "$VERIFY_OUTPUT"
if [[ ! "$VERIFY_OUTPUT" =~ "OK" || "$VERIFY_OUTPUT" =~ "null" ]]; then
    echo "Verification failed. Exiting."
    exit 1
fi

# Add a container for the multichain test blockchains
pmc container add --name ft4-multichain-test --cluster system --pubkeys $(pmc config --get pubkey --file $PMC_CONFIG)

# Add blockchains and save the blockchain BRIDs to a JSON file
BRIDS_JSON="{"
for i in $(seq -f "%02g" 0 $((NUM_BLOCKCHAINS-1)))
do
    MULTICHAIN_DAPP_BRID=$(pmc blockchain add --quiet --name multichain$i --container ft4-multichain-test --blockchain-config rell/out/multichain-test.xml -cfg $PMC_CONFIG)
    BRIDS_JSON+="\"multichain$i\": \"$MULTICHAIN_DAPP_BRID\","
done
BRIDS_JSON="${BRIDS_JSON%?}}"
BRIDS_JSON+="}"
echo $BRIDS_JSON > "./test/__multichain__/brids.json"

# Run the Jest tests
if [[ "$1" == "-f" || "$1" == "--file" ]]; then
    FILE_OPTION="--runTestsByPath $2"
else
    FILE_OPTION=""
fi
npx jest -maxWorkers=1 $FILE_OPTION -t "./test/__multichain__/*"

# Cleanup
exitfn

# If we are in interactive mode, return the exit code
if echo "$-" | grep -q "i"; then
    return $return_code
else
    exit $return_code
fi
