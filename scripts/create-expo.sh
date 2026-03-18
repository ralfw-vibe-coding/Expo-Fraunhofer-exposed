#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${1:-}"
EVENTS_FILE="${2:-events.json}"

if [[ -z "${CONFIG_FILE}" ]]; then
  echo "Usage: scripts/create-expo.sh <create-expo.json> [events.json]" >&2
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/${CONFIG_FILE}" && ! -f "${CONFIG_FILE}" ]]; then
  echo "Config file not found: ${CONFIG_FILE}" >&2
  exit 1
fi

if [[ -n "${NVM_DIR:-}" && -s "${NVM_DIR}/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
elif [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  export NVM_DIR="${HOME}/.nvm"
  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
fi

if command -v nvm >/dev/null 2>&1; then
  nvm use 20 >/dev/null
fi

cd "${REPO_ROOT}"
./node_modules/.bin/vite-node scripts/createExpoCli.ts "${CONFIG_FILE}" "${EVENTS_FILE}"
