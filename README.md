# CogniYard

CogniYard is an AI-enabled full-stack Supply Chain Management (SCM) platform integrating Procure-to-Pay (PR2) automation and Yard & Dock Logistics (E2) tracking.

The platform provides autonomous requisition-to-PO workflows, AI-assisted supplier evaluation, real-time GPS yard tracking via React-Leaflet, dynamic dock allocation, automated 3-way invoice matching, and role-based access control (RBAC).

---

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS v4 (Linear/Vercel Minimalist Design System with Light/Dark OLED mode toggle)
- **Maps**: React-Leaflet + OpenStreetMap
- **Icons**: Lucide React
- **Authentication**: JWT & `@react-oauth/google`

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB + Mongoose ODM
- **Authentication**: JWT & bcryptjs
- **Document Storage**: Cloudinary API
- **AI Engine**: Grok AI (xAI API) tool execution engine

---

## Prerequisites

Before running CogniYard, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection URI

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/CogniYard.git
cd CogniYard
```

---

### 2. Backend Setup (`server`)

Navigate to the `server` directory, install dependencies, and configure environment variables:

```bash
cd server
npm install
```

Create a `.env` file inside `server/` using the provided template:

```bash
cp .env.example .env
```

Configure your environment variables in `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
XAI_API_KEY=your_xai_grok_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLIENT_URL=http://localhost:3000
```

#### Seed Initial Database Records

Populate MongoDB with default master products, suppliers, active yard docks, trucks, and seeded user accounts:

```bash
npm run seed
```

#### Start Backend Server

```bash
npm start
# Server will run on http://localhost:5000
```

---

### 3. Frontend Setup (`client`)

Open a new terminal window, navigate to the `client` directory, install dependencies, and configure environment variables:

```bash
cd client
npm install
```

Create a `.env` file inside `client/` using the provided template:

```bash
cp .env.example .env
```

Configure your frontend environment variables in `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

#### Start Frontend Development Server

```bash
npm run dev
# Client will run on http://localhost:3000
```

---

## Seeded Demo Credentials

Use these seeded accounts to log in and evaluate role-restricted workflows:

| Role | Email | Password | Accessible Modules |
| :--- | :--- | :--- | :--- |
| **Procurement Manager** | `procurement@cogniyard.com` | `password123` | Dashboard, PR creation & approval, Supplier Matrix, PO issuance, Grok AI |
| **Warehouse Manager** | `warehouse@cogniyard.com` | `password123` | Dashboard, Yard Map, Dock allocation, Goods receiving, Inventory sync |
| **Finance User** | `finance@cogniyard.com` | `password123` | Dashboard, Invoices, 3-Way Match audit inspector, Cloudinary view, Payments |
| **System Admin** | `admin@cogniyard.com` | `password123` | Full platform access + User RBAC role assignment & account status management |

*Note: Clicking any demo card on the login screen automatically populates the corresponding credentials.*

---

## Core System Architecture & Features

### 1. Procure-to-Pay (PR2) Autonomous Procurement
- Create Purchase Requisitions (PR) manually or via Grok AI natural language prompts.
- Manager PR review and approval workflow.
- Supplier evaluation matrix matching rating, lead time, and On-Time Delivery (OTD) scores.
- Purchase Order (PO) generation and automated state tracking.

### 2. Where's My Truck? (E2) Yard & Logistics Management
- Interactive OpenStreetMap view tracking incoming trucks, trailers, ETAs, and status.
- Smart Dock Recommendation Engine matching truck priority to open dock bays.
- Warehouse Goods Receipt processing with automated inventory stock increments.

### 3. Automated 3-Way Matching Engine
- Cross-verifies Purchase Order totals, Warehouse Goods Receipt quantities, and Cloudinary Invoice documents.
- Automatically flags discrepancies (`MISMATCH`) and puts payments `ON_HOLD`.
- Passes verified invoices (`MATCHED`) for automated payment execution.

### 4. Natural Language Grok AI Assistant
- Integrated AI agent capability dispatching database actions (creating PRs, comparing suppliers, checking truck ETAs, auditing 3-way matches) directly via text prompts.

### 5. RBAC & Security System
- Strict Bearer JWT token verification middleware on backend API routes.
- Frontend route guards (`ProtectedRoute`) controlling access based on MongoDB user roles.
- Public registration defaults to `procurement_manager` (no self-assigned Admin or Finance roles).

---

## Project Directory Structure

```text
CogniYard/
├── client/                      # Frontend React + Vite application
│   ├── src/
│   │   ├── components/          # Reusable UI components (Navbar, Sidebar, Maps, AI Drawer)
│   │   ├── context/             # AuthContext & ThemeContext state managers
│   │   ├── pages/               # Dashboard, Procurement, Logistics, Finance, Admin, Login
│   │   └── services/            # Axios API client interceptors
│   ├── .env.example             # Frontend environment template
│   └── vite.config.js           # Vite configuration & proxy settings
│
└── server/                      # Backend Node.js + Express application
    ├── controllers/             # Auth, Procurement, Logistics, Finance, AI controllers
    ├── middleware/              # JWT auth and RBAC authorization handlers
    ├── models/                  # Mongoose schemas (User, PR, PO, Supplier, Truck, Dock, Invoice)
    ├── routes/                  # Express REST API endpoints
    ├── seed/                    # Database seeding scripts
    └── .env.example             # Backend environment template
```

---

## License

This project is created for the **Cognizant NPN_SCM Hackathon**. All rights reserved.
