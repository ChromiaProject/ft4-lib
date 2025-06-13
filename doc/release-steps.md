# Release steps

## Prerequisites

- merge master to development

## Changelog

These steps must be followed for `doc/release-notes/[rell|ts]`, depending on
whether it's a rell or ts release.

- update changelog version
  - duplicate Unreleased.md
  - rename new file to new version (Unreleased Copy -> X.X.X.md)
  - update version inside file as well, and set release date
  - ensure it has an ending newline
  - ensure release notes sections that are empty are removed
  - remove changes from (old) Unreleased.md so that it is clean for new changes

After having updated both Rell and TS changelog, generate change log with
`./scripts/compile-changelog.sh`

## Rell version [Can be omitted if a rell version is not released]

You first need to run `npm run version:rell -- [version or flag]` to update
version in rell. Examples:

- `npm run version:rell -- 1.1.0`
- `npm run version:rell -- -p` (for patch version)

After having run the above, you can make a PR to development branch, and wait
for tests before merging it.

Then, tag rell version `git tag vX.X.Xr` (for example `git tag v1.1.0r`)

## TS version

You can update the client version using
`npm version [<newversion> | major | minor | patch]`. This also tags the commit
with client version.

- publish `npm publish`

## Finalize the release

- push development
- create a pull request to main branch from development branch
- push `main` branch and tags (both rell and client)
- find rell lib hash
  - best way: `chr tools lib-model` should work from the next version of `chr`
  - alternative:
    - create a new folder on your machine
    - do `chr init`
    - update chromia.yml with new rell lib version
    - run `chr install`
    - get hash from error message
- publish release notes in zulip streams
- merge master to development
