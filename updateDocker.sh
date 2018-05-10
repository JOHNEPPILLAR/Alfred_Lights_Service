#!/bin/bash
clear
echo "Remove old docker containers & images"
docker stop alfred_lights_service
docker rm alfred_lights_service
docker rmi alfred_lights_service

echo "Build & run new ver"
docker build --no-cache --rm=true -t alfred_lights_service .
docker run -d --restart=always --name alfred_lights_service -p 3982:3982 alfred_lights_service
