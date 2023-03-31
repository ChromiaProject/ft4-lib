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

EXIT_ON_ERROR=0
while [[ $# -gt 0 ]]; do
    case $1 in
        --exit-on-error)
            EXIT_ON_ERROR=1
            shift
            ;;
        -*|--*)
            echo "Unknown flag $1"
            exit 1
            ;;
    esac
done

docker-compose -f dockers/jest-test.yml up -d
if test $? -eq 0
then
    npx jest test -t "$@"
    if test $? -eq 0
    then 
        docker-compose -f dockers/jest-test.yml down
    else
        docker-compose -f dockers/jest-test.yml down
        if [ "$EXIT_ON_ERROR" -eq 1 ]; then
            exit 1
        fi
    fi
else
    echo "There was an error starting the container. Shutting it down (if it's open)..."
    docker-compose -f dockers/jest-test.yml down
fi
