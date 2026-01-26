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
    wget -nv -O - https://gitlab.com/api/v4/projects/39844192/packages/maven/com/chromia/cli/chromia-cli/0.29.5/chromia-cli-0.29.5-dist.tar.gz | tar -C /opt/chromaway/chr -xz

    wget -nv -O - https://gitlab.com/api/v4/projects/46346037/packages/maven/net/postchain/mc/management-console/3.58.2/management-console-3.58.2-dist.tar.gz | tar -C /opt/chromaway -xz

    if $GITLAB; then
        mkdir bin
        cp -R /opt/chromaway/ bin/
        link_chr_pmc
    else
        ln -s /opt/chromaway/chr/bin/chr /bin/chr
        ln -s /opt/chromaway/management-console/bin/pmc /bin/pmc
    fi
fi