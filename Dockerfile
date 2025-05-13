FROM node:18 AS builder

# Install Python and PostgreSQL client libraries
# Also install dependencies required by Sharp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    postgresql-client \
    libpq-dev \
    # Dependencies for Sharp
    libvips-dev \
    && ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including Sharp
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Production image
FROM node:18-slim

# Install required runtime libraries for Sharp
RUN apt-get update && apt-get install -y \
    libvips-dev \
    postgresql-client \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --only=production

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/api ./api
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/database ./database
COPY --from=builder /app/models ./models
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/controllers ./controllers
COPY --from=builder /app/utils ./utils

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]