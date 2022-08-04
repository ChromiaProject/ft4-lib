#!/bin/bash

updaterell(){
    version=$1
    echo $version | grep -qe "c$"
    if test $? -eq 0 
    then
      echo "ERR: You passed a client version number to the -r argument"
      exit 1
    fi
    echo $version | grep -qe "r$"
    if test $? -eq 0 
    then
      version=${version::-1}
    fi
    echo $version | grep -qE "[0-9]+\.[0-9]+\.[0-9]+$"
    if test $? -eq 1 
    then
      echo "ERR: Invalid version format"
      exit 1
    fi
    sed -i 's/[0-9]\+\.[0-9]\+\.[0-9]\+r/'${version}'r/' rell/src/lib/ft3/version.rell
    sed -i 's/toEqual("[0-9]\+\.[0-9]\+\.[0-9]\+r")/toEqual("'${version}'r")/' test/blockchain.test.ts
}

while getopts 'h' OPTION; do
  case "$OPTION" in
    h)
        echo "If you want to update the rell version, use \n\tnpm run version -r [version number]\n"
        echo "The letter at the end of the version is optional.\n\n"
        echo "Example:\n\n\tnpm run version -r 4.1.3"
        echo "Will update the rell version to 4.1.3r"
        exit 0
        ;;
    ?)
        echo "script usage: npm run version [-h] [-r 'version']" >&2
        exit 1
        ;;
  esac
done
shift "$(($OPTIND -1))"

echo "moving rell version to $1";
updaterell $1