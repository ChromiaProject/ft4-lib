#!/bin/bash

postgres=true

source ./scripts/multichain-runner.sh

generate_keypairs() {
  if [ ! -f "$USER_KEYPAIR_FILE" ]; then
    debug "User-level keypair file does not exist. Initiating generation."
    chr keygen > "$USER_KEYPAIR_FILE" \
      || fatal_error "Failed to generate user-level keypair."
  else
    debug "User-level keypair file already exists. Skipping generation."
  fi
}

register_account_on_chain() {
  local blockchain_rid=$1

  chr tx \
    --blockchain-rid $blockchain_rid \
    ft4.admin.register_account '[0, [["A","T"], x"'$USER_PUBKEY'"], null]' \
    --await \
    --secret $ADMIN_KEYPAIR_FILE
}

retrieve_account_id() {
  USER_ACCOUNT_ID_RAW_OUTPUT=$(
    chr query \
      --blockchain-rid $1 \
      ft4.get_accounts_by_participant_id \
      -- "{id=$USER_PUBKEY}" \
      2>/dev/null
  )

  # Extract the account ID
  USER_ACCOUNT_ID=$(grep -o 'x"[A-Fa-f0-9]*"' <<< "$USER_ACCOUNT_ID_RAW_OUTPUT")

  # Remove the x" " wrapper using tr
  USER_ACCOUNT_ID=$(tr -d 'x"' <<< "$USER_ACCOUNT_ID")
}

fetch_test_asset_brid() {
  ASSET_RAW_OUTPUT=$( 
    chr query \
      --blockchain-rid $MULTICHAIN00_BRID \
      ft4.get_all_assets \
      -- '{page_size=1, page_cursor=null}' \
      2> /dev/null
  )
  
  # Extract the asset ID
  TEST_ASSET_BRID=$(
    echo "$ASSET_RAW_OUTPUT" \
      | grep -o '\bid=x"[A-Fa-f0-9]*"' \
      | awk -F'x"' '{print $2}' \
      | tr -d '"'
  )
  
  # Check if TEST_ASSET_BRID is empty, then exit with an error
  [ -z "$TEST_ASSET_BRID" ] && fatal_error "Failed to fetch the asset BRID."
}

print_summary() {
  echo -e "\n\n--- SUMMARY ---"
  echo "Copy the following into your code as needed:"
  echo -e "Multichain00 BRID: \033[1m$MULTICHAIN00_BRID\033[0m"
  echo -e "Multichain02 BRID: \033[1m$MULTICHAIN02_BRID\033[0m"
  echo -e "User Account ID:   \033[1m$USER_ACCOUNT_ID\033[0m"
  echo -e "User Private Key:  \033[1m$USER_PRIVKEY\033[0m"
  echo -e "Test Asset ID:     \033[1m$TEST_ASSET_BRID\033[0m"
  echo "-----------------"
}

main() {
  generate_keypairs

  log "Registering user account..."

  # Extract both pubkey and privkey from the keypair file
  USER_PUBKEY=$(awk '/pubkey:/ {print $2}' "$USER_KEYPAIR_FILE")
  USER_PRIVKEY=$(awk '/privkey:/ {print $2}' "$USER_KEYPAIR_FILE")

  # Call the function for multichain00 and multichain02
  register_account_on_chain $MULTICHAIN00_BRID
  register_account_on_chain $MULTICHAIN02_BRID

  retrieve_account_id $MULTICHAIN00_BRID

  log "Registering test asset..."

  chr tx \
      --blockchain-rid $MULTICHAIN00_BRID \
      ft4.admin.register_asset TestAsset TST 6 https://url-to-asset-icon \
      --await \
      --secret $ADMIN_KEYPAIR_FILE

  fetch_test_asset_brid

  # Proceed with the rest of your script
  log "Initiating cross-chain asset registration..."

  chr tx --blockchain-rid $MULTICHAIN02_BRID \
      ft4.admin.register_crosschain_asset TestAsset TST 6 $MULTICHAIN00_BRID https://url-to-asset-icon \
      $MULTICHAIN00_BRID \
      --await \
      --secret $ADMIN_KEYPAIR_FILE

  log "Asset registered. Proceeding to mint assets on source chain..."

  chr tx --blockchain-rid $MULTICHAIN00_BRID \
      ft4.admin.mint $USER_ACCOUNT_ID $TEST_ASSET_BRID 1000000000L \
      --await \
      --secret $ADMIN_KEYPAIR_FILE

  log "Asset minting complete. Multi-chain demo setup successfully executed."

  print_summary
  echo "Press Ctrl+C to exit."

  # Wait for the user to press Ctrl+C to quit
  trap "echo 'Exiting script.'; exit" INT
  while :; do sleep 1; done
}

# Global variables, defined here for clarity
ADMIN_KEYPAIR_FILE="$BASE_CONFIG_DIR/ft4-admin.keypair"
USER_KEYPAIR_FILE="$DEPENDENCIES_PATH/.user.keypair"

# Call the main function
main
