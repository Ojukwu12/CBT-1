#!/usr/bin/env bash
# Phase 0 Backend - Quick Start Guide

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     University AI CBT Backend - Phase 0 Quick Start       ║"
echo "║                                                           ║"
echo "║  Production-Ready Node.js Backend for UNIZIK CBT System  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check Node.js
echo "Step 1: Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install Node.js v16+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "✓ Node.js $NODE_VERSION found"
echo ""

# Step 2: Check MongoDB
echo "Step 2: MongoDB Connection (Required)"
echo "   You need a MongoDB instance running or MongoDB Atlas URI"
echo "   - Local: mongodb://localhost:27017/university-cbt"
echo "   - Atlas: mongodb+srv://user:password@cluster.mongodb.net/university-cbt"
echo ""

# Step 3: Get Gemini API Key
echo "Step 3: Google Gemini API Key (Required for AI Features)"
echo "   1. Visit: https://makersuite.google.com/app/apikey"
echo "   2. Generate new API key"
echo "   3. Save it safely"
echo ""

# Step 4: Install Dependencies
echo "Step 4: Installing Dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "✗ npm install failed"
        exit 1
    fi
    echo "✓ Dependencies installed"
else
    echo "✓ node_modules already exists (skipped npm install)"
fi
echo ""

# Step 5: Configure Environment
echo "Step 5: Configuring Environment Variables..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ Created .env from .env.example"
        echo ""
        echo "⚠  IMPORTANT: Edit .env and set:"
        echo "   - MONGO_URI: Your MongoDB connection string"
        echo "   - GEMINI_API_KEY: Your Google Gemini API key"
        echo ""
        echo "After editing, run: npm run seed && npm run dev"
        exit 0
    else
        echo "✗ .env.example not found"
        exit 1
    fi
else
    echo "✓ .env file already exists"
fi
echo ""

# Step 6: Validate System
echo "Step 6: Validating System..."
npm run validate
if [ $? -ne 0 ]; then
    echo "✗ System validation failed"
    exit 1
fi
echo ""

# Step 7: Seed Database
echo "Step 7: Seeding Database with Test Data..."
read -p "Run seed script now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run seed
    if [ $? -ne 0 ]; then
        echo "✗ Seed script failed (check MongoDB connection)"
        exit 1
    fi
    echo "✓ Test data created"
else
    echo "⚠  Skipped seed script (run 'npm run seed' later)"
fi
echo ""

# Step 8: Start Server
echo "Step 8: Starting Development Server..."
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                  READY TO START!                          ║"
echo "║                                                           ║"
echo "║  Run: npm run dev                                         ║"
echo "║                                                           ║"
echo "║  Server: http://localhost:3000                           ║"
echo "║  Test: curl http://localhost:3000/api/health            ║"
echo "║                                                           ║"
echo "║  Documentation: See PHASE0.md                            ║"
echo "║  Architecture: See ARCHITECTURE-REFERENCE.md             ║"
echo "║  Checklist: See PHASE0-CHECKLIST.md                      ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "Starting server..."
npm run dev
