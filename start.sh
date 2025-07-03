#!/bin/bash
set -e
echo "--- WhatsApp Service Pre-flight Checks ---"

echo "[1/4] Setting ownership for session data at /app/.wwebjs_auth..."
chown -R appuser:appuser /app/.wwebjs_auth
echo "[2/4] Setting permissions for /tmp..."
chmod 1777 /tmp
echo "[3/4] Creating and setting ownership for XDG directories..."
mkdir -p /tmp/config /tmp/cache
chown -R appuser:appuser /tmp/config /tmp/cache

echo "[4/4] Cleaning all stale Chromium lock files..."
find /app/.wwebjs_auth /tmp/config -type f -name "Singleton*" -print -delete || true

echo "--- Pre-flight checks complete. Handing over to application. ---"

exec gosu appuser node services/whatsappService.js "$@"
