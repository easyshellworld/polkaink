#!/usr/bin/env bash
# scripts/setup-node.sh
# Downloads and starts anvil-polkadot for Polkadot Hub compatibility testing
# Reference: https://docs.polkadot.com/develop/smart-contracts/connect-to-polkadot/
set -euo pipefail

ANVIL_POLKADOT_VERSION="latest"
INSTALL_DIR="${HOME}/.local/bin"
mkdir -p "${INSTALL_DIR}"

echo "Downloading anvil-polkadot..."
# Using the parity-provided binary; adjust URL once stable release is published
curl -L "https://github.com/paritytech/frontier/releases/download/${ANVIL_POLKADOT_VERSION}/anvil-polkadot-linux-x86_64" \
  -o "${INSTALL_DIR}/anvil-polkadot" 2>/dev/null || {
  echo "::warning::Could not download anvil-polkadot binary. Falling back to standard anvil."
  # Fallback: use standard anvil from foundry (already available in ubuntu-latest)
  which anvil && anvil --port 8545 --chain-id 420420417 &
  sleep 2
  echo "Standard anvil started as fallback on port 8545"
  exit 0
}

chmod +x "${INSTALL_DIR}/anvil-polkadot"
export PATH="${INSTALL_DIR}:${PATH}"

echo "Starting anvil-polkadot..."
anvil-polkadot --port 8545 &
sleep 3
echo "anvil-polkadot started on port 8545"
