#!/bin/bash

DOCKER=${DOCKER:-docker}

forceexit(){
    echo
    if $docker; then
        echo 'Remember to run "npm run stop-postchain:jest"!'
    fi
    echo "You'll also need to kill the chr node, running on pid: $prc"
    exit 2
}

exitfn () {
    trap "forceexit" 2
    echo; echo 'Stopping docker, hit Ctrl+C to force quit'
    if $docker; then
        $DOCKER stop ft4_jest_test  > /dev/null 
        $DOCKER rm ft4_jest_test > /dev/null
    fi
    kill $prc
    exit 2
}

trap "exitfn" 2

prc=
opt=
test_string=
docker=true
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
        --no-docker)
              echo 'skipping docker build'
              docker=false
              ;;
        --)
            shift
            break
            ;;
        -?*)
            printf 'WARN: Unknown option (ignored): %s\n' "$1" >&2
            ;;
        *)
            if [ "$1" ]; then
              test_string="$test_string$1 "
            else 
              break
            fi
            ;;
    esac
    shift
done

if [ -z "$opt" ]; then
    opt=""
fi

rm -rf logs
mkdir logs

if $docker; then
    $DOCKER run --name ft4_jest_test -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
        --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
        --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs -e POSTGRES_DB=postchain \
        -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres > ./logs/postgres.log;
fi

echo -n "Building and running postchain node..."
    chr build -s configs/jest-test.yml > /dev/null

chr node start -s configs/jest-test.yml --wipe \
    -np rell/config/jest-test/node-config.properties > ./logs/postchain.log &
prc=$!

printf "done!\n\n"
i=0
max=15
while [ $i -lt $max ]
do
    printf "Waiting to start tests... $(( $max - $i )) \r"
    true $(( i=i+1 ))
    sleep 1
done

printf "\n> Starting jest tests with options: $opt -t \"${test_string%?}\" \n"

pids=()
if [[ $opt == *"--runTestsByPath"* ]]; then
    npx jest -maxWorkers=1 $opt -t "${test_string%?}" &
    pids+=($!)
else
    if $docker; then
        for f in ./**/[!_]*.test.ts; do
            npx jest -maxWorkers=1 --testPathPattern="$f" $opt -t "${test_string%?}" &
            pids+=($!)
        done;
    else
        for f in ./**/*.test.ts; do
            npx jest -maxWorkers=1 --testPathPattern="$f" $opt &
            pids+=($!)
        done
    fi
fi

return_code=0
for pid in "${pids[@]}"; do
    wait "$pid"
    status=$?
    if [[ $status -eq 0 ]]; then return_code=$return_code; else return_code=$status; fi
done

if [[ $return_code -eq 0 ]]; then
    echo "All TypeScript tests passed"
else
    echo "Tests failed"
fi

kill $prc

if $docker; then
    $DOCKER stop ft4_jest_test  > /dev/null 
    $DOCKER rm ft4_jest_test > /dev/null
fi

# If we are in interactive mode, return the exit code
if echo "$-" | grep -q "i"; then
    return $return_code
else
    exit $return_code
fi
