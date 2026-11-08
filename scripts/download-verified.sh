#!/bin/bash
# Helpers to download build tooling and check its SHA-256 before it is extracted or executed.

# verify_sha256 FILE EXPECTED_SHA256 -> exit status 0 only when the file matches
verify_sha256() {
    local file=$1 expected=$2
    [ -n "$expected" ] || return 1
    # Compare the hash text directly: works with both GNU coreutils and BusyBox sha256sum
    local actual
    actual=$(sha256sum "$file" | cut -d' ' -f1) || return 1
    [ "$actual" = "$expected" ]
}

# download_verified URL EXPECTED_SHA256 TARGET_DIR -> downloads, verifies, then extracts. Exits on any failure.
download_verified() {
    local url=$1 expected=$2 target=$3
    local archive
    archive=$(mktemp)
    if ! wget -nv -O "$archive" "$url"; then
        rm -f "$archive"
        echo "Download failed: $url" >&2
        exit 1
    fi
    if ! verify_sha256 "$archive" "$expected"; then
        rm -f "$archive"
        echo "Checksum mismatch for $url" >&2
        exit 1
    fi
    tar -C "$target" -xzf "$archive"
    rm -f "$archive"
}
