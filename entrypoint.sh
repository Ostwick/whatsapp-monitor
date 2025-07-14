#!/bin/sh

# This script runs as the root user inside the container upon startup

echo "--- Self-Healing Entrypoint Script ---"
echo "Cleaning up any stale Chromium lock files..."

# This find command runs with root privileges *inside the container's filesystem*
# which will always succeed.
find /app/.wwebjs_auth -type f \( -name "SingletonLock" -o -name "SingletonSocket" \) -print -delete

echo "Cleanup complete. Starting the main application..."

# This command passes control to the CMD specified in your Dockerfile (the node app)
exec "$@"
