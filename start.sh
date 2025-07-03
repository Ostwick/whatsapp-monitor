#!/bin/bash
set -e

echo "--- Running Pre-flight Checks as root ---"
# Fix ownership of the session data volume for the non-root user
chown -R appuser:appuser /app/.wwebjs_auth
# Fix ownership of the npm cache to prevent errors
chown -R appuser:appuser /app/node_modules
chown appuser:appuser /app/package-lock.json

# Clean up any stale lock files from previous crashes
echo "[+] Cleaning stale Chromium lock files..."
find /app/.wwebjs_auth -type f -name "Singleton*" -print -delete || true

echo "--- Handing over to non-root user 'appuser' ---"
# Drop privileges and execute the original command
exec gosu appuser "$@"
