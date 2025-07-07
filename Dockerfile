FROM node:20-alpine

# Install build dependencies for bcrypt and native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies first (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

EXPOSE 5000

# Use npm start (which runs nest start according to your logs)
CMD ["npm", "start"]