
POSTCHAIN_DIR="`( cd \"${BASH_SOURCE%/*}/..\" && pwd )`"
INPUT_DIR_ROOT="$POSTCHAIN_DIR/config/nodes"
OUTPUT_DIR_ROOT="$POSTCHAIN_DIR/runtime/nodes"
POSTCHAIN_SCRIPT="$POSTCHAIN_DIR/lib/postchain.sh"
MULTIGEN_SCRIPT="$POSTCHAIN_DIR/lib/multigen.sh"
SRC_DIR="$POSTCHAIN_DIR/../rell/src"

NODE_CONFIG_PROPS=node-config.properties
PRIVATE_PROPS=private.properties

print_usage () {
    echo "Usage: run-node.sh <node_config> [options]"
    echo ""
    echo "Options:"
    echo "-W, --wipe-db         wipe database"
    echo "-a, --api-port        api port"
    echo "-n, --node-port       node port"
    echo "-s, --save-to-config  if api or node port is specified on command line, they will be saved to node config"
    echo "-p                    production mode"
    echo ""
    echo "Available configurations:"
    for blockchain in $INPUT_DIR_ROOT/* ; do
        if [ -d $blockchain ] && [ ! -L $blockchain ]; then
            echo " `basename $blockchain`"
        fi
    done
    echo ""
}

update_api_port () {
    sed -i '' "s|\(api\.port=\)\(.*\)|\1$1|" $2
}

update_node_port () {
    echo "$1"
    echo "$2"
    echo "$3"
    sed -i '' "s|\(node\.$1\.port=\)\(.*\)|\1$2|" $3
}

if [ "$#" -eq 0 ]; then
    echo "Error: Missing node configuration name"
    print_usage

    exit 1
fi

WIPE_DB=false
API_PORT=""
NODE_PORT=""
SAVE_TO_CONFIG=false
PROD_NODE=false

CONF="$1"
shift



if [ ! -d $INPUT_DIR_ROOT/$CONF ] || [ ! -f $INPUT_DIR_ROOT/$CONF/run.xml ]; then
    echo "Error: Cannot find '$CONF' node configuration"
    print_usage

    exit 3
fi

while (( "$#" )); do
    case "$1" in
        -W|--wipe-db)
            WIPE_DB=true
            shift
            ;;
        -a|--api-port)
            API_PORT=$2
            shift 2
            ;;
        -n|--node-port)
            #NODE_ID=$2
            NODE_PORT=$3
            shift 3
            ;;
        -s|--save-to-config)
            SAVE_TO_CONFIG=true
            shift
            ;;
        -p|--prod)
            PROD_NODE=true
            shift
            ;;
    esac
done


echo "Starting run-node.sh script..."

rm -rf $OUTPUT_DIR_ROOT/$CONF
mkdir -p $OUTPUT_DIR_ROOT/$CONF

cp $INPUT_DIR_ROOT/$CONF/$NODE_CONFIG_PROPS $OUTPUT_DIR_ROOT/$CONF
cp $INPUT_DIR_ROOT/$CONF/$PRIVATE_PROPS $OUTPUT_DIR_ROOT/$CONF

if [ ! -z "$API_PORT" ]; then
    update_api_port "$API_PORT" "$OUTPUT_DIR_ROOT/$CONF/$NODE_CONFIG_PROPS"

    if [ "$SAVE_TO_CONFIG" = true ]; then
        update_api_port "$API_PORT" $INPUT_DIR_ROOT/$CONF/$NODE_CONFIG_PROPS
    fi
fi

if [ ! -z "$NODE_PORT" ]; then
    update_node_port 0 "$NODE_PORT" "$OUTPUT_DIR_ROOT/$CONF/$NODE_CONFIG_PROPS"

    if [ "$SAVE_TO_CONFIG" = true ]; then
        update_node_port 0 "$NODE_PORT" $INPUT_DIR_ROOT/$CONF/$NODE_CONFIG_PROPS
    fi
fi

ENV_CONFIG="$INPUT_DIR_ROOT/$CONF"
if [ -d "$ENV_CONFIG" ] && [ ! -L "$ENV_CONFIG" ]; then
    BLOCKCHAIN_DIR="$OUTPUT_DIR_ROOT/$CONF"
    "$MULTIGEN_SCRIPT" -d "$SRC_DIR" -o "$BLOCKCHAIN_DIR" "$ENV_CONFIG/run.xml"
    if [ "$?" -ne 0 ]; then
        echo "Compilation error!!!"
        exit 1
    fi
fi

if [ "$WIPE_DB" = true ]; then
    echo "Wiping database ..."
    "$POSTCHAIN_SCRIPT" wipe-db -nc "$OUTPUT_DIR_ROOT/$CONF/$NODE_CONFIG_PROPS"
fi


if [ "$PROD_NODE" = true ]; then
    exec "$POSTCHAIN_SCRIPT" run-node -cid 1 -nc "$OUTPUT_DIR_ROOT/$CONF/$NODE_CONFIG_PROPS"
else
    exec "$POSTCHAIN_SCRIPT" run-node-auto -d "$OUTPUT_DIR_ROOT/$CONF"
fi
