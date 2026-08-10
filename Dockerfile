FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json /app/
RUN npm ci

COPY . .

FROM base AS build
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 http://localhost/ || exit 1


CMD ["nginx", "-g", "daemon off;"]