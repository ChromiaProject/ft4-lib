#!/bin/sh -eu

# This is a fork of the shared script at chromaway/core-infra/gitlab-automation, scripts/library_chain/deploy.sh.
# It is not kept in sync with it. Differences from the shared script:
# - the library chain keys are passed as job variables in .gitlab-ci.yml instead of being exported here
# - the configuration is always read from build/ (no CHR_BUILD_PATH)
# - the library description is only used on the first deploy and is never updated afterwards;
#   a new version reuses the description of the previous version instead of an empty one
# - it exits as soon as there is nothing to deploy, instead of going on to check the library description
# - library chain queries are retried on errors, as in the shared script

RELEASE_DOTENV_FILE="${CI_PROJECT_DIR}/.library_chain_releases.env"

function append_release {
  version="$1"

  echo "Appending $LIBRARY_NAME v$version to library chain release variable"

  release_value=";$LIBRARY_NAME:$version"
  if grep -q LIBRARY_CHAIN_RELEASES "$RELEASE_DOTENV_FILE" &> /dev/null; then
    sed -i "s/^LIBRARY_CHAIN_RELEASES=.*/&;$release_value/" "$RELEASE_DOTENV_FILE"
  else
    echo "LIBRARY_CHAIN_RELEASES=$release_value" > "$RELEASE_DOTENV_FILE"
  fi
}

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT

# Queries the library chain and prints the response body. A throttled node answers 503 with an error body,
# which must not be read as "library not found": retry on any non-200 answer and fail if it does not recover.
query_library_chain() {
  url="$1"
  attempts=6
  attempt=1
  while [ "$attempt" -le "$attempts" ]; do
    status="$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' "$url" || echo 000)"
    if [ "$status" = "200" ]; then
      cat "$RESPONSE_FILE"
      return 0
    fi
    echo "Library chain query failed (HTTP $status, attempt $attempt/$attempts): $(head -c 200 "$RESPONSE_FILE")" >&2
    if [ "$attempt" -lt "$attempts" ]; then
      sleep "$((attempt * ${LIBRARY_CHAIN_RETRY_DELAY:-10}))"
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

while [ "$#" -gt 0 ]; do
    case $1 in
        -n|--name) LIBRARY_NAME="$2"; shift ;;
        --major) MAJOR_VERSION="$2"; shift ;;
        --minor) MINOR_VERSION="$2"; shift ;;
        --library-description) LIBRARY_DESCRIPTION="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "Library: $LIBRARY_NAME"
echo "Major: $MAJOR_VERSION"
echo "Minor: $MINOR_VERSION"
if [ -n "${LIBRARY_DESCRIPTION+x}" ]; then
  echo "Library description: $LIBRARY_DESCRIPTION"
fi
echo

XML_CONF="build/$LIBRARY_NAME.xml"
if [ ! -f "$XML_CONF" ]; then
  echo "Missing configuration: $XML_CONF"
  exit 1
fi

RID_NEW=`xmllint --xpath 'string(/dict/entry[@key="rid"]/bytea)' "$XML_CONF"`
EXISTING="$(query_library_chain "$LIBRARY_CHAIN_API_URL/query/$LIBRARY_CHAIN_BRID?type=library_chain_versioning.get_latest_library_version&lib_id=com.chromia.$LIBRARY_NAME")"

RID_EXISTING=`echo $EXISTING | jq -r '.rid'`
if [ "$RID_EXISTING" = "null" ]; then

  if [ -z "${LIBRARY_DESCRIPTION+x}" ]; then
    echo "Library description is required for first deployment"
    exit 1
  fi

  echo "First deploy of library $LIBRARY_NAME"

  VERSION="$MAJOR_VERSION.$MINOR_VERSION.0"
  echo "Creating $LIBRARY_NAME $VERSION..."
  echo "RID: $RID_NEW"

  chr library create \
    --url "$LIBRARY_CHAIN_API_URL" \
    --brid "$LIBRARY_CHAIN_BRID" \
    --library "$LIBRARY_NAME" \
    --organization com.chromia \
    --name "$LIBRARY_NAME" \
    --version "$VERSION" \
    --description "$LIBRARY_DESCRIPTION"

  append_release "$VERSION"
else

  if [ "$RID_EXISTING" = "$RID_NEW" ]; then
     echo "Skipping deployment of $LIBRARY_NAME, because the RID has not changed: $RID_EXISTING."
     exit 0
  fi

  EXISTING_VERSION="$(echo $EXISTING | jq -r '.version')"
  echo "Current library version: $EXISTING_VERSION"

  EXISTING_MAJOR=${EXISTING_VERSION%%.*}
  EXISTING_VERSION_NO_MAJOR=${EXISTING_VERSION#*.}
  EXISTING_MINOR=${EXISTING_VERSION_NO_MAJOR%%.*}
  EXISTING_PATCH=${EXISTING_VERSION_NO_MAJOR#*.}

  MAJOR_MINOR_PREFIX="$MAJOR_VERSION.$MINOR_VERSION."
  if [ "${EXISTING_VERSION#$MAJOR_MINOR_PREFIX}" != "${EXISTING_VERSION}" ]; then
    NEW_PATCH="$((EXISTING_PATCH + 1))"
  else
    NEW_PATCH=0
  fi

  VERSION="$MAJOR_VERSION.$MINOR_VERSION.$NEW_PATCH"
  echo "New version: $VERSION"
  echo

  VERSION_EXISTING=`echo $EXISTING | jq -r '.version'`
  if [ "$VERSION_EXISTING" = "$VERSION" ]; then
     echo "Skipping deployment of $LIBRARY_NAME, because the version has not changed: $VERSION."
     exit 0
  fi

  DESCRIPTION=`echo $EXISTING | jq -r '.version_description'`

  echo "Deploying $LIBRARY_NAME $VERSION..."
  echo "previous RID: $RID_EXISTING"
  echo "new RID: $RID_NEW"

  chr library deploy \
    --url "$LIBRARY_CHAIN_API_URL" \
    --brid "$LIBRARY_CHAIN_BRID" \
    --library "$LIBRARY_NAME" \
    --id "com.chromia.$LIBRARY_NAME" \
    --version "$VERSION" \
    --description "$DESCRIPTION"

  append_release "$VERSION"
fi
