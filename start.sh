#!/bin/bash
set -e

# This script is run as root.
# We fix permissions on all necessary directories before dropping privileges.

# Fix 1: Ownership of the mounted session data volume
echo "Updating ownership of /app/.wwebjs_auth..."
chown -R appuser:appuser /app/.wwebjs_auth

# Fix 2: Permissions of the tmpfs /tmp directory
echo "Updating permissions of /tmp..."
chmod 1777 /tmp

# Fix 3: Create and set ownership for the XDG config/cache directories
echo "Creating and setting ownership for XDG directories..."
mkdir -p /tmp/config /tmp/cache
chown -R appuser:appuser /tmp/config /tmp/cache

# --- The rest of the script remains the same ---

cleanup() {
    echo "Cleaning up stray Chrome/Chromium processes..."
    pkill -f chromium || true
    pkill -f chrome || true
    exit 0
}

trap cleanup SIGTERM SIGINT

echo "Initial cleanup on start..."
pkill -f chromium || true
pkill -f chrome || true

echo "Starting WhatsApp service for ${USER_ID:-default}..."

# Use 'gosu' to drop from root to the 'appuser' before executing the node process.
exec gosu appuser node services/whatsappService.js "$@"
