#!/bin/bash
# build.sh - Custom build script for Wasmer.io deployment

# Install Python for native build dependencies
apt-get update
apt-get install -y python3 python3-pip build-essential postgresql-client libpq-dev
ln -s /usr/bin/python3 /usr/bin/python

# Install npm dependencies
npm install --no-optional

# Build the Next.js application and export to 'out' directory
npm run build

# Make sure the out directory exists at the expected location
mkdir -p /__app/out
cp -r out/* /__app/out/

# Install a simple static file server
npm install -g serve

echo "Build completed successfully!"