#!/bin/sh

# install chromia-cli-0.20.1-dist.tar.gz
mkdir -p /opt/chromaway/chr
wget -nv -O - https://gitlab.com/chromaway/core-tools/chromia-cli/-/package_files/131721774/download | tar -C /opt/chromaway/chr -xz
ln -s /opt/chromaway/chr/bin/chr /bin/chr

# install management-console-3.21.7-dist.tar.gz
# wget -nv -O - https://gitlab.com/chromaway/core-tools/management-console/-/package_files/124654080/download | tar -C /opt/chromaway -xz
wget -nv -O - https://gitlab.com/chromaway/core-tools/management-console/-/package_files/139267062/download | tar -C /opt/chromaway -xz
ln -s /opt/chromaway/management-console/bin/pmc /bin/pmc
