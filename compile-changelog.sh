#!/bin/bash

cat doc/release-notes/rell/Header.md >rell-changelog.md
for file in $(ls -1 -r doc/release-notes/rell/[0-9]*); do
  echo >>rell-changelog.md
  cat "${file}" >>rell-changelog.md
done

cat doc/release-notes/ts/Header.md >changelog.md
for file in $(ls -1 -r doc/release-notes/ts/[0-9]*); do
  echo >>changelog.md
  cat "${file}" >>changelog.md
done
