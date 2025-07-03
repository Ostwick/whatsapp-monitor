#!/bin/bash
set -e

# This function will be called on SIGTERM or SIGINT
cleanup() {
    echo "Cleaning up stray Chrome/Chromium processes..."
    # Use pkill to find and kill any processes matching 'chromium'
    pkill -f chromium || true
    pkill -f chrome || true
    exit 0
}

# Trap the signals to ensure cleanup runs on container stop
trap cleanup SIGTERM SIGINT

echo "Initial cleanup on start..."
pkill -f chromium || true
pkill -f chrome || true

echo "Starting WhatsApp service for ${USER_ID:-default}..."
# Use exec to replace the shell with the Node.js process.
# This is crucial for proper signal handling.
exec node services/whatsappService.js "$@"
