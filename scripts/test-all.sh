#!/bin/bash

# Orchi AI - Comprehensive Test Suite Runner
# Runs all test scripts in sequence

set -e

BASE_URL="http://localhost:3001"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Orchi AI - Comprehensive Test Suite"
echo "=========================================="
echo ""

# Check if server is running
echo "Checking server status..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${RED}Error: Server not running at $BASE_URL${NC}"
    echo "Please start the server with: npm run backend:dev"
    exit 1
fi
echo -e "${GREEN}Server is running${NC}"
echo ""

# Test results
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_TESTS=0

# Function to run a test script
run_test_script() {
    local script_name=$1
    local description=$2
    
    echo -e "${BLUE}=== Running: $description ===${NC}"
    echo ""
    
    if [ -f "$SCRIPT_DIR/$script_name" ]; then
        if bash "$SCRIPT_DIR/$script_name"; then
            echo -e "${GREEN}✓ $description completed successfully${NC}"
            echo ""
            return 0
        else
            echo -e "${RED}✗ $description failed${NC}"
            echo ""
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Script not found: $script_name${NC}"
        echo ""
        return 1
    fi
}

# Run test suites
echo "Starting test execution..."
echo ""

# Phase 3: CRUD Operations (if exists)
if [ -f "$SCRIPT_DIR/test-api.sh" ]; then
    run_test_script "test-api.sh" "Phase 3: CRUD Operations"
    if [ $? -eq 0 ]; then
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Phase 3: Additional Tests (if exists)
if [ -f "$SCRIPT_DIR/test-additional-fixed.sh" ]; then
    run_test_script "test-additional-fixed.sh" "Phase 3: Additional Scenarios"
    if [ $? -eq 0 ]; then
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Phase 4: Execution Features
if [ -f "$SCRIPT_DIR/test-phase4-execution.sh" ]; then
    run_test_script "test-phase4-execution.sh" "Phase 4: Execution Features"
    if [ $? -eq 0 ]; then
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Integration Tests
if [ -f "$SCRIPT_DIR/test-integration.sh" ]; then
    run_test_script "test-integration.sh" "Integration Tests"
    if [ $? -eq 0 ]; then
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Summary
echo "=========================================="
echo "Test Suite Summary"
echo "=========================================="
echo -e "Total Test Suites: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$TOTAL_PASSED${NC}"
echo -e "Failed: ${RED}$TOTAL_FAILED${NC}"
echo ""

if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}All test suites passed!${NC}"
    exit 0
else
    echo -e "${RED}Some test suites failed${NC}"
    exit 1
fi

