#!/bin/sh
which="latest"
OLD_BRID=$CURRENT_BRID_LATEST
VARIABLE_UUID="98de4c85-1f75-4dc9-85b4-c99fa59bcd76"
WALLET_VARIABLE_UUID="a5191218-79f9-4b48-99ed-4ac0bf138bea"
while :; do
    case $1 in
        --stable)
              echo 'Deploying to stable'
              which="stable"
              OLD_BRID=$CURRENT_BRID_STABLE
              VARIABLE_UUID="3539621a-e2e1-4f18-9667-2b2fe3b7ca61"
              WALLET_VARIABLE_UUID="4cb2f3f6-3f52-4b66-b37c-532825307b1b"
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

ZULIP_MESSAGE="Releasing: ${which}. "
EXIT_EARLY=0

echo "\nBuilding..."

if [ $which = "stable" ]; then
    printf "// stable" >> rell/src/main/module.rell # makes unique brid
fi
chr build -s configs/devnet1.yml --hide-lib-warnings

echo "\nPausing the old network..."
sed -E -i 's/x"[0-9A-F]{64}" #'$which'/x"'$OLD_BRID'" #'$which'/' configs/devnet1.yml
chr deployment pause -d $which -bc ft_deploy -s configs/devnet1.yml

PAUSED_OLD_CHAIN=$?
[ $PAUSED_OLD_CHAIN -eq 0 ] && echo "Old chain paused" || echo "Couldn't pause old chain"

sed -E -i 'N;s/chains:\n\s+ft_deploy: x"[0-9A-F]{64}" #'$which'/#'$which'/;P;D' configs/devnet1.yml

echo -n "\nDeploying a new one... "
BRID=$( echo y | chr deployment create -d $which -bc ft_deploy -s configs/devnet1.yml | grep -oE '[0-9A-F]{64}' )

if [ -z "$BRID" ]; then
    printf "Error during deployment!\n" >&2
    ZULIP_MESSAGE="${ZULIP_MESSAGE}Failed!"
    EXIT_EARLY=1
else 
    ZULIP_MESSAGE="${ZULIP_MESSAGE}Success! BRID:\`$BRID\`"
fi

curl -X POST https://chromadev.zulipchat.com/api/v1/messages \
    -u $BOT_EMAIL_ADDRESS:$BOT_API_KEY \
    --data-urlencode type=stream \
    --data-urlencode 'to="Chromia Wallet"' \
    --data-urlencode 'topic=deploy bot' \
    --data-urlencode "content=$ZULIP_MESSAGE" 

printf "\n\nZulip message:\n${ZULIP_MESSAGE}\n\n"

if [ $EXIT_EARLY -ne 0 ]; then
    exit 1
fi

printf "\nDone!\nNew brid: $BRID\n"


echo "editing pipeline variable on ft3-lib repo... "
curl -s --request PUT \
  --url 'https://api.bitbucket.org/2.0/repositories/chromawallet/ft3-lib/pipelines_config/variables/%7B'$VARIABLE_UUID'%7D' \
  --header 'Accept: application/json' --header "Content-Type: application/json" \
  --data '{"value":"'$BRID'"}' \
  --header "Authorization: Bearer $BRID_DEPLOYMENT_TOKEN"

printf "\nediting pipeline variable on wallet repo\n"
echo "global (1/?)"
curl -s --request PUT \
    --url 'https://api.bitbucket.org/2.0/repositories/chromawallet/chromia-wallet/pipelines_config/variables/%7B'$WALLET_VARIABLE_UUID'%7D' \
    --header 'Accept: application/json' --header "Content-Type: application/json" \
    --data '{"value":"'$BRID'"}' \
    --header "Authorization: Bearer $WALLET_BRID_UPDATER"

if [ $which = "stable" ]; then
    printf "\ntest (2/4)\n"
    curl -s --request PUT \
        --url 'https://api.bitbucket.org/2.0/repositories/chromawallet/chromia-wallet/deployments_config/environments/%7B7a5611ab-075c-407a-a14b-4a2adc2e696c%7D/variables/%7B5d61e94f-0f94-4db5-b666-6e9f68c6b388%7D' \
        --header 'Accept: application/json' --header "Content-Type: application/json" \
        --data '{"value":"'$BRID'"}' \
        --header "Authorization: Bearer $WALLET_BRID_UPDATER"
    printf "\ndev (3/4)\n"
    curl -s --request PUT \
        --url 'https://api.bitbucket.org/2.0/repositories/chromawallet/chromia-wallet/deployments_config/environments/%7Bba751f68-4454-42b3-8b8b-62ee36e22751%7D/variables/%7B580da712-f600-40c7-8bf4-37de76224006%7D' \
        --header 'Accept: application/json' --header "Content-Type: application/json" \
        --data '{"value":"'$BRID'"}' \
        --header "Authorization: Bearer $WALLET_BRID_UPDATER"
    printf "\nprod (4/4)\n"
    curl -s --request PUT \
        --url 'https://api.bitbucket.org/2.0/repositories/chromawallet/chromia-wallet/deployments_config/environments/%7B6714c227-673b-448e-95df-2b30ad6882fd%7D/variables/%7Be91a0ba3-4b94-47da-8d2d-5ddc1ada6ec0%7D' \
        --header 'Accept: application/json' --header "Content-Type: application/json" \
        --data '{"value":"'$BRID'"}' \
        --header "Authorization: Bearer $WALLET_BRID_UPDATER"
    printf "\nrunning wallet pipeline... \n"
    curl -s --request POST \
        --url 'https://api.bitbucket.org/2.0/repositories/chromawallet/chromia-wallet/pipelines' \
        --header 'Accept: application/json' --header "Content-Type: application/json" \
        -d '
            {
                "target": {
                    "type": "pipeline_ref_target",
                    "ref_type": "branch",
                    "ref_name": "develop",
                    "selector": {
                        "type": "custom",
                        "pattern": "remote-deploy"
                    }
                }
            }' \
        --header "Authorization: Bearer $WALLET_BRID_UPDATER"
    printf "\n\nDeployment started!\n\n"
fi
