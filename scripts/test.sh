#!/bin/sh
echo "If you want to run just certain jest tests, use:\n\n\tnpm run test 'string matching test(s)'\n"
echo "Example: npm run 'rate|sso' will only run tests with either rate or sso in their name"
npm run test:js "$@" && npm run test:rell
