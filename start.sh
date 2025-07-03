#!/bin/bash
set -e

echo "Updating ownership of /app/.wwebjs_auth..."
chown -R appuser:appuser /app/.wwebjs_auth

echo "Updating permissions of /tmp..."
chmod 1777 /tmp

echo "Creating and setting ownership for XDG directories..."
mkdir -p /tmp/config /tmp/cache
chown -R appuser:appuser /tmp/config /tmp/cache

echo "Cleaning up stale profile lock files..."
find /app/.wwebjs_auth -type f -name "Singleton*" -delete || true
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
