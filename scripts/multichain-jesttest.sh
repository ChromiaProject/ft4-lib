#!/bin/bash

# You can set the number of blockchains here
NUM_BLOCKCHAINS=5
PMC_CONFIG="rell/config/jest-test/multichain/.pmc/config"

forceexit() {
    echo "Forcing exit. Please remember to clean up manually."
    exit 2
}

exitfn() {
    trap "forceexit" 2
    echo 'Stopping and cleaning up. Hit Ctrl+C to force quit.'
    docker stop postgres multichain-jest-test
    docker rm postgres multichain-jest-test
    exit 2
}

trap "exitfn" 2

# 1. Check if pmc and chr commands are installed
if ! command -v pmc &> /dev/null || ! command -v chr &> /dev/null
then
    echo "pmc and chr commands must be installed."
    exit 1
fi

# 2. Run Postgres
docker run --name postgres -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_PASSWORD=postchain -e POSTGRES_USER=postchain -p 5432:5432 postgres

# 3. Clone Directory Chain dependency
mkdir -p rell/dep
git clone --branch 1.9.2 --single-branch --depth 1 https://gitlab.com/chromaway/core/directory-chain.git rell/dep/directory-chain

# 4. Build Directory Chain
chr build --settings rell/dep/directory-chain/config.yml

# 5. Run the node
docker run \
    --name multichain-jest-test \
    --restart unless-stopped \
    --mount type=bind,source="$(pwd)/rell/config/jest-test/multichain",target=/config,readonly \
    --mount type=bind,source="$(pwd)/rell/dep/directory-chain/build",target=/build,readonly \
    -e JAVA_TOOL_OPTIONS="-Xmx16g" \
    -e POSTCHAIN_DEBUG=true \
    -e POSTCHAIN_CONFIG=/config/config.0.properties \
    -e POSTCHAIN_BLOCKCHAIN_CONFIG=/build/manager.xml \
    -p 9870:9870/tcp \
    -p 127.0.0.1:7740:7740/tcp \
    registry.gitlab.com/chromaway/postchain-chromia/chromaway/chromia-server:3.11.2 \
    run-node

# 6. Get the manager chain BRID
BRID=$(curl http://localhost:7740/brid/iid_0)

# 7. Save the BRID to the config
pmc config --file $PMC_CONFIG --set brid="$BRID"

# 8. Initialize the network
pmc network initialize --system-anchoring-config directory-chain/build/system_anchoring.xml --cluster-anchoring-config directory-chain/build/cluster_anchoring.xml -cfg $PMC_CONFIG

# 9. Verify the network
VERIFY_OUTPUT=$(pmc network verify -cfg $PMC_CONFIG)
echo "$VERIFY_OUTPUT"
if [[ ! "$VERIFY_OUTPUT" =~ "OK" || "$VERIFY_OUTPUT" =~ "null" ]]; then
    echo "Verification failed. Exiting."
    exit 1
fi

# 10. Add a container for the multichain test blockchains
pmc container add --name multichain-jest-test --cluster system --pubkeys $(pmc config --get pubkey --file $PMC_CONFIG)

# 11 & 12. Add blockchains and save the blockchain BRIDs to a JSON file
BRIDS_JSON="{"
for i in $(seq -f "%02g" 0 $((NUM_BLOCKCHAINS-1)))
do
    MULTICHAIN_DAPP_BRID=$(pmc blockchain add --quiet --name multichain$i --container multichain-jest-test --blockchain-config rell/out/multichain.xml -cfg $PMC_CONFIG)
    BRIDS_JSON+="\"multichain$i\": \"$MULTICHAIN_DAPP_BRID\","
done
BRIDS_JSON="${BRIDS_JSON%?}}"
BRIDS_JSON+="}"
echo $BRIDS_JSON > "./test/__multichain__/brids.json"

# 13. Run the Jest tests
if [[ "$1" == "-f" || "$1" == "--file" ]]; then
    FILE_OPTION="--runTestsByPath $2"
else
    FILE_OPTION=""
fi
npx jest -maxWorkers=1 $FILE_OPTION -t "./test/__multichain__/*"

# 15. Cleanup
exitfn

# If we are in interactive mode, return the exit code
if echo "$-" | grep -q "i"; then
    return $return_code
else
    exit $return_code
fi
