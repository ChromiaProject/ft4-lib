#!/bin/sh

# install chromia-cli-0.17.2-dist.tar.gz
mkdir -p /opt/chromaway/chr
wget -nv -O - https://gitlab.com/chromaway/core-tools/chromia-cli/-/package_files/122213957/download | tar -C /opt/chromaway/chr -xz
ln -s /opt/chromaway/chr/bin/chr /bin/chr

# install management-console-3.21.4-dist.tar.gz
wget -nv -O - https://gitlab.com/chromaway/core-tools/management-console/-/package_files/120749882/download | tar -C /opt/chromaway -xz
ln -s /opt/chromaway/management-console/bin/pmc /bin/pmc
