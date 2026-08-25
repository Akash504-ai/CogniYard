# CogniYard

**AI-Enabled Procure-to-Pay and Yard/Dock Execution Platform**

CogniYard is a full-stack supply-chain platform that connects procurement, supplier collaboration, warehouse operations, yard execution, finance, and analytics in a single application.

The platform covers the complete workflow from **Purchase Requisition and Purchase Order to Truck Arrival, Goods Receipt, Supplier Invoice, 3-Way Matching, and Payment**.

**Current Version:** v2.3.1 — Verified Corrections

---

## Overview

CogniYard is designed to demonstrate how AI, computer vision, document processing, workflow automation, and persistent enterprise data can be combined to improve supply-chain execution.

The platform provides dedicated workflows for:

* Procurement
* Warehouse and Yard Operations
* Supplier Management
* Finance
* Administration
* Analytics and Operational Monitoring

---

## Key Features

### Role-Based Access

CogniYard supports dedicated workspaces for:

* Admin
* Procurement Manager
* Warehouse/Dock Manager
* Finance
* Supplier

Access is protected through authentication, role-based authorization, route protection, and supplier ownership controls.

### Procurement

* Purchase requisition creation and approval
* Supplier selection
* Purchase order generation
* Supplier Chain Matrix
* Quantity and unit-price tracking
* AI-assisted procurement actions
* Persistent procurement records

The procurement workflow connects:

**PR → PO → GRN → Invoice → 3-Way Match → Payment**

### Warehouse and Yard Operations

* Truck gate verification
* Browser-based camera and OCR workflow
* License plate verification
* Driver ID verification
* Dock recommendation and assignment
* Yard truck simulation
* Goods receiving
* Goods Receipt Notes
* Inventory updates
* Dock availability tracking

Gate verification is enforced before the truck can proceed to the yard and receiving workflow.

### Supplier Portal

Suppliers can:

* View assigned purchase orders
* Generate PDF invoices
* Upload invoice documents
* Edit submitted invoices
* Replace invoice documents
* Update invoice number, date, quantities, prices, tax, and shipping

Supplier access is restricted to their assigned purchase orders and invoices.

### Finance and 3-Way Matching

Finance users can review supplier invoices and perform 3-way matching between:

* Purchase Order
* Goods Receipt Note
* Supplier Invoice

Matching validates supplier, PO number, items, quantities, unit prices, and subtotal.

Fully matched invoices become eligible for payment. Partial or failed matches are placed on payment hold for review.

### Dashboards and Monitoring

Role-specific dashboards provide operational KPIs for:

* Procurement
* Warehouse
* Finance
* Administration

Admin users also have access to:

* Control Tower
* Exception Center
* Inventory Planning
* Smart CCTV

### AI and Computer Vision

The platform includes:

* Groq-powered AI assistance
* Deterministic local AI fallback
* Browser camera integration
* Tesseract OCR
* TensorFlow.js COCO-SSD object detection

### Invoice Documents

Invoice processing supports:

* PDF generation
* Invoice uploads
* Invoice replacement
* Cloudinary storage
* Local demo storage
* File size validation
* MIME-type validation
* File signature/content validation

---

## End-to-End Workflow

1. Admin creates or manages suppliers.
2. Procurement creates and approves a purchase requisition.
3. The approved requisition is converted into a purchase order.
4. Warehouse verifies the arriving truck using the gate workflow.
5. The truck proceeds through yard and dock assignment.
6. Warehouse receives the goods and creates the GRN.
7. Supplier generates or uploads an invoice against the PO.
8. Finance reviews the invoice and performs 3-way matching.
9. A matched invoice becomes payment-eligible; exceptions are placed on hold.
10. Dashboards and operational views reflect the resulting activity.

---

## Technology Stack

| Layer           | Technology                   |
| --------------- | ---------------------------- |
| Frontend        | React 18, Vite, Tailwind CSS |
| Routing         | React Router                 |
| Charts          | Recharts                     |
| Maps            | React Leaflet                |
| Backend         | Node.js 20+, Express         |
| Database        | MongoDB, Mongoose            |
| Authentication  | JWT, bcrypt                  |
| Documents       | PDFKit, Multer               |
| File Storage    | Cloudinary / Local Storage   |
| OCR             | Tesseract                    |
| Computer Vision | TensorFlow.js, COCO-SSD      |
| AI              | Groq API with local fallback |
| Testing         | Node Test Runner             |
| Build           | Vite                         |

---

## Project Structure

```text
CogniYard/
├── client/                         # React + Vite frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
│
├── server/                         # Express + MongoDB backend
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seed/
│   ├── services/
│   └── tests/
│
├── docs/
│   └── IMPLEMENTATION_REPORT.md
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── START_COGNIYARD_WINDOWS.bat
```

`node_modules` and environment files containing secrets are excluded from version control.

---

## Quick Start

### Requirements

* Node.js 20 or newer
* npm
* MongoDB Community Server or MongoDB Atlas
* Chrome or Edge for camera/OCR functionality

### 1. Configure Environment

From the project root, create `.env` from the example file.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

At minimum:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/cogniyard
JWT_SECRET=replace_with_a_long_random_secret
```

Cloudinary, Groq AI, and Google Sign-In are optional.

### 2. Install Dependencies

```bash
npm install
```

Prepare demo data:

```bash
npm run bootstrap
```

`bootstrap` safely prepares demo data without intentionally clearing existing business records.

### 3. Start the Application

```bash
npm run dev
```

Development frontend:

```text
http://localhost:3000
```

---

## Windows One-Click Start

Windows users can run:

```text
START_COGNIYARD_WINDOWS.bat
```

The startup script prepares the environment, installs dependencies, bootstraps demo accounts, starts the backend and frontend, and opens the verified application.

Verified Windows URL:

```text
http://127.0.0.1:3101
```

MongoDB must be running before starting the application.

---

## Demo Accounts

All demo accounts use:

```text
password123
```

| Role                   | Email                       |
| ---------------------- | --------------------------- |
| Admin                  | `admin@cogniyard.com`       |
| Procurement Manager    | `procurement@cogniyard.com` |
| Warehouse/Dock Manager | `warehouse@cogniyard.com`   |
| Finance                | `finance@cogniyard.com`     |
| Supplier               | `supplier@cogniyard.com`    |

The login page also provides quick-access options for the seeded demo roles.

---

## Useful Commands

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm install`       | Install project dependencies              |
| `npm run bootstrap` | Prepare demo data safely                  |
| `npm run dev`       | Start frontend and backend                |
| `npm run build`     | Build the frontend                        |
| `npm test`          | Run tests and production build validation |
| `npm start`         | Start the production backend              |
| `npm run seed`      | Reset and reseed development data         |

Use `npm run seed` only when intentionally rebuilding the development dataset.

---

## Environment Variables

| Variable                    | Required   | Description                          |
| --------------------------- | ---------- | ------------------------------------ |
| `DATABASE_URL`              | Yes        | MongoDB connection string            |
| `JWT_SECRET`                | Yes        | JWT signing secret                   |
| `JWT_EXPIRES_IN`            | No         | JWT lifetime; defaults to `7d`       |
| `PORT`                      | No         | Backend port; defaults to `5000`     |
| `CLIENT_URL`                | Production | Allowed browser origins              |
| `ALLOW_PUBLIC_REGISTRATION` | No         | Enables/disables public registration |
| `DEMO_ACCOUNTS_ENABLED`     | No         | Enables demo account bootstrap       |
| `GROQ_API_KEY`              | No         | Groq AI integration                  |
| `GROQ_MODEL`                | No         | Groq model                           |
| `CLOUDINARY_URL`            | No         | Cloudinary connection string         |
| `CLOUDINARY_CLOUD_NAME`     | No         | Cloudinary cloud name                |
| `CLOUDINARY_API_KEY`        | No         | Cloudinary API key                   |
| `CLOUDINARY_API_SECRET`     | No         | Cloudinary API secret                |
| `CLOUDINARY_INVOICE_FOLDER` | No         | Invoice storage folder               |
| `CLOUDINARY_REQUIRED`       | No         | Forces Cloudinary storage            |
| `GOOGLE_CLIENT_ID`          | No         | Google authentication configuration  |
| `VITE_GOOGLE_CLIENT_ID`     | No         | Browser Google Sign-In configuration |
| `VITE_API_URL`              | No         | Frontend API base URL                |
| `VITE_PORT`                 | No         | Vite frontend port                   |
| `VITE_API_TARGET`           | No         | Vite API proxy target                |
| `VITE_APP_VERSION`          | No         | Application version label            |
| `BUYER_COMPANY_NAME`        | No         | Buyer name for generated invoices    |
| `BUYER_ADDRESS`             | No         | Buyer address for generated invoices |

Never commit real `.env` files or production secrets.

---

## Invoice Uploads

Supported formats:

```text
PDF, JPG, JPEG, PNG, WEBP, HTML, HTM,
DOC, DOCX, XLS, XLSX, CSV
```

Maximum file size: **10 MB**

Uploaded files are validated using file extension, MIME type, size, and file signature/content checks. Executable files and disguised executable files are rejected.

---

## Production-Like Run

Build the frontend:

```bash
npm run build
```

Configure the required production environment variables, including:

```env
NODE_ENV=production
DATABASE_URL=...
JWT_SECRET=...
CLIENT_URL=...
```

Then start the application:

```bash
npm start
```

For production deployments, configure Cloudinary and use:

```env
CLOUDINARY_REQUIRED=true
```

when invoice documents must not fall back to local storage.

---

## Troubleshooting

| Problem                                   | Solution                                                              |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Application loads but data is unavailable | Start MongoDB and verify `DATABASE_URL`                               |
| Invalid demo credentials                  | Run `npm run bootstrap`                                               |
| `ECONNREFUSED 127.0.0.1:27017`            | Start MongoDB or verify the connection string                         |
| Port 5000 is already in use               | Stop the existing Node process or change `PORT`                       |
| Cloudinary configuration error            | Configure `CLOUDINARY_URL` or use local demo storage                  |
| Camera does not open                      | Use Chrome/Edge and allow camera permissions                          |
| OCR model does not load                   | Refresh after establishing an internet connection                     |
| Groq AI is unavailable                    | Configure `GROQ_API_KEY`; local fallback remains available            |
| Old frontend keeps opening                | Close old tabs and use `http://127.0.0.1:3101` for the verified build |

---

## Testing

Run:

```bash
npm test
```

The test suite includes backend validation for areas such as:

* AI procurement parsing
* Document storage
* File uploads
* Gate verification
* Invoice processing
* Regression scenarios

The command also validates the frontend production build.

---

## Demo and Simulation Notes

Some physical-world capabilities are simulated because the hackathon environment does not provide live warehouse hardware.

Simulated components include:

* GPS truck movement
* Fixed-yard camera associations
* Physical yard telemetry

Core application workflows use persisted backend data, including:

* Authentication
* Users
* Suppliers
* Purchase requisitions
* Purchase orders
* Trucks
* Gate verification
* Goods receipts
* Inventory
* Supplier invoices
* Invoice documents
* 3-way matching
* Payments
* Dashboards
* Analytics
* Role enforcement

This allows CogniYard to demonstrate a realistic end-to-end supply-chain workflow while simulating physical infrastructure that is unavailable in the development environment.

---

## Documentation

Additional implementation details are available in:

```text
docs/IMPLEMENTATION_REPORT.md
```

---

## Project Status

**CogniYard v2.3.1 — Verified Corrections**

The current build includes:

* Role-based workspaces
* Supplier ownership controls
* Procurement workflow
* Purchase orders
* Gate verification
* Browser-camera OCR
* Yard and dock simulation
* Goods receiving and GRNs
* Supplier invoice generation and uploads
* Finance invoice review
* 3-way matching
* Payment workflow
* AI-assisted procurement
* Operational dashboards
* Control Tower
* Exception Center
* Inventory Planning
* Smart CCTV
* Automated Windows startup
* Backend tests
* Production frontend build

---

## License

This project was developed as a hackathon solution and demonstration platform.

For implementation details, architecture information, and verification notes, refer to `docs/IMPLEMENTATION_REPORT.md`.
