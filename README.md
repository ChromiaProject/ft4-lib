# FT4 Library: Asset and Account Management for Chromia's Rell and TypeScript Environments

## Introduction

The FT4 library is a toolkit to help dApp developers build real world applications
within the Chromia ecosystem by providing out of the box support for things such as
account creation and access management and interaction with external signature solutions
already familiar to the user. It also provides asset management. Allowing issuance,
allocation and transfers and tracing of asset activities, both within a chain as well
as across other chains within the Chromia ecosystem.

## Features

- **Asset Management**: Facilitate the creation, allocation, and management of
  assets.
- **Asset Allocation and Transfers**: Perform secure and efficient asset
  transfers.
- **Cross-Chain Transfers**: Enable the movement of assets between distinct
  blockchains.
- **Account Registration and Management**: Create and oversee user accounts
  independently of asset activities.

A full documentation on how to use the various features of the library can be
found on the [official docs page](https://docs.chromia.com/category/ft4-accounts-and-tokens).

## Repository Overview

This repository contains the FT4 library and a comprehensive suite of tests
written in Node.js and Jest. The current testing setup serves as a temporary
measure, as a Rell-based testing suite is in development.

## Getting Started

### Prerequisites

- Node.js
- [Chromia CLI](https://docs.chromia.com/getting-started/dev-setup/cli-installation)
- Docker
- [Optional] PostgreSQL for database sessions

### Installation

Clone the repository and install the dependencies:

```bash
git clone git@bitbucket.org:chromawallet/ft3-lib.git
cd ft3-lib
npm install
chr install
```

## Build

Build TypeScript library into `dist/`:

```bash
npm run build
```

## How to Run Tests

### Comprehensive Test Suite

Run the complete set of Rell and TypeScript tests:

```bash
npm run test
```

Run only Rell or TypeScript tests:

```bash
npm run test:rell
npm run test:js
```

The TypeScript tests can be run with even more granularity:
```bash
npm run test:js-unit # does not make any calls to a real blockchain
npm run test:js-integration # stars a single blockchain which it interacts with
npm run test:js-multichain # Stars a cluster of chains which it interacts with
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
npm run test:js 'string matching test(s)'
```

Examples:

```bash
npm run test:js 'user'
npm run test:js 'rate|sso'
```

## Running End-to-End Tests with Cypress

### Interactive Mode

Run e2e tests interactively:

```bash
npm run test:e2e
```

### Headless Mode

Run e2e tests in headless mode:

```bash
npm run test:e2e:headless
```

## Changelog

Update changelog in `doc/release-notes/`, then run `./scripts/compile-changelog.sh`
script to assemble `changelog.md` and `rell-changelog.md`. Do not update
`changelog.md` or `rell-changelog.md` directly.

## License

This project is licensed under the Apache License, Version 2.0. For more
details, see the [LICENSE](LICENSE) file in the repository or visit
[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
