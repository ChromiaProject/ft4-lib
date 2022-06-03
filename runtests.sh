#!/bin/sh
forceexit(){
    echo
    echo 'Remember to run "docker-compose down"!'
    exit 2
}

exitfn () {
    trap "forceexit" 2
    echo; echo 'Stopping docker, hit Ctrl+C to force quit'
    docker-compose down
    exit 2
}

trap "exitfn" 2

docker-compose up -d
npx jest test $*
docker-compose down

