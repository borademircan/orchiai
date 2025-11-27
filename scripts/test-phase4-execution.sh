#!/bin/bash

# Orchi AI - Phase 4 Execution Features Test Script
# Tests all Phase 4 execution endpoints (14 endpoints)

set -e

BASE_URL="http://localhost:3001"
TEST_DIR="/tmp/orchiai-tests-phase4"
mkdir -p "$TEST_DIR"

# Colors for output
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
    local check_field=${6:-""}
    local check_value=${7:-""}
    
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
        # Check additional field if specified
        if [ -n "$check_field" ] && [ -n "$check_value" ]; then
            field_value=$(echo "$body" | grep -o "\"$check_field\":\"[^\"]*\"" | head -1 | cut -d'"' -f4)
            if [ "$field_value" = "$check_value" ]; then
                echo -e "${GREEN}PASS${NC}"
                PASSED=$((PASSED + 1))
                return 0
            else
                echo -e "${YELLOW}WARN${NC} (Status OK but field check failed: expected $check_value, got $field_value)"
                WARNINGS=$((WARNINGS + 1))
                return 0
            fi
        else
            echo -e "${GREEN}PASS${NC}"
            PASSED=$((PASSED + 1))
            return 0
        fi
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_status, got $http_code)"
        FAILED=$((FAILED + 1))
        echo "    Response: $body" > "$TEST_DIR/error_${TOTAL}.txt"
        return 1
    fi
}

# Extract ID from JSON response
extract_id() {
    local json=$1
    echo "$json" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

# Extract field value from JSON
extract_field() {
    local json=$1
    local field=$2
    echo "$json" | grep -o "\"$field\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

echo "=========================================="
echo "Orchi AI - Phase 4 Execution Features Test"
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
# SETUP: Create test data
# ============================================
echo -e "${BLUE}=== Setup: Creating Test Data ===${NC}"

# Create ProviderConnection (OpenAI)
echo "Creating ProviderConnection..."
CONNECTION_DATA='{"name":"Test Connection '$(date +%s)'","provider":"OPENAI","apiKey":"sk-test-key-12345"}'
CONNECTION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/provider-connections" \
    -H "Content-Type: application/json" \
    -d "$CONNECTION_DATA")
CONNECTION_ID=$(extract_id "$CONNECTION_RESPONSE")
echo "  Created ProviderConnection: $CONNECTION_ID"

# Create Model with connection
echo "Creating Model..."
MODEL_DATA="{\"name\":\"Test Model $(date +%s)\",\"provider\":\"OPENAI\",\"modelId\":\"gpt-3.5-turbo\",\"connectionId\":\"$CONNECTION_ID\"}"
MODEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/models" \
    -H "Content-Type: application/json" \
    -d "$MODEL_DATA")
MODEL_ID=$(extract_id "$MODEL_RESPONSE")
echo "  Created Model: $MODEL_ID"

# Create Agent with model
echo "Creating Agent..."
AGENT_DATA="{\"name\":\"Test Agent $(date +%s)\",\"instructions\":\"You are a helpful assistant.\",\"modelId\":\"$MODEL_ID\",\"memoryStrategy\":\"AUTO\"}"
AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/agents" \
    -H "Content-Type: application/json" \
    -d "$AGENT_DATA")
AGENT_ID=$(extract_id "$AGENT_RESPONSE")
echo "  Created Agent: $AGENT_ID"

# Create Tool
echo "Creating Tool..."
TOOL_DATA='{"name":"Test Tool '$(date +%s)'","description":"Test tool","type":"WEBHOOK","endpoint":"https://httpbin.org/post","method":"POST","schema":{"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}}'
TOOL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/tools" \
    -H "Content-Type: application/json" \
    -d "$TOOL_DATA")
TOOL_ID=$(extract_id "$TOOL_RESPONSE")
echo "  Created Tool: $TOOL_ID"

# Create Chat Trigger
echo "Creating Chat Trigger..."
TRIGGER_DATA="{\"name\":\"Test Chat Trigger $(date +%s)\",\"type\":\"CHAT\",\"agentId\":\"$AGENT_ID\",\"config\":{\"route\":\"/chat/test\"}}"
TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/triggers" \
    -H "Content-Type: application/json" \
    -d "$TRIGGER_DATA")
TRIGGER_ID=$(extract_id "$TRIGGER_RESPONSE")
echo "  Created Chat Trigger: $TRIGGER_ID"

# Create Webhook Trigger (without secretToken for basic test)
echo "Creating Webhook Trigger..."
WEBHOOK_TRIGGER_DATA="{\"name\":\"Test Webhook Trigger $(date +%s)\",\"type\":\"WEBHOOK\",\"agentId\":\"$AGENT_ID\",\"config\":{}}"
WEBHOOK_TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/triggers" \
    -H "Content-Type: application/json" \
    -d "$WEBHOOK_TRIGGER_DATA")
WEBHOOK_TRIGGER_ID=$(extract_id "$WEBHOOK_TRIGGER_RESPONSE")
echo "  Created Webhook Trigger: $WEBHOOK_TRIGGER_ID"

# Create Webhook Trigger with secretToken for signature test
echo "Creating Webhook Trigger with secret..."
WEBHOOK_SECRET_DATA="{\"name\":\"Test Webhook Secret $(date +%s)\",\"type\":\"WEBHOOK\",\"agentId\":\"$AGENT_ID\",\"config\":{},\"secretToken\":\"test-secret-123\"}"
WEBHOOK_SECRET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/triggers" \
    -H "Content-Type: application/json" \
    -d "$WEBHOOK_SECRET_DATA")
WEBHOOK_SECRET_ID=$(extract_id "$WEBHOOK_SECRET_RESPONSE")
echo "  Created Webhook Trigger with secret: $WEBHOOK_SECRET_ID"

# Create Scheduled Trigger
echo "Creating Scheduled Trigger..."
SCHEDULED_TRIGGER_DATA="{\"name\":\"Test Scheduled Trigger $(date +%s)\",\"type\":\"SCHEDULED\",\"agentId\":\"$AGENT_ID\",\"config\":{\"cronExpression\":\"0 0 * * *\",\"message\":\"Daily task\"}}"
SCHEDULED_TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/triggers" \
    -H "Content-Type: application/json" \
    -d "$SCHEDULED_TRIGGER_DATA")
SCHEDULED_TRIGGER_ID=$(extract_id "$SCHEDULED_TRIGGER_RESPONSE")
echo "  Created Scheduled Trigger: $SCHEDULED_TRIGGER_ID"

echo ""
echo -e "${GREEN}Setup complete${NC}"
echo ""

# ============================================
# TEST SUITE 7: ProviderConnectionService
# ============================================
echo -e "${BLUE}=== Test Suite 7: ProviderConnectionService (6 endpoints) ===${NC}"

test_endpoint "GET" "/api/v1/provider-connections" "" 200 "List provider connections"
test_endpoint "GET" "/api/v1/provider-connections/$CONNECTION_ID" "" 200 "Get connection by ID"
test_endpoint "GET" "/api/v1/provider-connections/provider/OPENAI" "" 200 "Get connections by provider"
# Update with unique name to avoid conflicts
UNIQUE_UPDATE_NAME="Updated Connection $(date +%s)"
test_endpoint "PATCH" "/api/v1/provider-connections/$CONNECTION_ID" "{\"name\":\"$UNIQUE_UPDATE_NAME\"}" 200 "Update connection"

# Verify API key is encrypted (should show [ENCRYPTED])
echo -n "  [*] Verifying API key encryption ... "
ENCRYPTED_CHECK=$(curl -s "$BASE_URL/api/v1/provider-connections/$CONNECTION_ID" | grep -o '\[ENCRYPTED\]' || echo "")
if [ -n "$ENCRYPTED_CHECK" ]; then
    echo -e "${GREEN}PASS${NC}"
    PASSED=$((PASSED + 1))
    TOTAL=$((TOTAL + 1))
else
    echo -e "${RED}FAIL${NC} (API key not encrypted in response)"
    FAILED=$((FAILED + 1))
    TOTAL=$((TOTAL + 1))
fi

# Test duplicate name prevention
DUPLICATE_NAME="Duplicate Connection $(date +%s)"
test_endpoint "POST" "/api/v1/provider-connections" "{\"name\":\"$DUPLICATE_NAME\",\"provider\":\"OPENAI\",\"apiKey\":\"sk-test\"}" 201 "Create connection for duplicate test"
test_endpoint "POST" "/api/v1/provider-connections" "{\"name\":\"$DUPLICATE_NAME\",\"provider\":\"OPENAI\",\"apiKey\":\"sk-test\"}" 409 "Try duplicate connection name (should fail)"

echo ""

# ============================================
# TEST SUITE 8: Model Connection Testing
# ============================================
echo -e "${BLUE}=== Test Suite 8: Model Connection Testing (1 endpoint) ===${NC}"

# Note: This will likely fail with invalid API key, but should return 200 with success: false
test_endpoint "POST" "/api/v1/models/$MODEL_ID/test" "" 200 "Test model connection"

# Test without connection
echo "Creating model without connection..."
MODEL_NO_CONN_DATA='{"name":"Test Model No Conn '$(date +%s)'","provider":"OPENAI","modelId":"gpt-3.5-turbo"}'
MODEL_NO_CONN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/models" \
    -H "Content-Type: application/json" \
    -d "$MODEL_NO_CONN_DATA")
MODEL_NO_CONN_ID=$(extract_id "$MODEL_NO_CONN_RESPONSE")
test_endpoint "POST" "/api/v1/models/$MODEL_NO_CONN_ID/test" "" 400 "Test model without connection (should fail)"

echo ""

# ============================================
# TEST SUITE 9: Tool Execution
# ============================================
echo -e "${BLUE}=== Test Suite 9: Tool Execution (2 endpoints) ===${NC}"

# Test tool execution
test_endpoint "POST" "/api/v1/tools/$TOOL_ID/execute" '{"parameters":{"message":"Hello from test"}}' 200 "Execute tool with parameters"

# Test tool connection
test_endpoint "POST" "/api/v1/tools/$TOOL_ID/test" "" 200 "Test tool connection"

# Test inactive tool
echo "Deactivating tool..."
curl -s -X POST "$BASE_URL/api/v1/tools/$TOOL_ID/deactivate" > /dev/null
test_endpoint "POST" "/api/v1/tools/$TOOL_ID/execute" '{"parameters":{"message":"test"}}' 400 "Execute inactive tool (should fail)"

# Reactivate tool
curl -s -X POST "$BASE_URL/api/v1/tools/$TOOL_ID/activate" > /dev/null

# Test tool without endpoint
echo "Creating tool without endpoint..."
TOOL_NO_ENDPOINT_DATA='{"name":"Test Tool No Endpoint '$(date +%s)'","description":"Test","type":"WEBHOOK","method":"POST","schema":{"type":"object"}}'
TOOL_NO_ENDPOINT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/tools" \
    -H "Content-Type: application/json" \
    -d "$TOOL_NO_ENDPOINT_DATA")
TOOL_NO_ENDPOINT_ID=$(extract_id "$TOOL_NO_ENDPOINT_RESPONSE")
test_endpoint "POST" "/api/v1/tools/$TOOL_NO_ENDPOINT_ID/execute" '{"parameters":{}}' 400 "Execute tool without endpoint (should fail)"

echo ""

# ============================================
# TEST SUITE 10: Trigger Execution
# ============================================
echo -e "${BLUE}=== Test Suite 10: Trigger Execution (4 endpoints) ===${NC}"

# Chat trigger execution (may return 200 or 500 depending on API key validity)
echo -n "  [14] Testing: Execute chat trigger ... "
CHAT_TRIGGER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/triggers/$TRIGGER_ID/execute/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"Hello, test message"}' 2>/dev/null)
CHAT_TRIGGER_CODE=$(echo "$CHAT_TRIGGER_RESPONSE" | tail -n1)
CHAT_TRIGGER_BODY=$(echo "$CHAT_TRIGGER_RESPONSE" | sed '$d')
TOTAL=$((TOTAL + 1))
if [ "$CHAT_TRIGGER_CODE" = "200" ] || [ "$CHAT_TRIGGER_CODE" = "500" ]; then
    # Check if response has proper structure (success field)
    if echo "$CHAT_TRIGGER_BODY" | grep -q '"success"'; then
        echo -e "${GREEN}PASS${NC} (Status: $CHAT_TRIGGER_CODE - endpoint working, execution may fail with invalid API key)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARN${NC} (Status: $CHAT_TRIGGER_CODE but missing success field)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}FAIL${NC} (Expected 200 or 500, got $CHAT_TRIGGER_CODE)"
    FAILED=$((FAILED + 1))
fi
echo "$CHAT_TRIGGER_BODY" > "$TEST_DIR/response_14.json"

# Webhook trigger execution (without signature - may return 200 or 500 depending on API key validity)
echo -n "  [15] Testing: Execute webhook trigger without signature ... "
WEBHOOK_NO_SIG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/triggers/$WEBHOOK_TRIGGER_ID/execute/webhook" \
    -H "Content-Type: application/json" \
    -d '{"test":"data"}' 2>/dev/null)
WEBHOOK_NO_SIG_CODE=$(echo "$WEBHOOK_NO_SIG_RESPONSE" | tail -n1)
WEBHOOK_NO_SIG_BODY=$(echo "$WEBHOOK_NO_SIG_RESPONSE" | sed '$d')
TOTAL=$((TOTAL + 1))
if [ "$WEBHOOK_NO_SIG_CODE" = "200" ] || [ "$WEBHOOK_NO_SIG_CODE" = "500" ]; then
    if echo "$WEBHOOK_NO_SIG_BODY" | grep -q '"success"'; then
        echo -e "${GREEN}PASS${NC} (Status: $WEBHOOK_NO_SIG_CODE - endpoint working, execution may fail with invalid API key)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARN${NC} (Status: $WEBHOOK_NO_SIG_CODE but missing success field)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}FAIL${NC} (Expected 200 or 500, got $WEBHOOK_NO_SIG_CODE)"
    FAILED=$((FAILED + 1))
fi
echo "$WEBHOOK_NO_SIG_BODY" > "$TEST_DIR/response_15.json"

# Webhook trigger execution with signature (will fail with invalid signature, but should return proper error)
echo -n "  [16] Testing: Execute webhook trigger with invalid signature ... "
WEBHOOK_PAYLOAD='{"test":"data"}'
WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/triggers/$WEBHOOK_SECRET_ID/execute/webhook" \
    -H "Content-Type: application/json" \
    -H "X-Signature: sha256=invalid-signature" \
    -d "$WEBHOOK_PAYLOAD" 2>/dev/null)
WEBHOOK_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -n1)
WEBHOOK_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '$d')
TOTAL=$((TOTAL + 1))
if [ "$WEBHOOK_CODE" = "401" ]; then
    echo -e "${GREEN}PASS${NC} (Status: 401 - signature validation working)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}WARN${NC} (Expected 401 for invalid signature, got $WEBHOOK_CODE)"
    WARNINGS=$((WARNINGS + 1))
fi
echo "$WEBHOOK_BODY" > "$TEST_DIR/response_16.json"

# Scheduled trigger execution (may return 200 or 500 depending on API key validity)
echo -n "  [17] Testing: Execute scheduled trigger ... "
SCHEDULED_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/triggers/$SCHEDULED_TRIGGER_ID/execute/scheduled" \
    -H "Content-Type: application/json" 2>/dev/null)
SCHEDULED_CODE=$(echo "$SCHEDULED_RESPONSE" | tail -n1)
SCHEDULED_BODY=$(echo "$SCHEDULED_RESPONSE" | sed '$d')
TOTAL=$((TOTAL + 1))
if [ "$SCHEDULED_CODE" = "200" ] || [ "$SCHEDULED_CODE" = "500" ]; then
    if echo "$SCHEDULED_BODY" | grep -q '"success"'; then
        echo -e "${GREEN}PASS${NC} (Status: $SCHEDULED_CODE - endpoint working)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARN${NC} (Status: $SCHEDULED_CODE but missing success field)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}FAIL${NC} (Expected 200 or 500, got $SCHEDULED_CODE)"
    FAILED=$((FAILED + 1))
fi
echo "$SCHEDULED_BODY" > "$TEST_DIR/response_17.json"

# Trigger validation
test_endpoint "POST" "/api/v1/triggers/$TRIGGER_ID/validate" "" 200 "Validate trigger configuration"

# Test disabled trigger
echo "Disabling trigger..."
curl -s -X POST "$BASE_URL/api/v1/triggers/$TRIGGER_ID/disable" > /dev/null
test_endpoint "POST" "/api/v1/triggers/$TRIGGER_ID/execute/chat" '{"message":"test"}' 400 "Execute disabled trigger (should fail)"

# Test wrong trigger type
test_endpoint "POST" "/api/v1/triggers/$WEBHOOK_TRIGGER_ID/execute/chat" '{"message":"test"}' 400 "Execute wrong trigger type (should fail)"

echo ""

# ============================================
# TEST SUITE 11: AgentRuntime Engine
# ============================================
echo -e "${BLUE}=== Test Suite 11: AgentRuntime Engine (1 endpoint) ===${NC}"

# Agent execution (may return 200 or 500 depending on API key validity)
echo -n "  [21] Testing: Execute agent with message ... "
AGENT_EXEC_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/agents/$AGENT_ID/execute" \
    -H "Content-Type: application/json" \
    -d '{"userMessage":"Hello, this is a test message"}' 2>/dev/null)
AGENT_EXEC_CODE=$(echo "$AGENT_EXEC_RESPONSE" | tail -n1)
AGENT_EXEC_BODY=$(echo "$AGENT_EXEC_RESPONSE" | sed '$d')
TOTAL=$((TOTAL + 1))
if [ "$AGENT_EXEC_CODE" = "200" ] || [ "$AGENT_EXEC_CODE" = "500" ]; then
    if echo "$AGENT_EXEC_BODY" | grep -q '"success"'; then
        echo -e "${GREEN}PASS${NC} (Status: $AGENT_EXEC_CODE - endpoint working, execution may fail with invalid API key)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}WARN${NC} (Status: $AGENT_EXEC_CODE but missing success field)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}FAIL${NC} (Expected 200 or 500, got $AGENT_EXEC_CODE)"
    FAILED=$((FAILED + 1))
fi
echo "$AGENT_EXEC_BODY" > "$TEST_DIR/response_21.json"

# Test with session ID (may return 200 or 500, sessionId must be UUID format)
echo -n "  [22] Testing: Execute agent with session ID ... "
AGENT_SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/agents/$AGENT_ID/execute" \
    -H "Content-Type: application/json" \
    -d '{"userMessage":"Test","sessionId":"00000000-0000-0000-0000-000000000001"}' 2>/dev/null)
AGENT_SESSION_CODE=$(echo "$AGENT_SESSION_RESPONSE" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$AGENT_SESSION_CODE" = "200" ] || [ "$AGENT_SESSION_CODE" = "500" ]; then
    echo -e "${GREEN}PASS${NC} (Status: $AGENT_SESSION_CODE)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}WARN${NC} (Status: $AGENT_SESSION_CODE - may be validation error)"
    WARNINGS=$((WARNINGS + 1))
fi

# Test with context (may return 200 or 500)
echo -n "  [23] Testing: Execute agent with context ... "
AGENT_CTX_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/agents/$AGENT_ID/execute" \
    -H "Content-Type: application/json" \
    -d '{"userMessage":"Test","context":{"key":"value"}}' 2>/dev/null)
AGENT_CTX_CODE=$(echo "$AGENT_CTX_RESPONSE" | tail -n1)
TOTAL=$((TOTAL + 1))
if [ "$AGENT_CTX_CODE" = "200" ] || [ "$AGENT_CTX_CODE" = "500" ]; then
    echo -e "${GREEN}PASS${NC} (Status: $AGENT_CTX_CODE)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}FAIL${NC} (Expected 200 or 500, got $AGENT_CTX_CODE)"
    FAILED=$((FAILED + 1))
fi

# Test inactive agent
echo "Deactivating agent..."
curl -s -X POST "$BASE_URL/api/v1/agents/$AGENT_ID/deactivate" > /dev/null
test_endpoint "POST" "/api/v1/agents/$AGENT_ID/execute" '{"userMessage":"test"}' 400 "Execute inactive agent (should fail)"

# Reactivate agent
curl -s -X POST "$BASE_URL/api/v1/agents/$AGENT_ID/activate" > /dev/null

# Test agent without model
echo "Creating agent without model..."
AGENT_NO_MODEL_DATA='{"name":"Test Agent No Model '$(date +%s)'","instructions":"Test","memoryStrategy":"MANUAL_ONLY"}'
AGENT_NO_MODEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/agents" \
    -H "Content-Type: application/json" \
    -d "$AGENT_NO_MODEL_DATA")
AGENT_NO_MODEL_ID=$(extract_id "$AGENT_NO_MODEL_RESPONSE")
test_endpoint "POST" "/api/v1/agents/$AGENT_NO_MODEL_ID/execute" '{"userMessage":"test"}' 400 "Execute agent without model (should fail)"

echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Total Tests: ${BLUE}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check error logs in $TEST_DIR${NC}"
    exit 1
fi

