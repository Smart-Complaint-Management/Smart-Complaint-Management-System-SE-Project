#!/usr/bin/env bash
set -euo pipefail

# SCMS Pull Request Automation Bash Wrapper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "${SCRIPT_DIR}/scms-pr.js" "$@"
