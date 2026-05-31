FROM oven/bun:1-alpine

WORKDIR /app

COPY package*.json ./
COPY bun.lock ./

RUN bun install

COPY . .

RUN bun run build

EXPOSE 5000

CMD ["bun", "start"]