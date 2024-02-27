#!/bin/bash

postgres=true
deployment_script="rell/dep/deployments.yml"
NUM_BLOCKCHAINS=3

source ./scripts/multichain-runner.sh

generate_config() {
  debug "Generating config"
  sed "s/{manager_brid}/${MULTICHAIN_D1_BRID}/;" \
    configs/multichain-demo.yml.template > $deployment_script
  for chain_num in $(bash scripts/chain-numbers.sh $NUM_BLOCKCHAINS)
  do
    chain_rid=$(eval "echo \${MULTICHAIN${chain_num}_BRID}")
    echo "      deploy$chain_num: x\"${chain_rid}\"" >> $deployment_script
  done
}

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
  local num=$1

  chr tx -d local -bc "deploy$num" -s $deployment_script \
    ft4.admin.register_account '[0, [["A","T"], x"'$USER_PUBKEY'"], null]' \
    --await \
    --secret $ADMIN_KEYPAIR_FILE
}

retrieve_account_id() {
  local num=$1

  USER_ACCOUNT_ID_RAW_OUTPUT=$(
    chr query \
      -d local -bc "deploy$num" -s $deployment_script \
      ft4.get_accounts_by_signer \
      -- "[\"id\":\"$USER_PUBKEY\", \"page_size\": 1, \"page_cursor\": null]" 
  )

  # Extract the account ID
  USER_ACCOUNT_ID=$(grep -Eo '[A-Fa-f0-9]{64}' <<< "$USER_ACCOUNT_ID_RAW_OUTPUT")
}

fetch_test_asset_brid() {
  ASSET_RAW_OUTPUT=$( 
    chr query \
      -d local -bc "deploy00" -s $deployment_script \
      ft4.get_all_assets \
      -- '["page_size":1, "page_cursor":null]'
  )

  # Extract the asset ID
  TEST_ASSET_BRID=$(
    echo "$ASSET_RAW_OUTPUT" \
      | grep -o '"id": x"[A-Fa-f0-9]*"' \
      | grep -Eo "[A-Fa-f0-9]{64}"
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
  generate_config
  generate_keypairs

  log "Registering user account..."

  # Extract both pubkey and privkey from the keypair file
  USER_PUBKEY=$(awk '/pubkey:/ {print $2}' "$USER_KEYPAIR_FILE")
  USER_PRIVKEY=$(awk '/privkey:/ {print $2}' "$USER_KEYPAIR_FILE")

  # Call the function for multichain00 and multichain02
  register_account_on_chain 00
  register_account_on_chain 02

  retrieve_account_id 00

  log "Registering test asset..."

  chr tx \
      -d local -bc "deploy00" -s $deployment_script \
      ft4.admin.register_asset TestAsset TST 6 https://url-to-asset-icon \
      --await \
      --secret $ADMIN_KEYPAIR_FILE

  fetch_test_asset_brid

  # Proceed with the rest of your script
  log "Initiating cross-chain asset registration..."

  chr tx \
      -d local -bc "deploy02" -s $deployment_script \
      ft4.admin.register_crosschain_asset TestAsset TST 6 $MULTICHAIN00_BRID \
      https://url-to-asset-icon \
      $MULTICHAIN00_BRID \
      --await \
      --secret $ADMIN_KEYPAIR_FILE

  log "Asset registered. Proceeding to mint assets on source chain..."

  chr tx \
      -d local -bc "deploy00" -s $deployment_script \
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
