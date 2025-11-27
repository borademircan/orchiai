# Orchi AI - Comprehensive Test Plan
## Phase 3 & Phase 4 Complete Testing Suite

**Test Plan Version**: 2.1  
**Date**: 2025-01-27  
**Coverage**: All 94 API Endpoints (76 Phase 3 + 18 Phase 4)  
**Status**: Ready for Execution

---

## Table of Contents

1. [Test Overview](#test-overview)
2. [Test Environment](#test-environment)
3. [Phase 3: CRUD Operations Testing](#phase-3-crud-operations-testing)
4. [Phase 4: Execution Features Testing](#phase-4-execution-features-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [Test Execution Plan](#test-execution-plan)
10. [Test Metrics & KPIs](#test-metrics--kpis)

---

## Test Overview

### Objectives

**Primary Objectives:**
- Verify all 94 API endpoints function correctly
- Validate CRUD operations for all 7 services (6 data + ProviderConnection)
- Test all Phase 4 execution features (ProviderConnection, Tool Execution, Trigger Execution, AgentRuntime, Memory Advanced Features)
- Ensure integration between components works correctly
- Validate security measures (encryption, validation, error handling)
- Measure performance and identify bottlenecks

**Secondary Objectives:**
- Document test results and coverage
- Identify edge cases and error scenarios
- Verify backward compatibility
- Ensure data integrity across operations

### Test Scope

**In Scope:**
- ✅ All 94 API endpoints
- ✅ CRUD operations (Phase 3)
- ✅ ProviderConnection management (Phase 4.1)
- ✅ Model connection testing (Phase 4.3)
- ✅ Tool execution (Phase 4.4-4.5)
- ✅ Trigger execution (Phase 4.6)
- ✅ AgentRuntime engine (Phase 4.7)
- ✅ Memory advanced features (Phase 4.8) - Summarization and ask-user workflow
- ✅ Integration between components
- ✅ Security features (encryption, validation)
- ✅ Error handling and edge cases

**Out of Scope:**
- ⏳ Frontend UI testing (Phase 5)
- ⏳ Load testing at scale (future)
- ⏳ Browser compatibility (frontend)

### Test Strategy

**Approach:**
1. **Automated API Testing** - Shell scripts with curl/jq for all endpoints
2. **Manual Testing** - Interactive testing with REST Client
3. **Integration Testing** - Multi-component workflows
4. **End-to-End Testing** - Complete user scenarios
5. **Performance Testing** - Response time and throughput
6. **Security Testing** - Encryption, validation, error handling

**Test Levels:**
- **Unit Level**: Individual endpoint testing
- **Integration Level**: Component interaction testing
- **System Level**: End-to-end workflow testing
- **Performance Level**: Load and stress testing
- **Security Level**: Vulnerability and validation testing

---

## Test Environment

### Prerequisites

**Server Requirements:**
- Backend server running on `http://localhost:3001`
- Database: PostgreSQL 16+ with schema migrated
- Environment variables configured
- All dependencies installed

**Tools Required:**
- `curl` - HTTP client
- `jq` - JSON processor
- `bash` - Shell interpreter
- VS Code REST Client (optional, for manual testing)

**Test Data:**
- Clean database state (recommended before testing)
- Test API keys for LLM providers (optional, for connection tests)
- Test tool endpoints (optional, for tool execution tests)

### Environment Setup

```bash
# 1. Start backend server
cd /var/www/www.orchiai.com
npm run backend:dev

# 2. Verify server is running
curl http://localhost:3001/health

# 3. Verify database connection
# (Server logs should show "Database connected successfully")

# 4. Run database migrations (if needed)
cd packages/database
npx prisma migrate deploy
```

---

## Phase 3: CRUD Operations Testing

### Test Suite 1: AgentService (18 Endpoints)

**Status**: ✅ Previously Tested (17 endpoints) | ⏳ New: 1 execution endpoint

#### CRUD Operations (17 endpoints - previously tested)

**Test Group 1.1: Basic CRUD**
- [ ] `GET /api/v1/agents` - List all agents
- [ ] `POST /api/v1/agents` - Create agent
- [ ] `GET /api/v1/agents/:id` - Get agent by ID
- [ ] `PATCH /api/v1/agents/:id` - Update agent
- [ ] `DELETE /api/v1/agents/:id` - Delete agent

**Test Group 1.2: Filtering & Search**
- [ ] `GET /api/v1/agents?isActive=true` - Filter by status
- [ ] `GET /api/v1/agents?modelId=:id` - Filter by model
- [ ] `GET /api/v1/agents?search=keyword` - Search agents
- [ ] `GET /api/v1/agents?page=1&limit=10` - Pagination

**Test Group 1.3: Status Management**
- [ ] `POST /api/v1/agents/:id/activate` - Activate agent
- [ ] `POST /api/v1/agents/:id/deactivate` - Deactivate agent
- [ ] `GET /api/v1/agents/active` - Get active agents
- [ ] `GET /api/v1/agents/model/:modelId` - Get agents by model

**Test Group 1.4: Consult Rules**
- [ ] `GET /api/v1/agents/:id/consults` - List consult rules
- [ ] `POST /api/v1/agents/:id/consults` - Add consult rule
- [ ] `PATCH /api/v1/agents/:id/consults/:consultId` - Update consult rule
- [ ] `DELETE /api/v1/agents/:id/consults/:consultId` - Remove consult rule
- [ ] `POST /api/v1/agents/:id/consults/reorder` - Reorder consult rules

**Test Group 1.5: Tool Management**
- [ ] `GET /api/v1/agents/:id/tools` - List agent tools
- [ ] `POST /api/v1/agents/:id/tools` - Attach tool
- [ ] `DELETE /api/v1/agents/:id/tools/:toolId` - Detach tool

**Test Group 1.6: Advanced Operations**
- [ ] `POST /api/v1/agents/:id/clone` - Clone agent with all configurations

**Test Group 1.7: Validation & Error Handling**
- [ ] Duplicate name prevention (409 Conflict)
- [ ] Invalid UUID handling (400 Bad Request)
- [ ] Non-existent agent (404 Not Found)
- [ ] Invalid model ID (404 Not Found)
- [ ] Invalid consult rule (404 Not Found)

#### NEW: Execution Endpoint (1 endpoint - Phase 4.7)

**Test Group 1.8: Agent Execution**
- [ ] `POST /api/v1/agents/:id/execute` - Execute agent with message
- [ ] Execute agent with session ID
- [ ] Execute agent with context
- [ ] Execute agent with metadata
- [ ] Verify response includes: finalResponse, toolCalls, consultsExecuted, memoryUpdates, debugInfo
- [ ] Error: Execute inactive agent (400 Bad Request)
- [ ] Error: Execute non-existent agent (404 Not Found)
- [ ] Error: Execute agent without model (400 Bad Request)
- [ ] Error: Execute agent without connection (400 Bad Request)

**Expected Results:**
- ✅ All CRUD operations return correct status codes
- ✅ Execution endpoint returns RuntimeOutput with all fields
- ✅ Error cases return appropriate error codes and messages
- ✅ Response times < 500ms for CRUD, < 30s for execution

---

### Test Suite 2: ModelService (12 Endpoints)

**Status**: ✅ Previously Tested (11 endpoints) | ⏳ New: 1 test endpoint

#### CRUD Operations (11 endpoints - previously tested)

**Test Group 2.1: Basic CRUD**
- [ ] `GET /api/v1/models` - List models
- [ ] `POST /api/v1/models` - Create model
- [ ] `GET /api/v1/models/:id` - Get model by ID
- [ ] `PATCH /api/v1/models/:id` - Update model
- [ ] `DELETE /api/v1/models/:id` - Delete model

**Test Group 2.2: Filtering**
- [ ] `GET /api/v1/models?provider=OPENAI` - Filter by provider
- [ ] `GET /api/v1/models?isActive=true` - Filter by status
- [ ] `GET /api/v1/models/active` - Get active models
- [ ] `GET /api/v1/models/provider/:provider` - Get models by provider

**Test Group 2.3: Advanced Operations**
- [ ] `POST /api/v1/models/:id/clone` - Clone model

**Test Group 2.4: Validation & Error Handling**
- [ ] Duplicate name prevention (409 Conflict)
- [ ] Invalid provider enum (400 Bad Request)
- [ ] Invalid connection ID (404 Not Found)

#### NEW: Connection Testing (1 endpoint - Phase 4.3)

**Test Group 2.5: Model Connection Testing**
- [ ] `POST /api/v1/models/:id/test` - Test model connection
- [ ] Test with valid connection (200 OK, success: true)
- [ ] Test with invalid API key (200 OK, success: false)
- [ ] Test without connection (400 Bad Request)
- [ ] Test non-existent model (404 Not Found)
- [ ] Verify response includes: success, message

**Expected Results:**
- ✅ Connection test returns success/failure status
- ✅ Error messages are descriptive
- ✅ Test completes within 10 seconds

---

### Test Suite 3: ToolService (13 Endpoints)

**Status**: ✅ Previously Tested (11 endpoints) | ⏳ New: 2 execution endpoints

#### CRUD Operations (11 endpoints - previously tested)

**Test Group 3.1: Basic CRUD**
- [ ] `GET /api/v1/tools` - List tools
- [ ] `POST /api/v1/tools` - Create tool
- [ ] `GET /api/v1/tools/:id` - Get tool by ID
- [ ] `PATCH /api/v1/tools/:id` - Update tool
- [ ] `DELETE /api/v1/tools/:id` - Delete tool

**Test Group 3.2: Filtering**
- [ ] `GET /api/v1/tools?type=WEBHOOK` - Filter by type
- [ ] `GET /api/v1/tools?isActive=true` - Filter by status
- [ ] `GET /api/v1/tools/active` - Get active tools
- [ ] `GET /api/v1/tools/type/:type` - Get tools by type

**Test Group 3.3: Status Management**
- [ ] `POST /api/v1/tools/:id/activate` - Activate tool
- [ ] `POST /api/v1/tools/:id/deactivate` - Deactivate tool

**Test Group 3.4: Validation & Error Handling**
- [ ] Duplicate name prevention (409 Conflict)
- [ ] Invalid tool type enum (400 Bad Request)
- [ ] Delete tool used by agents (400 Bad Request)

#### NEW: Execution Endpoints (2 endpoints - Phase 4.4-4.5)

**Test Group 3.5: Tool Execution**
- [ ] `POST /api/v1/tools/:id/execute` - Execute tool with parameters
- [ ] Execute GET tool with query parameters
- [ ] Execute POST tool with body parameters
- [ ] Execute tool with invalid parameters (400 Bad Request)
- [ ] Execute inactive tool (400 Bad Request)
- [ ] Execute tool without endpoint (400 Bad Request)
- [ ] Verify response includes: success, data, statusCode, executionTimeMs
- [ ] Verify error response includes: success: false, error, executionTimeMs

**Test Group 3.6: Tool Connection Testing**
- [ ] `POST /api/v1/tools/:id/test` - Test tool connection
- [ ] Test accessible endpoint (200 OK, success: true)
- [ ] Test unreachable endpoint (200 OK, success: false)
- [ ] Test without endpoint (200 OK, success: false)
- [ ] Verify response includes: success, message

**Expected Results:**
- ✅ Tool execution handles all HTTP methods correctly
- ✅ Parameter validation works correctly
- ✅ Connection test completes within 5 seconds
- ✅ Error handling provides clear messages

---

### Test Suite 4: TriggerService (16 Endpoints)

**Status**: ✅ Previously Tested (12 endpoints) | ⏳ New: 4 execution endpoints

#### CRUD Operations (12 endpoints - previously tested)

**Test Group 4.1: Basic CRUD**
- [ ] `GET /api/v1/triggers` - List triggers
- [ ] `POST /api/v1/triggers` - Create trigger
- [ ] `GET /api/v1/triggers/:id` - Get trigger by ID
- [ ] `PATCH /api/v1/triggers/:id` - Update trigger
- [ ] `DELETE /api/v1/triggers/:id` - Delete trigger

**Test Group 4.2: Filtering**
- [ ] `GET /api/v1/triggers?type=CHAT` - Filter by type
- [ ] `GET /api/v1/triggers?agentId=:id` - Filter by agent
- [ ] `GET /api/v1/triggers?isEnabled=true` - Filter by status
- [ ] `GET /api/v1/triggers/enabled` - Get enabled triggers
- [ ] `GET /api/v1/triggers/type/:type` - Get triggers by type
- [ ] `GET /api/v1/triggers/agent/:agentId` - Get triggers by agent

**Test Group 4.3: Status Management**
- [ ] `POST /api/v1/triggers/:id/enable` - Enable trigger
- [ ] `POST /api/v1/triggers/:id/disable` - Disable trigger

**Test Group 4.4: Validation & Error Handling**
- [ ] Duplicate name per agent (409 Conflict)
- [ ] Invalid trigger type enum (400 Bad Request)
- [ ] Invalid agent ID (404 Not Found)

#### NEW: Execution Endpoints (4 endpoints - Phase 4.6)

**Test Group 4.5: Chat Trigger Execution**
- [ ] `POST /api/v1/triggers/:id/execute/chat` - Execute chat trigger
- [ ] Execute with message
- [ ] Execute with session ID
- [ ] Execute with user ID
- [ ] Execute disabled trigger (400 Bad Request)
- [ ] Execute wrong trigger type (400 Bad Request)
- [ ] Verify response includes: message, agentId, toolCalls, consultsExecuted, memoryUpdates, debugInfo

**Test Group 4.6: Webhook Trigger Execution**
- [ ] `POST /api/v1/triggers/:id/execute/webhook` - Execute webhook trigger
- [ ] Execute with JSON payload
- [ ] Execute with valid signature (x-signature header)
- [ ] Execute with valid signature (x-webhook-signature header)
- [ ] Execute with valid signature (x-hub-signature-256 header)
- [ ] Execute with invalid signature (401 Unauthorized)
- [ ] Execute without signature when required (401 Unauthorized)
- [ ] Execute disabled trigger (400 Bad Request)
- [ ] Verify response includes: message, agentId, toolCalls, consultsExecuted

**Test Group 4.7: Scheduled Trigger Execution**
- [ ] `POST /api/v1/triggers/:id/execute/scheduled` - Manually execute scheduled trigger
- [ ] Execute enabled scheduled trigger
- [ ] Execute disabled trigger (400 Bad Request)
- [ ] Execute wrong trigger type (400 Bad Request)
- [ ] Verify response includes: message, agentId, executedAt

**Test Group 4.8: Trigger Validation**
- [ ] `POST /api/v1/triggers/:id/validate` - Validate trigger configuration
- [ ] Validate chat trigger with route (valid: true)
- [ ] Validate chat trigger without route (valid: false)
- [ ] Validate scheduled trigger with cronExpression (valid: true)
- [ ] Validate scheduled trigger without cronExpression (valid: false)
- [ ] Validate scheduled trigger with invalid cron (valid: false)
- [ ] Verify response includes: valid, errors array

**Expected Results:**
- ✅ All trigger types execute correctly
- ✅ Signature validation works for webhooks
- ✅ Validation provides clear error messages
- ✅ Execution integrates with AgentRuntime

---

### Test Suite 5: MemoryService (16 Endpoints)

**Status**: ✅ Previously Tested (12 endpoints) | ⏳ **NEW Phase 4.8** (4 endpoints)

**Test Group 5.1: Basic CRUD**
- [ ] `GET /api/v1/memories` - List memories
- [ ] `POST /api/v1/memories` - Create memory
- [ ] `GET /api/v1/memories/:id` - Get memory by ID
- [ ] `PATCH /api/v1/memories/:id` - Update memory
- [ ] `DELETE /api/v1/memories/:id` - Delete memory

**Test Group 5.2: Filtering**
- [ ] `GET /api/v1/memories?agentId=:id` - Filter by agent
- [ ] `GET /api/v1/memories?type=SHORT_TERM` - Filter by type
- [ ] `GET /api/v1/memories/agent/:agentId` - Get memories by agent
- [ ] `GET /api/v1/memories/agent/:agentId/active` - Get active memories
- [ ] `GET /api/v1/memories/agent/:agentId/type/:type` - Get memories by type
- [ ] `GET /api/v1/memories/expired` - Get expired memories

**Test Group 5.3: Validation & Error Handling**
- [ ] Invalid agent ID (404 Not Found)
- [ ] Invalid memory type enum (400 Bad Request)
- [ ] Expired memory handling

**Test Group 5.4: Memory Advanced Features (Phase 4.8)** ⏳ **NEW**
- [ ] `POST /api/v1/memories/agents/:agentId/should-summarize` - Check if summarization needed
  - [ ] Check with threshold below current memory (shouldSummarize: false)
  - [ ] Check with threshold above current memory (shouldSummarize: true)
  - [ ] Invalid agent ID (404 Not Found)
  - [ ] Invalid threshold (400 Bad Request - negative or zero)
  - [ ] Verify response includes: shouldSummarize, agentId, threshold

- [ ] `POST /api/v1/memories/agents/:agentId/summarize` - Summarize memories
  - [ ] Summarize with existing memories (creates SUMMARY type memory)
  - [ ] Summarize with no memories (returns empty string)
  - [ ] Agent without model (400 Bad Request)
  - [ ] Agent without connection (400 Bad Request)
  - [ ] Invalid agent ID (404 Not Found)
  - [ ] Verify summary is saved as SUMMARY type
  - [ ] Verify old memories marked as summarized in metadata
  - [ ] Verify response includes: summary, agentId

- [ ] `GET /api/v1/memories/agents/:agentId/context` - Get memory context
  - [ ] Get context with summary (returns summary + recent memories)
  - [ ] Get context without summary (returns recent memories only)
  - [ ] Get context with limit parameter
  - [ ] Invalid agent ID (404 Not Found)
  - [ ] Verify response includes: context, agentId, limit
  - [ ] Verify context format includes [Summary] and [Recent Memories] sections

- [ ] `POST /api/v1/memories/agents/:agentId/approve` - Approve memory (ASK_USER strategy)
  - [ ] Approve memory with valid content
  - [ ] Invalid agent ID (404 Not Found)
  - [ ] Empty content (400 Bad Request)
  - [ ] Verify approved memory has metadata with approved: true
  - [ ] Verify response includes created memory item

**Expected Results:**
- ✅ Summarization check works correctly
- ✅ Summarization creates SUMMARY type memory
- ✅ Context retrieval includes summaries when available
- ✅ Memory approval works for ASK_USER strategy
- ✅ All error cases handled properly

---

### Test Suite 6: ChatService (13 Endpoints)

**Status**: ✅ Previously Tested (13 endpoints)

**Test Group 6.1: Session Management**
- [ ] `GET /api/v1/chat/sessions` - List sessions
- [ ] `POST /api/v1/chat/sessions` - Create session
- [ ] `GET /api/v1/chat/sessions/:id` - Get session by ID
- [ ] `PATCH /api/v1/chat/sessions/:id` - Update session
- [ ] `DELETE /api/v1/chat/sessions/:id` - Delete session
- [ ] `GET /api/v1/chat/sessions/agent/:agentId` - Get sessions by agent
- [ ] `GET /api/v1/chat/sessions/user/:userId` - Get sessions by user

**Test Group 6.2: Message Management**
- [ ] `GET /api/v1/chat/sessions/:sessionId/messages` - List messages
- [ ] `POST /api/v1/chat/messages` - Create message
- [ ] `GET /api/v1/chat/messages/:id` - Get message by ID
- [ ] `PATCH /api/v1/chat/messages/:id` - Update message
- [ ] `DELETE /api/v1/chat/messages/:id` - Delete message

**Test Group 6.3: Validation & Error Handling**
- [ ] Invalid session ID (404 Not Found)
- [ ] Invalid agent ID (404 Not Found)
- [ ] Cascade delete (messages deleted with session)

---

## Phase 4: Execution Features Testing

### Test Suite 7: ProviderConnectionService (6 Endpoints)

**Status**: ⏳ NEW - Phase 4.1

**Test Group 7.1: Basic CRUD**
- [ ] `GET /api/v1/provider-connections` - List connections
- [ ] `POST /api/v1/provider-connections` - Create connection
- [ ] `GET /api/v1/provider-connections/:id` - Get connection by ID
- [ ] `PATCH /api/v1/provider-connections/:id` - Update connection
- [ ] `DELETE /api/v1/provider-connections/:id` - Delete connection
- [ ] `GET /api/v1/provider-connections/provider/:provider` - Get connections by provider

**Test Group 7.2: Security & Encryption**
- [ ] Verify API key is encrypted in database
- [ ] Verify API key shows `[ENCRYPTED]` in responses
- [ ] Verify encryption key shows `[REDACTED]` in responses
- [ ] Verify API key is never exposed in error messages
- [ ] Test decryption with valid encryption key
- [ ] Test decryption with invalid encryption key (should fail)

**Test Group 7.3: Filtering**
- [ ] `GET /api/v1/provider-connections?provider=OPENAI` - Filter by provider
- [ ] `GET /api/v1/provider-connections?search=keyword` - Search connections
- [ ] `GET /api/v1/provider-connections?page=1&limit=10` - Pagination

**Test Group 7.4: Validation & Error Handling**
- [ ] Duplicate name prevention (409 Conflict)
- [ ] Invalid provider enum (400 Bad Request)
- [ ] Delete connection used by models (400 Bad Request)
- [ ] Missing API key (400 Bad Request)
- [ ] Invalid UUID (400 Bad Request)

**Test Group 7.5: Provider-Specific Tests**
- [ ] Create OpenAI connection
- [ ] Create Anthropic connection
- [ ] Create Google connection
- [ ] Create CUSTOM connection (should fail or require endpoint)

**Expected Results:**
- ✅ All API keys encrypted with AES-256-GCM
- ✅ No API keys exposed in responses
- ✅ Encryption/decryption works correctly
- ✅ Connection deletion prevented when in use

---

### Test Suite 8: Tool Execution (2 Endpoints)

**Status**: ⏳ NEW - Phase 4.4-4.5

**Test Group 8.1: Tool Execution**
- [ ] Execute GET tool with query parameters
- [ ] Execute POST tool with JSON body
- [ ] Execute PUT tool with JSON body
- [ ] Execute PATCH tool with JSON body
- [ ] Execute DELETE tool
- [ ] Execute tool with schema validation (required fields)
- [ ] Execute tool with schema validation (type checking)
- [ ] Execute tool with invalid parameters (400 Bad Request)
- [ ] Execute inactive tool (400 Bad Request)
- [ ] Execute tool without endpoint (400 Bad Request)
- [ ] Execute tool with timeout (504 Gateway Timeout)
- [ ] Verify execution time tracking
- [ ] Verify status code in response

**Test Group 8.2: Tool Connection Testing**
- [ ] Test accessible HTTP endpoint (200 OK)
- [ ] Test unreachable endpoint (success: false)
- [ ] Test endpoint with timeout (success: false)
- [ ] Test without endpoint configured (success: false)
- [ ] Verify test completes within 5 seconds

**Test Group 8.3: Tool Types**
- [ ] Execute SEEDREAM tool
- [ ] Execute VEO tool
- [ ] Execute CRM tool
- [ ] Execute EMAIL tool
- [ ] Execute SOCIAL tool
- [ ] Execute WEBHOOK tool
- [ ] Execute CUSTOM tool

**Expected Results:**
- ✅ All HTTP methods work correctly
- ✅ Schema validation prevents invalid parameters
- ✅ Timeout handling works (30s default)
- ✅ Connection test completes quickly (5s)

---

### Test Suite 9: AgentRuntime Engine (1 Endpoint)

**Status**: ⏳ NEW - Phase 4.7

**Test Group 9.1: Basic Execution**
- [ ] Execute agent with simple message
- [ ] Execute agent with session ID
- [ ] Execute agent with context
- [ ] Execute agent with metadata
- [ ] Verify response structure: finalResponse, toolCalls, consultsExecuted, memoryUpdates, debugInfo
- [ ] Verify executionTimeMs is present

**Test Group 9.2: LLM Integration**
- [ ] Execute agent with OpenAI model
- [ ] Execute agent with Anthropic model
- [ ] Execute agent with Google model
- [ ] Verify LLM response is included in finalResponse
- [ ] Error: Execute agent without model (400 Bad Request)
- [ ] Error: Execute agent without connection (400 Bad Request)
- [ ] Error: Execute agent with invalid API key (handled gracefully)

**Test Group 9.3: Tool Execution Integration**
- [ ] Execute agent that calls tools
- [ ] Verify tool calls are executed
- [ ] Verify tool results are included in response
- [ ] Verify tool errors are handled gracefully
- [ ] Verify tool calls appear in toolCalls array

**Test Group 9.4: Multi-Agent Consults**
- [ ] Execute agent with ALWAYS consult rule
- [ ] Execute agent with CONDITIONAL consult rule (condition met)
- [ ] Execute agent with CONDITIONAL consult rule (condition not met)
- [ ] Execute agent with ONLY_IF_NEEDED consult rule (uncertainty detected)
- [ ] Execute agent with ONLY_IF_NEEDED consult rule (no uncertainty)
- [ ] Verify consulted agents appear in consultsExecuted array
- [ ] Verify consult responses are included
- [ ] Verify execution path tracking (debugInfo.executionPath)
- [ ] Error: Circular consult dependency (max depth reached)

**Test Group 9.5: Memory Integration**
- [ ] Execute agent with AUTO memory strategy
- [ ] Execute agent with MANUAL_ONLY memory strategy
- [ ] Execute agent with ASK_USER memory strategy
- [ ] Verify memory retrieval (recent memories included)
- [ ] Verify memory auto-save (memoryUpdates array)
- [ ] Verify memory threshold handling

**Test Group 9.6: Error Handling**
- [ ] Execute inactive agent (400 Bad Request)
- [ ] Execute non-existent agent (404 Not Found)
- [ ] Execute agent with LLM timeout (handled gracefully)
- [ ] Execute agent with tool execution failure (handled gracefully)
- [ ] Execute agent with consult failure (error in debugInfo.errors)
- [ ] Verify errors array in debugInfo

**Test Group 9.7: Execution Tracking**
- [ ] Verify executionPath includes all executed agents
- [ ] Verify totalAgentsExecuted count is correct
- [ ] Verify errors array captures failures
- [ ] Verify metadata includes entryAgentId, sessionId

**Expected Results:**
- ✅ Agent execution completes successfully
- ✅ LLM integration works for all providers
- ✅ Tool execution integrated correctly
- ✅ Multi-agent consults work as expected
- ✅ Memory management functions correctly
- ✅ Error handling is graceful
- ✅ Execution tracking provides useful debug info

---

### Test Suite 10: Memory Advanced Features (Phase 4.8) - 4 Endpoints

**Status**: ⏳ **NEW - Phase 4.8**

**Test Group 10.1: Memory Summarization Check**
- [ ] `POST /api/v1/memories/agents/:agentId/should-summarize` - Check if summarization needed
  - [ ] Check with threshold below current memory (shouldSummarize: false)
  - [ ] Check with threshold above current memory (shouldSummarize: true)
  - [ ] Check with no memories (shouldSummarize: false)
  - [ ] Invalid agent ID (404 Not Found)
  - [ ] Invalid threshold (400 Bad Request - negative)
  - [ ] Invalid threshold (400 Bad Request - zero)
  - [ ] Verify response includes: shouldSummarize, agentId, threshold

**Test Group 10.2: Memory Summarization**
- [ ] `POST /api/v1/memories/agents/:agentId/summarize` - Summarize memories
  - [ ] Summarize with existing SHORT_TERM memories (creates SUMMARY type memory)
  - [ ] Summarize with existing LONG_TERM memories
  - [ ] Summarize with no memories (returns empty string)
  - [ ] Agent without model (400 Bad Request)
  - [ ] Agent without connection (400 Bad Request)
  - [ ] Invalid agent ID (404 Not Found)
  - [ ] Verify summary is saved as SUMMARY type memory
  - [ ] Verify old memories marked as summarized in metadata
  - [ ] Verify response includes: summary, agentId
  - [ ] Verify summary content is meaningful (not empty, contains key info)

**Test Group 10.3: Memory Context Retrieval**
- [ ] `GET /api/v1/memories/agents/:agentId/context` - Get memory context
  - [ ] Get context with summary (returns summary + recent memories)
  - [ ] Get context without summary (returns recent memories only)
  - [ ] Get context with limit parameter (limit=5)
  - [ ] Get context with limit parameter (limit=20)
  - [ ] Invalid agent ID (404 Not Found)
  - [ ] Verify response includes: context, agentId, limit
  - [ ] Verify context format includes [Summary] section when summary exists
  - [ ] Verify context format includes [Recent Memories] section
  - [ ] Verify context respects limit parameter

**Test Group 10.4: Memory Approval (ASK_USER Strategy)**
- [ ] `POST /api/v1/memories/agents/:agentId/approve` - Approve memory
  - [ ] Approve memory with valid content
  - [ ] Invalid agent ID (404 Not Found)
  - [ ] Empty content (400 Bad Request)
  - [ ] Verify approved memory has metadata with approved: true
  - [ ] Verify approved memory has metadata with approvedAt timestamp
  - [ ] Verify response includes created memory item
  - [ ] Verify memory type is SHORT_TERM

**Test Group 10.5: Integration with AgentRuntime**
- [ ] Agent with AUTO strategy and threshold exceeded
  - [ ] Create agent with AUTO strategy and low threshold
  - [ ] Add multiple memories to exceed threshold
  - [ ] Execute agent
  - [ ] Verify summarization is triggered automatically
  - [ ] Verify summary is created
  - [ ] Verify new memory is saved after summarization

- [ ] Agent with ASK_USER strategy
  - [ ] Create agent with ASK_USER strategy
  - [ ] Execute agent via chat trigger
  - [ ] Verify memory is marked as pending approval
  - [ ] Verify memoryUpdates includes pending approval info
  - [ ] Approve memory via API
  - [ ] Verify memory is saved

- [ ] Memory context in AgentRuntime
  - [ ] Create agent with memories
  - [ ] Summarize memories
  - [ ] Execute agent
  - [ ] Verify context includes summary
  - [ ] Verify context includes recent memories

**Expected Results:**
- ✅ Summarization check works correctly
- ✅ Summarization creates SUMMARY type memory using LLM
- ✅ Context retrieval includes summaries when available
- ✅ Memory approval works for ASK_USER strategy
- ✅ Integration with AgentRuntime works correctly
- ✅ All error cases handled properly
- ✅ Memory metadata properly updated

---

## Integration Testing

### Test Suite 11: Component Integration

**Test Group 11.1: ProviderConnection → Model → Agent Flow**
- [ ] Create ProviderConnection
- [ ] Create Model with ProviderConnection
- [ ] Create Agent with Model
- [ ] Execute Agent (should use ProviderConnection)
- [ ] Delete ProviderConnection (should fail if model uses it)
- [ ] Delete Model (should set agent.modelId to null)

**Test Group 11.2: Tool → Agent → Execution Flow**
- [ ] Create Tool
- [ ] Create Agent
- [ ] Attach Tool to Agent
- [ ] Execute Agent with tool-calling message
- [ ] Verify tool is executed
- [ ] Verify tool result in response

**Test Group 11.3: Trigger → Agent → Execution Flow**
- [ ] Create Agent
- [ ] Create Chat Trigger for Agent
- [ ] Execute Trigger
- [ ] Verify Agent is executed
- [ ] Verify response structure

**Test Group 10.4: Multi-Agent Consult Flow**
- [ ] Create Agent A
- [ ] Create Agent B
- [ ] Add consult rule: A consults B
- [ ] Execute Agent A
- [ ] Verify Agent B is consulted
- [ ] Verify both agents in executionPath

**Test Group 10.5: Memory → Agent → Execution Flow**
- [ ] Create Agent with AUTO memory strategy
- [ ] Create Memory for Agent
- [ ] Execute Agent
- [ ] Verify memory is retrieved
- [ ] Verify new memory is saved

**Test Group 10.6: Complete Workflow**
- [ ] Create ProviderConnection (OpenAI)
- [ ] Create Model with connection
- [ ] Create Tool
- [ ] Create Agent with Model
- [ ] Attach Tool to Agent
- [ ] Create Chat Trigger for Agent
- [ ] Create Memory for Agent
- [ ] Execute Trigger
- [ ] Verify complete execution flow works

---

## End-to-End Testing

### Test Suite 15: Complete User Scenarios

**Scenario 1: Create and Execute Simple Agent**
1. Create ProviderConnection (OpenAI)
2. Create Model with connection
3. Create Agent with Model
4. Create Chat Trigger
5. Execute Trigger with message
6. Verify response

**Scenario 2: Multi-Agent Consultation**
1. Create ProviderConnection
2. Create Model
3. Create Agent A (main agent)
4. Create Agent B (consulted agent)
5. Add consult rule: A consults B (ALWAYS)
6. Execute Agent A
7. Verify both agents executed
8. Verify consult response included

**Scenario 3: Agent with Tool Execution**
1. Create Tool (webhook endpoint)
2. Create ProviderConnection
3. Create Model
4. Create Agent with Model
5. Attach Tool to Agent
6. Execute Agent with tool-requesting message
7. Verify tool is called
8. Verify tool result in response

**Scenario 4: Scheduled Trigger Execution**
1. Create Agent
2. Create Scheduled Trigger with cron expression
3. Verify trigger is scheduled on server start
4. Manually execute trigger
5. Verify agent executes
6. Disable trigger
7. Verify trigger is unscheduled

**Scenario 5: Webhook Trigger with Signature**
1. Create Agent
2. Create Webhook Trigger with secretToken
3. Generate HMAC-SHA256 signature
4. Execute trigger with signature
5. Verify execution succeeds
6. Execute trigger with invalid signature
7. Verify execution fails (401)

---

## Performance Testing

### Test Suite 12: Memory → AgentRuntime Integration

**Test Group 12.1: Memory Summarization in Execution**
- [ ] Agent with AUTO strategy and memory threshold
- [ ] Execute agent multiple times to exceed threshold
- [ ] Verify summarization is triggered
- [ ] Verify summary is used in subsequent executions
- [ ] Verify old memories are marked as summarized

**Test Group 12.2: ASK_USER Workflow**
- [ ] Agent with ASK_USER strategy
- [ ] Execute agent via chat trigger
- [ ] Verify memory pending approval in response
- [ ] Approve memory via API
- [ ] Verify memory is saved
- [ ] Execute agent again, verify approved memory in context

**Test Group 12.3: Memory Context in AgentRuntime**
- [ ] Create agent with multiple memories
- [ ] Summarize memories
- [ ] Execute agent
- [ ] Verify context includes summary
- [ ] Verify context includes recent memories since summary
- [ ] Verify context is used in LLM prompt

---

### Test Suite 13: Performance & Load

**Test Group 13.1: Response Time**
- [ ] Measure CRUD operation response times (target: < 500ms)
- [ ] Measure execution response times (target: < 30s)
- [ ] Measure tool execution times (target: < 30s)
- [ ] Measure connection test times (target: < 10s)

**Test Group 13.2: Concurrent Requests**
- [ ] 10 concurrent CRUD requests
- [ ] 5 concurrent execution requests
- [ ] Verify no data corruption
- [ ] Verify response times acceptable

**Test Group 13.3: Database Performance**
- [ ] Large dataset queries (1000+ records)
- [ ] Pagination performance
- [ ] Search performance
- [ ] Relationship queries

**Test Group 13.4: Memory Usage**
- [ ] Monitor memory during execution
- [ ] Verify no memory leaks
- [ ] Verify garbage collection works

---

## Security Testing

### Test Suite 14: Security & Validation

**Test Group 14.1: Input Validation**
- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] Invalid UUID formats
- [ ] Invalid enum values
- [ ] Missing required fields
- [ ] Invalid data types

**Test Group 14.2: Authentication & Authorization**
- [ ] Unauthorized access attempts (if auth implemented)
- [ ] Token validation (if auth implemented)

**Test Group 14.3: Encryption**
- [ ] Verify API keys encrypted at rest
- [ ] Verify encryption keys not exposed
- [ ] Verify decryption works correctly
- [ ] Test with corrupted encryption data

**Test Group 14.4: Error Handling**
- [ ] Verify no sensitive data in error messages
- [ ] Verify stack traces not exposed (production)
- [ ] Verify appropriate error codes

**Test Group 14.5: Webhook Security**
- [ ] Signature validation works
- [ ] Invalid signatures rejected
- [ ] Missing signatures rejected (when required)
- [ ] Signature algorithm verification

---

## Test Execution Plan

### Phase 1: CRUD Operations Verification (2-3 hours)
**Objective**: Verify all Phase 3 CRUD endpoints still work

1. Run existing test scripts (`test-api.sh`, `test-additional-fixed.sh`)
2. Verify all 76 Phase 3 endpoints
3. Document any regressions

### Phase 2: Phase 4 Execution Features (4-6 hours)
**Objective**: Test all new Phase 4 endpoints

1. ProviderConnection testing (1 hour)
2. Tool execution testing (1 hour)
3. Trigger execution testing (1.5 hours)
4. AgentRuntime testing (2 hours)
5. Integration testing (1 hour)

### Phase 3: Integration & E2E (2-3 hours)
**Objective**: Test component interactions

1. Integration scenarios (1 hour)
2. End-to-end workflows (1.5 hours)
3. Performance testing (30 minutes)

### Phase 4: Security & Edge Cases (1-2 hours)
**Objective**: Security and error handling

1. Security tests (30 minutes)
2. Edge cases (30 minutes)
3. Error scenarios (30 minutes)

### Total Estimated Time: 9-14 hours

---

## Test Metrics & KPIs

### Success Criteria

**Functional:**
- ✅ 100% endpoint coverage (90/90 endpoints tested)
- ✅ 100% test pass rate
- ✅ All error cases handled correctly
- ✅ All integration points work

**Performance:**
- ✅ CRUD operations: < 500ms (P95)
- ✅ Execution operations: < 30s (P95)
- ✅ Connection tests: < 10s (P95)
- ✅ Tool execution: < 30s (P95)

**Security:**
- ✅ All API keys encrypted
- ✅ No sensitive data exposed
- ✅ Input validation works
- ✅ Error messages don't leak information

**Quality:**
- ✅ Zero critical bugs
- ✅ Zero security vulnerabilities
- ✅ All error messages descriptive
- ✅ All responses follow API contract

### Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Endpoint Coverage | 100% | 94/94 (100%) - All endpoints documented |
| Functional Coverage | 100% | Phase 3: 100%, Phase 4: 100% |
| Integration Coverage | 100% | Phase 4.1-4.7: Tested, Phase 4.8: Planned |
| Error Case Coverage | 100% | All error scenarios documented |

### Reporting

**Test Report Should Include:**
- Total tests executed
- Pass/fail counts
- Coverage percentages
- Performance metrics
- Security findings
- Bug reports
- Recommendations

---

## Test Scripts

### Automated Test Scripts

**Main Test Script**: `scripts/test-comprehensive.sh` (to be created)
- Tests all 90 endpoints
- Includes Phase 4 execution features
- Generates detailed report

**Execution Test Script**: `scripts/test-execution.sh` (to be created)
- Tests all execution features
- Includes integration scenarios
- Performance measurements

### Manual Test Files

**REST Client File**: `api-tests.http`
- Update with Phase 4 endpoints
- Include execution examples
- Include integration scenarios

---

## Implementation Status

### ✅ Test Scripts Created

1. **`scripts/test-phase4-execution.sh`** - Phase 4 execution features (14 endpoints)
   - ProviderConnection tests
   - Model connection testing
   - Tool execution
   - Trigger execution
   - AgentRuntime execution

2. **`scripts/test-integration.sh`** - Integration scenarios
   - Component workflows
   - End-to-end scenarios

3. **`scripts/test-all.sh`** - Comprehensive test runner
   - Runs all test suites
   - Provides summary

4. **`api-tests.http`** - Updated with Phase 4 examples
   - All Phase 4 endpoints documented
   - Ready for manual testing

### 📋 Documentation Created

- `Project/TEST-IMPLEMENTATION-STATUS.md` - Implementation details
- `Project/TEST-QUICK-START.md` - Quick reference guide

## Next Steps

1. **Execute Test Plan**
   ```bash
   # Run all tests
   ./scripts/test-all.sh
   
   # Or run individually
   ./scripts/test-phase4-execution.sh
   ./scripts/test-integration.sh
   ```

2. **Review Test Results**
   - Check test output
   - Review error logs in `/tmp/orchiai-tests-*/`
   - Verify all endpoints tested

3. **Generate Test Report**
   - Document all results
   - Identify issues
   - Provide recommendations

4. **Future Enhancements**
   - Add test data cleanup
   - Mock LLM providers for consistent testing
   - Add performance benchmarks
   - Add security test suite

---

**Test Plan Status**: ✅ **Implemented & Ready for Execution**  
**Implementation Date**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Next Review**: After test execution

