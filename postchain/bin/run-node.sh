
INPUT_DIR_ROOT="../config/nodes"
OUTPUT_DIR_ROOT="../runtime/nodes"
RELL_CFG="../lib/rellcfg.sh"

NODE_CONFIG_PROPS=node-config.properties
PRIVATE_PROPS=private.properties

print_usage () {
    echo "Usage: run-node.sh <node_config>"
    echo "Available configurations:"
    echo "-------------------------"
    for blockchain in $INPUT_DIR_ROOT/* ; do
        if [ -d $blockchain ] && [ ! -L $blockchain ]; then
            echo " `basename $blockchain`"
        fi
    done
    echo "-------------------------"
}

echo "Starting run-node.sh script..."

if [ "$#" -eq 0 ]; then
    echo "Error: Missing node configuration name"
    print_usage

    exit 1
elif [ "$#" -gt 1 ]; then
    echo "Error: Invalid number of arguments"
    print_usage

    exit 2
fi

if [ ! -d $INPUT_DIR_ROOT/${1} ] || [ ! -d $INPUT_DIR_ROOT/${1}/blockchains ]; then
    echo "Cannot find '$1' node configuration"
fi

rm -rf $OUTPUT_DIR_ROOT/$1
mkdir -p $OUTPUT_DIR_ROOT/$1

cp $INPUT_DIR_ROOT/${1}/$NODE_CONFIG_PROPS $OUTPUT_DIR_ROOT/${1}
cp $INPUT_DIR_ROOT/${1}/$PRIVATE_PROPS $OUTPUT_DIR_ROOT/${1}

i=1

for blockchain in $INPUT_DIR_ROOT/${1}/blockchains/* ; do
    if [ -d $blockchain ] && [ ! -L $blockchain ]; then
        blockchain_dir=$OUTPUT_DIR_ROOT/${1}/blockchains/$i
        mkdir -p $blockchain_dir
        cp $blockchain/brid.txt $blockchain_dir
        main_rell=`cat $blockchain/entry-file.txt`
        $RELL_CFG --template $blockchain/config.template.xml "$blockchain/${main_rell}" $blockchain_dir/0.xml
        ((i=i+1))
    fi
done

../lib/postchain.sh wipe-db -nc $OUTPUT_DIR_ROOT/${1}/node-config.properties
exec ../lib/postchain.sh run-node-auto -d $OUTPUT_DIR_ROOT/${1}


#exec postchain-node/postchain.sh run-node -cid 1 -nc config/node-config.properties