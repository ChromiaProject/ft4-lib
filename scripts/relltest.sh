#!/bin/sh
DOCKER=${DOCKER:-docker}

usage() {
    echo "Usage: npm run test:rell -- [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help                          Display this help message"
    echo "  --no-docker                         Skip Docker build"
    echo "  -t, --tests=<tests>, --test=<test>  Specify tests to run (e.g., -t=tests.accounts.auth_basic_single_sig:test_not_signed)"
    echo "  -bc, --blockchain=<blockchain>      Run tests for specified blockchain(s). Can only be a single chain if used with -m"
    echo "  -m, --modules=<modules>             Run tests in this module(s) only. Must be the part of the specified modules or its"
    echo "                                      submodules. Comma delimited, will default to all modules either under each selected"
    echo "                                      blockchain or test. -bc must be specified for this flag to work properly"
    echo
    echo "Example:"
    echo "  % npm run test:rell -- -t=tests.accounts.auth_basic_single_sig:test_not_signed"
    exit 1
}

forceexit(){
    echo
    echo 'Remember to run "npm run stop-postchain:rell"!'
    exit 2
}

exitfn () {
    trap "forceexit" 2
    echo; echo 'Stopping docker, hit Ctrl+C to force quit'
    $DOCKER stop ft4_rell_test > /dev/null
    $DOCKER rm ft4_rell_test > /dev/null
    exit 2
}

trap "exitfn" 2

docker=true
tests=""
additional_args=""

while :; do
    case $1 in
        -h|--help)
            usage
            ;;
        --no-docker)
            echo 'skipping docker build'
            docker=false
            ;;
        --tests=* | --test=*)
            echo "Testing specified tests: ${1#*=}"
            tests="--tests=${1#*=}"
            ;;
        --tests | --test | -t)
            if [ "$2" ]; then
                echo "Testing specified tests: $2"
                tests="--tests=$2"
                shift
            else
                echo 'ERROR: "--test" requires a non-empty option argument.'
                exit 1
            fi
            ;;
        *)
            [ -z "$1" ] && break 
            additional_args="$additional_args $1"
            ;;
    esac
    shift
done

if $docker; then
    $DOCKER run --name ft4_rell_test -e POSTGRES_USER=postchain \
        --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs \
        -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres:14.9-alpine3.18 > /dev/null
fi

chr test --use-db $tests $additional_args
return_code=$?

if $docker; then
    $DOCKER stop ft4_rell_test > /dev/null
    $DOCKER rm ft4_rell_test > /dev/null
fi

# If the script is sourced, return the exit code, otherwise exit the script
if echo "$-" | grep -q "i"; then
    return $return_code
else
    exit $return_code
fi
