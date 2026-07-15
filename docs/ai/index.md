# AI Capabilities

Birth Voices Hub integrates deeply with AI providers to power intelligent agents and voice runtimes.

## Supported Providers

- **Google Gemini**: Currently the primary provider for text and reasoning (via `@google/genai`).
- *(Planned)* OpenAI, Anthropic: Multi-provider abstraction is being built into the `ai.service.ts`.

## Core Features

### Prompt Manager
Prompts are not hardcoded. They are managed dynamically in the database per Agent, allowing non-technical users to tweak system instructions without deploying code.

### Memory
Agents maintain conversational context (Memory) during active Sessions.
- **Short-term Memory**: Stored in Redis for active, fast-paced voice sessions.
- **Long-term Memory**: Summarized and stored in PostgreSQL (`Session.metadata`) when a session concludes.

### Retrieval-Augmented Generation (RAG)
Agents can be configured to query internal knowledge bases. (Knowledge base chunking and vector storage implementation is planned for Phase 3).

### Function Calling (Tools)
Agents can be given access to platform tools. For example, an Agent can decide to execute a "book_appointment" function during a conversation, which triggers a webhook to an external scheduling system.

### Streaming
To minimize latency (especially critical for the Voice Runtime), responses from the AI providers can be streamed chunk-by-chunk to the client or voice synthesizer.

### Voice Runtime
The Voice Runtime connects AI Agents to telephony or WebSocket clients. It handles:
- **Speech-to-Text (STT)**: Converting user audio to text.
- **Reasoning**: Routing text through the Agent.
- **Text-to-Speech (TTS)**: Converting Agent responses back to audio dynamically.
