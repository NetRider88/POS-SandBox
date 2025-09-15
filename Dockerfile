# Talabat POS Integration Platform - Docker Configuration

# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S talabat -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data logs uploads backups
RUN chown -R talabat:nodejs /app

# Set user
USER talabat

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"]

# Labels for image metadata
LABEL maintainer="Talabat Integration Team <integration-support@talabat.com>"
LABEL version="1.0.0"
LABEL description="Enterprise-grade testing environment for Talabat POS integrations"
LABEL org.opencontainers.image.source="https://github.com/talabat/pos-integration-platform"
