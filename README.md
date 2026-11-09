# Cloud-Native Telemedicine & Virtual Care Platform
### Enterprise-Grade Healthcare Architecture & Production Engineering Specification

[![Node.js 24](https://img.shields.io/badge/Node.js-24_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript 5.x](https://img.shields.io/badge/TypeScript-5.x_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express 5](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![AWS Architecture](https://img.shields.io/badge/AWS-Cloud--Native-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P_Encrypted-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Executive Summary & Architectural Vision

The **Telemedicine & Virtual Care Platform** is an enterprise-class, HIPAA-aligned digital healthcare system engineered for low-latency virtual consultations, high-concurrency appointment scheduling, zero-trust electronic medical records (EMR) exchange, and resilient multi-channel asynchronous patient notifications.

The system is architected around **event-driven, decoupled micro-components** and **clean domain boundaries**, eliminating single points of failure while enforcing stringent data privacy and least-privilege security perimeters.

```
                              ┌──────────────────────────────────────────────────────────┐
                              │               CORE ARCHITECTURAL PILLARS                 │
                              └──────────────────────────────────────────────────────────┘
           ┌─────────────────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────┐
           ▼                         ▼                         ▼                         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ Zero-Trust Security │   │ Ephemeral Ingestion │   │ Atomic Scheduling   │   │ High-Resilience     │   │ P2P WebRTC & Media  │
│ Strict RBAC, bcrypt │   │ Direct S3 pre-signed│   │ ACID transactions,  │   │ EventBridge + SQS   │   │ Peer-to-peer audio/ │
│ rotating JWT/token  │   │ uploads & CloudFront│   │ conflict-guarded    │   │ DLQ retry pipeline, │   │ video, DTLS-SRTP,   │
│ family theft defense│   │ signed download URLs│   │ concurrency locks   │   │ idempotent consumer │   │ WebSocket signaling │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

---

## 2. Global Cloud Architecture & Network Perimeter

The production topology leverages AWS multi-tiered network isolation, separating public ingress from application compute and database persistence layers across multiple Availability Zones.

### 2.1 AWS Infrastructure & Topology Map

```mermaid
flowchart TB
    subgraph Clients ["Client Layer"]
        B_PATIENT["Patient (Browser / Mobile)"]
        B_DOCTOR["Doctor (Workstation / Browser)"]
        B_ADMIN["Administrator (Portal)"]
    end

    subgraph Edge ["AWS Edge Network"]
        WAF["AWS WAF (DDoS / Rate Limiting)"]
        CF["Amazon CloudFront CDN (Global Distribution)"]
        S3_WEB[("S3 Bucket: Web Client SPA Assets")]
    end

    subgraph AWS_VPC ["Amazon VPC (10.0.0.0/16) - Multi-AZ"]
        subgraph Public_Subnets ["Public Subnets (AZ-a / AZ-b)"]
            ALB["Application Load Balancer (ALB) - TLS Termination"]
            NAT["NAT Gateway (Outbound Internet Egress)"]
        end

        subgraph Private_App_Subnets ["Private Application Subnets (Auto-Scaling Group)"]
            EC2_APP1["EC2 Instance 1: Express 5 + Socket.IO + SQS Consumer"]
            EC2_APP2["EC2 Instance 2: Express 5 + Socket.IO + SQS Consumer"]
            REDIS[("Amazon ElastiCache / Redis PubSub (Socket Adapter)")]
        end

        subgraph Private_DB_Subnets ["Private Data Subnets (Isolated)"]
            RDS_MASTER[("Amazon RDS PostgreSQL 16 (Primary)")]
            RDS_STANDBY[("Amazon RDS Multi-AZ Standby")]
        end
    end

    subgraph Cloud_Storage ["Dedicated S3 Storage Tier"]
        S3_FILES[("S3 Bucket: Private Medical Records & Prescription PDFs")]
    end

    subgraph Async_Messaging ["Asynchronous Eventing & Scheduling Subsystem"]
        EB_SCHED["Amazon EventBridge Scheduler (One-time Rules)"]
        SQS_MAIN["Amazon SQS: telecare-reminders (Visibility: 60s)"]
        SQS_DLQ["Amazon SQS: telecare-reminders-dlq (Dead Letter Queue)"]
        SNS["Amazon SNS: telecare-notifications (Transactional Fan-out)"]
    end

    subgraph External_Carriers ["Notification Egress"]
        EMAIL_GW["Amazon SES / Email Gateway"]
        SMS_GW["Amazon SNS SMS (Transactional E.164)"]
    end

    %% Ingress Traffic
    B_PATIENT -->|"HTTPS 443"| WAF
    B_DOCTOR -->|"HTTPS 443"| WAF
    B_ADMIN -->|"HTTPS 443"| WAF
    WAF --> CF

    CF -->|"Default: /*"| S3_WEB
    CF -->|"API: /api/*"| ALB
    CF -->|"Realtime: /socket.io/*"| ALB
    CF -->|"Signed URL Read"| S3_FILES

    %% Load Balancing to Compute
    ALB -->|"HTTP 4000 (sg-alb to sg-app)"| EC2_APP1
    ALB -->|"HTTP 4000 (sg-alb to sg-app)"| EC2_APP2
    EC2_APP1 <-->|"Cluster Sync"| REDIS
    EC2_APP2 <-->|"Cluster Sync"| REDIS

    %% Persistence
    EC2_APP1 -->|"Port 5432 (sg-app to sg-db)"| RDS_MASTER
    EC2_APP2 -->|"Port 5432 (sg-app to sg-db)"| RDS_MASTER
    RDS_MASTER -.->|"Synchronous Replication"| RDS_STANDBY

    %% Direct S3 Storage Ingestion
    B_PATIENT -->|"Direct PUT (Pre-signed URL)"| S3_FILES
    EC2_APP1 -->|"PutObject: PDF Prescriptions"| S3_FILES

    %% Asynchronous Pipeline
    EC2_APP1 -->|"Create Schedule"| EB_SCHED
    EB_SCHED -->|"Fire at Timestamp"| SQS_MAIN
    SQS_MAIN -.->|"Max Receives = 5 Exceeded"| SQS_DLQ
    SQS_MAIN -->|"Long Poll: 20s"| EC2_APP1
    SQS_MAIN -->|"Long Poll: 20s"| EC2_APP2
    EC2_APP1 -->|"Publish (User ID Filter)"| SNS
    SNS -->|"Email Delivery"| EMAIL_GW
    SNS -->|"Direct SMS"| SMS_GW
```

### 2.2 Security Group Firewall Perimeter

| Security Group | Inbound Rules | Outbound Rules | Purpose |
| :--- | :--- | :--- | :--- |
| `sg-alb` | `0.0.0.0/0:80` (HTTP &rarr; HTTPS 301)<br>`0.0.0.0/0:443` (HTTPS TLS 1.3) | `sg-app:4000` | Edge traffic ingress & TLS termination |
| `sg-app` | `sg-alb:4000` (Node.js API instance) | `0.0.0.0/0:443` (via NAT Gateway for AWS SDK)<br>`sg-db:5432` | Stateless compute isolation |
| `sg-db` | `sg-app:5432` only | None (Total egress lockdown) | Database isolation & PHI protection |

---

## 3. Modular Clean Architecture

The backend implements a **Hexagonal / Clean Architecture** pattern where application services encapsulate business domain logic and depend strictly on abstract infrastructure interfaces.

```mermaid
flowchart TD
    subgraph Presentation ["1. Presentation & Transport Layer"]
        HTTP_ROUTES["Express 5 REST Handlers (/api/v1/*)"]
        WS_GATEWAY["Socket.IO WebSocket Gateway (/socket.io/*)"]
        ZOD_VALIDATION["Zod Request Validation & Coercion"]
    end

    subgraph Domain_Services ["2. Application & Core Domain Services"]
        AUTH_SVC["Auth Service (Token Rotation, Family Revocation)"]
        APPT_SVC["Appointment Service (ACID Reservation, Mutex)"]
        PRES_SVC["Prescription Service (PDFKit Engine, Validation)"]
        DOC_SVC["Medical Documents Service (S3 Pre-Sign Engine)"]
        REM_SVC["Reminders Service (Queue Consumer & Idempotency)"]
        NOTIF_SVC["Notification Engine (Multi-Channel Dispatcher)"]
    end

    subgraph Domain_Model ["3. Domain Persistence Layer"]
        PRISMA_CLIENT["Prisma 6 ORM Data Mapper"]
        PG_MODELS[("PostgreSQL 16 Tables")]
    end

    subgraph Infra_Adapters ["4. Infrastructure Adapters (Ports & Adapters)"]
        S3_ADAPTER["Storage Adapter: S3StorageService (AWS SDK v3 / MinIO)"]
        CDN_ADAPTER["CDN Adapter: CloudFrontSigner (RSA Key Pairs)"]
        SCHED_ADAPTER["Scheduler Adapter: EventBridge / Local Logger"]
        QUEUE_ADAPTER["Queue Adapter: SqsConsumer (Long-Polling Worker)"]
        NOTIF_ADAPTER["Notifier Adapter: SnsNotifier (E.164 SMS + Topic Filter)"]
    end

    HTTP_ROUTES --> ZOD_VALIDATION
    WS_GATEWAY --> ZOD_VALIDATION
    ZOD_VALIDATION --> AUTH_SVC
    ZOD_VALIDATION --> APPT_SVC
    ZOD_VALIDATION --> PRES_SVC
    ZOD_VALIDATION --> DOC_SVC

    AUTH_SVC --> PRISMA_CLIENT
    APPT_SVC --> PRISMA_CLIENT
    PRES_SVC --> PRISMA_CLIENT
    DOC_SVC --> PRISMA_CLIENT
    REM_SVC --> PRISMA_CLIENT
    NOTIF_SVC --> PRISMA_CLIENT
    PRISMA_CLIENT --> PG_MODELS

    PRES_SVC --> S3_ADAPTER
    DOC_SVC --> S3_ADAPTER
    DOC_SVC --> CDN_ADAPTER
    PRES_SVC --> CDN_ADAPTER
    APPT_SVC --> SCHED_ADAPTER
    REM_SVC --> QUEUE_ADAPTER
    NOTIF_SVC --> NOTIF_ADAPTER
```

---

## 4. End-to-End Core Architectural Workflows

### 4.1 Authentication & Zero-Trust Token Rotation Lifecycle

To mitigate token replay attacks, authentication employs short-lived JWT access tokens paired with cryptographically hashed, single-use refresh tokens with automatic token family revocation upon theft detection.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client Browser
    participant API as Auth Controller and Service
    participant DB as PostgreSQL (refresh_tokens)

    Note over Client,DB: Phase A: Initial Sign-In
    Client->>API: POST /api/v1/auth/login {email, password}
    API->>DB: Query User by email
    API->>API: Verify password with bcrypt.compare()
    API->>API: Generate 15-min JWT Access Token
    API->>API: Generate Opaque Random Refresh Token (Hex)
    API->>API: Hash Refresh Token using SHA-256
    API->>DB: INSERT INTO refresh_tokens (tokenHash, expiresAt, userId)
    API-->>Client: 200 OK { accessToken, refreshToken, user }

    Note over Client,DB: Phase B: Standard Token Refresh
    Client->>API: POST /api/v1/auth/refresh { refreshToken: "Token-A" }
    API->>API: Hash "Token-A" (SHA-256)
    API->>DB: SELECT FROM refresh_tokens WHERE tokenHash = hash("Token-A")
    alt Token valid and unused (revokedAt is null)
        API->>DB: UPDATE refresh_tokens SET revokedAt = NOW() WHERE id = "Token-A"
        API->>API: Generate "Token-B" (SHA-256) + New 15-min Access Token
        API->>DB: INSERT INTO refresh_tokens (tokenHash = hash("Token-B"))
        API-->>Client: 200 OK { accessToken: "JWT-2", refreshToken: "Token-B" }
    else Token already used / revoked (THEFT DETECTED!)
        API->>DB: UPDATE refresh_tokens SET revokedAt = NOW() WHERE userId = targetUser
        Note over API,DB: Immediate Security Invalidation: Entire Token Family Nuked
        API-->>Client: 401 Unauthorized { code: "TOKEN_COMPROMISED" }
    end
```

---

### 4.2 Concurrency-Guarded Atomic Slot Booking

To guarantee that no doctor slot is ever double-booked under intense concurrent load, reservations execute inside an ACID transaction using optimistic state transitions.

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient Client
    actor Doctor as Doctor Client
    participant ApptCtrl as Appointments Controller
    participant ApptSvc as Appointments Service
    participant DB as PostgreSQL Database
    participant EventBridge as AWS EventBridge Scheduler
    participant SNS as AWS SNS

    Patient->>ApptCtrl: POST /api/v1/appointments { slotId, reason }
    ApptCtrl->>ApptSvc: bookAppointment(patientId, slotId, reason)
    
    rect rgb(240, 248, 255)
        Note over ApptSvc,DB: Atomic Database Transaction (ACID Isolation)
        ApptSvc->>DB: BEGIN TRANSACTION
        ApptSvc->>DB: UPDATE availability_slots SET isBooked = true WHERE id = slotId AND isBooked = false
        alt Slot was already booked (Rows updated = 0)
            DB-->>ApptSvc: 0 Rows
            ApptSvc->>DB: ROLLBACK
            ApptSvc-->>Patient: 409 Conflict: "Slot is no longer available"
        else Slot successfully locked
            ApptSvc->>DB: INSERT INTO appointments (patientId, doctorId, slotId, status="PENDING")
            ApptSvc->>DB: COMMIT TRANSACTION
            ApptSvc-->>Patient: 201 Created { appointmentId, status: "PENDING" }
        end
    end

    Note over ApptSvc,SNS: Asynchronous Post-Confirmation Side Effects
    Doctor->>ApptCtrl: PATCH /api/v1/appointments/:id/status { status: "CONFIRMED" }
    ApptCtrl->>DB: UPDATE appointments SET status="CONFIRMED" WHERE id=:id AND status="PENDING"
    ApptCtrl->>EventBridge: CreateSchedule: appt-id-24h (Fire at visit minus 24 hours)
    ApptCtrl->>EventBridge: CreateSchedule: appt-id-1h (Fire at visit minus 1 hour)
    ApptCtrl->>SNS: Publish notification to Patient (Filtered by userId)
```

---

### 4.3 Distributed Asynchronous Reminders Pipeline

Reminders are scheduled without holding persistent timers in memory, guaranteeing durability across application restarts.

```mermaid
flowchart LR
    subgraph Trigger ["1. Schedule Target"]
        CONFIRM["Doctor Confirms Visit"] -->|"API Invocation"| SCHED["EventBridge Scheduler"]
        SCHED -->|"Fire at T-24h and T-1h"| SQS_QUEUE[("Amazon SQS Queue: telecare-reminders")]
    end

    subgraph Consumer ["2. Resilient Worker Processing"]
        SQS_QUEUE -->|"Long Poll: 20s"| WORKER["SQS Consumer Loop (In-Process Worker)"]
        WORKER -->|"Validate Status and Idempotency"| IDEMP_CHECK{"Valid and Not Sent?"}
        
        IDEMP_CHECK -->|"No / Stale"| DROP["Acknowledge and Delete Message"]
        IDEMP_CHECK -->|"Yes"| DISPATCH["Dispatch Notifications"]
        
        DISPATCH -->|"Atomic INSERT (appointmentId, kind)"| DBLOG[("PostgreSQL: reminder_logs")]
        DISPATCH -->|"Targeted Fan-out"| SNS_TOPIC["Amazon SNS Topic"]
        
        WORKER -.->|"On 5 Consecutive Failures"| DLQ[("SQS Dead-Letter Queue (DLQ)")]
    end

    subgraph Channels ["3. Delivery Egress"]
        SNS_TOPIC -->|"User Attribute Filter: userId"| EMAIL["SES / Email Subscription"]
        SNS_TOPIC -->|"Direct Transactional Route"| SMS["Direct SMS Gateway (+E.164)"]
    end
```

---

### 4.4 Low-Latency Consultation: WebRTC Signaling & P2P Media

Video consultations utilize WebRTC for peer-to-peer audio/video streaming, relying on authenticated Socket.IO rooms purely for exchange of SDP session descriptions and ICE candidates.

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient Browser
    participant SocketServer as Socket.IO Cluster (Express)
    participant Coturn as STUN / TURN Server
    actor Doctor as Doctor Browser

    Note over Patient,Doctor: Step 1: Secure Handshake & Room Validation
    Patient->>SocketServer: Connect with Bearer JWT
    Doctor->>SocketServer: Connect with Bearer JWT
    SocketServer->>SocketServer: Verify Appointment Membership & Time Window
    
    Patient->>SocketServer: emit("call:join", { appointmentId })
    Doctor->>SocketServer: emit("call:join", { appointmentId })
    SocketServer-->>Doctor: emit("call:peer-joined", { peerId: Patient.id })

    Note over Patient,Doctor: Step 2: Interactive Connectivity Establishment (ICE)
    Patient->>Coturn: Query STUN/TURN for Public Candidates
    Doctor->>Coturn: Query STUN/TURN for Public Candidates
    
    Patient->>SocketServer: emit("webrtc:offer", { sdp: OfferSDP, to: Doctor.id })
    SocketServer->>Doctor: relay("webrtc:offer", { sdp: OfferSDP, from: Patient.id })
    
    Doctor->>SocketServer: emit("webrtc:answer", { sdp: AnswerSDP, to: Patient.id })
    SocketServer->>Patient: relay("webrtc:answer", { sdp: AnswerSDP, from: Doctor.id })
    
    Patient->>SocketServer: emit("webrtc:ice-candidate", { candidate })
    SocketServer->>Doctor: relay("webrtc:ice-candidate", { candidate })

    Note over Patient,Doctor: Step 3: Direct P2P Media Streaming (DTLS-SRTP)
    Patient->>Doctor: P2P Encrypted Audio / Video (DTLS-SRTP)
    Doctor->>Patient: P2P Encrypted Audio / Video (DTLS-SRTP)
    
    Note over Patient,Doctor: Step 4: Real-Time Chat Audit Trail
    Patient->>SocketServer: emit("chat:send", { appointmentId, text })
    SocketServer->>SocketServer: Persist message in PostgreSQL messages table
    SocketServer-->>Doctor: emit("chat:message", { id, senderId, text, sentAt })
```

---

### 4.5 Zero-Trust Medical Document Ingestion & Egress

PHI (Protected Health Information) files never traverse API server memory directly. The client negotiates short-lived, cryptographically signed credentials and transfers encrypted binaries directly to S3.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Patient / Doctor Browser
    participant API as Documents Module
    participant S3 as Amazon S3 (Encrypted Bucket)
    participant CF as Amazon CloudFront (OAC Protected)

    Note over Client,CF: Phase 1: Direct-to-S3 Upload Negotiation
    Client->>API: POST /api/v1/documents/upload-url { fileName, contentType, sizeBytes }
    API->>API: Validate MIME type (PDF, PNG, JPEG, WebP) & Size (<= 10MB)
    API->>API: Generate Cryptographic Key: patients/patientId/uuid-filename
    API->>S3: PutObjectCommand (generatePreSignedUrl, expires: 15m)
    API-->>Client: 200 OK { uploadUrl, fileKey, headers }

    Note over Client,CF: Phase 2: Direct Binary Transfer
    Client->>S3: HTTP PUT uploadUrl (Raw Binary Bytes + Strict Headers)
    S3-->>Client: 200 OK (Object written with SSE-S3 AES-256)

    Note over Client,CF: Phase 3: Metadata Verification & Registration
    Client->>API: POST /api/v1/documents { fileKey, fileName, appointmentId }
    API->>S3: HeadObjectCommand(fileKey)
    API->>API: Verify Object Exists, Byte Size Matches, ContentType Matches
    API->>API: Insert Record into PostgreSQL medical_documents
    API-->>Client: 201 Created { documentId, createdAt }

    Note over Client,CF: Phase 4: Authorized Download Egress
    Client->>API: GET /api/v1/documents/:id/download-url
    API->>API: Verify RBAC (Patient owns file OR Doctor has Confirmed Appointment)
    alt CloudFront CDN Configured
        API->>API: Generate CloudFront Signed URL (Private RSA Key, expires: 5m)
        API-->>Client: 200 OK { downloadUrl: "https://cdn.telecare.com/patients/..." }
    else S3 Direct Mode
        API->>S3: GetObjectCommand (generatePreSignedUrl, expires: 5m)
        API-->>Client: 200 OK { downloadUrl: "https://s3.ap-south-1.../patients/..." }
    end
    Client->>CF: GET downloadUrl
    CF-->>Client: 200 OK (Encrypted Stream Download)
```

---

### 4.6 Clinical Prescription Issuance & PDF Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Doctor Client
    participant API as Prescriptions Module
    participant Engine as PDFKit Engine
    participant S3 as Amazon S3 (Files Bucket)
    participant DB as PostgreSQL
    participant SNS as Amazon SNS Notifier
    actor Patient as Patient Client

    Doctor->>API: PUT /api/v1/appointments/:id/prescription { medications, notes, diagnosis, followUpDate }
    API->>API: Validate payload using Zod prescriptionSchema
    API->>DB: Upsert record in prescriptions table
    
    Note over API,S3: Immutable Dynamic PDF Compilation
    API->>Engine: renderPrescriptionPdf({ clinic, doctor, patient, medications, notes })
    Engine-->>API: Binary PDF Buffer
    API->>API: Compute Object Key: prescriptions/apptId/prescId/timestamp.pdf
    API->>S3: PutObjectCommand (Content-Type: application/pdf)
    API->>DB: UPDATE prescriptions SET pdfKey, pdfGeneratedAt = NOW()
    
    API->>SNS: notifyUser(patientId, "Your prescription is ready for download")
    API-->>Doctor: 200 OK { prescription, hasPdf: true }

    Note over Patient,S3: Patient Download Flow
    Patient->>API: GET /api/v1/appointments/:id/prescription/pdf-url
    API->>API: Validate requester is the appointment's Patient
    API->>API: Generate signed CloudFront / S3 URL (5-minute expiration)
    API-->>Patient: 200 OK { downloadUrl }
    Patient->>S3: Open downloadUrl in secure tab
```

---

## 5. Domain Data Model & Entity-Relationship Specification

The relational architecture is enforced via PostgreSQL foreign key constraints, composite unique indexes, and cascade-deletion rules mapped through Prisma 6.

```mermaid
erDiagram
    USER ||--o| DOCTOR_PROFILE : "extends as doctor"
    USER ||--o{ REFRESH_TOKEN : "owns"
    USER ||--o{ APPOINTMENT : "books as patient"
    USER ||--o{ APPOINTMENT : "conducts as doctor"
    USER ||--o{ MEDICAL_DOCUMENT : "owns"
    USER ||--o{ MESSAGE : "authors"

    DOCTOR_PROFILE ||--o{ AVAILABILITY_SLOT : "publishes"

    AVAILABILITY_SLOT ||--o| APPOINTMENT : "allocated to"

    APPOINTMENT ||--o| PRESCRIPTION : "generates"
    APPOINTMENT ||--o{ MEDICAL_DOCUMENT : "associated with"
    APPOINTMENT ||--o{ MESSAGE : "contains chat history"
    APPOINTMENT ||--o{ REMINDER_LOG : "delivers"

    USER {
        uuid id PK "Primary Key (UUID v4)"
        string email UK "Unique User Email"
        string passwordHash "Bcrypt Password Hash"
        string name "Full Name"
        string phone "E.164 Formatted Mobile Number"
        string role "PATIENT, DOCTOR, ADMIN"
        boolean isActive "Soft Disable Flag"
        boolean notifyEmail "Opt-in Email Notifications"
        boolean notifySms "Opt-in SMS Notifications"
        string snsEmailSubscriptionArn "AWS SNS Topic Subscription ARN"
        datetime createdAt "UTC Timestamp"
        datetime updatedAt "UTC Timestamp"
    }

    DOCTOR_PROFILE {
        uuid userId PK "References USER.id"
        string specialty "Medical Specialty Category"
        int experienceYears "Years of Clinical Practice"
        int consultationFee "Fee in Base Units (INR)"
        string qualification "Credentials e.g. MBBS, MD"
        string bio "Doctor Narrative Biography"
        string languages "Spoken Languages Array"
    }

    AVAILABILITY_SLOT {
        uuid id PK "Primary Key (UUID v4)"
        uuid doctorId FK "References DOCTOR_PROFILE.userId"
        datetime startTime "Slot Start (UTC)"
        datetime endTime "Slot End (UTC)"
        boolean isBooked "Concurrency Booking Mutex Flag"
    }

    APPOINTMENT {
        uuid id PK "Primary Key (UUID v4)"
        uuid patientId FK "References USER.id"
        uuid doctorId FK "References USER.id"
        uuid slotId FK "Unique Nullable (availability_slots.id)"
        datetime scheduledStart "Snapshot of Slot Start"
        datetime scheduledEnd "Snapshot of Slot End"
        string status "PENDING, CONFIRMED, COMPLETED, CANCELLED"
        string reason "Chief Clinical Complaint"
        string cancelledReason "Cancellation Note"
        uuid cancelledById "User Who Triggered Cancellation"
    }

    PRESCRIPTION {
        uuid id PK "Primary Key (UUID v4)"
        uuid appointmentId FK "1-to-1 Reference (appointments.id)"
        string diagnosis "Clinical Diagnosis"
        string notes "General Doctor Directives"
        jsonb medications "Array of Dosage, Frequency & Duration"
        datetime followUpDate "Suggested Follow-Up Date"
        string pdfKey "S3 Object Storage Key"
        datetime pdfGeneratedAt "Generation Timestamp"
    }

    REMINDER_LOG {
        uuid appointmentId PK "References appointments.id"
        string kind PK "Composite PK: 24h or 1h"
        datetime sentAt "UTC Dispatch Timestamp"
    }

    MEDICAL_DOCUMENT {
        uuid id PK "Primary Key (UUID v4)"
        uuid patientId FK "References USER.id"
        uuid appointmentId FK "Optional Consultation Attachment"
        string fileKey UK "S3 Object Key"
        string fileName "Original Client File Name"
        string contentType "Verified MIME Type"
        int sizeBytes "Byte Size"
        datetime createdAt "Upload Timestamp"
    }

    MESSAGE {
        uuid id PK "Primary Key (UUID v4)"
        uuid appointmentId FK "References appointments.id"
        uuid senderId FK "References USER.id"
        string text "Encrypted Chat Payload"
        datetime sentAt "UTC Delivery Timestamp"
    }

    REFRESH_TOKEN {
        uuid id PK "Primary Key (UUID v4)"
        uuid userId FK "References USER.id"
        string tokenHash UK "SHA-256 Digest of Token"
        datetime expiresAt "Expiration Timestamp"
        datetime revokedAt "Single-Use Invalidation Timestamp"
    }
```

---

## 6. Appointment State Machine

The lifecycle of every appointment is governed by a deterministic finite state machine ensuring illegal transitions are rejected at the database level.

```mermaid
stateDiagram-v2
    [*] --> PENDING: Patient Claims Open Slot
    
    PENDING --> CONFIRMED: Doctor Approves Visit
    note right of CONFIRMED
        1. Schedule EventBridge 24h and 1h alerts
        2. Publish SNS confirmation to Patient
        3. Authorize WebRTC consultation window
    end note

    PENDING --> CANCELLED: Patient or Doctor Cancels
    note right of CANCELLED
        1. Free Slot (isBooked = false)
        2. Delete pending EventBridge schedules
        3. Publish cancellation alert
    end note

    CONFIRMED --> CANCELLED: Doctor or Patient Cancels Visit
    CONFIRMED --> COMPLETED: Doctor Concludes Consultation
    note right of COMPLETED
        1. Close WebRTC media session
        2. Finalize & seal prescription PDF
        3. Persist consultation notes
    end note

    COMPLETED --> [*]
    CANCELLED --> [*]
```

---

## 7. Security Architecture & HIPAA Compliance Matrix

| Security Domain | Architectural Mechanism | Implementation Details |
| :--- | :--- | :--- |
| **Authentication** | Dual-Token JWT + Opaque Refresh Token | 15-minute RS256/HS256 access tokens. Refresh tokens stored as SHA-256 hashes; automatic revocation of token families on reuse detection. |
| **Password Security** | Bcrypt with Salt Rounds | Multi-pass salt generation; raw credentials never written to disk or logs. |
| **PHI Sanitization** | Zero-PHI Notification Policy | SNS emails and SMS contain timestamps, doctor names, and secure portal links only. No diagnoses or medicine names are ever dispatched via external SMS/Email carriers. |
| **Transport Encryption** | TLS 1.3 / Strict HTTPS | AWS CloudFront enforces HTTPS redirect. WebRTC audio/video encrypted via DTLS-SRTP. |
| **Data at Rest** | AES-256 Storage Encryption | RDS PostgreSQL encrypted with AWS KMS. S3 medical buckets enforce server-side SSE-S3 encryption. |
| **Storage Isolation** | S3 Private Buckets & OAC | Direct public bucket access is 100% blocked. Ingestion occurs via short-lived (15 min) pre-signed PUT URLs; egress occurs via CloudFront Origin Access Control (OAC) with signed URLs. |
| **Network Boundaries** | Multi-Tier VPC Segmentation | EC2 compute instances live in private subnets with no public IPs. Inbound traffic allowed strictly from ALB security group (`sg-alb`). RDS is restricted strictly to `sg-app`. |
| **Privilege Model** | AWS IAM Instance Profiles | EC2 instances authenticate to AWS APIs via IAM roles with least privilege. Zero access keys (`AWS_ACCESS_KEY_ID`) are stored on production servers. |

---

## 8. Technology Stack Specification

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     TECHNOLOGY MATRIX                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Version | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 19.x | Modern concurrent rendering, transitions, and component composition. |
| **Language** | TypeScript | 5.x | End-to-end type safety between database models, API payloads, and UI components. |
| **Build Tooling** | Vite | 6.x | Lightning-fast HMR and optimized production asset chunking. |
| **Styling** | Tailwind CSS | 4.x | Utility-first, purgeable, zero-runtime CSS. |
| **State Management** | TanStack Query | 5.x | Server-state caching, automatic cache invalidation, and optimistic UI mutations. |
| **Backend Runtime** | Node.js | 24 LTS | High-throughput asynchronous I/O with native V8 engine optimizations. |
| **API Framework** | Express | 5.x | Enterprise HTTP routing with robust middleware pipeline and native Promise error handling. |
| **ORM / Data Access** | Prisma | 6.x | Type-safe query building, declarative schema migrations, and connection pooling. |
| **Database** | PostgreSQL | 16.x | ACID compliance, row-level locking, JSONB indexing, and rock-solid reliability. |
| **Realtime Engine** | Socket.IO | 4.8.x | Resilient WebSocket transport with HTTP long-polling fallback and Redis adapter clustering. |
| **Media Transport** | WebRTC | Native | Ultra-low latency peer-to-peer encrypted audio and video streaming. |
| **PDF Generation** | PDFKit | 0.16.x | Vector-based server-side streaming PDF generation for prescription documents. |
| **Cloud Infrastructure**| AWS Native | — | CloudFront, S3, ALB, EC2, EventBridge Scheduler, SQS, SNS, RDS PostgreSQL. |
| **Testing Harness** | Vitest | 3.x | Fast, unit and integration test runner with in-memory AWS and Prisma mocks. |

---

## 9. Repository Directory Anatomy

```
telemedicine/
├── .github/
│   └── workflows/ci.yml             # GitHub Actions CI: lint, typecheck, unit tests
├── backend/                         # Express 5 + Prisma backend service
│   ├── prisma/
│   │   ├── schema.prisma            # Declarative PostgreSQL schema & relations
│   │   ├── migrations/              # Incremental SQL migration history
│   │   └── seed.ts                  # Deterministic demo database seeder
│   ├── src/
│   │   ├── config/env.ts            # Strongly-typed environment parser (Zod)
│   │   ├── infrastructure/          # External boundary adapters (Ports & Adapters)
│   │   │   ├── cdn/                 # CloudFront signed URL generator
│   │   │   ├── notifications/       # SNS Notifier & Console fallback
│   │   │   ├── queue/               # SQS long-polling consumer worker
│   │   │   ├── scheduler/           # EventBridge Scheduler client
│   │   │   └── storage/             # S3 pre-signed upload & download adapter
│   │   ├── modules/                 # Domain modules (Controller -> Service -> Rules)
│   │   │   ├── appointments/        # Booking transactions & state management
│   │   │   ├── auth/                # JWT issuance, bcrypt hashing & token rotation
│   │   │   ├── doctors/             # Doctor profiles, search & directory
│   │   │   ├── documents/           # Direct-to-S3 medical file upload engine
│   │   │   ├── health/              # Liveness and readiness probes
│   │   │   ├── messages/            # Chat persistence & history
│   │   │   ├── notifications/       # User notification preference engine
│   │   │   ├── prescriptions/       # Clinical prescriptions & PDF compilation
│   │   │   ├── reminders/           # Asynchronous queue handler & idempotency
│   │   │   ├── slots/               # Weekly recurring schedule slot generator
│   │   │   └── webrtc/              # STUN/TURN credential negotiation
│   │   ├── shared/                  # Typed error classes, auth & validation middleware
│   │   ├── sockets/                 # Socket.IO connection handling & WebRTC signaling
│   │   ├── app.ts                   # Express application setup & middleware stack
│   │   └── server.ts                # HTTP, WebSocket & SQS worker bootstrapper
│   └── vitest.config.ts             # Backend Vitest configuration
├── frontend/                        # React 19 single-page application
│   ├── src/
│   │   ├── app/                     # Route configuration & role-based route guards
│   │   ├── components/              # Reusable design system components (buttons, modals)
│   │   ├── features/                # Domain-specific UI features
│   │   │   ├── admin/               # Administrator management & doctor onboarding
│   │   │   ├── appointments/        # Patient booking & appointment history
│   │   │   ├── auth/                # Authentication screens (Login, Register)
│   │   │   ├── consultation/        # Unified Room: WebRTC Call, Chat, Prescriptions
│   │   │   ├── doctor/              # Doctor schedule, slot builder & patient charts
│   │   │   ├── doctors/             # Doctor search, filtering & slot selection
│   │   │   ├── documents/           # Medical record upload & preview portal
│   │   │   └── notifications/       # Multi-channel notification settings
│   │   ├── lib/                     # API client, WebRTC media session & formatting utilities
│   │   └── types/                   # TypeScript contract definitions matching backend DTOs
│   └── vite.config.ts               # Vite configuration
├── docs/                            # Deep-dive architectural documentation & manuals
│   ├── AWS_DEPLOYMENT.md            # Step-by-step AWS provisioning runbook
│   ├── BACKEND_FLOW.md              # Backend module execution flows
│   └── FRONTEND_FLOW.md             # Frontend screen states & mutation lifecycles
├── infra/                           # Production AWS IAM policies & S3 CORS declarations
│   ├── ec2-instance-policy.json     # Least-privilege EC2 IAM policy
│   ├── files-bucket-cors.json       # S3 CORS policy for direct browser uploads
│   └── scheduler-role-policy.json   # EventBridge to SQS execution role policy
└── docker-compose.yml               # Local development stack (PostgreSQL + MinIO)
```

---

## 10. Local Development & Engineering Quick-Start

### 10.1 Prerequisites

- **Node.js**: v24.x LTS
- **Package Manager**: npm v10+
- **Container Engine**: Docker & Docker Compose (optional, for local PostgreSQL & MinIO)

### 10.2 Starting Supporting Services (Docker)

```bash
# Launch PostgreSQL (port 5432) and MinIO S3 (ports 9000/9001)
docker compose up -d
```

### 10.3 Backend Initialization

```bash
cd backend

# 1. Configure environment variables
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Execute database schema migrations
npx prisma migrate dev

# 4. Seed database with initial administrators, doctors, and slots
npm run db:seed

# 5. Launch development server with hot-reload (http://localhost:4000)
npm run dev
```

> **Local Mode (Zero-AWS Dependency)**: If `SNS_TOPIC_ARN`, `SQS_REMINDER_QUEUE_URL`, and `SCHEDULER_ROLE_ARN` are left blank, the application automatically switches to in-memory/console logging adapters. All features (booking, consultation, PDF generation, uploads via MinIO) function seamlessly offline!

### 10.4 Frontend Initialization

```bash
cd frontend

# 1. Configure environment
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Launch Vite development server (http://localhost:5173)
npm run dev
```

### 10.5 Quality Assurance & Test Verification

Both tiers feature rigorous automated testing pipelines that require zero cloud connectivity:

```bash
# Verify backend: Type checking, Linting, Unit & Integration Tests, Production Build
cd backend
npm run typecheck
npm run lint
npm test
npm run build

# Verify frontend: Type checking, Linting, Unit Tests, Production Bundle
cd ../frontend
npm run typecheck
npm run lint
npm test
npm run build
```

---

## 11. Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | Method | Patient | Doctor | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| `/api/v1/auth/*` | `POST` | Public | Public | Public |
| `/api/v1/doctors` | `GET` | Yes | Yes | Yes |
| `/api/v1/doctors/:id/slots` | `GET` | Yes | Yes | Yes |
| `/api/v1/doctor/slots` | `POST / DELETE` | No | Yes (Own slots) | No |
| `/api/v1/appointments` | `POST` | Yes (Book visit) | No | No |
| `/api/v1/appointments/:id/status` | `PATCH` | Yes (Cancel) | Yes (Confirm/Cancel/Complete) | Yes (Supervisory) |
| `/api/v1/appointments/:id/prescription`| `PUT` | No | Yes (Assigned doctor) | No |
| `/api/v1/appointments/:id/prescription`| `GET` | Yes (Visit patient)| Yes (Assigned doctor) | Yes |
| `/api/v1/documents/upload-url` | `POST` | Yes (Own files) | No | No |
| `/api/v1/documents/:id` | `DELETE`| Yes (Own files) | No | No |
| `/api/v1/documents/:id/download-url` | `GET` | Yes (Own files) | Yes (If Confirmed Visit) | No |
| `/api/v1/admin/doctors` | `POST` | No | No | Yes (Create doctor) |
| `/api/v1/admin/appointments` | `GET` | No | No | Yes (Full audit) |

---

## 12. Operational Runbook & Production Deployment

For complete, step-by-step production deployment instructions, refer to the exhaustive guide:
**[`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md)**

### Key Deployment Steps:
1. **Network Provisioning**: Configure dual-AZ VPC, subnets, and security groups (`sg-alb`, `sg-app`, `sg-db`).
2. **Database Provisioning**: Deploy Amazon RDS PostgreSQL 16 Multi-AZ instance inside isolated private subnets.
3. **Storage Tier Setup**: Create private S3 files bucket and web asset bucket; attach CORS via `infra/files-bucket-cors.json`.
4. **Messaging Pipeline Setup**: Deploy SNS topic `telecare-notifications`, SQS queue `telecare-reminders`, and SQS Dead Letter Queue.
5. **Scheduler Setup**: Create EventBridge schedule group `telecare-reminders` and attach execution role `infra/scheduler-role-policy.json`.
6. **Application Compute**: Launch EC2 instances with IAM instance profile `infra/ec2-instance-policy.json`, attach to ALB target group, and configure environment variables in `/etc/telecare.env`.
7. **CloudFront CDN Distribution**: Deploy single CloudFront distribution routing `/*` to S3 Web Bucket, `/api/*` to ALB, and `/socket.io/*` to ALB with WebSocket support enabled.

---

## 13. Observability, Health Checks & Telemetry

The application exposes standardized health and readiness endpoints for load balancer health probes and container orchestrator lifecycles:

- **Liveness Probe**: `GET /api/v1/health`
  - Validates HTTP server responsiveness.
  - Returns: `200 OK { status: "ok", timestamp: "<ISO-8601>" }`
- **Readiness Probe**: `GET /api/v1/health/ready`
  - Validates active database connectivity via `prisma.$queryRaw` (SELECT 1).
  - Returns: `200 OK { status: "ready", database: "connected" }` or `503 Service Unavailable`.
- **Structured Logging**: Emitted via `pino` with JSON payloads, timestamps, error stack traces, and request correlation IDs.

---

## 14. Architecture Documentation Index

| Document | Focus & Scope |
| :--- | :--- |
| **[`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md)** | Comprehensive AWS cloud deployment runbook, IAM policies, and infrastructure configuration. |
| **[`docs/BACKEND_FLOW.md`](docs/BACKEND_FLOW.md)** | Deep-dive module logic, controller-to-service flows, and database transaction design. |
| **[`docs/FRONTEND_FLOW.md`](docs/FRONTEND_FLOW.md)** | Client-side routing, WebRTC call session lifecycle, TanStack Query mutations, and error handling. |
| **[`infra/`](infra/)** | IAM policies, trust relationships, and bucket policies used for production deployments. |

---

## 15. License & Contributions

This project is released under the **MIT License**. Engineered for production telemedicine systems, clinical research, and cloud computing architectural demonstrations.
