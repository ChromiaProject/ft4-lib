#!/bin/bash

# Exit script on any error
set -e

# Running Rell tests
echo "Running Rell tests..."
./scripts/relltest.sh --

# Running unit tests with Jest
echo "Running unit tests..."
npx jest -maxWorkers=1 --testPathPattern=unit/

# Running integration tests with Jest
echo "Running integration tests..."
TESTCONTAINERS_RYUK_DISABLED=true \
    npx jest \
    -maxWorkers=1 \
    --config=jest.config.integration.js \
    --testPathPattern=integration/

# Running E2E tests with Synpress
echo "Running E2E tests..."
./scripts/start-e2e-environment.sh --run-tests-headless

echo "All tests completed successfully."
