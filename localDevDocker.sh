#!/bin/bash
clear

echo "Remove node_modules"
rm -rf node_modules

echo "Remove old docker containers & images"
docker-compose down --rmi all

echo "Set env vars"
export ENVIRONMENT="production"
export MOCK="true"

echo "Build & run new container"
docker-compose up -d --build

echo "Tidy up"
docker image prune -f
