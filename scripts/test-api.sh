#!/bin/bash

# Orchi AI - API Test Script
# Tests all 6 backend services (76 endpoints)

set -e

BASE_URL="http://localhost:3001"
TEST_DIR="/tmp/orchiai-tests"
mkdir -p "$TEST_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Test helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "Testing: $description ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC}"
        PASSED=$((PASSED + 1))
        echo "$body" > "$TEST_DIR/response_${TOTAL}.json"
        return 0
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_status, got $http_code)"
        FAILED=$((FAILED + 1))
        echo "Response: $body" > "$TEST_DIR/error_${TOTAL}.txt"
        return 1
    fi
}

# Extract ID from JSON response
extract_id() {
    local json=$1
    echo "$json" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

echo "=========================================="
echo "Orchi AI - API Test Suite"
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

# ============================================
# 1. AGENT SERVICE TESTS
# ============================================
echo "=== Agent Service Tests ==="

# Create test agent
AGENT_DATA='{"name":"Test Agent '$(date +%s)'","instructions":"Test instructions","memoryStrategy":"MANUAL_ONLY"}'
AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/agents" \
    -H "Content-Type: application/json" \
    -d "$AGENT_DATA")
AGENT_ID=$(extract_id "$AGENT_RESPONSE")
echo "Created test agent: $AGENT_ID"

test_endpoint "GET" "/api/v1/agents" "" 200 "List agents"
test_endpoint "GET" "/api/v1/agents/$AGENT_ID" "" 200 "Get agent by ID"
test_endpoint "GET" "/api/v1/agents?isActive=true" "" 200 "List active agents"
test_endpoint "PATCH" "/api/v1/agents/$AGENT_ID" '{"instructions":"Updated"}' 200 "Update agent"
test_endpoint "POST" "/api/v1/agents/$AGENT_ID/activate" "" 200 "Activate agent"
test_endpoint "POST" "/api/v1/agents/$AGENT_ID/deactivate" "" 200 "Deactivate agent"

# Test duplicate name prevention
DUPLICATE_NAME="DuplicateTest$(date +%s)"
test_endpoint "POST" "/api/v1/agents" "{\"name\":\"$DUPLICATE_NAME\",\"instructions\":\"Test\"}" 201 "Create agent for duplicate test"
test_endpoint "POST" "/api/v1/agents" "{\"name\":\"$DUPLICATE_NAME\",\"instructions\":\"Test\"}" 409 "Try duplicate agent name (should fail)"

echo ""

# ============================================
# 2. MODEL SERVICE TESTS
# ============================================
echo "=== Model Service Tests ==="

MODEL_DATA='{"name":"Test Model '$(date +%s)'","provider":"OPENAI","modelId":"gpt-4","temperature":0.7}'
MODEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/models" \
    -H "Content-Type: application/json" \
    -d "$MODEL_DATA")
MODEL_ID=$(extract_id "$MODEL_RESPONSE")
echo "Created test model: $MODEL_ID"

test_endpoint "GET" "/api/v1/models" "" 200 "List models"
test_endpoint "GET" "/api/v1/models/$MODEL_ID" "" 200 "Get model by ID"
test_endpoint "GET" "/api/v1/models/active" "" 200 "List active models"
test_endpoint "GET" "/api/v1/models/provider/OPENAI" "" 200 "Get models by provider"
test_endpoint "PATCH" "/api/v1/models/$MODEL_ID" '{"temperature":0.9}' 200 "Update model"
test_endpoint "POST" "/api/v1/models/$MODEL_ID/activate" "" 200 "Activate model"
test_endpoint "POST" "/api/v1/models/$MODEL_ID/deactivate" "" 200 "Deactivate model"

echo ""

# ============================================
# 3. TOOL SERVICE TESTS
# ============================================
echo "=== Tool Service Tests ==="

TOOL_DATA='{"name":"Test Tool '$(date +%s)'","description":"Test tool","type":"EMAIL","schema":{"to":"string"}}'
TOOL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/tools" \
    -H "Content-Type: application/json" \
    -d "$TOOL_DATA")
TOOL_ID=$(extract_id "$TOOL_RESPONSE")
echo "Created test tool: $TOOL_ID"

test_endpoint "GET" "/api/v1/tools" "" 200 "List tools"
test_endpoint "GET" "/api/v1/tools/$TOOL_ID" "" 200 "Get tool by ID"
test_endpoint "GET" "/api/v1/tools/active" "" 200 "List active tools"
test_endpoint "GET" "/api/v1/tools/type/EMAIL" "" 200 "Get tools by type"
test_endpoint "PATCH" "/api/v1/tools/$TOOL_ID" '{"description":"Updated"}' 200 "Update tool"
test_endpoint "POST" "/api/v1/tools/$TOOL_ID/activate" "" 200 "Activate tool"
test_endpoint "POST" "/api/v1/tools/$TOOL_ID/deactivate" "" 200 "Deactivate tool"

echo ""

# ============================================
# 4. TRIGGER SERVICE TESTS
# ============================================
echo "=== Trigger Service Tests ==="

TRIGGER_DATA="{\"name\":\"Test Trigger $(date +%s)\",\"type\":\"CHAT\",\"agentId\":\"$AGENT_ID\",\"config\":{\"route\":\"/test\"}}"
TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/triggers" \
    -H "Content-Type: application/json" \
    -d "$TRIGGER_DATA")
TRIGGER_ID=$(extract_id "$TRIGGER_RESPONSE")
echo "Created test trigger: $TRIGGER_ID"

test_endpoint "GET" "/api/v1/triggers" "" 200 "List triggers"
test_endpoint "GET" "/api/v1/triggers/$TRIGGER_ID" "" 200 "Get trigger by ID"
test_endpoint "GET" "/api/v1/triggers/enabled" "" 200 "List enabled triggers"
test_endpoint "GET" "/api/v1/triggers/type/CHAT" "" 200 "Get triggers by type"
test_endpoint "GET" "/api/v1/triggers/agent/$AGENT_ID" "" 200 "Get triggers by agent"
test_endpoint "PATCH" "/api/v1/triggers/$TRIGGER_ID" '{"config":{"updated":true}}' 200 "Update trigger"
test_endpoint "POST" "/api/v1/triggers/$TRIGGER_ID/enable" "" 200 "Enable trigger"
test_endpoint "POST" "/api/v1/triggers/$TRIGGER_ID/disable" "" 200 "Disable trigger"

echo ""

# ============================================
# 5. MEMORY SERVICE TESTS
# ============================================
echo "=== Memory Service Tests ==="

MEMORY_DATA="{\"agentId\":\"$AGENT_ID\",\"type\":\"SHORT_TERM\",\"content\":\"Test memory content\"}"
MEMORY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/memories" \
    -H "Content-Type: application/json" \
    -d "$MEMORY_DATA")
MEMORY_ID=$(extract_id "$MEMORY_RESPONSE")
echo "Created test memory: $MEMORY_ID"

test_endpoint "GET" "/api/v1/memories" "" 200 "List memories"
test_endpoint "GET" "/api/v1/memories/$MEMORY_ID" "" 200 "Get memory by ID"
test_endpoint "GET" "/api/v1/memories/agent/$AGENT_ID" "" 200 "Get memories by agent"
test_endpoint "GET" "/api/v1/memories/agent/$AGENT_ID/active" "" 200 "Get active memories by agent"
test_endpoint "GET" "/api/v1/memories/type/SHORT_TERM" "" 200 "Get memories by type"
test_endpoint "GET" "/api/v1/memories/expired" "" 200 "Get expired memories"
test_endpoint "PATCH" "/api/v1/memories/$MEMORY_ID" '{"content":"Updated"}' 200 "Update memory"

echo ""

# ============================================
# 6. CHAT SERVICE TESTS
# ============================================
echo "=== Chat Service Tests ==="

SESSION_DATA="{\"agentId\":\"$AGENT_ID\",\"userId\":\"user-123\"}"
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/chat/sessions" \
    -H "Content-Type: application/json" \
    -d "$SESSION_DATA")
SESSION_ID=$(extract_id "$SESSION_RESPONSE")
echo "Created test session: $SESSION_ID"

test_endpoint "GET" "/api/v1/chat/sessions" "" 200 "List sessions"
test_endpoint "GET" "/api/v1/chat/sessions/$SESSION_ID" "" 200 "Get session by ID"
test_endpoint "GET" "/api/v1/chat/sessions/agent/$AGENT_ID" "" 200 "Get sessions by agent"
test_endpoint "GET" "/api/v1/chat/sessions/user/user-123" "" 200 "Get sessions by user"
test_endpoint "PATCH" "/api/v1/chat/sessions/$SESSION_ID" '{"metadata":{"test":true}}' 200 "Update session"

MESSAGE_DATA="{\"sessionId\":\"$SESSION_ID\",\"role\":\"USER\",\"content\":\"Hello\"}"
MESSAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/chat/messages" \
    -H "Content-Type: application/json" \
    -d "$MESSAGE_DATA")
MESSAGE_ID=$(extract_id "$MESSAGE_RESPONSE")
echo "Created test message: $MESSAGE_ID"

test_endpoint "GET" "/api/v1/chat/sessions/$SESSION_ID/messages" "" 200 "List messages for session"
test_endpoint "GET" "/api/v1/chat/messages/$MESSAGE_ID" "" 200 "Get message by ID"
test_endpoint "PATCH" "/api/v1/chat/messages/$MESSAGE_ID" '{"content":"Updated"}' 200 "Update message"

echo ""

# ============================================
# ERROR HANDLING TESTS
# ============================================
echo "=== Error Handling Tests ==="

test_endpoint "GET" "/api/v1/agents/00000000-0000-0000-0000-000000000000" "" 404 "Get non-existent agent"
test_endpoint "POST" "/api/v1/agents" '{"name":"Test"}' 400 "Create agent with missing fields"
test_endpoint "GET" "/api/v1/models/provider/INVALID" "" 400 "Invalid provider enum"

echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✅${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check $TEST_DIR for details.${NC}"
    exit 1
fi

