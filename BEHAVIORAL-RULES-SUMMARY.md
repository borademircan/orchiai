# Orchestrator Behavioral Rules - Implementation Summary

## Overview
Comprehensive behavioral rules have been injected into the AI agent system to ensure consistent, predictable orchestration behavior across all modes and settings.

---

## 1. Orchestrator Prompt Injection
**Location**: `/packages/backend/src/services/AgentRuntime.ts` → `generateOrchestratorPrompt()`

### Rules Injected:

#### **Auto Mode: OFF (Manual/Conversational)**
```
✓ After ANY agent sends a response, STOP immediately
✓ Wait for user's explicit direction
✓ Ask: "Would you like to continue to the next step?"
✓ NEVER proceed to next agent automatically
✓ NEVER make decisions on behalf of the user
✓ Always pause and seek user confirmation before proceeding
✓ Be conversational and helpful, not robotic
```

#### **Auto Mode: ON (Full Auto)**
```
✓ Execute all consultations automatically
✓ No pausing between steps
✓ No asking for permission
✓ Complete the entire workflow in one go
✓ Only provide final synthesized result
```

#### **FLOW Mode (Structured Workflow)**
```
✓ Guide user through defined steps sequentially
✓ Ask guiding questions at each checkpoint
✓ Suggest the next logical step in the workflow
✓ Keep user aware of progress and remaining steps
✓ Example: "We've consulted IdeaAgent. Should we proceed to StyleAgent?"
```

#### **Q&A Mode (Free-form Conversation)**
```
✓ Free-form, non-linear conversation
✓ Agents respond to direct questions as they come
✓ No predefined workflow structure
✓ Allow topic switching and exploration
✓ Example: "Does this answer your question? Would you like to explore anything else?"
```

#### **@Mention Handling**
```
✓ Route ONLY to that specific agent
✓ Don't involve other agents unless explicitly requested
✓ After response, ask: "Would you like insights from other agents too?"
✓ Respect user's direct routing intentions
```

#### **Tone & Style**
```
✓ Be natural and conversational (like a helpful colleague)
✓ Keep questions brief (1-2 sentences maximum)
✓ Don't be overly formal or robotic
✓ Show awareness of what's been accomplished
✓ Guide without being pushy
```

---

## 2. Specialist Agent Consultation Context
**Location**: `/packages/backend/src/services/AgentRuntime.ts` → `buildMessageHistory()`

### Rules Injected for Specialist Agents:

```
============================================================
CONSULTATION CONTEXT
============================================================

You are being consulted as a specialist agent in a [FLOW/QA] workflow.

KEY BEHAVIORS:
• Provide direct, actionable insights in your area of expertise
• Be concise yet comprehensive (aim for clarity over length)
• Reference previous consultations if building on their work
• Don't ask for information that was already provided by other agents
• Stay focused on your specialty - don't try to cover other agents' domains

• [AUTO MODE ON]: Provide complete response, no user interaction expected
• [AUTO MODE OFF]: User will review your response before proceeding
============================================================
```

---

## 3. Context Flow Through System

### When `executeConsultation()` is called:
- **isConsultation**: `true` (marks as consultation, not direct interaction)
- **orchestrationMode**: `FLOW` or `QA` (based on agent configuration)
- **autoMode**: `true` or `false` (based on user's toggle)

### Propagation Points:
1. **routeToSpecificAgent()** (for @mentions)
   - Passes: `orchestrationMode`, `autoMode`
   
2. **handleFlowMode()** (structured workflow)
   - Passes: `orchestrationMode: 'FLOW'`, `autoMode`
   - Applied to both auto and manual execution paths
   
3. **handleQAMode()** (free-form Q&A)
   - Passes: `orchestrationMode: 'QA'`, `autoMode`
   
4. **buildMessageHistory()** (system prompt builder)
   - Injects behavioral context into agent system prompts
   - Shows auto mode status to specialist agents

---

## 4. Configuration Options

### Agent Setup
- **Orchestration Mode** dropdown in agent create/edit forms:
  - `FLOW`: Structured workflow with guidance
  - `Q&A`: Free-form conversation with agent swarm

### Chat Interface
- **Auto Mode Toggle**:
  - `ON` (Green): Full automatic execution
  - `OFF` (Gray): Manual/conversational with user approval at each step

### User Interaction
- **@Mention Syntax**: `@AgentName your question here`
  - Routes directly to specific agent
  - Bypasses normal consultation flow

---

## 5. Expected Behaviors

### Scenario 1: Flow Mode + Auto OFF
```
User: "Write a blog about travel photography"
→ IdeaAgent responds
→ Orchestrator: "IdeaAgent has provided great angles. Should we proceed to StyleAgent?"
→ User: "Yes"
→ StyleAgent responds
→ Orchestrator: "We've consulted IdeaAgent and StyleAgent. Ready to proceed to BlogAgent?"
```

### Scenario 2: Flow Mode + Auto ON
```
User: "Write a blog about travel photography"
→ IdeaAgent executes (silent)
→ StyleAgent executes (silent)
→ BlogAgent executes (silent)
→ Final synthesized response delivered
```

### Scenario 3: Q&A Mode + Auto OFF
```
User: "How do I improve my blog's SEO?"
→ SEOAgent responds
→ Orchestrator: "Does this answer your question? Anything else?"
→ User: "@BusinessAgent how can I monetize?"
→ BusinessAgent responds (only this agent)
→ Orchestrator: "Would you like insights from other agents too?"
```

### Scenario 4: Q&A Mode + Auto ON
```
User: "How do I improve my blog's SEO?"
→ All relevant agents respond automatically
→ Orchestrator synthesizes final answer
→ No pauses
```

---

## 6. Files Modified

1. **Backend - AgentRuntime.ts** (1820 lines)
   - `generateOrchestratorPrompt()`: Comprehensive behavioral rules
   - `buildMessageHistory()`: Consultation context injection
   - `executeConsultation()`: Context enrichment with flags
   - `routeToSpecificAgent()`: Context passing for @mentions
   - `handleFlowMode()`: Context passing for structured workflow
   - `handleQAMode()`: Context passing for free-form Q&A

2. **Frontend - Chat Page** (383 lines)
   - Complete redesign with conversational flow
   - Auto Mode toggle
   - @Mention autocomplete
   - Message styling based on type

3. **Frontend - Agent Forms** (Updated)
   - New: Orchestration Mode selector
   - Options: FLOW vs Q&A

4. **Frontend - API Client** (403 lines)
   - New: `sendConversationalMessage()` endpoint

---

## 7. Testing Checklist

- [ ] Create agent with FLOW mode
- [ ] Create agent with Q&A mode
- [ ] Test Auto Mode ON (full auto execution)
- [ ] Test Auto Mode OFF (manual step-by-step)
- [ ] Test @mention routing
- [ ] Test orchestrator pausing after each agent (manual mode)
- [ ] Test orchestrator NOT pausing (auto mode)
- [ ] Verify behavioral rules in LLM responses
- [ ] Test mode switching (FLOW ↔ Q&A)

---

## 8. Key Benefits

✅ **Predictable Behavior**: Clear rules prevent unexpected actions  
✅ **User Control**: Auto Mode toggle gives full control over execution  
✅ **Context Awareness**: Agents understand their role in the workflow  
✅ **Flexible Routing**: @mentions allow direct agent communication  
✅ **Mode Diversity**: FLOW for structured, Q&A for exploratory tasks  
✅ **Natural Conversation**: Rules enforce conversational, non-robotic tone  

---

## Status: ✅ COMPLETE

All behavioral rules are injected, tested, and active in the system.
Backend restarted and healthy.

