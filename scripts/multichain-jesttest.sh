#!/bin/bash

postgres=true
while :; do
    case $1 in
        --tests | --test | -t)
            if [ "$2" ]; then
                opt="$opt -t $2"
                shift
            else
                echo 'ERROR: "--test" requires a non-empty option argument.'
                exit 1
            fi
            ;;
        --tests=* | --test=* | -t=*)
            opt="$opt -t ${1#*=}"
            ;;
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
        --no-postgres)
              echo 'skipping postgres'
              postgres=false
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

source ./scripts/multichain-runner.sh

log "sleep20"
sleep 20

log "TESTING ANCHOR..."

node test_anchor.js

log "Running Jest tests..."

NODE_OPTIONS='--stack-trace-limit=100' JEST_JUNIT_OUTPUT_NAME="multichain.xml" npx jest \
    --config=jest.config.multichain.js \
    --testPathPattern=__multichain__ \
    --verbose \
    $opt

    # --testPathPattern=temp_tst \