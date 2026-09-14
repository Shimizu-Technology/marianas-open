# syntax=docker/dockerfile:1

FROM node:22.22-alpine AS build

WORKDIR /app

RUN apk add --no-cache g++ make python3

ARG VITE_API_URL=
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:no-translate

FROM caddy:2.10-alpine

COPY Caddyfile.staging /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 8080
