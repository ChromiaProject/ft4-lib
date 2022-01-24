![Chromia logo](https://bitbucket.org/chromawallet/ft3-lib/raw/master/chromia-logo-60.png)
# FT3 Library

[FT3][1] is the recommended standards to handle accounts and tokens in [Chromia][2] ecosystem.

[FT3 Library][3] is a communication library for [Rell][4] modules (Chromia smart contract language). It allow dapps to
make full use of Chromia Vault, including Single Sign-On (SSO), assets transfer and visibility on the Vault’s dapp
explorer.

[Learn more about Chromia, Rell & FT3][5].

## The repository

This repository provides the library, TypeScript types and tests written in NodeJs and Jest.

## Installation & usage

[Read the docs][3] to learn how to use this library.

## Full-featured TypeScript usage

Read how to get the most of TypeScript with ft3-lib [in the TS docs][6].

## Develop & testing

To start development of this library do the following:
- install dependencies
- copy `.env.sample` as `.env`
- use docker-compose file from `test-docker` directory to start up a database preconfigured to work with Rell
- head to `rell` directory and run `./restart-devnet.sh` and keep it running
- look for something like `+ BRID=HASH_HERE` in the output of `restart-devnet.sh` script
- edit `.env` and use these demo values:
  - `CHAIN_ID` = hash you have found earlier
  - `NODE_URL` = `http://localhost:7740`
  - `ADMIN_PUB` = `039a2b0785d62e9dc0d9720fe5add001d409706aab049fa603205bc08f89126984`
  - `ADMIN_PRIV` = `75001c141b51b3dfe46b7c4c7bce4acdc78810ef5f144ff3dcbb6bb26f8d7509`
- run `npm test` to run tests

[1]: https://rell.chromia.com/en/master/advanced-topics/ft3.html
[2]: https://chromia.com
[3]: https://rell.chromia.com/en/master/advanced-topics/ft3/ft3-javascript-library.html
[4]: https://rell.chromia.com/en/master/rell-basics/main-concepts.html
[5]: https://rell.chromia.com/en/master/index.html
[6]: https://bitbucket.org/chromawallet/ft3-lib/src/master/TYPESCRIPT.md