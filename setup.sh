#!/bin/bash

# =============================================================================
# SIGNAL SERVICE PLATFORM - Setup Script
# =============================================================================

set -e

echo "=========================================="
echo "  Signal Service Platform Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required (found v$NODE_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

echo ""
echo "Installing dependencies..."
echo ""

# Backend setup
echo -e "${YELLOW}Setting up backend...${NC}"
cd backend
cp -n .env.example .env 2>/dev/null || true
npm install
npx prisma generate
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Frontend setup
echo ""
echo -e "${YELLOW}Setting up frontend...${NC}"
cd ../frontend
cp -n .env.example .env.local 2>/dev/null || true
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

cd ..

echo ""
echo "=========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your environment variables:"
echo "   - Edit backend/.env (database, SMTP, Twilio, Stripe)"
echo "   - Edit frontend/.env.local (API URL, Stripe key)"
echo ""
echo "2. Setup the database:"
echo "   cd backend"
echo "   npx prisma db push    # Create tables"
echo "   npx prisma db seed    # Seed initial data"
echo ""
echo "3. Start the development servers:"
echo "   # Terminal 1 - Backend"
echo "   cd backend && npm run dev"
echo ""
echo "   # Terminal 2 - Frontend"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Open in browser:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:3001"
echo "   - Prisma:   npx prisma studio (port 5555)"
echo ""
