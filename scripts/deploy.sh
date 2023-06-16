#!/bin/sh
which="auto"
while :; do
    case $1 in
        --manual)
              echo 'Deploying to manual'
              which="manual"
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

echo "\nBuilding..."
chr build -s configs/devnet1.yaml

echo "\nPausing the old network..."
chr deployment pause -d $which -bc ft_deploy -s configs/devnet1.yaml
sed -E -i 'N;s/chains:\n\s+ft_deploy: x"[0-9A-F]{64}" #'$which'/#'$which'/;P;D' configs/devnet1.yaml

echo -n "\nDeploying a new one... "
BRID=$( echo y | chr deployment create -d $which -bc ft_deploy -s configs/devnet1.yaml | grep -oE '[0-9A-F]{64}' )
echo "new brid: $BRID"

sed -E -i 's/#'$which'/chains:\n      ft_deploy: x"'$BRID'" #'$which'/' configs/devnet1.yaml