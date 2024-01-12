# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Changed
- Removed auth descriptor types `ES` and `EM`.
- `create_account_with_auth` now requires the `auth_descriptor` to have `A` flag. You can no longer create account with no `A` flag auth descriptor by default.