#!/bin/bash

# Enable buildx
docker buildx create --use

# Build for the current platform
echo "Building Docker image for local testing..."
docker buildx build \
  --platform=$(docker version -f '{{.Server.Os}}/{{.Server.Arch}}') \
  --load \
  -t runjs-local \
  .

# Run the container
echo "Starting container..."
docker run -p 30000:30000 runjs-local
