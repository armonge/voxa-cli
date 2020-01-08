#!/usr/bin/env bash
set -euo pipefail
set -o xtrace

rm -rf test/out

npm install
npm run lint

npm run test-ci
npm run report
