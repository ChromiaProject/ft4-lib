## [Unreleased] - 2025-xx-xx

### Breaking 💔

### Changed 🪙

### Added ✅

- `transactionBuilder` now accepts `null` as the authenticator parameter,
  allowing building transactions for operations that don't require
  authentication (e.g., `nop` operations). When `null` is passed, it behaves the
  same as using `noopAuthenticator`.

- Migrated package manager from npm to pnpm. All scripts and commands now use
  `pnpm` instead of `npm`. The `package-lock.json` file has been replaced with
  `pnpm-lock.yaml`. Documentation files have been updated to reflect this
  change:
  - `README.md` - Updated installation and build instructions to use `pnpm`
    commands
  - `doc/release-steps.md` - Updated release workflow documentation to use
    `pnpm` commands for versioning and publishing
  - `scripts/update-docs.sh` - Updated documentation generation script to use
    `pnpm` for installation and execution

### Fixed 🔧

### Removed 🗑️
