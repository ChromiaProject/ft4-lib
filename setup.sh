#!/bin/bash
echo "Generating keypairs..."

keys=$(./postchain/lib/postchain.sh keygen | sed -nr 's/^[a-z]*: +([A-F0-9]{64,66})$/\1/ p');
{ read priv0; read pub0;} <<< "${keys}"

keys=$(./postchain/lib/postchain.sh keygen | sed -nr 's/^[a-z]*: +([A-F0-9]{64,66})$/\1/ p');
{ read priv1; read pub1;} <<< "${keys}"

echo "Setting .env..."

sed -i -r -e '/ADMIN_0_PUB/ s/([A-F0-9]{66})$/'$pub0'/' .env;
sed -i -r -e '/ADMIN_0_PRIV/ s/([A-F0-9]{64})$/'$priv0'/' .env;

sed -i -r -e '/ADMIN_1_PUB/ s/([A-F0-9]{66})$/'$pub1'/' .env;
sed -i -r -e '/ADMIN_1_PRIV/ s/([A-F0-9]{64})$/'$priv1'/' .env;

echo "Setting run.xml..."

keys=$(sed -nr 's/^.*([A-F0-9]{66}).*$/\1/ p' postchain/config/nodes/test/run.xml);
{ read old0; read old1;} <<< "${keys}"

sed -i -r 's/'$old0'/'$pub0'/' postchain/config/nodes/test/run.xml;
sed -i -r 's/'$old1'/'$pub1'/' postchain/config/nodes/test/run.xml;

echo "Done! Now you can start postchain and then run the tests!"
