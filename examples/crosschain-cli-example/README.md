# Simple FT4 cross-chain demo

## Introduction

This simple app demos cross-chain transfer between two chains. On the first
chain asset is registered on the fly, while on the second chain asset is
registered with `init` operation. Sender account is registered with a custom
operation `custom_register_account`, that mints 100 test assets to user account,
while recipient account is registered with standard `register_account`
operation, using `open` strategy (i.e. account creation is free and anyone can
register an account).

Note: This is a simple example that showcases cross-chain transfers and should
not be used in production.

## How to run

### Blockchain

1. start postgres database
2. run `chr install` to install rell dependencies
3. run `chr node start --directory-chain-mock --wipe` to start simple network

### Client

1. navigate to `client` directory
2. run `npm install` to install dependencies
3. run `npm run transfer` to register two accounts and transfer assets between
   them

Note: the script create two new accounts each time it is executed.
