#!/bin/sh

# This script runs as the 'root' user upon container startup,
# because it's defined as the ENTRYPOINT while the user is ROOT.

echo "--- Running Pre-flight Checks as root ---"

# 1. Take ownership of the session data folder.
# This ensures 'appuser' can write to the volume you mounted.
echo "[1/3] Setting ownership of session data..."
chown -R appuser:appuser /app/.wwebjs_auth

# 2. THE SELF-HEALING FIX: Aggressively clean stale lock files.
# This runs as root BEFORE the node app starts, so it has permissions
# to delete any leftover lock files from previous crashed sessions.
echo "[2/3] Cleaning stale Chromium lock files..."
find /app/.wwebjs_auth -type f \( -name "SingletonLock" -o -name "SingletonSocket" \) -print -delete

# 3. Ensure the main app directory is also owned by the appuser.
echo "[3/3] Verifying app file ownership..."
chown -R appuser:appuser /app

# --- Checks are complete ---

# 4. Hand over control to the non-root user.
# 'gosu' is a lighter, more secure alternative to 'sudo'.
# 'exec' replaces this script with the node process, making it the main process (PID 1).
# "$@" represents the command passed from the Dockerfile's CMD line.
echo "--- Pre-flight checks complete. Handing over to non-root user 'appuser' ---"
exec gosu appuser "$@"
