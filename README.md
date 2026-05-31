# Docker — My Complete Learning Notes

> Personal reference from learning Docker from scratch. Covers core concepts, CLI commands, Dockerfiles, and Docker Compose with a real MERN-style (Express + Next.js) app example.

---

## Table of Contents

1. [Why Docker?](#why-docker)
2. [Core Architecture](#core-architecture)
3. [Key Concepts](#key-concepts)
   - [Images](#images)
   - [Containers](#containers)
   - [Volumes](#volumes)
   - [Networks](#networks)
   - [Registry & Docker Hub](#registry--docker-hub)
4. [The Image → Container Lifecycle](#the-image--container-lifecycle)
5. [Essential CLI Commands](#essential-cli-commands)
6. [Writing a Dockerfile](#writing-a-dockerfile)
7. [Dockerizing a Full-Stack App (Express + Next.js with Bun)](#dockerizing-a-full-stack-app-express--nextjs-with-bun)
   - [Server Dockerfile](#server-dockerfile)
   - [Client Dockerfile](#client-dockerfile)
   - [.dockerignore](#dockerignore)
   - [Building & Running Manually](#building--running-manually)
8. [Docker Compose](#docker-compose)
   - [Why Compose?](#why-compose)
   - [The Compose File Explained](#the-compose-file-explained)
   - [How Containers Discover Each Other](#how-containers-discover-each-other)
   - [Running Compose](#running-compose)
   - [Compose Logs](#compose-logs)
9. [Quick Reference Cheatsheet](#quick-reference-cheatsheet)

---

## Why Docker?

Before Docker, the classic problem was: _"It works on my machine."_ Different developers had different OS versions, different runtimes, different library versions — and getting an app to behave consistently across dev, staging, and prod was painful.

Docker solves this by **packaging your application together with everything it needs** (runtime, libraries, config) into a portable unit called a **container**. That container runs identically everywhere — your laptop, your teammate's machine, a cloud server.

**Key benefits:**

- Consistent environments across all machines
- Isolated processes — containers don't interfere with each other
- Lightweight compared to full virtual machines (containers share the host OS kernel)
- Easy to spin up, tear down, and scale services

---

## Core Architecture

Docker uses a **client-server architecture**:

```
You (terminal)
    │
    ▼
Docker CLI  ──── Docker API ────►  Docker Daemon
(client)                           (server/engine)
                                       │
                              builds images, runs containers,
                              manages networks & volumes
```

There are 3 major components:

**1. Docker Engine (the core)**
The heart of Docker. It's a client-server application that bundles the daemon, the API, and the CLI together.

**2. Docker Daemon (`dockerd`)**
A long-running background process — the actual workhorse. You never talk to it directly. It:

- Listens for Docker API requests
- Builds images from Dockerfiles
- Creates and runs containers
- Manages networks and volumes

**3. Docker CLI**
The command-line tool you type into (`docker run`, `docker build`, `docker logs`, etc.). It is purely a **control surface** — it sends commands to the daemon via the Docker API but doesn't do any execution itself.

**Docker API**
The interface that allows the CLI (and other tools) to communicate with the daemon. This is also what tools like Docker Desktop and Portainer use under the hood.

---

## Key Concepts

### Images

A Docker image is a **read-only template** used to create containers. Think of it like a class or blueprint.

- It does **not** run the app itself — it's just the recipe
- It can be based on another image (e.g., your app image might be based on `node:20-alpine`)
- Built from a `Dockerfile`
- Made up of **layers** — each instruction in a Dockerfile adds a layer; layers are cached, which makes rebuilds fast

> **Analogy:** Image = class/blueprint. Container = object/instance created from that class.

### Containers

A container is a **running instance** of an image. This is where your application actually lives and executes.

- Can be created, started, stopped, restarted, and removed
- Can connect to networks and attach to storage (volumes)
- Is **ephemeral by default** — when you remove a container, any data written inside it is gone (unless you use volumes)

Two types in practice:

- **Stateless containers** — can be freely deleted and recreated (e.g., your frontend, backend API). These are easy to work with.
- **Stateful containers** — hold data that must survive restarts (e.g., a database like MongoDB, PostgreSQL). These need volumes.

### Volumes

Volumes are Docker-managed persistent storage. Since containers are ephemeral, volumes let data survive even when a container is deleted and recreated.

```
Container dies  →  Container data dies (bad for DBs)
Volume exists   →  Volume data persists  ✓
```

You attach a volume to a container at a specific path. Docker handles the storage on the host.

### Networks

Docker networks allow containers to communicate with each other and with external services. When you run `docker compose up`, Docker automatically creates a network and connects all your services to it — which is how your frontend container can talk to your backend container by name (more on this below).

### Registry & Docker Hub

A **registry** is a remote store for Docker images. [Docker Hub](https://hub.docker.com) is the default public registry.

The workflow:

```
Build image locally  →  Push to Docker Hub  →  Pull from anywhere else
```

This is how images like `nginx`, `postgres`, and `oven/bun` are distributed. You can also use private registries (AWS ECR, GitHub Container Registry, etc.).

---

## The Image → Container Lifecycle

```
Dockerfile
    │
    │  docker build
    ▼
Docker Image  (stored locally or in a registry)
    │
    │  docker run / docker create + docker start
    ▼
Running Container
    │
    ├── docker logs      → view output
    ├── docker exec      → run commands inside container
    ├── docker inspect   → see detailed config/state
    ├── docker stop      → stop the container gracefully
    ├── docker start     → restart a stopped container
    └── docker rm        → remove the container entirely
```

---

## Essential CLI Commands

### Working with Images

```bash
# Pull an image from Docker Hub
docker pull nginx

# List all local images
docker images

# Remove an image
docker rmi <image_name>
```

### Working with Containers

```bash
# Run a container (pulls image if not local)
# -d = detached (runs in background)
# --name = give it a friendly name
# -p = port mapping: host_port:container_port
docker run -d --name my-nginx -p 8080:80 nginx

# List running containers
docker ps

# List ALL containers (including stopped)
docker ps -a

# View logs of a container
docker logs my-nginx

# Follow logs in real-time (like tail -f)
docker logs -f my-nginx

# Stop a container
docker stop my-nginx

# Start a stopped container
docker start my-nginx

# Remove a container (must be stopped first)
docker rm my-nginx

# Run a command inside a running container
docker exec -it my-nginx bash
```

> **Important:** You must `docker stop` a container before you can `docker rm` it. Docker won't let you remove a running container without the `-f` (force) flag.

### The `hello-world` Walkthrough

When I ran `docker run hello-world`, here is exactly what happened:

1. The Docker **CLI** sent a `run` request to the Docker **daemon**
2. The daemon checked locally — no `hello-world` image found
3. The daemon **pulled** the `hello-world` image from Docker Hub automatically
4. The daemon **created a new container** from that image
5. The container ran its executable, which printed the welcome message
6. The daemon **streamed the output** back to the CLI, which printed it to your terminal

---

## Writing a Dockerfile

A Dockerfile is the **recipe** for building a Docker image. Each instruction adds a layer to the image.

```dockerfile
FROM <base_image>       # Start from an existing image (e.g., node:20-alpine, oven/bun:1-alpine)
WORKDIR /app            # Set the working directory inside the container for all following commands
COPY <src> <dest>       # Copy files from your build context (local machine) into the image
RUN <command>           # Execute a shell command at BUILD time (install packages, compile code, etc.)
ARG <name>=<default>    # Define a build-time variable (can be passed with --build-arg)
ENV <name>=<value>      # Set an environment variable available at both build and runtime
EXPOSE <port>           # Document which port the app listens on (informational, doesn't publish the port)
CMD ["cmd", "arg"]      # Default command to run when a container starts from this image
```

**Key distinction:**

- `RUN` runs at **build time** (when building the image)
- `CMD` runs at **container start time** (when you `docker run` the image)
- `ARG` is only available at **build time** (gone after image is built)
- `ENV` is available at **build time AND runtime**

**Why copy `package.json` before copying everything else?**

```dockerfile
COPY package*.json ./   # Copy dependency manifest first
RUN bun install         # Install deps (this layer gets CACHED if package.json hasn't changed)
COPY . .                # Copy everything else
```

Docker caches layers. If you copy your source code first, every code change invalidates the cache and forces a full `bun install` again. By copying `package.json` first, the expensive install step is only re-run when dependencies actually change.

---

## Dockerizing a Full-Stack App (Express + Next.js with Bun)

Project structure:

```
project/
├── server/          # Express API (Bun)
│   ├── Dockerfile
│   ├── .dockerignore
│   └── index.ts
└── client/          # Next.js frontend (Bun)
    ├── Dockerfile
    ├── .dockerignore
    └── app/
```

### Server Dockerfile

```dockerfile
FROM oven/bun:1-alpine      # Use Bun's official Alpine-based image (lightweight)

WORKDIR /app

COPY package*.json ./       # Copy dependency files first (for layer caching)
COPY bun.lock ./

RUN bun install             # Install dependencies

COPY . .                    # Copy all source files into the image

RUN bun run build           # Compile/build the app at image build time

EXPOSE 5000                 # Document that the server listens on port 5000

CMD ["bun", "start"]        # Default command when a container starts
```

> **Note:** I initially used `node:20-alpine` by mistake, but since the project uses Bun, I needed `oven/bun:1-alpine`. Always match the base image to your actual runtime!

### Client Dockerfile

```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# ARG declares a build-time variable. This lets you pass in the API URL when building.
# It has a default fallback value of http://localhost:5000.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000

# ENV makes the variable available at runtime inside the container as well.
# Next.js needs NEXT_PUBLIC_* vars at BUILD time to bake them into the client bundle.
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN apk add --no-cache libc6-compat   # Required by Next.js on Alpine Linux

COPY package*.json bun.lock ./

RUN bun install

COPY . .

RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
```

**Why `ARG` + `ENV` together?**
`ARG` captures the value passed in at build time (`--build-arg`). `ENV` copies it so it's also available when the container runs. For Next.js specifically, `NEXT_PUBLIC_*` env vars are embedded into the JavaScript bundle during `bun run build`, so they must be set at build time — hence the `ARG`.

### .dockerignore

Like `.gitignore` but for Docker builds. Prevents unnecessary (or sensitive) files from being sent to the Docker daemon during the build.

```
node_modules    # Already installed inside the image; sending it wastes time and space
dist            # Build output — will be regenerated inside the image
build           # Same as above
.env            # Never bake secrets into an image!
.git            # Git history is irrelevant inside a container
npm-debug.log
.next           # Next.js build cache — regenerated inside
```

> **Security note:** Always add `.env` to `.dockerignore`. You don't want your secrets baked into a Docker image, especially if you ever push it to a registry.

### Building & Running Manually

**Build images:**

```bash
# Build the server image, tag it as "docker-api-server"
docker build -t docker-api-server ./server

# Build the client image, passing in the API URL as a build argument
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:5000 -t docker-client ./client
```

**Run containers:**

```bash
# Run the server container
# -d = detached (background)
# --name = container name
# -e = set environment variable
# -p = map host port 5000 to container port 5000
docker run -d --name server -e PORT=5000 -p 5000:5000 docker-api-server

# Run the client container
docker run -d --name client -e PORT=3000 -p 3000:3000 docker-client
```

This works — but doing this manually for every service gets tedious and error-prone. That's where Docker Compose comes in.

---

## Docker Compose

### Why Compose?

Running multiple containers manually means:

- Building each image separately
- Running each container separately with the right flags
- Managing environment variables manually
- Figuring out networking between containers yourself
- Repeating all of this every time you change something

**Docker Compose** solves this. One `docker-compose.yml` file defines your entire multi-container application: services, ports, environment, build settings, dependencies, and volumes. One command brings everything up.

### The Compose File Explained

```yaml
services:
  server:
    build:
      context: ./server # Where to find the Dockerfile for this service (the "server" directory)
    environment:
      PORT:
        ${SERVER_PORT} # PORT is the env var name the Express app reads (e.g., process.env.PORT)
        # SERVER_PORT is the variable name defined in the root .env file
      DATABASE_URL: ${DATABASE_URL}
    ports:
      - "${SERVER_PORT}:${SERVER_PORT}" # Map host port → container port

  client:
    build:
      context: ./client # Where to find the client Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${API_URL} # Pass this as a build ARG (Next.js needs it at build time)
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL} # Also set it as a runtime ENV var
    depends_on:
      - server # Don't start the client until the server container is up
    ports:
      - "${CLIENT_PORT}:${CLIENT_PORT}"
```

**Why `args` in client but not server?**
`args` passes values to `ARG` instructions in the Dockerfile. The client Dockerfile has an `ARG NEXT_PUBLIC_API_URL` because Next.js needs the API URL baked into the bundle at build time. The server Dockerfile has no `ARG` instructions — it just reads env vars at runtime — so no `args` section is needed.

**Why `depends_on`?**
Without it, Docker Compose starts all services simultaneously. With `depends_on: - server`, Compose waits for the server **container to start** before starting the client. This prevents the client from trying to reach the API before the API is even up.

> **Note:** `depends_on` only waits for the container to _start_, not for the app inside to be _ready_. For production, you'd use health checks to wait for the service to actually be healthy.

**Where does `.env` get read from?**
Compose automatically reads a `.env` file in the same directory as `docker-compose.yml`. Variables defined there (like `SERVER_PORT=5000`) are substituted anywhere you write `${SERVER_PORT}` in the Compose file.

### How Containers Discover Each Other

This is one of the most important things Compose does for you automatically.

When you run `docker compose up`, Compose creates a **shared Docker network** and attaches all your services to it. On that network, each container is **reachable by its service name** as a hostname.

So if your Next.js client needs to call the Express server, the URL inside the container would be:

```
http://server:5000
```

Not `localhost:5000` — because inside the client container, `localhost` refers to the client container itself, not the server. But `server` (the service name) resolves to the server container's IP on the shared network.

This is why the `API_URL` in a production Compose setup is typically `http://server:5000` (using the service name), not `http://localhost:5000`.

```
┌─────────────────────────────────────────────┐
│           docker_default network             │
│                                             │
│   ┌──────────────┐     ┌──────────────┐    │
│   │   client     │────►│   server     │    │
│   │ (Next.js)    │     │ (Express)    │    │
│   └──────────────┘     └──────────────┘    │
│   reachable as          reachable as        │
│   "client"              "server"            │
└─────────────────────────────────────────────┘
```

### Running Compose

```bash
# Build all images and start all services in detached mode
docker compose up -d --build

# What these flags mean:
# --build  → force rebuild of images even if they already exist (picks up code changes)
# -d       → detached mode: runs all containers in the background so your terminal isn't locked.
#            Without -d, Compose streams all logs to your terminal and Ctrl+C stops everything.

# Stop and remove all containers (but keeps volumes and images)
docker compose down

# Stop and remove containers AND delete volumes (wipes persistent data)
docker compose down -v
```

**Build output summary from my run:**

```
✔ Image docker-server Built
✔ Image docker-client Built
✔ Network docker_default Created    ← Compose auto-created this shared network
✔ Container docker-server-1 Started
✔ Container docker-client-1 Started
```

Notice Docker automatically created `docker_default` — the shared network that lets the two containers talk to each other by service name.

### Compose Logs

```bash
# See logs from all services
docker compose logs

# See logs from a specific service
docker compose logs server
docker compose logs client

# Follow logs in real-time
docker compose logs -f

# Follow logs for a specific service
docker compose logs -f server
```

---

## Quick Reference Cheatsheet

| Task                     | Command                                                     |
| ------------------------ | ----------------------------------------------------------- |
| Pull an image            | `docker pull <image>`                                       |
| List local images        | `docker images`                                             |
| Build an image           | `docker build -t <name> <path>`                             |
| Run a container          | `docker run -d --name <name> -p <host>:<container> <image>` |
| List running containers  | `docker ps`                                                 |
| List all containers      | `docker ps -a`                                              |
| View container logs      | `docker logs <name>`                                        |
| Follow logs              | `docker logs -f <name>`                                     |
| Stop a container         | `docker stop <name>`                                        |
| Start a container        | `docker start <name>`                                       |
| Remove a container       | `docker rm <name>`                                          |
| Shell into container     | `docker exec -it <name> bash`                               |
| Start Compose (build)    | `docker compose up -d --build`                              |
| Stop Compose             | `docker compose down`                                       |
| Compose logs             | `docker compose logs -f`                                    |
| Compose specific service | `docker compose logs -f <service>`                          |

---

_Last updated: learning session covering Docker fundamentals → Dockerfiles → Docker Compose with a real Express + Next.js app_
