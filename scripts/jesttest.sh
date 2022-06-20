#!/bin/sh
forceexit(){
    echo
    echo 'Remember to run "npm run stop-postchain:jest"!'
    exit 2
}

exitfn () {
    trap "forceexit" 2
    echo; echo 'Stopping docker, hit Ctrl+C to force quit'
    docker-compose -f dockers/jest-test.yml down
    exit 2
}

trap "exitfn" 2

docker-compose -f dockers/jest-test.yml up -d
if test $? -eq 0
then
    sleep 20
    npx jest test $*
    docker-compose -f dockers/jest-test.yml down
    exit 0
else
    echo "There was an error starting the container. Shutting it down (if it's open)..."
    docker-compose -f dockers/jest-test.yml down
    exit 1
fi
