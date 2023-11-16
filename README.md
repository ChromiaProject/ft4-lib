# FT4 Library: Asset and Account Management for Chromia's Rell and TypeScript Environments

## Introduction

The FT4 Library functions as a comprehensive toolkit engineered for both Rell and TypeScript modules in the Chromia blockchain ecosystem. Specialising in asset and account management, the library provides a suite of operations including asset issuance, allocation, and transfers, extending even to cross-chain capabilities. Furthermore, it establishes foundational data structures for account management, designed to operate independently of asset-related activities.

## Features

- **Asset Management**: Facilitate the creation, allocation, and management of assets. **Asset Allocation and Transfers**: Perform secure and efficient asset transfers.
- **Cross-Chain Transfers**: Enable the movement of assets between distinct blockchains.
- **Account Management**: Oversee user accounts independently of asset activities.

## Repository Overview

This repository contains the FT4 library and a comprehensive suite of tests written in Node.js and Jest. The current testing setup serves as a temporary measure, as a Rell-based testing suite is in development.

## Getting Started

### Prerequisites

- Node.js
- Docker
- [Optional] PostgreSQL for database sessions

### Installation

Clone the repository and install the dependencies:

```bash
git clone git@bitbucket.org:chromawallet/ft3-lib.git
cd ft3-lib
npm install
```

## Build

Build TypeScript library into `dist/`:

```bash
npm run build
```

Note that this will temporarily copy `package.json` into the source directory in order to extract the version string.

## How to Run Tests

### Comprehensive Test Suite

Run the complete set of TypeScript and Rell tests:

```bash
npm run test
```

Run only TypeScript or Rell tests:

```bash
npm run test:js
npm run test:rell
```

### Running Specific Rell Tests

To execute particular tests in Rell, use the `--tests` or `-t` option:

```bash
npm run test:rell -- --tests=test1,test2
npm run test:rell -- -t=test1,test2
```

### Running Specific Jest Tests

Execute specific Jest tests by string matching:

```bash
npm run test 'string matching test(s)'
```

Examples:

```bash
npm run test 'user'
npm run test:js 'rate|sso'
```

## How to Run the Blockchain

For running different blockchain configurations, you can use the following npm commands:

- **Test Environment**: `npm run postchain:test`
- **Demo Environment**: `npm run postchain:demo`

To stop these environments:

- **Test**: `npm run stop-postchain:jest`
- **Demo**: `npm run stop-postchain:demo`

## Changelog

Update changelog in `doc/release-notes/`, then run `./compile-changelog.sh` script to assemble 
`changelog.md` and `rell-changelog.md`. Do not update `changelog.md` or `rell-changelog.md` directly.

## License

This project is licensed under the Apache License, Version 2.0. For more details, see the [LICENSE](LICENSE) file in the repository or visit [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
