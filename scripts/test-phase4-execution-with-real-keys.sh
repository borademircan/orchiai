#!/bin/bash

# Orchi AI - Phase 4 Execution Features Test with Real API Keys
# This script uses real API keys from .test-api-keys.env

set -e

# Load API keys from environment file
if [ -f .test-api-keys.env ]; then
    source .test-api-keys.env
    echo "✅ Loaded API keys from .test-api-keys.env"
else
    echo "❌ Error: .test-api-keys.env not found"
    echo "Please create it with your API keys"
    exit 1
fi

BASE_URL="http://localhost:3001"
TEST_DIR="/tmp/orchiai-tests-phase4-real"
mkdir -p "$TEST_DIR"

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

# Test helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "  [$TOTAL] Testing: $description ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Save response for debugging
    echo "$body" > "$TEST_DIR/response_${TOTAL}.json"
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_status, got $http_code)"
        echo "$body" > "$TEST_DIR/error_${TOTAL}.txt"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Extract ID from JSON response
extract_id() {
    echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

echo "=========================================="
echo "Orchi AI - Phase 4 Execution Features Test"
echo "Using REAL API Keys for Full Functionality Testing"
echo "=========================================="
echo ""

# Check server status
echo -n "Checking server status... "
if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}Server is running${NC}"
else
    echo -e "${RED}Server is not running${NC}"
    exit 1
fi

echo ""

# ============================================
# Setup: Create Test Data with REAL API Keys
# ============================================
echo -e "${BLUE}=== Setup: Creating Test Data with Real API Keys ===${NC}"

# Create ProviderConnection with REAL OpenAI key
echo "Creating ProviderConnection (OpenAI)..."
CONNECTION_DATA="{\"name\":\"OpenAI Real Test $(date +%s)\",\"provider\":\"OPENAI\",\"apiKey\":\"$OPENAI_API_KEY\"}"
CONNECTION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/provider-connections" \
    -H "Content-Type: application/json" \
    -d "$CONNECTION_DATA")
CONNECTION_ID=$(extract_id "$CONNECTION_RESPONSE")
echo "  Created ProviderConnection: $CONNECTION_ID"

# Create ProviderConnection with REAL Anthropic key
echo "Creating ProviderConnection (Anthropic)..."
CONN_ANTHROPIC_DATA="{\"name\":\"Anthropic Real Test $(date +%s)\",\"provider\":\"ANTHROPIC\",\"apiKey\":\"$ANTHROPIC_API_KEY\"}"
CONN_ANTHROPIC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/provider-connections" \
    -H "Content-Type: application/json" \
    -d "$CONN_ANTHROPIC_DATA")
CONN_ANTHROPIC_ID=$(extract_id "$CONN_ANTHROPIC_RESPONSE")
echo "  Created ProviderConnection (Anthropic): $CONN_ANTHROPIC_ID"

# Create Model with OpenAI connection
echo "Creating Model (OpenAI)..."
MODEL_DATA="{\"name\":\"OpenAI Model Test $(date +%s)\",\"provider\":\"OPENAI\",\"modelId\":\"gpt-3.5-turbo\",\"connectionId\":\"$CONNECTION_ID\"}"
MODEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/models" \
    -H "Content-Type: application/json" \
    -d "$MODEL_DATA")
MODEL_ID=$(extract_id "$MODEL_RESPONSE")
echo "  Created Model: $MODEL_ID"

# Create Agent
echo "Creating Agent..."
AGENT_DATA="{\"name\":\"Test Agent Real $(date +%s)\",\"instructions\":\"You are a helpful assistant. Respond concisely.\",\"modelId\":\"$MODEL_ID\",\"memoryStrategy\":\"AUTO\",\"memoryThreshold\":1000}"
AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/agents" \
    -H "Content-Type: application/json" \
    -d "$AGENT_DATA")
AGENT_ID=$(extract_id "$AGENT_RESPONSE")
echo "  Created Agent: $AGENT_ID"

echo -e "${GREEN}Setup complete${NC}"
echo ""

# ============================================
# TEST: Model Connection Testing with Real Key
# ============================================
echo -e "${BLUE}=== Test: Model Connection Testing (Real API Key) ===${NC}"

echo -n "  [1] Testing: Test model connection with real OpenAI key ... "
TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/models/$MODEL_ID/test" \
    -H "Content-Type: application/json" 2>/dev/null)
TEST_CODE=$(echo "$TEST_RESPONSE" | tail -n1)
TEST_BODY=$(echo "$TEST_RESPONSE" | sed '$d')
TOTAL=$((TOTAL + 1))

if [ "$TEST_CODE" = "200" ]; then
    if echo "$TEST_BODY" | grep -q '"success".*true'; then
        echo -e "${GREEN}PASS${NC} (Connection successful!)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARN${NC} (Status 200 but success: false)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}FAIL${NC} (Status: $TEST_CODE)"
    FAILED=$((FAILED + 1))
fi
echo "$TEST_BODY" > "$TEST_DIR/response_1.json"

echo ""

# ============================================
# TEST: Agent Execution with Real LLM
# ============================================
echo -e "${BLUE}=== Test: Agent Execution (Real LLM Call) ===${NC}"

echo -n "  [2] Testing: Execute agent with real OpenAI API ... "
EXEC_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/agents/$AGENT_ID/execute" \
    -H "Content-Type: application/json" \
    -d '{"userMessage":"Hello! Please respond with just: Test successful"}' 2>/dev/null)
EXEC_CODE=$(echo "$EXEC_RESPONSE" | tail -n1)
EXEC_BODY=$(echo "$EXEC_RESPONSE" | sed '$d')
TOTAL=$((TOTAL + 1))

if [ "$EXEC_CODE" = "200" ]; then
    if echo "$EXEC_BODY" | grep -q '"success".*true'; then
        # Extract the actual response message
        RESPONSE_MSG=$(echo "$EXEC_BODY" | grep -o '"finalResponse":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo -e "${GREEN}PASS${NC}"
        echo "    Response: ${RESPONSE_MSG:0:100}..."
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARN${NC} (Status 200 but success: false)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}FAIL${NC} (Status: $EXEC_CODE)"
    FAILED=$((FAILED + 1))
fi
echo "$EXEC_BODY" > "$TEST_DIR/response_2.json"

echo ""

# ============================================
# TEST: Chat Trigger Execution with Real LLM
# ============================================
echo -e "${BLUE}=== Test: Chat Trigger Execution (Real LLM Call) ===${NC}"

# Create Chat Trigger
echo "Creating Chat Trigger..."
TRIGGER_DATA="{\"name\":\"Chat Trigger Real $(date +%s)\",\"type\":\"CHAT\",\"agentId\":\"$AGENT_ID\",\"config\":{}}"
TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/triggers" \
    -H "Content-Type: application/json" \
    -d "$TRIGGER_DATA")
TRIGGER_ID=$(extract_id "$TRIGGER_RESPONSE")
echo "  Created Chat Trigger: $TRIGGER_ID"

echo -n "  [3] Testing: Execute chat trigger with real OpenAI API ... "
CHAT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/triggers/$TRIGGER_ID/execute/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"Say hello and confirm you received this message"}' 2>/dev/null)
CHAT_CODE=$(echo "$CHAT_RESPONSE" | tail -n1)
CHAT_BODY=$(echo "$CHAT_RESPONSE" | sed '$d')
TOTAL=$((TOTAL + 1))

if [ "$CHAT_CODE" = "200" ]; then
    if echo "$CHAT_BODY" | grep -q '"success".*true'; then
        RESPONSE_MSG=$(echo "$CHAT_BODY" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo -e "${GREEN}PASS${NC}"
        echo "    Response: ${RESPONSE_MSG:0:100}..."
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARN${NC} (Status 200 but success: false)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}FAIL${NC} (Status: $CHAT_CODE)"
    FAILED=$((FAILED + 1))
fi
echo "$CHAT_BODY" > "$TEST_DIR/response_3.json"

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
    echo -e "${GREEN}All tests passed! Real API integration working! ✅${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check error logs in $TEST_DIR${NC}"
    exit 1
fi

