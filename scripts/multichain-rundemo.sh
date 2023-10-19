#!/bin/bash

source ./scripts/multichain-runner.sh

log "Registering the cross-chain asset..."

chr tx ft4.admin.register_crosschain_asset \
  5E2488889F72939DD4D0A034FB91893ACBF14C7EDBCEF2A9F5C621A07169EAD2 \
TST \
  100000000L \
  --await --secret ft4-admin.keypair

log "Minting the assets to the source chain..."

chr tx ft4.admin.mint \
  5E2488889F72939DD4D0A034FB91893ACBF14C7EDBCEF2A9F5C621A07169EAD2 \
  85506832C77AFDDB17DE1D175BAEE949C9248578E06CAC3EC7B59AA69C7C69B0 \
  100L \
  --await --secret ft4-admin.keypair
