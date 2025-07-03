#!/bin/bash
set -e

cleanup() {
    echo "Cleaning up Chrome processes..."
    # Use pkill with the -f flag to match the full command line
    pkill -f chromium || true
    pkill -f chrome || true
    # Clean up temporary directories that may have been left behind
    find /tmp -name "chrome-*" -type d -exec rm -rf {} + 2>/dev/null || true
    rm -rf /tmp/crashpad 2>/dev/null || true
    exit 0
}

# Set a trap to call the cleanup function on receiving SIGTERM or SIGINT
trap cleanup SIGTERM SIGINT

echo "Initial cleanup on start..."
# Clean up any potentially lingering Chrome processes from a bad shutdown
pkill -f chromium || true
pkill -f chrome || true

echo "Cleaning up session lock files..."
find /app/.wwebjs_auth -name "SingletonLock" -exec rm -f {} + 2>/dev/null || true
find /app/.wwebjs_auth -name "SingletonSocket" -exec rm -f {} + 2>/dev/null || true
find /app/.wwebjs_auth -name "SingletonCookie" -exec rm -f {} + 2>/dev/null || true

echo "Starting WhatsApp service for ${USER_ID:-default}..."
# Use exec to replace the shell process with the Node.js process
# This ensures Node receives signals (like SIGTERM) directly
exec node services/whatsappService.js "$@"
