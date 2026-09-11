<p align="center">
  <img alt="CogniYard — AI-enabled Procure-to-Pay and Yard Execution Platform" src="./docs/assets/cogniyard-banner.png" width="900" />
</p>

<p align="center">
  <a href="#"><img alt="Version" src="https://img.shields.io/badge/version-2.3.1-blue?style=flat-square" /></a>
  <a href="#"><img alt="Status" src="https://img.shields.io/badge/status-hackathon%20ready-success?style=flat-square" /></a>
  <a href="#"><img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" /></a>
  <a href="#"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" /></a>
  <a href="#"><img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" /></a>
  <a href="#"><img alt="Tests" src="https://img.shields.io/badge/tests-31%20passed-success?style=flat-square" /></a>
</p>

<p align="center">
  <b>AI-enabled supply-chain execution from procurement request to payment eligibility.</b>
</p>

<p align="center">
  CogniYard connects procurement, supplier collaboration, yard & dock execution,<br/>
  warehouse receiving, invoicing, 3-way matching, payment controls, and operational intelligence<br/>
  into one persistent end-to-end platform.
</p>

---

## What is CogniYard?

CogniYard is a full-stack supply-chain platform built around a simple idea:

> **Procurement decisions and physical warehouse execution should not live in disconnected systems.**

A natural-language requirement can move through AI-assisted procurement intelligence, supplier evaluation, EOQ validation, human approval, purchase-order creation, shipment and truck lifecycle management, gate verification, yard/dock execution, goods receipt, supplier invoicing, 3-way matching, and payment eligibility.

The result is a single workflow connecting the **digital procurement lifecycle** with the **physical execution lifecycle**.

```text
Natural-Language Requirement
            │
            ▼
     AI Supply-Chain Copilot
            │
     ┌──────┼───────────┐
     │      │           │
    SKU  Supplier      EOQ
     │  Intelligence  Validation
     └──────┼───────────┘
            ▼
      Human Approval
            │
            ▼
    Purchase Requisition
            │
            ▼
     Purchase Order
            │
      ┌─────┴─────┐
      ▼           ▼
 Shipment       Truck
      │           │
      └─────┬─────┘
            ▼
     Gate Verification
            │
            ▼
       Yard / Dock
            │
            ▼
      Goods Receiving
            │
            ▼
           GRN
            │
            ▼
     Supplier Invoice
            │
            ▼
      3-Way Matching
        ┌───┴───┐
        ▼       ▼
     MATCHED  MISMATCH
        │       │
        ▼       ▼
     PAYMENT   ON HOLD
     ELIGIBLE
```

## Why CogniYard?

Traditional supply-chain workflows often split procurement, supplier communication, warehouse execution, and finance across separate systems.

CogniYard brings them together:

* **Procurement** — PR creation, approval, supplier selection, PO generation
* **Supplier Intelligence** — supplier scoring, recommendations, pricing and availability analysis
* **AI Procurement** — natural-language requirement extraction and procurement orchestration
* **Yard Execution** — truck verification, yard movement, dock recommendation and assignment
* **Warehouse** — receiving, GRNs, inventory updates and dock availability
* **Supplier Portal** — PO visibility, invoice generation and document submission
* **Finance** — invoice review, 3-way matching and payment controls
* **Control Tower** — operational KPIs, exceptions and cross-module monitoring
* **Computer Vision** — browser camera, OCR and object detection
* **Persistent Enterprise Data** — MongoDB-backed business workflows instead of frontend-only simulation

---

## Core Workflow

### Procure-to-Pay

```text
Purchase Requisition
        ↓
Approval
        ↓
Supplier Intelligence
        ↓
Purchase Order
        ↓
Shipment + Truck
        ↓
Goods Receipt
        ↓
Supplier Invoice
        ↓
3-Way Match
        ↓
Payment Eligibility
```

### Yard & Dock Execution

```text
Truck Arrival
     ↓
Gate Verification
     ↓
License Plate / Driver Verification
     ↓
Yard Entry
     ↓
Dock Recommendation
     ↓
Dock Assignment
     ↓
Goods Receiving
     ↓
GRN
     ↓
Inventory Update
```

These are not isolated demos. The workflows are connected through persistent backend records.

---

## AI Procurement

CogniYard includes an AI-powered Supply-Chain Copilot that turns natural-language procurement requirements into structured procurement actions.

```text
"I need 500 units of product X
for next month's production."
                │
                ▼
       Natural-Language Parsing
                │
       ┌────────┼─────────┐
       ▼        ▼         ▼
      SKU    Quantity   Business
   Resolution              Reason
       │        │         │
       └────────┼─────────┘
                ▼
       Supplier Intelligence
                │
                ▼
         Supplier Scoring
                │
                ▼
          EOQ Validation
                │
                ▼
          Human Approval
                │
                ▼
       Purchase Requisition
```

AI capabilities include:

* Natural-language requirement extraction
* SKU/product resolution
* Quantity and unit-price extraction
* Business reason and priority extraction
* Supplier recommendation
* Supplier scoring
* EOQ-based procurement validation
* AI-assisted PR creation
* AI-assisted PR → PO conversion
* Autonomous orchestration with human approval safeguards
* Deterministic local fallback when the external AI service is unavailable

### AI Architecture

```text
                    User
                     │
                     ▼
             Supply-Chain Copilot
                     │
            ┌────────┴────────┐
            ▼                 ▼
       Groq API         Local Fallback
            │                 │
            └────────┬────────┘
                     ▼
            Procurement Engine
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   SKU Resolver   Supplier      EOQ Engine
                  Intelligence
        │            │            │
        └────────────┼────────────┘
                     ▼
               Human Approval
                     │
                     ▼
                  PR / PO
```

The external AI layer is therefore not a single point of failure for the core demonstration workflow.

---

## Computer Vision & Gate Verification

CogniYard extends the digital workflow into truck arrival and gate execution.

The browser-based gate workflow combines:

* Camera access
* Tesseract OCR
* License-plate extraction
* Driver ID verification
* TensorFlow.js
* COCO-SSD object detection
* Backend verification
* Persisted truck/gate state

```text
Camera
  │
  ├── License Plate
  │       ↓
  │     OCR
  │
  └── Driver / Vehicle
          ↓
    Verification Engine
          │
          ▼
     Backend API
          │
    ┌─────┴─────┐
    ▼           ▼
 VERIFIED     REJECTED
    │
    ▼
 Yard Entry
```

Gate verification is enforced before the truck can proceed into the downstream yard and receiving workflow.

---

## 3-Way Matching

Finance closes the loop by validating the supplier invoice against the purchasing and receiving records.

```text
             Purchase Order
                   │
                   │
                   ▼
             ┌───────────┐
             │           │
             │  3-Way    │
             │  Match    │
             │           │
             └───────────┘
              ▲         ▲
              │         │
        Goods Receipt  Invoice
              │         │
              └────┬────┘
                   ▼
             Validation
                   │
          ┌────────┴────────┐
          ▼                 ▼
       MATCHED           MISMATCH
          │                 │
          ▼                 ▼
 Payment Eligible       Payment Hold
```

Matching validates key procurement and financial fields including:

* Supplier
* Purchase order
* Items
* Quantities
* Unit prices
* Subtotal

A fully matched invoice becomes payment-eligible.

Partial or failed matches are placed on **payment hold** for review.

---

## Role-Based Workspaces

CogniYard provides separate workspaces for the different actors involved in the supply chain.

| Role                         | Primary Responsibilities                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| **Admin**                    | Platform administration, Control Tower, exceptions, inventory planning, Smart CCTV |
| **Procurement Manager**      | PRs, supplier intelligence, approvals, POs                                         |
| **Warehouse / Dock Manager** | Trucks, gate verification, yard, docks, receiving, GRNs                            |
| **Finance**                  | Supplier invoices, 3-way matching, payment controls                                |
| **Supplier**                 | Assigned POs, invoice generation, invoice upload and updates                       |

Access is protected using:

* JWT authentication
* bcrypt password hashing
* Role-based authorization
* Protected frontend routes
* Backend authorization middleware
* Supplier ownership controls
* Resource-level access restrictions

---

## Supplier Portal

Suppliers receive a dedicated workflow rather than direct access to the entire application.

They can:

* View assigned purchase orders
* Generate PDF invoices
* Upload invoice documents
* Replace submitted invoice documents
* Edit invoice metadata
* Update invoice number and date
* Update quantities and prices
* Add tax and shipping information

Supplier resources are restricted to the supplier's permitted purchase orders and invoices.

---

## Invoice Documents

Invoice processing supports:

```text
PDF
JPG / JPEG
PNG
WEBP
HTML / HTM
DOC / DOCX
XLS / XLSX
CSV
```

Maximum upload size:

```text
10 MB
```

Documents pass through multiple validation layers:

```text
Extension
   ↓
MIME Type
   ↓
File Size
   ↓
File Signature / Content
   ↓
Storage
   ↓
Invoice Record
```

Cloudinary is used as the preferred production document-storage provider, while local storage can be used for development/demo configurations.

Executable and disguised executable files are rejected.

---

## Operational Intelligence

CogniYard includes role-specific dashboards and an operational control layer.

### Control Tower

Admin users can monitor:

* Procurement activity
* Yard activity
* Dock utilization
* Inventory
* Finance exceptions
* Supplier activity
* Operational KPIs

### Exception Center

Exceptions surface workflow problems such as:

```text
Invoice mismatch
      │
      ├── Quantity mismatch
      ├── Price mismatch
      ├── Supplier mismatch
      └── PO / receiving mismatch
```

This gives the platform an operational monitoring layer rather than treating each workflow as an isolated CRUD module.

---

## Architecture

```text
                              USERS
                                │
                                ▼
                    ┌─────────────────────┐
                    │ React 18 + Vite     │
                    │ Role-Based UI       │
                    └──────────┬──────────┘
                               │
                         HTTPS / REST
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Node.js + Express   │
                    │ JWT • RBAC          │
                    │ Business Logic      │
                    └───────┬─┬─┬────────┘
                            │ │ │
              ┌─────────────┘ │ └─────────────┐
              ▼               ▼               ▼
        AI Services      Procurement      Yard / Dock
        Groq + Fallback   Engine           Execution
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ MongoDB Atlas│
                       │              │
                       │ Users        │
                       │ Suppliers    │
                       │ PRs / POs    │
                       │ Trucks       │
                       │ GRNs         │
                       │ Inventory    │
                       │ Invoices     │
                       │ Payments     │
                       └──────────────┘
                              │
                              │
                       ┌──────▼──────┐
                       │ Cloudinary  │
                       │ Documents   │
                       └─────────────┘
```

### Deployment

```text
                    Internet
                       │
                       ▼
              ┌────────────────┐
              │     Vercel     │
              │ React + Vite   │
              └───────┬────────┘
                      │
                  HTTPS / REST
                      │
                      ▼
              ┌────────────────┐
              │     Render     │
              │ Node + Express │
              └───┬────┬───┬───┘
                  │    │   │
          ┌───────┘    │   └─────────┐
          ▼            ▼             ▼
     MongoDB Atlas  Cloudinary    Groq API
```

---

## Technology Stack

| Layer                    | Technology                                       |
| ------------------------ | ------------------------------------------------ |
| Frontend                 | React 18, Vite, Tailwind CSS                     |
| Routing                  | React Router                                     |
| Charts                   | Recharts                                         |
| Maps                     | React Leaflet                                    |
| Backend                  | Node.js 20+, Express                             |
| Database                 | MongoDB Atlas, Mongoose                          |
| Authentication           | JWT, bcrypt, RBAC                                |
| AI                       | Groq API + deterministic local fallback          |
| Procurement Intelligence | NLP extraction, supplier scoring, EOQ validation |
| Computer Vision          | TensorFlow.js, COCO-SSD                          |
| OCR                      | Tesseract                                        |
| Documents                | PDFKit, Multer                                   |
| File Storage             | Cloudinary                                       |
| API                      | REST                                             |
| Testing                  | Node.js Test Runner                              |
| CI/CD                    | GitHub Actions                                   |
| Frontend Hosting         | Vercel                                           |
| Backend Hosting          | Render                                           |
| Version Control          | Git, GitHub                                      |

---

## Project Structure

```text
CogniYard/
│
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seed/
│   ├── services/
│   └── tests/
│
├── docs/
│   ├── assets/
│   └── IMPLEMENTATION_REPORT.md
│
├── .github/
│   └── workflows/
│       ├── client-ci.yml
│       └── server-ci.yml
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── START_COGNIYARD_WINDOWS.bat
```

Secrets, environment files, and `node_modules` are excluded from version control.

---

## Installation

### Requirements

* Node.js 20+
* npm
* MongoDB Community Server or MongoDB Atlas
* Chrome or Edge for camera/OCR functionality

### 1. Clone

```bash
git clone <YOUR_REPOSITORY_URL>
cd CogniYard
```

### 2. Configure Environment

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

Minimum configuration:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/cogniyard
JWT_SECRET=replace_with_a_long_random_secret
```

Optional integrations:

```env
GROQ_API_KEY=...
CLOUDINARY_URL=...
GOOGLE_CLIENT_ID=...
```

Never commit real credentials or `.env` files.

### 3. Install

```bash
npm install
```

### 4. Prepare Demo Data

```bash
npm run bootstrap
```

The bootstrap command prepares demo data without intentionally clearing existing business records.

### 5. Start

```bash
npm run dev
```

For the verified local configuration:

```text
http://127.0.0.1:3101
```

---

## Windows One-Click Start

Windows users can launch the application through:

```text
START_COGNIYARD_WINDOWS.bat
```

The launcher prepares the environment, installs dependencies, bootstraps demo accounts, starts the required services, and opens the local application.

MongoDB must be available when using the local MongoDB configuration.

---

## Demo Accounts

All seeded demo accounts use:

```text
password123
```

| Role        | Email                       |
| ----------- | --------------------------- |
| Admin       | `admin@cogniyard.com`       |
| Procurement | `procurement@cogniyard.com` |
| Warehouse   | `warehouse@cogniyard.com`   |
| Finance     | `finance@cogniyard.com`     |
| Supplier    | `supplier@cogniyard.com`    |

These credentials are intended only for the hackathon/demo environment.

---

## Testing

CogniYard includes automated backend regression tests and frontend production-build validation.

```bash
npm test
```

The complete validation pipeline is:

```text
Backend Tests
     │
     ▼
31 Tests
     │
     ▼
Frontend Production Build
     │
     ▼
Vite Build Validation
```

Current verification:

```text
31 tests
31 passed
0 failed
```

Coverage includes:

* AI procurement parsing
* Procurement intelligence
* Supplier recommendation
* EOQ validation
* PR creation
* PR → PO conversion
* Shipment lifecycle
* Truck lifecycle
* Logistics Copilot
* Finance Copilot
* RBAC
* Invoice processing
* Document validation
* Document storage
* File uploads
* Gate verification
* OCR processing
* 3-way matching
* Payment controls
* Regression scenarios

### Backend only

```bash
npm run test --workspace server
```

### Frontend build only

```bash
npm run build --workspace client
```

---

## Continuous Integration

GitHub Actions runs independent validation workflows:

```text
.github/workflows/
├── client-ci.yml
└── server-ci.yml
```

### Server CI

```text
Install dependencies
        ↓
Run backend tests
        ↓
Validate regression suite
```

### Client CI

```text
Install dependencies
        ↓
Run production build
        ↓
Validate Vite compilation
```

This prevents backend regressions and frontend build failures from silently reaching deployment.

---

## Production Configuration

### Backend

```env
NODE_ENV=production
DATABASE_URL=...
JWT_SECRET=...
CLIENT_URL=...
CLOUDINARY_REQUIRED=true
```

### Frontend

```env
VITE_API_URL=...
```

Production infrastructure:

```text
Frontend   → Vercel
Backend    → Render
Database   → MongoDB Atlas
Documents  → Cloudinary
AI         → Groq API
CI/CD      → GitHub Actions
```

---

## Simulation vs Persistent Systems

CogniYard is a hackathon demonstration platform, so some physical-world capabilities are intentionally simulated.

### Simulated

* GPS truck movement
* Physical yard telemetry
* Fixed-yard camera associations
* Certain logistics events
* Hardware-dependent logistics signals

### Persisted

The core enterprise workflow is backed by persistent application data:

* Authentication
* Users
* Suppliers
* Purchase requisitions
* Purchase orders
* Shipments
* Trucks
* Gate verification
* Dock assignments
* Goods receipts
* Inventory
* Supplier invoices
* Invoice documents
* 3-way matching
* Payments
* Exceptions
* Dashboards
* Analytics
* AI procurement recommendations
* Role enforcement

This distinction is intentional: the platform demonstrates realistic enterprise workflow orchestration without pretending that a browser-based hackathon environment contains physical warehouse infrastructure.

---

## End-to-End Demo

For the strongest demonstration, start with a natural-language procurement requirement and follow the data through the entire system:

```text
Natural-Language Requirement
             ↓
Supply-Chain Copilot
             ↓
SKU Resolution
             ↓
Supplier Intelligence
             ↓
EOQ Validation
             ↓
Human Approval
             ↓
Purchase Requisition
             ↓
Purchase Order
             ↓
Shipment + Truck
             ↓
Gate Verification
             ↓
Yard / Dock Assignment
             ↓
Goods Receipt
             ↓
GRN
             ↓
Supplier Invoice
             ↓
3-Way Match
        ↙          ↘
   MATCHED       MISMATCH
      ↓              ↓
Payment Eligible  Payment Hold
```

This single journey demonstrates the core idea behind CogniYard:

**AI-assisted procurement → physical execution → financial validation.**

---

## Useful Commands

| Command             | Purpose                           |
| ------------------- | --------------------------------- |
| `npm install`       | Install dependencies              |
| `npm run bootstrap` | Prepare demo data                 |
| `npm run dev`       | Start development environment     |
| `npm run build`     | Build frontend                    |
| `npm test`          | Backend tests + frontend build    |
| `npm start`         | Start production backend          |
| `npm run seed`      | Reset and reseed development data |

Use `npm run seed` only when intentionally rebuilding the development dataset.

---

## Environment Variables

| Variable                    | Required   | Purpose                       |
| --------------------------- | ---------- | ----------------------------- |
| `DATABASE_URL`              | Yes        | MongoDB connection            |
| `JWT_SECRET`                | Yes        | JWT signing secret            |
| `JWT_EXPIRES_IN`            | No         | JWT lifetime                  |
| `PORT`                      | No         | Backend port                  |
| `CLIENT_URL`                | Production | Allowed frontend origin       |
| `ALLOW_PUBLIC_REGISTRATION` | No         | Public registration control   |
| `DEMO_ACCOUNTS_ENABLED`     | No         | Demo account bootstrap        |
| `GROQ_API_KEY`              | No         | Groq AI integration           |
| `GROQ_MODEL`                | No         | AI model configuration        |
| `CLOUDINARY_URL`            | No         | Cloudinary connection         |
| `CLOUDINARY_CLOUD_NAME`     | No         | Cloudinary cloud              |
| `CLOUDINARY_API_KEY`        | No         | Cloudinary API key            |
| `CLOUDINARY_API_SECRET`     | No         | Cloudinary API secret         |
| `CLOUDINARY_INVOICE_FOLDER` | No         | Invoice storage folder        |
| `CLOUDINARY_REQUIRED`       | No         | Require Cloudinary storage    |
| `GOOGLE_CLIENT_ID`          | No         | Google authentication         |
| `VITE_GOOGLE_CLIENT_ID`     | No         | Browser Google authentication |
| `VITE_API_URL`              | Production | Render API URL                |
| `VITE_PORT`                 | No         | Local Vite port               |
| `VITE_API_TARGET`           | No         | Local API proxy               |
| `VITE_APP_VERSION`          | No         | Application version           |
| `BUYER_COMPANY_NAME`        | No         | Invoice buyer name            |
| `BUYER_ADDRESS`             | No         | Invoice buyer address         |

---

## Troubleshooting

| Problem                    | Solution                                                       |
| -------------------------- | -------------------------------------------------------------- |
| Data unavailable           | Verify MongoDB / Atlas connectivity                            |
| Demo login fails           | Run `npm run bootstrap`                                        |
| MongoDB connection refused | Start MongoDB or configure Atlas                               |
| Port already in use        | Stop the existing process or change `PORT`                     |
| CORS error                 | Verify `CLIENT_URL`                                            |
| Frontend cannot reach API  | Verify `VITE_API_URL`                                          |
| Invoice upload fails       | Check file type, size, validation and Cloudinary configuration |
| Camera does not open       | Use Chrome/Edge and allow camera permissions                   |
| OCR model does not load    | Refresh with an active internet connection                     |
| Groq unavailable           | Configure `GROQ_API_KEY`; local fallback remains available     |
| CI server workflow fails   | Inspect backend test output                                    |
| CI client workflow fails   | Inspect Vite build output                                      |

---

## Project Status

**CogniYard v2.3.1 — Verified Corrections**

The current implementation includes:

```text
✓ Role-based workspaces
✓ Supplier ownership controls
✓ AI Supply-Chain Copilot
✓ Natural-language procurement intelligence
✓ SKU resolution
✓ Supplier intelligence
✓ Supplier scoring
✓ EOQ validation
✓ Human approval safeguards
✓ AI-assisted PR creation
✓ AI-assisted PR → PO conversion
✓ Shipment + Truck lifecycle
✓ Gate verification
✓ Browser camera + OCR
✓ Yard / dock simulation
✓ Dock recommendation
✓ Goods receiving
✓ GRNs
✓ Inventory updates
✓ Supplier invoice generation
✓ Invoice uploads
✓ Cloudinary document storage
✓ Finance invoice review
✓ 3-way matching
✓ Payment eligibility
✓ Payment holds
✓ Logistics Copilot
✓ Finance Copilot
✓ Operational dashboards
✓ Control Tower
✓ Exception Center
✓ Inventory Planning
✓ Smart CCTV
✓ MongoDB Atlas persistence
✓ Vercel deployment
✓ Render deployment
✓ GitHub Actions CI
✓ Automated Windows startup
✓ Backend regression tests
✓ Production frontend build
```

---

## Roadmap

Potential future extensions include:

* Real GPS / telematics integration
* Production-grade CCTV streams
* Real-time yard IoT telemetry
* Advanced demand forecasting
* Supplier performance prediction
* Automated exception resolution
* Multi-warehouse orchestration
* Event-driven workflow processing
* Advanced invoice OCR and field extraction
* Production observability and distributed tracing

---

## Documentation

Detailed implementation and verification information is available in:

```text
docs/IMPLEMENTATION_REPORT.md
```

---

## License

This project was developed as a hackathon solution and demonstration platform.

**CogniYard**
AI-enabled Procure-to-Pay + Yard & Dock Execution
