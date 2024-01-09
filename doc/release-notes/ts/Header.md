# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Breaking
- `Account.getAuthDescriptors` and `Account.getAuthDescriptorsBySigner` now have an additional optional parameter `includeInactive` which, if false, will remove the expired auth descriptors and the ones that will only be active in the future. The `op_count` rule is unaffected by this filtering.