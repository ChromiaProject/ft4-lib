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
opt=
test_string=
while :; do
    case $1 in
        -f|--file)
            if [ "$2" ]; then
                opt="$opt --runTestsByPath $2"
                shift
            else
                echo 'ERROR: "--file" requires a non-empty option argument.'
                exit 1
            fi
            ;;
        --file=?*)
            opt="$opt --runTestsByPath ${1#*=}"
            ;;
        --file=)
            echo 'ERROR: "--file" requires a non-empty option argument.'
            exit 1
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
            if [ "$1" ]; then
              test_string="$test_string$1 "
            else 
              break
            fi
            ;;
    esac
    shift
done

if [ -z "$opt" ]; then
    opt="test"
fi
if [ "$test_string" ]; then
    opt="$opt -t ${test_string%?}"
fi

docker-compose -f dockers/jest-test.yml up -d && sleep 15
if test $? -eq 0
then
    echo "\n> npx jest " "$opt" "\n"
    npx jest $opt $@
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
