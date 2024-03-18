#!/bin/sh

# install chromia-cli-0.16.3-dist.tar.gz
mkdir -p /opt/chromaway/chr
wget -nv -O - https://gitlab.com/chromaway/core-tools/chromia-cli/-/package_files/117777664/download | tar -C /opt/chromaway/chr -xz
ln -s /opt/chromaway/chr/bin/chr /bin/chr

# install management-console-3.19.2-dist.tar.gz
wget -nv -O - https://gitlab.com/chromaway/core-tools/management-console/-/package_files/109244030/download | tar -C /opt/chromaway -xz
ln -s /opt/chromaway/management-console/bin/pmc /bin/pmc
