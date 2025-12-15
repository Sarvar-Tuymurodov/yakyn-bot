#!/bin/sh
set -e

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    npx prisma migrate deploy || npx prisma db push
fi

# Run dev server with hot reload
npm run dev
