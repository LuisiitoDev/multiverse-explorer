FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json /app/
RUN npm ci

COPY . .

FROM base AS build

# Vite inlines VITE_* at build time, so feature flags must arrive as build args;
# setting them on the running container would have no effect.
ARG VITE_FEATURE_CHARACTER_MODAL_V2
ENV VITE_FEATURE_CHARACTER_MODAL_V2=$VITE_FEATURE_CHARACTER_MODAL_V2

RUN npm run build

FROM nginx:1.27-alpine

# Self-signed cert for local HTTPS only; production terminates TLS at the ingress.
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
        -keyout /etc/nginx/certs/server.key \
        -out /etc/nginx/certs/server.crt \
        -subj "/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 http://127.0.0.1:8080/health || exit 1


CMD ["nginx", "-g", "daemon off;"]