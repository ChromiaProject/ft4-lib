#!/bin/sh
while getopts 'h' OPTION; do
  case "$OPTION" in
    h)
      echo "If you want to run just certain jest tests, use:\n\n\tnpm run test[:js] 'string matching test(s)'\n"
      echo "Example:\nnpm run test 'user' will only run js tests with user in their name, and all rell tests"
      echo "npm run test:js 'rate|sso' will only run js tests with either rate or sso in their name, and no rell tests"
      exit 0
      ;;
    ?)
      echo "script usage: npm run test [-h] ['test name']" >&2
      exit 1
      ;;
  esac
done
shift "$(($OPTIND -1))"
npm run test:js "$@" && npm run test:rell
