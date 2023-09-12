# FT4 Library

FT4 Library is a library for Rell modules (Chromia smart contract language).
It can be imported and used as a token provider and manager.
It allows several operations, among them: creation of different assets (type of tokens), allocation of tokens, and transfer.
It also have some basic data structure for users (account) that can be used independently from the use of the tokens.

# The repository

This repository provides the TypeScript (client) and Rell (blockchain) libraries and tests.

# How to run tests

`npm run test` will take care of everything, launching the blockchain and running bot typescript and rell tests.

`npm run test:js` and `npm run test:rell` will only run one kind of test

If you want to run just certain jest tests, use:
    npm run test[:js] 'string matching test(s)'
Example:
npm run test 'user' will only run js tests with user in their name, and all rell tests
npm run test:js 'rate|sso' will only run js tests with either rate or sso in their name, and no rell tests


# How to run the blockchain


"postchain:test": "docker-compose -f dockers/rell-test.yml up -d",
"postchain:demo": "docker-compose -f dockers/demo.yml up -d",
"stop-postchain:jest": "docker-compose -f dockers/jest-test.yml down",
"stop-postchain:rell": "docker-compose -f dockers/rell-test.yml down",
"stop-postchain:demo": "docker-compose -f dockers/demo.yml down",
