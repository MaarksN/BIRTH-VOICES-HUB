# Platform Diagrams

The following Mermaid diagrams illustrate the core flows and architecture of the Birth Voices Hub.

## High-Level Architecture

```mermaid
graph TD
    Client[Web/Mobile Client] --> API[Express.js API Gateway]
    API --> Middleware[Auth/RBAC Middleware]
    Middleware --> Controllers[Controllers]
    Controllers --> Services[Business Services]
    Services --> Repositories[Prisma Repositories]
    Repositories --> DB[(PostgreSQL)]

    Services --> AI[AI Service Wrapper]
    AI --> Gemini[Google Gemini API]

    Services --> Queue[BullMQ Producer]
    Queue --> Redis[(Redis)]
    Redis --> Worker[Background Workers]
    Worker --> Webhooks[External Webhooks]
```

## Data Isolation (Multi-Tenancy)

```mermaid
erDiagram
    TENANT ||--o{ USER : contains
    TENANT ||--o{ WORKFLOW : owns
    TENANT ||--o{ AGENT : owns
    TENANT ||--o{ ROLE : defines

    USER }|--|{ MEMBERSHIP : has
    TENANT }|--|{ MEMBERSHIP : includes
    MEMBERSHIP }o--|| ROLE : assigned
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB

    User->>API: POST /auth/login (email, pass)
    API->>DB: Query User by Email
    DB-->>API: Return User Hash
    API->>API: Compare bcrypt Hash
    API->>API: Generate JWT (userId, tenantId)
    API-->>User: Return 200 OK + Token

    User->>API: GET /workflows (Bearer Token)
    API->>API: Verify Token Signature
    API->>API: Extract tenantId
    API->>DB: Query Workflows WHERE tenantId = X
    DB-->>API: Data
    API-->>User: Return 200 OK + Data
```

## Voice Runtime Flow

```mermaid
sequenceDiagram
    participant Caller
    participant VoiceRuntime
    participant AgentService
    participant AIProvider

    Caller->>VoiceRuntime: Audio Stream (WebSocket/WebRTC)
    VoiceRuntime->>VoiceRuntime: STT (Speech to Text)
    VoiceRuntime->>AgentService: Process Text Input (with Session Context)
    AgentService->>AIProvider: Send Prompt + Memory
    AIProvider-->>AgentService: Return Response Stream
    AgentService-->>VoiceRuntime: Text Response
    VoiceRuntime->>VoiceRuntime: TTS (Text to Speech)
    VoiceRuntime-->>Caller: Audio Stream Response
```
