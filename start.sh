#!/bin/bash
set -e

echo "Updating ownership of /app/.wwebjs_auth to appuser..."
chown -R appuser:appuser /app/.wwebjs_auth

echo "Updating permissions of /tmp..."
chmod 1777 /tmp


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

exec gosu appuser node services/whatsappService.js "$@"
