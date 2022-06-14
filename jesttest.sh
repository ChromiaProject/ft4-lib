#!/bin/sh
forceexit(){
    echo
    echo 'Remember to run "docker-compose -f jest-test.yml down"!'
    exit 2
}

exitfn () {
    trap "forceexit" 2
    echo; echo 'Stopping docker, hit Ctrl+C to force quit'
    docker-compose -f jest-test.yml down
    exit 2
}

trap "exitfn" 2

docker-compose -f jest-test.yml up -d
if test $? -eq 0
then
    sleep 20
    npx jest test $*
    docker-compose -f jest-test.yml down
    exit 0
else
    docker-compose -f jest-test.yml down
    exit 1
fi
