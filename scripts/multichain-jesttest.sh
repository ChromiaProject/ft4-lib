#!/bin/bash
GITLAB=false
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
        --gitlab)
              echo 'running for gitlab pipeline'
              GITLAB=true
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

# log "sleep20"
# sleep 20

# log "TESTING ANCHOR..."

# node test_anchor.js


# creating bak is mandatory on some platforms like Mac
if $GITLAB; then
    sed -i.bak 's|^export const NODE_URL = .*$|export const NODE_URL = "http://docker:7740"|' test/util/blockchain-util.ts
else
    sed -i.bak 's|^export const NODE_URL = .*$|export const NODE_URL = "http://localhost:7740"|' test/util/blockchain-util.ts
fi
rm test/util/blockchain-util.ts.bak

log "Running Jest tests..."

NODE_OPTIONS='--stack-trace-limit=100' JEST_JUNIT_OUTPUT_NAME="multichain.xml" npx jest \
    --config=jest.config.multichain.js \
    --testPathPattern=__multichain__ \
    --verbose \
    $opt

    # --testPathPattern=temp_tst \