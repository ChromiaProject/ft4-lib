# FT4 Library: Chromia's Rell Module Manager

## Introduction

FT4 Library is a robust toolkit designed for Rell modules in Chromia, a next-generation blockchain platform. This library serves as both a token provider and manager, offering a variety of operations. These include asset creation, token allocation, transfers, and even cross-chain transfers. Moreover, the library features foundational data structures for user accounts, independent of token operations.

## Features

- **Asset Management**: Create and manage multiple types of tokens.
- **Token Operations**: Allocate and transfer tokens with ease.
- **Cross-Chain Transfers**: Seamlessly move assets across different blockchains.
- **User Account Management**: Manage user accounts with or without tokens.

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
git clone https://github.com/your-repo/ft3-library.git
cd ft3-library
npm install
```

## How to Run Tests

### Comprehensive Test Suite

Run the complete set of TypeScript and Rell tests:

```bash
npm run test
```

Run only JavaScript or Rell tests:

```bash
npm run test:js
npm run test:rell
```

### Running Specific Rell Tests

Execute specific Rell modules using the `--modules` or `-m` option:

```bash
npm run test:rell -- --modules=module1,module2
npm run test:rell -- -m=module1,module2
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

## License

This project is licensed under the Apache License, Version 2.0. For more details, see the [LICENSE](LICENSE) file in the repository or visit [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
