FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY bun.lock ./

RUN bun install

COPY . .

RUN bun run build

FROM oven/bun:1-alpine AS runtime

WORKDIR /app

COPY package*.json ./

RUN bun install --omit=dev

COPY --from=builder /app/dist ./dist


EXPOSE 5000

CMD ["bun", "dist/index.js"]