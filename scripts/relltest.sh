#!/bin/sh
forceexit(){
    echo
    echo 'Remember to run "npm run stop-postchain:rell"!'
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

docker=true
while :; do
    case $1 in
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
            break
            ;;
    esac
    shift
done

if $docker; then
    docker run --name ft4_rell_test -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
        --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
        --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs \
        -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres > /dev/null
fi

chr test -s configs/rell-test.yml --use-db
return_code=$?

if $docker; then
    docker stop ft4_rell_test  > /dev/null 
    docker rm ft4_rell_test > /dev/null
fi

if [ "$$" -eq "$PPID" ]; then
    return $return_code
else
    exit $return_code
fi
