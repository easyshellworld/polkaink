#!/usr/bin/env bash
# Download anvil-polkadot binary for local Polkadot-compatible testing.
# Usage: ./scripts/setup-node.sh
#
# The script detects OS/arch, finds the latest anvil-polkadot release from
# paritytech/hardhat-polkadot, and places the binary in ./bin/.
#
# Supported platforms:
#   - linux  x64
#   - darwin arm64

set -euo pipefail

REPO="paritytech/hardhat-polkadot"
BIN_DIR="$(cd "$(dirname "$0")/.." && pwd)/bin"
BINARY_NAME="anvil-polkadot"

# ── Detect OS & Architecture ──────────────────────────────────────────
detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$os" in
    linux)  os="linux" ;;
    darwin) os="darwin" ;;
    *)      echo "❌ Unsupported OS: $os"; exit 1 ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *)             echo "❌ Unsupported arch: $arch"; exit 1 ;;
  esac

  echo "${os}-${arch}"
}

# ── Find latest anvil-polkadot release tag via GitHub API ─────────────
find_latest_tag() {
  local tag
  tag=$(curl -sL "https://api.github.com/repos/${REPO}/releases" \
    | grep -o '"tag_name": *"anvil-polkadot-nodes-[^"]*"' \
    | head -1 \
    | sed 's/"tag_name": *"//;s/"//')

  if [ -z "$tag" ]; then
    echo "❌ Could not find anvil-polkadot release tag" >&2
    exit 1
  fi
  echo "$tag"
}

# ── Main ──────────────────────────────────────────────────────────────
main() {
  local platform tag asset_name download_url dest

  platform=$(detect_platform)
  asset_name="${BINARY_NAME}-${platform}"
  dest="${BIN_DIR}/${BINARY_NAME}"

  # Skip if binary already exists
  if [ -x "$dest" ]; then
    echo "✅ ${BINARY_NAME} already exists at ${dest}"
    "$dest" --version 2>/dev/null || true
    return 0
  fi

  echo "🔍 Detecting platform: ${platform}"
  echo "🔍 Finding latest release..."
  tag=$(find_latest_tag)
  echo "📦 Latest tag: ${tag}"

  download_url="https://github.com/${REPO}/releases/download/${tag}/${asset_name}"
  echo "⬇️  Downloading ${asset_name} from ${download_url}..."

  mkdir -p "$BIN_DIR"
  curl -fSL --progress-bar -o "$dest" "$download_url"
  chmod +x "$dest"

  echo "✅ Installed ${BINARY_NAME} → ${dest}"
  "$dest" --version 2>/dev/null || true
}

main "$@"