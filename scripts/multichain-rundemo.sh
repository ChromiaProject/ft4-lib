#!/bin/bash

source ./scripts/multichain-runner.sh

TEST_ASSET_BRID="BD4D3A0D3797080E581631E74E622F90E58EC9DD426B66F07AA7D3D65B8DAFE6"

register_account_on_chain() {
  local blockchain_rid=$1

  chr tx \
      --blockchain-rid $blockchain_rid \
      ft4.admin.register_account '[0, [["A","T"], x"'$USER_PUBKEY'"], null]' \
      --await \
      --secret $ADMIN_KEYPAIR_FILE
}

debug "Initiating generation of admin-level keypair."

debug "Initiating generation of user-level keypair."

# Keypair file paths
ADMIN_KEYPAIR_FILE="$DEPENDENCIES_PATH/.ft4-admin.keypair"
USER_KEYPAIR_FILE="$DEPENDENCIES_PATH/.user.keypair"

# Generate keypair
chr keygen > "$USER_KEYPAIR_FILE"

log "Registering user account..."

# Extract both pubkey and privkey from the keypair file
USER_PUBKEY=$(awk '/pubkey:/ {print $2}' "$USER_KEYPAIR_FILE")
USER_PRIVKEY=$(awk '/privkey:/ {print $2}' "$USER_KEYPAIR_FILE")

# Call the function for MULTICHAIN00 and MULTICHAIN02
register_account_on_chain $MULTICHAIN00_BRID
register_account_on_chain $MULTICHAIN02_BRID

# Retrieve the account ID
USER_ACCOUNT_ID_RAW_OUTPUT=$(
  chr query \
    --blockchain-rid $MULTICHAIN00_BRID \
    ft4.get_accounts_by_participant_id \
    -- "{id=$USER_PUBKEY}" \
    2>/dev/null
)

# Use grep to robustly extract the account ID
USER_ACCOUNT_ID=$(grep -o 'x"[A-Fa-f0-9]*"' <<< "$USER_ACCOUNT_ID_RAW_OUTPUT")

# Remove the x" " wrapper using tr
USER_ACCOUNT_ID=$(tr -d 'x"' <<< "$USER_ACCOUNT_ID")

log "Registering test asset..."

chr tx \
    --blockchain-rid $MULTICHAIN00_BRID \
    ft4.admin.register_asset TestAsset TST 6 https://url-to-asset-icon \
    --await \
    --secret $ADMIN_KEYPAIR_FILE

log "Initiating cross-chain asset registration..."

chr tx --blockchain-rid $MULTICHAIN02_BRID \
    ft4.admin.register_crosschain_asset TestAsset TST 6 $TEST_ASSET_BRID https://url-to-asset-icon \
    $MULTICHAIN00_BRID \
    --await \
    --secret $ADMIN_KEYPAIR_FILE

log "Asset registered. Proceeding to mint assets on source chain..."

chr tx --blockchain-rid $MULTICHAIN00_BRID \
    ft4.admin.mint $USER_ACCOUNT_ID $TEST_ASSET_BRID 1000L \
    --await \
    --secret $ADMIN_KEYPAIR_FILE

log "Asset minting complete. Multi-chain demo setup successfully executed."

# Summary for easy copy-pasting
echo -e "\n\n--- SUMMARY ---"
echo "Copy the following into your code as needed:"
echo -e "Multichain00 BRID: \033[1m$MULTICHAIN00_BRID\033[0m"
echo -e "Multichain02 BRID: \033[1m$MULTICHAIN02_BRID\033[0m"
echo -e "User Account ID:   \033[1m$USER_ACCOUNT_ID\033[0m"
echo -e "User Private Key:  \033[1m$USER_PRIVKEY\033[0m"
echo -e "Test Asset ID:     \033[1m$TEST_ASSET_BRID\033[0m"
echo "-----------------"
echo "Press Ctrl+C to exit."

# Wait for the user to press Ctrl+C to quit
trap "echo 'Exiting script.'; exit" INT
while :; do sleep 1; done
