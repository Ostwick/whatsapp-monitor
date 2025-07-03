#!/bin/bash
set -e

echo "--- Running Pre-flight Checks as root ---"

# Fix 1: Ownership of the session data volume for the non-root user.
# Adding '|| true' makes the script not fail if the path doesn't exist yet.
echo "[1/3] Setting ownership of session data..."
chown -R appuser:appuser /app/.wwebjs_auth || true

# Fix 2: Clean up stale lock files from previous crashes.
echo "[2/3] Cleaning stale Chromium lock files..."
find /app/.wwebjs_auth -type f -name "Singleton*" -print -delete || true

# Fix 3: Ensure other app files are owned by appuser.
echo "[3/3] Verifying app file ownership..."
chown -R appuser:appuser /app/node_modules || true
chown appuser:appuser /app/package-lock.json || true

echo "--- Pre-flight checks complete. Handing over to non-root user 'appuser' ---"

# Drop privileges from root to 'appuser' and execute the command from the Dockerfile CMD.
exec gosu appuser "$@"
