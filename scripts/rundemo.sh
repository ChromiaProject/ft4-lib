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
    -e POSTGRES_PASSWORD=postchain -p 5433:5432 -d postgres:16.7-alpine3.21@sha256:97a14a17b1fea5ae1ab33024ca556bb4fedc8709bea5722cb8b7665a9cabb656 > /dev/null;

echo "Building and running postchain node..."

chr build -s configs/demo.yml --hide-lib-warnings

chr node start -s configs/demo.yml --wipe \
    -np rell/config/demo/node-config.properties
