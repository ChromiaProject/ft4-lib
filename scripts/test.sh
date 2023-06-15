#!/bin/sh
file=
test=
nodocker=

while :; do
    case $1 in
        -h|-\?|--help)
          echo "If you want to run just certain jest tests, use:\n\n\tnpm run test[:js] -- 'string matching test(s)'\n"
          echo "Example:\nnpm run test -- user will only run js tests with user in their name, and all rell tests"
          echo "npm run test:js -- rate sso will only run js tests with either rate or sso in their name, and no rell tests"
          echo "\n\nThe --file option allows you to specify which test suite to run.\n"
          echo "Example:\nnpm run test -- --file test/transfer.test.ts user will only run js tests in that file with matching name, and all rell tests"
          exit 0
          ;;
        -f|--file)
            if [ "$2" ]; then
                file=$2
                shift
            else
                echo 'ERROR: "--file" requires a non-empty option argument.'
                exit 1
            fi
            ;;
        --file=?*)
            file=${1#*=}
            ;;
        --file=)
              echo 'ERROR: "--file" requires a non-empty option argument.'
              exit 1
              ;;
        --no-docker)
              echo 'skipping docker build'
              nodocker="--no-docker"
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
              test="${test}$1 "
            else 
              break
            fi
            ;;
    esac
    shift
done

opts=""
if [ "$file" ]; then
    opts="--file=$file"
    echo $opts
fi
if [ "$test" ]; then
    opts="$opts ${test%?}"
fi

npm run test:js -- $opts $nodocker
exit_js=$?

npm run test:rell -- $nodocker
exit_rell=$?

if [ $exit_js -ne 0 -o $exit_rell -ne 0 ] ; then
    echo "\n======================================\n"
    echo "\e[0;31mTESTS FAILED\e[0m\n"
    return 1 || exit 1;
fi

echo "\n======================================\n"
echo "\e[0;32mTESTS SUCCEEDED\e[0m\n"
