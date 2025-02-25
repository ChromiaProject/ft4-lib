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
    sed -i 's/[0-9]\+\.[0-9]\+\.[0-9]\+/'${version}'/' rell/src/lib/ft4/version.rell
    sed -i 's/toEqual("[0-9]\+\.[0-9]\+\.[0-9]\+")/toEqual("'${version}'")/' test/integration/blockchain.integration.test.ts
}

updateapi(){
    version=$1
    if ! [[ $version =~ [0-9]+$ ]]; then
      echo "ERROR: Invalid version format"
      exit 1
    fi
    sed -i 's/[0-9]\+;/'${version}';/' rell/src/lib/ft4/version.rell
    sed -i 's/toEqual([0-9]\+)/toEqual('${version}')/' test/integration/blockchain.integration.test.ts
}

function usage {
  echo -e "~~~~~~~~~~~~~~~~~~~HELP~~~~~~~~~~~~~~~~~~~"
  echo -e "\nIf you want to update the rell version, use"
  echo -e "\n|\tnpm run version:rell [-- -Mmp] | [version number]\n"
  echo -e "The 'r' at the end of the version is optional.\n\n"
  echo -e "Examples:\n\n|\tnpm run version:rell 4.1.3"
  echo -e "|Will update the rell version to 4.1.3r"
  echo -e "\n\n|\tnpm run version:rell -- -M"
  echo -e "|Will update the rell version from 4.1.3r to 5.0.0r"
  echo -e "\nMinor (-m) and patch (-p) will update the rell version from 4.1.3r to 4.2.0r and 4.1.4r, respectively."
  echo -e "\n\n|\tnpm run version:rell -- -mp"
  echo -e "|Will update the rell version from 4.1.3r to 4.2.1r"
  echo -e "\n\nIf a version number is passed after flags, it is discarded:"
  echo -e "\n|\tnpm run version:rell -- -p 15.1.3r"
  echo -e "|Will update the rell version from 4.1.3r to 4.1.4r"
}

# Increment a version string using Semantic Versioning (SemVer) terminology.

# Parse command line options.

no_args=true
major=false
minor=false
patch=false
while getopts "hMmp" Option
do
  case $Option in
    M ) major=true;;
    m ) minor=true;;
    p ) patch=true;;
    h)
      usage
      exit 0
        ;;
    \?)
      echo "usage: $(basename $0) [-- -hMmp] [major.minor.patch]" >&2
      exit 1
      ;;
  esac
  no_args=false
done

shift $(($OPTIND - 1))

currVersion=$(grep "get_version" rell/src/lib/ft4/version.rell | grep -o "[0-9]*\.[0-9]*\.[0-9]*");
currApiVersion=$(grep "get_api_version" rell/src/lib/ft4/version.rell | grep -o "[0-9]*");
if [[ $no_args = "true" ]]; then version=$1; else version=$currVersion; fi

# Build array from version string.

a=( ${version//./ } )

# If version string is missing or has the wrong number of members, show usage message.

if [ ${#a[@]} -ne 3 ]
then
  echo "usage: $(basename $0) [-- -hMmp] [major.minor.patch]"
  exit 1
fi

# Increment version numbers as requested.

if $major;
then
  ((a[0]++))
  a[1]=0
  a[2]=0
fi

if $minor;
then
  ((a[1]++))
  a[2]=0
fi

if $patch;
then
  ((a[2]++))
fi

currApiVersion=$((currApiVersion + 1));

echo -e "moving rell version to ${a[0]}.${a[1]}.${a[2]}";
updaterell "${a[0]}.${a[1]}.${a[2]}"

echo -e "moving api version to ${currApiVersion}";
updateapi "${currApiVersion}"
