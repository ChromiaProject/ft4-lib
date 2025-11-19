#!/bin/sh
forceexit(){
    echo
    echo 'Remember to run "pnpm run stop-postchain:demo"!'
    exit 2
}

exitfn () {
    trap "forceexit" 2
    echo; echo 'Stopping docker, hit Ctrl+C to force quit'
    docker stop ft4_demo  > /dev/null 
    docker rm ft4_demo > /dev/null
    exit 2
}

trap "exitfn" 2

docker run --name ft4_demo -e POSTGRES_USER=postchain \
    --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs -e POSTGRES_DB=postchain \
    -e POSTGRES_PASSWORD=postchain -p 5433:5432 -d postgres:14.9-alpine3.18 > /dev/null;

echo "Building and running postchain node..."

chr build -s configs/demo.yml --hide-lib-warnings

chr node start -s configs/demo.yml --wipe \
    -np rell/config/demo/node-config.properties
