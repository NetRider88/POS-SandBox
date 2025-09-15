#!/bin/bash

# Talabat POS Integration Platform - Startup Script

echo "🚀 Starting Talabat POS Integration Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14.0.0 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version 14.0.0 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data logs uploads backups

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        echo "📋 Creating .env file from env.example..."
        cp env.example .env
        echo "⚠️  Please edit .env file with your configuration before running in production."
    fi
fi

# Check if we're in development or production mode
if [ "$NODE_ENV" = "production" ]; then
    echo "🌟 Starting in PRODUCTION mode..."
    npm start
else
    echo "🔧 Starting in DEVELOPMENT mode..."
    echo "📝 For production, set NODE_ENV=production"
    
    # Check if nodemon is available for development
    if command -v nodemon &> /dev/null; then
        npm run dev
    else
        echo "⚠️  Nodemon not found, using regular node..."
        npm start
    fi
fi
