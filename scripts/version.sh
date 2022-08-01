#!/bin/bash

updateclient(){
    version=$1
    echo $version | grep -qe "r$"
    if test $? -eq 0
    then
      echo "ERR: You passed a rell version number to the -c argument"
      exit 1
    fi
    echo $version | grep -qe "c$"
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
    sed -i 's/[0-9]\+\.[0-9]\+\.[0-9]\+c/'${version}'c/' client/lib/ft3/index.ts
    sed -i 's/toEqual("[0-9]\+\.[0-9]\+\.[0-9]\+c")/toEqual("'${version}'c")/' test/blockchain.test.ts
}

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

while getopts 'c:r:h' OPTION; do
  case "$OPTION" in
    h)
        echo "If you want to update the rell version, use \n\tnpm run version -r [version number]\n"
        echo "If you want to update the client version, use \n\tnpm run version -c [version number]\n"
        echo "In both cases, the letter at the end of the version is optional.\n\n"
        echo "You can use both options together.\n\nExamples:\n\n\tnpm run version -r 4.1.3 -c 2.1.5c"
        echo "Will update the rell version to 4.1.3r and the client to 2.1.5c"
        exit 0
        ;;
    c)
        echo "moving client version to $OPTARG";
        updateclient $OPTARG
        ;;
    r)
        echo "moving client version to $OPTARG";
        updaterell $OPTARG
        ;;
    ?)
        echo "script usage: npm run version [-h] [-c 'version'] [-r 'version']" >&2
        exit 1
        ;;
  esac
done
shift "$(($OPTIND -1))"