#!/bin/sh
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
        docker stop ft4_jest_test  > /dev/null 
        docker rm ft4_jest_test > /dev/null
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
if [ "$test_string" ]; then
    opt="$opt -t ${test_string%?}"
fi

rm -rf logs
mkdir logs

if $docker; then
    docker run --name ft4_jest_test -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
        --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
        --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs -e POSTGRES_DB=postchain \
        -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres > ./logs/postgres.log;
fi

echo -n "Building and running postchain node..."
    chr build -s configs/jest-test.yml > /dev/null

chr node start -s configs/jest-test.yml --wipe \
    -np rell/config/jest-test/node-config.properties > ./logs/postchain.log &
prc=$!

echo "done!\n"
i=0
max=15
while [ $i -lt $max ]
do
    echo -n "Waiting to start tests... $(( $max - $i )) \r"
    true $(( i=i+1 ))
    sleep 1
done


echo "> Starting jest tests with options: " "$opt" "\n"
npx jest -maxWorkers=1 --testPathPattern=payment-history.test.ts $opt && \
    npx jest --testPathIgnorePatterns=payment-history.test.ts $opt
return_code=$?

if $docker; then
    docker stop ft4_jest_test  > /dev/null 
    docker rm ft4_jest_test > /dev/null
fi
kill $prc
return $return_code || exit $return_code
