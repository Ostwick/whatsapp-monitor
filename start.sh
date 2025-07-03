#!/bin/bash
set -e

echo "--- Running Pre-flight Checks as root ---"

# Fix 1: Ownership of the session data volume for the non-root user.
# This is critical because the volume is mounted as root.
echo "[1/3] Setting ownership of session data..."
chown -R appuser:appuser /app/.wwebjs_auth

# Fix 2: Clean up stale lock files from previous crashes.
# This prevents the "Profile is in use" error without deleting the session.
echo "[2/3] Cleaning stale Chromium lock files..."
find /app/.wwebjs_auth -type f -name "Singleton*" -print -delete || true

# Fix 3: Ensure other app files are owned by appuser.
# This prevents any potential permission errors during runtime.
echo "[3/3] Verifying app file ownership..."
chown -R appuser:appuser /app/node_modules
chown appuser:appuser /app/package-lock.json

echo "--- Pre-flight checks complete. Handing over to non-root user 'appuser' ---"

# Drop privileges from root to 'appuser' and execute the original command
# (which is 'npm run start' from your Dockerfile's CMD).
exec gosu appuser "$@"
