FROM node:22-alpine as base

WORKDIR /app

COPY package*.json /app/
RUN npm ci

COPY . .

FROM nginx:1.27-alpine

COPY nginx.conf /etc/ngnix/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 http://localhost/ || exit 1


CMD ["nginx", "-g", "daemon off;"]