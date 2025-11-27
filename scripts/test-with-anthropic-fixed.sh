#!/bin/bash
source .test-api-keys.env

BASE_URL="http://localhost:3001"

echo "Testing with Anthropic API Key (Fixed Model ID)..."

# Create ProviderConnection with Anthropic
echo "Creating Anthropic ProviderConnection..."
CONN_DATA="{\"name\":\"Anthropic Test $(date +%s)\",\"provider\":\"ANTHROPIC\",\"apiKey\":\"$ANTHROPIC_API_KEY\"}"
CONN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/provider-connections" \
    -H "Content-Type: application/json" \
    -d "$CONN_DATA")
CONN_ID=$(echo "$CONN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Connection: $CONN_ID"

# Create Model with correct Anthropic model ID
echo "Creating Model..."
MODEL_DATA="{\"name\":\"Anthropic Model $(date +%s)\",\"provider\":\"ANTHROPIC\",\"modelId\":\"claude-3-5-sonnet-20240620\",\"connectionId\":\"$CONN_ID\"}"
MODEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/models" \
    -H "Content-Type: application/json" \
    -d "$MODEL_DATA")
MODEL_ID=$(echo "$MODEL_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Model: $MODEL_ID"

# Test connection
echo ""
echo "Testing model connection..."
curl -s -X POST "$BASE_URL/api/v1/models/$MODEL_ID/test" \
    -H "Content-Type: application/json" | jq '.'

# Create Agent
echo ""
echo "Creating Agent..."
AGENT_DATA="{\"name\":\"Anthropic Agent $(date +%s)\",\"instructions\":\"You are a helpful assistant. Respond concisely with just the requested text.\",\"modelId\":\"$MODEL_ID\",\"memoryStrategy\":\"AUTO\",\"memoryThreshold\":1000}"
AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/agents" \
    -H "Content-Type: application/json" \
    -d "$AGENT_DATA")
AGENT_ID=$(echo "$AGENT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Agent: $AGENT_ID"

# Execute agent
echo ""
echo "Executing agent with Anthropic..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/agents/$AGENT_ID/execute" \
    -H "Content-Type: application/json" \
    -d '{"userMessage":"Say exactly: Test successful"}')

echo "$RESPONSE" | jq '.'
echo ""
echo "Final Response:"
echo "$RESPONSE" | jq -r '.data.finalResponse // .error.message // "No response"'
