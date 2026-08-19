#!/usr/bin/env bash
set -euo pipefail

echo "=== Unit Tests ==="
npm test -- --run

echo "=== Type Check ==="
npm run type-check

echo "=== Build ==="
npm run build

echo "=== Audit (production deps) ==="
npm audit --omit=dev --audit-level=high || echo "⚠ Audit found issues (non-blocking)"

echo "=== Non-browser checks passed ==="
echo "Browser tests run only through the manual GitHub-hosted workflow."
