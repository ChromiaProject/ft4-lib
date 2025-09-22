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


# docker run --rm -v $(pwd):/usr/app registry.gitlab.com/chromaway/core-tools/chromia-cli/chr:0.26.0 chr
# docker run --rm -v $(pwd):/usr/app registry.gitlab.com/chromaway/core-tools/chromia-cli/chr:0.26.0 chr install


if $LINK_ONLY; then
    echo "Linking the binaries from artifacts..."
    link_chr_pmc;
else
    echo "Downloading the binaries..."

    # install chromia-cli-0.27.10-dist.tar.gz
    mkdir -p /opt/chromaway/chr
    wget -nv -O - https://gitlab.com/chromaway/core-tools/chromia-cli/-/package_files/227145377/download | tar -C /opt/chromaway/chr -xz

    # install management-console-3.52.0-dist.tar.gz
    wget -nv -O - https://gitlab.com/chromaway/core-tools/management-console/-/package_files/229134865/download | tar -C /opt/chromaway -xz

    if $GITLAB; then
        mkdir bin
        cp -R /opt/chromaway/ bin/
        link_chr_pmc
    else
        ln -s /opt/chromaway/chr/bin/chr /bin/chr
        ln -s /opt/chromaway/management-console/bin/pmc /bin/pmc
    fi
fi