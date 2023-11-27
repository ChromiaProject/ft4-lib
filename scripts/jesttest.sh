#!/bin/bash

exitfn() {
    rm client/lib/ft4/package.json
    exit 2
}

trap "exitfn" 2

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
        --ci)
              echo 'generating test reports'
              opt="$opt --ci --reporters=default --reporters=jest-junit"
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
    opt=""
fi

cp package.json client/lib/ft4/

printf "\n> Starting jest tests with options: $opt -t \"${test_string%?}\" \n"

pids=()
if [[ $opt == *"--runTestsByPath"* ]]; then
    npx jest -maxWorkers=1 --detectOpenHandles $opt -t "${test_string%?}" &
    pids+=($!)
else
    for f in ./**/*.test.ts; do
        JEST_JUNIT_OUTPUT_NAME="${f}.xml" npx jest -maxWorkers=1 --testPathPattern="$f" $opt &
        pids+=($!)
    done
fi

return_code=0
for pid in "${pids[@]}"; do
    wait "$pid"
    status=$?
    if [[ $status -eq 0 ]]; then return_code=$return_code; else return_code=$status; fi
done

if [[ $return_code -eq 0 ]]; then
    echo "All TypeScript tests passed"
else
    echo "Tests failed"
fi

# If we are in interactive mode, return the exit code
if echo "$-" | grep -q "i"; then
    return $return_code
else
    exit $return_code
fi
