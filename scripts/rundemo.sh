#!/bin/sh
docker run --name postchain_demo -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
    --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
    --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs -e POSTGRES_DB=postchain_demo \
    -e POSTGRES_PASSWORD=postchain -p 5433:5432 -d postgres > /dev/null;


echo "Building and running postchain node..."

chr build -s configs/demo.yml

chr node start -s configs/demo.yml --wipe \
    -np rell/config/demo/node-config.properties