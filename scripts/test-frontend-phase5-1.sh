#!/bin/bash

# Orchi AI - Phase 5.1 Frontend Foundation Test
# Tests: Next.js setup, Tailwind, API client, Layout components

set -e

FRONTEND_DIR="/var/www/www.orchiai.com/packages/frontend"
BACKEND_URL="http://localhost:3001"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
TOTAL=0
WARNINGS=0

echo "=========================================="
echo "Orchi AI - Phase 5.1 Frontend Foundation Test"
echo "=========================================="
echo ""

# ============================================
# TEST SUITE 1: Next.js Setup
# ============================================
echo -e "${BLUE}=== Test Suite 1: Next.js Setup ===${NC}"

# Test 1.1: Project Structure
echo -n "  [1] Testing: Project structure ... "
TOTAL=$((TOTAL + 1))
if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ] && [ -d "$FRONTEND_DIR/app" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 1.2: Dependencies
echo -n "  [2] Testing: Dependencies installed ... "
TOTAL=$((TOTAL + 1))
cd "$FRONTEND_DIR"
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}WARN${NC} (Run 'npm install' if needed)"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 1.3: TypeScript Configuration
echo -n "  [3] Testing: TypeScript configuration ... "
TOTAL=$((TOTAL + 1))
if [ -f "$FRONTEND_DIR/tsconfig.json" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 1.4: Build Test
echo -n "  [4] Testing: Build compilation ... "
TOTAL=$((TOTAL + 1))
if npm run build > /tmp/frontend-build.log 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC} (Check /tmp/frontend-build.log)"
    FAILED=$((FAILED + 1))
fi

echo ""

# ============================================
# TEST SUITE 2: File Structure
# ============================================
echo -e "${BLUE}=== Test Suite 2: File Structure ===${NC}"

# Test 2.1: API Client
echo -n "  [5] Testing: API client exists ... "
TOTAL=$((TOTAL + 1))
if [ -f "$FRONTEND_DIR/lib/api.ts" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.2: Layout Components
echo -n "  [6] Testing: Layout components exist ... "
TOTAL=$((TOTAL + 1))
if [ -f "$FRONTEND_DIR/components/layout/Sidebar.tsx" ] && \
   [ -f "$FRONTEND_DIR/components/layout/Header.tsx" ] && \
   [ -f "$FRONTEND_DIR/components/layout/AdminLayout.tsx" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.3: Dashboard Page
echo -n "  [7] Testing: Dashboard page exists ... "
TOTAL=$((TOTAL + 1))
if [ -f "$FRONTEND_DIR/app/admin/page.tsx" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.4: Providers
echo -n "  [8] Testing: React Query providers exist ... "
TOTAL=$((TOTAL + 1))
if [ -f "$FRONTEND_DIR/lib/providers.tsx" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# ============================================
# TEST SUITE 3: Backend Connectivity
# ============================================
echo -e "${BLUE}=== Test Suite 3: Backend Connectivity ===${NC}"

# Test 3.1: Backend Server Status
echo -n "  [9] Testing: Backend server running ... "
TOTAL=$((TOTAL + 1))
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}WARN${NC} (Backend not running - start with 'npm run backend:dev')"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 3.2: API Endpoint Accessible
echo -n "  [10] Testing: API endpoint accessible ... "
TOTAL=$((TOTAL + 1))
if curl -s "$BACKEND_URL/api/v1/agents" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}WARN${NC} (Backend API not accessible)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ============================================
# TEST SUITE 4: Dependencies Check
# ============================================
echo -e "${BLUE}=== Test Suite 4: Dependencies Check ===${NC}"

check_dependency() {
    local dep=$1
    local name=$2
    TOTAL=$((TOTAL + 1))
    echo -n "  [$TOTAL] Testing: $name installed ... "
    if grep -q "\"$dep\"" "$FRONTEND_DIR/package.json"; then
        echo -e "${GREEN}PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi
}

check_dependency "next" "Next.js"
check_dependency "react" "React"
check_dependency "@tanstack/react-query" "React Query"
check_dependency "axios" "Axios"
check_dependency "tailwindcss" "Tailwind CSS"
check_dependency "lucide-react" "Lucide Icons"

echo ""

# ============================================
# Test Summary
# ============================================
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests: ${BLUE}$TOTAL${NC}"
echo "Passed: ${GREEN}$PASSED${NC}"
echo "Failed: ${RED}$FAILED${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo "Warnings: ${YELLOW}$WARNINGS${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All critical tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start frontend: cd packages/frontend && npm run dev"
    echo "  2. Open http://localhost:3000 in browser"
    echo "  3. Test UI manually"
    exit 0
else
    echo -e "${RED}Some tests failed. Please fix issues before proceeding.${NC}"
    exit 1
fi

