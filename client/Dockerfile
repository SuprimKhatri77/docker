FROM oven/bun:1-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN apk add --no-cache libc6-compat

COPY package*.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

FROM nginx:alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html  

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]