#!/bin/sh
DOCKER=${DOCKER:-docker}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help               Display this help message"
    echo "  --no-docker              Skip Docker build"
    echo "  -t, --tests=<tests>      Specify tests to run (e.g., -t=tests.accounts.auth_basic_single_sig:test_not_signed)"
    echo
    echo "Example:"
    echo "  % $0 -t=tests.accounts.auth_basic_single_sig:test_not_signed"
    echo
    echo "Remember to run 'npm run stop-postchain:rell' after running tests."
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
    $DOCKER stop ft4_rell_test  > /dev/null 
    $DOCKER rm ft4_rell_test > /dev/null
    exit 2
}

trap "exitfn" 2

docker=true
tests=""
additional_args=""

while :; do
    case $1 in
        --no-docker)
              echo 'skipping docker build'
              docker=false
              ;;
        --tests=* | -t=*)
              echo "Testing specified tests: ${1#*=}"
              tests="--tests=${1#*=}"
              ;;
        *)
            additional_args="$additional_args $1"
            ;;
    esac
    shift
    [ -z "$1" ] && break
done

if [ -z "$tests" ]; then
    usage
fi

if $docker; then
    $DOCKER run --name ft4_rell_test -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
        --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
        --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs \
        -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres > /dev/null
fi

chr test -s configs/rell-test.yml --use-db $tests $additional_args
return_code=$?

if $docker; then
    $DOCKER stop ft4_rell_test  > /dev/null 
    $DOCKER rm ft4_rell_test > /dev/null
fi

# If the script is sourced, return the exit code, otherwise exit the script
if echo "$-" | grep -q "i"; then
    return $return_code
else
    exit $return_code
fi
