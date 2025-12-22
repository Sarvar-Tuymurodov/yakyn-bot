#!/bin/bash
# Decrypt environment files for deployment
# Usage: ENCRYPTION_KEY=your_key ./scripts/decrypt-env.sh

set -e

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "Error: ENCRYPTION_KEY environment variable is required"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Decrypt production env
if [ -f "$PROJECT_DIR/.env.production.encrypted" ]; then
    echo "Decrypting .env.production..."
    openssl enc -aes-256-cbc -d -salt -pbkdf2 \
        -in "$PROJECT_DIR/.env.production.encrypted" \
        -out "$PROJECT_DIR/.env.production" \
        -pass pass:"$ENCRYPTION_KEY"
    echo "✅ .env.production decrypted"
fi

echo "Done!"
