# Transfer open strategy account registration demo

## Introduction

This FT4 example showcases account registration using `transfer open` strategy.
The strategy is configured to register accounts only for crosschain transfers where sender and recipient IDs are same.
On the first chain `Test` asset is registered dynamically, while on the second chain asset is
registered using `init` operation. Sender account is registered with a custom
operation `custom_register_account` using `open` strategy. The operations mints 100 `Test` assets to the user account.
Recipient account is registered with standard `register_account` operation using `transfer open` strategy.

## How to run

### Blockchain

1. start postgres database
2. run `chr install` to install rell dependencies
3. run `chr node start --directory-chain-mock --wipe` to start simple network

### Client

1. navigate to `client` directory
2. run `npm install` to install dependencies
3. run `npm run register-account` to register accounts

Note: the script create two new accounts each time it is executed.
