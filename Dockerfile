FROM node:18

# Install Python and build tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    postgresql-client \
    libpq-dev \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && apt-get clean

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]