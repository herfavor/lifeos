#!/usr/bin/env bash
set -euo pipefail

echo "=== Lint ==="
npm run lint:ci

echo "=== Repository Hygiene ==="
npm run lint:hygiene

echo "=== Source Size ==="
npm run lint:source-size

echo "=== Documentation Links ==="
npm run lint:docs

echo "=== Type Check ==="
npm run type-check

echo "=== Unit Tests ==="
npm test -- --run

echo "=== Design Tokens ==="
npm run lint:design-tokens

echo "=== Browser Test Inventory ==="
npm run test:browser:inventory

echo "=== Build ==="
npm run build

echo "=== Audit (production deps) ==="
npm audit --omit=dev --audit-level=high

echo "=== Non-browser checks passed ==="
echo "Full browser tests run only through the hosted GitHub Actions workflow."
