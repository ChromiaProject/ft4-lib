#!/bin/bash

source ./scripts/multichain-runner.sh

log "Running Jest tests..."

while :; do
    case $1 in
        -f|--file)
            if [ "$2" ]; then
                opt="$opt --runTestsByPath $2"
                shift
            else
                echo 'ERROR: "--file" requires a non-empty option argument.'
                exit 1
            fi
            ;;
        --file=?*)
            opt="$opt --runTestsByPath ${1#*=}"
            ;;
        --file=)
            echo 'ERROR: "--file" requires a non-empty option argument.'
            exit 1
            ;;
        --ci)
              echo 'generating test reports'
              opt="$opt --ci --reporters=default --reporters=jest-junit"
              ;;
        --)
            shift
            break
            ;;
        -?*)
            printf 'WARN: Unknown option (ignored): %s\n' "$1" >&2
            ;;
        *)
            break
            ;;
    esac
    shift
done

NODE_OPTIONS='--stack-trace-limit=100' JEST_JUNIT_OUTPUT_NAME="multichain.xml" npx jest \
    --config=jest.config.multichain.js \
    --maxWorkers=1 \
    --testPathPattern=__multichain__ \
    $opt
