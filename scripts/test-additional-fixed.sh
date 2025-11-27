#!/bin/bash

# Orchi AI - Additional API Tests (Fixed Version)
# Tests additional scenarios including consult rules, relationships, etc.

set -e

BASE_URL="http://localhost:3001"
PASSED=0
FAILED=0

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected=$4
    local desc=$5
    
    if [ -z "$data" ]; then
        code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    else
        code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" -d "$data")
    fi
    
    if [ "$code" -eq "$expected" ]; then
        echo "✅ PASS: $desc"
        PASSED=$((PASSED + 1))
    else
        echo "❌ FAIL: $desc (Expected $expected, got $code)"
        FAILED=$((FAILED + 1))
    fi
}

echo "=== Additional Manual Tests (Fixed) ==="
echo ""

# Get test agent ID
AGENT_ID=$(curl -s "$BASE_URL/api/v1/agents" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Using Agent ID: $AGENT_ID"
echo ""

# Test duplicate name (should now fail)
echo "--- Duplicate Name Tests (Fixed) ---"
DUPLICATE_NAME="DuplicateTest$(date +%s)"
test_endpoint "POST" "/api/v1/agents" "{\"name\":\"$DUPLICATE_NAME\",\"instructions\":\"Test\"}" 201 "Create agent for duplicate test"
test_endpoint "POST" "/api/v1/agents" "{\"name\":\"$DUPLICATE_NAME\",\"instructions\":\"Test\"}" 409 "Try duplicate agent name (should fail)"

# Test consult rules (FIXED: includes order field)
echo ""
echo "--- Consult Rules Tests (Fixed) ---"
# Get another agent for consult
AGENT2_ID=$(curl -s "$BASE_URL/api/v1/agents" | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)
test_endpoint "POST" "/api/v1/agents/$AGENT_ID/consults" "{\"consultedAgentId\":\"$AGENT2_ID\",\"whenCondition\":\"ALWAYS\",\"purpose\":\"Test consult\",\"order\":0}" 201 "Add consult rule (with order field)"
test_endpoint "GET" "/api/v1/agents/$AGENT_ID/consults" "" 200 "List consult rules"

# Test tool attachment
echo ""
echo "--- Tool Attachment Tests ---"
TOOL_ID=$(curl -s "$BASE_URL/api/v1/tools" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
test_endpoint "POST" "/api/v1/agents/$AGENT_ID/tools" "{\"toolId\":\"$TOOL_ID\"}" 201 "Attach tool to agent"
test_endpoint "GET" "/api/v1/agents/$AGENT_ID/tools" "" 200 "List agent tools"

# Test model cloning
echo ""
echo "--- Model Cloning Tests ---"
MODEL_ID=$(curl -s "$BASE_URL/api/v1/models" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
test_endpoint "POST" "/api/v1/models/$MODEL_ID/clone" "{\"name\":\"Cloned Model $(date +%s)\"}" 201 "Clone model"

# Test trigger with invalid agent
echo ""
echo "--- Invalid Relationship Tests ---"
test_endpoint "POST" "/api/v1/triggers" "{\"name\":\"Invalid\",\"type\":\"CHAT\",\"agentId\":\"00000000-0000-0000-0000-000000000000\",\"config\":{}}" 404 "Create trigger with invalid agent"

# Test memory expiration
echo ""
echo "--- Memory Expiration Tests ---"
FUTURE_DATE=$(date -d "+1 year" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -v+1y -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "2026-12-31T23:59:59Z")
test_endpoint "POST" "/api/v1/memories" "{\"agentId\":\"$AGENT_ID\",\"type\":\"SHORT_TERM\",\"content\":\"Test\",\"expiresAt\":\"$FUTURE_DATE\"}" 201 "Create memory with expiration"

# Test pagination
echo ""
echo "--- Pagination Tests ---"
test_endpoint "GET" "/api/v1/agents?page=1&limit=5" "" 200 "Pagination page 1"
test_endpoint "GET" "/api/v1/agents?page=2&limit=5" "" 200 "Pagination page 2"

# Test filtering
echo ""
echo "--- Filtering Tests ---"
test_endpoint "GET" "/api/v1/agents?isActive=true" "" 200 "Filter active agents"
test_endpoint "GET" "/api/v1/tools?type=EMAIL" "" 200 "Filter tools by type"
test_endpoint "GET" "/api/v1/triggers?type=CHAT" "" 200 "Filter triggers by type"

# Test search
echo ""
echo "--- Search Tests ---"
test_endpoint "GET" "/api/v1/agents?search=Test" "" 200 "Search agents"

# Test invalid UUID
echo ""
echo "--- Validation Tests ---"
test_endpoint "GET" "/api/v1/agents/invalid-uuid" "" 404 "Invalid UUID format"

# Test missing required fields
test_endpoint "POST" "/api/v1/models" "{\"name\":\"Test\"}" 400 "Create model missing required fields"

echo ""
echo "=== Additional Tests Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi

