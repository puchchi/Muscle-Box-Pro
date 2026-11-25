#!/usr/bin/env bash
# Starts the app on :3100 with every API host pointed at mock.mjs. Run from anywhere, then `npm run capture`.
set -euo pipefail
cd "$(dirname "$0")/../../.."
eval "$(node --input-type=module -e 'import { PROXY_ENV } from "./docs/franchise-guide/_capture/mock.mjs"; for (const [k, v] of Object.entries(PROXY_ENV)) console.log(`export ${k}="${v}"`)')"
exec npx next dev --port 3100 --turbopack
