FROM node:18 AS builder

# Install Python and PostgreSQL client libraries
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    postgresql-client \
    libpq-dev \
    && ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with native modules disabled
RUN npm install --no-optional

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# The export directory is now in /app/.next/export

FROM node:18-slim AS runtime

WORKDIR /app

# Copy only the production dependencies and built files
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/out /app/out

# Expose the port
EXPOSE 3000

# Start the server with a simple static file server
CMD ["npx", "serve", "-s", "out", "-l", "3000"]