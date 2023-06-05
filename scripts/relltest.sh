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
EXIT_ON_ERROR=0
while :; do
    case $1 in
        --no-docker)
              echo 'skipping docker build'
              docker=false
              ;;
        --exit-on-error)
            EXIT_ON_ERROR=1
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
    docker run --name postchain -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
        --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
        --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs \
        -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres > /dev/null
fi

chr test -s configs/rell-test.yml --use-db

if test $? -eq 0
then 
    if $docker; then
        docker stop postchain  > /dev/null 
        docker rm postchain > /dev/null
    fi
else
    if $docker; then
        docker stop postchain  > /dev/null 
        docker rm postchain > /dev/null
    fi
    if [ "$EXIT_ON_ERROR" -eq 1 ]; then
        exit 1
    fi
fi
