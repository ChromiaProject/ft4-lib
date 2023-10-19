#!/bin/bash

source ./scripts/multichain-runner.sh

log "Running Jest tests..."
if [[ "$1" == "-f" || "$1" == "--file" ]]; then
    FILE_OPTION="--runTestsByPath $2"
else
    FILE_OPTION=""
fi

debug "Running tests..."

NODE_OPTIONS='--stack-trace-limit=100' npx jest \
    --config=jest.config.multichain.js \
    --maxWorkers=1 \
    --testPathPattern=__multichain__ \
    $FILE_OPTION
