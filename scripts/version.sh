#!/bin/bash

updaterell(){
    version=$1
    if [[ $version =~ r$ ]]; then
      version=${version::-1}
    fi
    if ! [[ $version =~ [0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "ERROR: Invalid version format"
      exit 1
    fi
    sed -i 's/[0-9]\+\.[0-9]\+\.[0-9]\+r/'${version}'r/' rell/src/lib/ft3/version.rell
    sed -i 's/toEqual("[0-9]\+\.[0-9]\+\.[0-9]\+r")/toEqual("'${version}'r")/' test/blockchain.test.ts
}

while getopts 'h' OPTION; do
  case "$OPTION" in
    h)
        echo "If you want to update the rell version, use \n\tnpm run version [version number] | major | minor | patch\n"
        echo "The letter at the end of the version is optional.\n\n"
        echo "Example:\n\n\tnpm run version 4.1.3"
        echo "Will update the rell version to 4.1.3r"
        echo "\n\n\tnpm run version major"
        echo "Will update the rell version from 4.1.3r to 5.0.0r"
        echo "\nMinor and patch will update the rell version from 4.1.3r to 4.2.0r and 4.1.4r, respectively"
        exit 0
        ;;
    ?)
        echo "script usage: npm run version [-h] [-r 'version']" >&2
        exit 1
        ;;
  esac
done
shift "$(($OPTIND -1))"

input=$1;
pattern="[0-9]+\.[0-9]+\.[0-9]+r?$";

if [[ "$input" =~ $pattern ]]; then
  version="$input";
  echo "matched"
else
  currVersion=$(grep -Po "[0-9\.]+(?=r)" rell/src/lib/ft3/version.rell);
  if [[ "$input" == "major" ]]; then
    major=$(echo $currVersion | grep -Po "^[0-9]+");
    version="$((major+1)).0.0";
  elif [[ "$input" == "minor" ]]; then
    major=$(echo $currVersion | grep -Po "^[0-9]+");
    minor=$(echo $currVersion | grep -Po "(?<=\.)[0-9]+(?=\.)");
    version="$major.$((minor+1)).0";
  elif [[ "$input" == "patch" ]]; then
    major=$(echo $currVersion | grep -Po "^[0-9]+");
    minor=$(echo $currVersion | grep -Po "(?<=\.)[0-9]+(?=\.)");
    patch=$(echo $currVersion | grep -Po "(?<=\.)[0-9]+$");
    version="$major.$minor.$((patch+1))";
  else
    echo "Unrecognized option: '$input'. It should be one of major | minor | patch | version number"
    echo "Version number should be formatted as [digits].[digits].[digits], with an optional r at the end"
    echo "If you're trying to edit the client version (as in 4.2.5c), use 'npm version'"
    exit 1
  fi
fi

echo "moving rell version to $version";
updaterell "$version"