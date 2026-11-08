#!/bin/bash

GITLAB=false
LINK_ONLY=false
while :; do
    case $1 in
        --gitlab)
              echo 'running for gitlab pipeline'
              GITLAB=true
              ;;
        --link-only)
              echo 'adding the links in bin'
              LINK_ONLY=true
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

# SHA-256 of the exact archives below. Update together with the version in the URL.
CHR_CLI_SHA256=6b070bf7706bfb2843f313194e18839d19a8a7a23b9aff4524b65eeef8b7a1b2
PMC_SHA256=f6ce8c6c1fb02f31536843a0a51b91413adfb26e02cfae48ed71ca39f6202819

# shellcheck source=scripts/download-verified.sh
source "$(dirname "${BASH_SOURCE[0]}")/download-verified.sh"

link_chr_pmc() {
    ln -s $(pwd)/bin/chromaway/chr/bin/chr /bin/chr
    ln -s $(pwd)/bin/chromaway/management-console/bin/pmc /bin/pmc
}

if $LINK_ONLY; then
    echo "Linking the binaries from artifacts..."
    link_chr_pmc;
else
    echo "Downloading the binaries..."

    mkdir -p /opt/chromaway/chr
    download_verified \
        https://gitlab.com/api/v4/projects/39844192/packages/maven/com/chromia/cli/chromia-cli/0.34.3/chromia-cli-0.34.3-dist.tar.gz \
        "$CHR_CLI_SHA256" /opt/chromaway/chr

    download_verified \
        https://gitlab.com/api/v4/projects/46346037/packages/maven/net/postchain/mc/management-console/3.63.2/management-console-3.63.2-dist.tar.gz \
        "$PMC_SHA256" /opt/chromaway

    if $GITLAB; then
        mkdir bin
        cp -R /opt/chromaway/ bin/
        link_chr_pmc
    else
        ln -s /opt/chromaway/chr/bin/chr /bin/chr
        ln -s /opt/chromaway/management-console/bin/pmc /bin/pmc
    fi
fi