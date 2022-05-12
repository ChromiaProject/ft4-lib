# FT3 Library

FT3 Library is a library for Rell modules (Chromia smart contract language).
It can be imported and used as a token provider and manager.
It allows several operations, among them: creation of different assets (type of tokens), allocation of tokens, transfer, and cross crosschain transfer.
It also have some basic data structure for users (account) that can be used independently from the use of the tokens.

# The repository

This repository  provides the library and tests written in NodeJs and Jest. It is a temporary counter measure as in the future we will have proper testing suite based on Rell.

# How to run tests

first of all, start the testing blockchain (You need a .env file in the root folder of the project): 

 ./postchain/bin/run-node.sh test --wipe-db

then, run the tests:

npm run test [-t testName]


# How to run the blockchain
