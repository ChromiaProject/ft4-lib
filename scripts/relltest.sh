#!/bin/sh
forceexit(){
    echo
    echo 'Remember to run "npm run stop-postchain:rell"!'
    exit 2
}

exitfn () {
    trap "forceexit" 2
    echo; echo 'Stopping docker, hit Ctrl+C to force quit'
    docker-compose -f dockers/rell-test.yml down
    exit 2
}

trap "exitfn" 2

docker-compose -f dockers/rell-test.yml up --abort-on-container-exit --exit-code-from ft3-lib-rell-postchain
docker-compose -f dockers/rell-test.yml down
