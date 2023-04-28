#!/bin/sh
forceexit(){
    echo
    echo 'Remember to run "docker stop postchain && docker rm postchain"!'
    exit 2
}

exitfn () {
    trap "forceexit" 2
    echo; echo 'Stopping docker, hit Ctrl+C to force quit'
    docker stop postchain  > /dev/null 
    docker rm postchain > /dev/null
    exit 2
}

trap "exitfn" 2

docker run --name postchain -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
    --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
    --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs \
    -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres > /dev/null

chr test -s configs/rell-test.yml --use-db

docker stop postchain  > /dev/null 
docker rm postchain > /dev/null
