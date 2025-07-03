# In start.sh

#!/bin/bash
set -e

echo "--- WhatsApp Service Pre-flight Checks ---"
chown -R appuser:appuser /app/.wwebjs_auth
chmod 1777 /tmp
mkdir -p /tmp/config /tmp/cache
chown -R appuser:appuser /tmp/config /tmp/cache
echo "[+] Cleaning all stale Chromium lock files..."
find /app/.wwebjs_auth /tmp/config -type f -name "Singleton*" -print -delete || true
echo "--- Pre-flight checks complete. Handing over to application. ---"
exec gosu appuser node services/whatsappService.js "$@"
