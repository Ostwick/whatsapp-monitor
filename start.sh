#!/bin/bash
set -e

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

# Initial process cleanup
echo "Initial cleanup on start..."
pkill -f chromium || true
pkill -f chrome || true

# Use 'gosu' to drop from root to the 'appuser' before executing the node process.
echo "Starting WhatsApp service for ${USER_ID:-default}..."
exec gosu appuser node services/whatsappService.js "$@"
