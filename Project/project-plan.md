ORCHI AI PROJECT PLAN (FULL ARCHITECTURE EXECUTION)

1. Project Overview

Goal

Build a configurable Multi-Agent Orchestration System where any agent can act as an orchestrator using consult rules, memory, models, and tools. The system must support chat triggers, webhook triggers, and scheduled triggers.

Core Principles
	•	Every Agent is first-class: can think, decide, call tools, and consult other agents.
	•	AgentRuntime executes graphs of agents based on their configuration.
	•	Admin UI manages everything: agents, tools, models, triggers, memory.
	•	System supports multi-provider LLM models (OpenAI, Anthropic…).
	•	Non-text generators (Seedream, Veo) are implemented as Tools.
	•	Memory supports both short-term and long-term with an optional “ask user before saving” rule (chat only).

⸻

2. System Components

2.1 Agents

Agents represent intelligent units with:
	•	Instructions (persona, rules)
	•	Model assignment (LLM provider/model profile)
	•	Memory rules
	•	Attached tools (Seedream, Veo, CRM, Email, Social, Zapier-like integrations)
	•	Consult rules (when, what, why, order)

Agents can be:
	•	Simple leaf agents (just answer)
	•	Orchestrator-style agents (consult others)
	•	Reviewer agents (final synthesis)
	•	Integration agents (tool-heavy)

⸻

2.2 Models

A Model Profile defines:
	•	Provider (OpenAI, Anthropic, etc.)
	•	Model ID (gpt-5.1, claude-3.5, etc.)
	•	Endpoint
	•	Temperature/max tokens defaults
	•	Credential connection (secure storage)

Admins can:
	•	Create/edit/delete model profiles
	•	Bind them to agents
	•	Test model availability

⸻

2.3 Tools

Tools expose API functionality to agents:
	•	HTTP-based or SDK-based
	•	Seedream (image gen)
	•	Veo (video gen)
	•	CRM (internal)
	•	Email sending
	•	Social posting
	•	Custom endpoints

Admin features:
	•	Add new tool
	•	Configure endpoint, schema, method
	•	Bind credentials
	•	Test Connection
	•	Attach/detach tools from agents

⸻

2.4 Memory
	•	Short-term: chat history, session state
	•	Long-term: summaries or notes
	•	Long-term strategies:
	•	auto: summarize when threshold hits
	•	ask-user: only for chat triggers
	•	manual-only: admin-driven only
	•	Storage: memory_items table

Agents can call a built-in summarization tool via their main LLM to store memory.

⸻

2.5 Triggers

Triggers define how an agent (or workflow) gets activated:
	•	Chat trigger → interactive agent UI
	•	Webhook trigger → automated external events
	•	Scheduled trigger → cron-based autonomous actions

Admins can:
	•	Create triggers
	•	Bind target agent or workflow
	•	Configure chat routes, URLs, secrets, cron
	•	Enable/disable triggers

⸻

2.6 AgentRuntime

The central execution engine:
	1.	Receives input + entry agent
	2.	Calls the agent (LLM)
	3.	Loads consult rules for that agent
	4.	Evaluates “When”:
	•	always
	•	conditional
	•	only-if-needed
	5.	Executes consulted agents in sorted order
	6.	Passes context & summaries between agents
	7.	Handles tool calls returned by agents
	8.	Optionally calls reviewer/synthesizer agent
	9.	Returns combined output
	10.	Updates memory

This is the heart of multi-agent orchestration.

⸻

3. High-Level User Flows

3.1 Admin Configures an Agent
	1.	Create new Agent
	2.	Write instructions
	3.	Select model
	4.	Configure memory
	5.	Attach tools (Seedream etc.)
	6.	Add consult rules (when/what/why/order)
	7.	Save

Agent is now capable of orchestrating.

⸻

3.2 User/Trigger Activates an Agent
	1.	Trigger fires (chat/webhook/scheduled)
	2.	Runtime loads entry agent
	3.	Agent generates output
	4.	Runtime checks consult links
	5.	Additional agents are called
	6.	Result synthesized
	7.	Memory updated
	8.	Response sent to user or webhook caller

⸻

3.3 Tool Use (Image, Video, Email, CRM)
	1.	Agent receives user request
	2.	Decides to call Seedream/Veo/email tool
	3.	Returns tool call request
	4.	Runtime executes tool
	5.	Passes tool output back into agent
	6.	Agent produces final answer

⸻

4. Architecture Components

Backend
	•	Node.js + TypeScript
	•	Express or Fastify
	•	Prisma ORM + PostgreSQL
	•	Unified provider connectors
	•	AgentRuntime
	•	TriggerService
	•	MemoryService
	•	ModelService
	•	ToolService
	•	ChatService

Frontend
	•	React/Next.js Admin UI
	•	Forms for agent settings
	•	Test console
	•	Tools/Models/Triggers management
	•	Credential input UI

Database
	•	agents
	•	agent_consults
	•	model_profiles
	•	provider_connections
	•	tools
	•	agent_tools
	•	triggers
	•	chat_sessions
	•	chat_messages
	•	memory_items

⸻

5. Security
	•	Credential encryption (provider connections)
	•	Rate limiting for webhooks
	•	Trigger secret tokens
	•	CSRF-safe chat trigger
	•	Admin-only access to UI

⸻

6. Deliverables
	•	Fully functioning multi-agent system
	•	Admin UI for configuration
	•	Memory layers
	•	Tools with test connection
	•	Multi-model LLM support
	•	Agent orchestration engine
	•	Triggers for chat/webhook/scheduled
	•	Documentation

⸻

🧱 WORK BREAKDOWN STRUCTURE (WBS)

⸻

LEVEL 1 — PROJECT

1. Planning

1.1 Requirements gathering
1.2 Architecture definition
1.3 System design diagrams
1.4 Sprint plan / timeline setup

⸻

2. Backend Foundations

2.1 Node project setup
2.2 Database setup
2.3 Environment handling
2.4 Logging & monitoring setup
2.5 CI/CD

⸻

3. Data Model

3.1 Agents table
3.2 Agent consults table
3.3 Model profiles
3.4 Provider connections
3.5 Tools table
3.6 Agent-to-tool mapping
3.7 Triggers
3.8 Sessions & messages
3.9 Memory items

⸻

4. Core Backend Services

4.1 AgentService
4.2 ModelService
4.3 ToolService
4.4 TriggerService
4.5 MemoryService
4.6 ChatService

⸻

5. AgentRuntime Engine

5.1 Base agent execution
5.2 Consult rule execution
5.3 Conditional consult logic
5.4 Tool call handling
5.5 Final synthesis logic
5.6 Error propagation
5.7 Debug metadata and logging

⸻

6. Triggers Implementation

6.1 Chat triggers
6.2 Webhook triggers
6.3 Scheduled triggers
6.4 Trigger validation
6.5 Trigger debug views

⸻

7. Memory Implementation

7.1 Short-term memory buffer
7.2 Long-term memory writing
7.3 Summarization flow
7.4 Ask-user workflow
7.5 Memory inspector in UI

⸻

8. Tools Implementation

8.1 Tool registration logic
8.2 Credential binding
8.3 API execution engine
8.4 Tool Test Connection
8.5 Error handling for tools
8.6 Seedream integration
8.7 Veo integration
8.8 CRM/email/social tools

⸻

9. Models Implementation

9.1 Model profile CRUD
9.2 Credential linking
9.3 Unified model wrapper
9.4 Provider-specific logic
9.5 Model test call

⸻

10. Frontend Admin UI

10.1 Agents UI
10.2 Instructions editor
10.3 Memory settings UI
10.4 Consult rules UI
10.5 Model picker
10.6 Tools manager + test button
10.7 Triggers UI
10.8 Models UI
10.9 Tools UI
10.10 Test Console
10.11 UI authentication

⸻

11. QA

11.1 Unit tests
11.2 Integration tests
11.3 Runtime scenario tests
11.4 Trigger tests
11.5 Multi-agent consult tests
11.6 Tool invocation tests
11.7 Memory tests
11.8 Model provider tests

⸻

12. Deployment

12.1 Build pipeline
12.2 Secrets setup
12.3 Deployment
12.4 Monitoring
12.5 Error handling system

⸻

13. Documentation

13.1 API documentation
13.2 Data model docs
13.3 Admin UI usage docs
13.4 How to add agents/models/tools
13.5 How to configure triggers
13.6 Developer onboarding