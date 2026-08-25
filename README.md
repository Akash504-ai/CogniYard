# CogniYard

CogniYard is an AI-enabled Procure-to-Pay and Yard/Dock Execution platform for supply-chain teams. It connects supplier onboarding, purchase requisitions, purchase orders, warehouse gate verification, yard simulation, goods receiving, supplier invoices, 3-way matching, payments, dashboards, and admin controls in one React + Express + MongoDB application.

This build is **v2.3.1 Verified Corrections**. It includes role-based workspaces, real invoice document handling, live browser-camera OCR for gate checks, persisted analytics, and a one-click Windows startup flow.

## Quick Start

### Requirements

- Node.js 20 or newer
- npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- Chrome or Edge for the warehouse camera/OCR workflow

### 1. Create `.env`

Copy the example file from the project root:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Set at least these values:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/cogniyard
JWT_SECRET=replace_with_a_long_random_secret
```

Cloudinary, Groq AI, and Google sign-in are optional. The app still runs locally without them.

### 2. Install and prepare data

```bash
npm install
npm run bootstrap
```

`npm run bootstrap` safely prepares demo data only when needed. It does not wipe existing business records.

### 3. Run the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Windows One-Click Start

On Windows, you can double-click:

```text
START_COGNIYARD_WINDOWS.bat
```

The starter script creates `.env` if needed, installs dependencies, bootstraps demo accounts, starts the backend and frontend, and opens the verified build at:

```text
http://127.0.0.1:3101
```

Keep the terminal window open while using the app. If MongoDB is not running, start the MongoDB Server service and run the starter again.

## Demo Accounts

All demo accounts use:

```text
password123
```

| Role | Email | Workspace |
| --- | --- | --- |
| Admin | `admin@cogniyard.com` | Users, suppliers, control tower, exceptions, planning, CCTV, full supervision |
| Procurement Manager | `procurement@cogniyard.com` | Requisitions, supplier matrix, purchase orders, AI help |
| Warehouse/Dock Manager | `warehouse@cogniyard.com` | Gate verification, yard simulation, docks, receiving, GRNs |
| Finance | `finance@cogniyard.com` | Supplier invoice review, 3-way match, payment approval/hold |
| Supplier | `supplier@cogniyard.com` | Assigned POs, invoice generation/upload, invoice edits |

The login page also includes quick role buttons for the seeded demo users.

## Main Features

### Role-Based Workspaces

- Admin, Procurement, Warehouse, Finance, and Supplier roles.
- Route-level protection for restricted pages.
- Each role sees only the tools needed for its work.
- Supplier portal is ownership-scoped, so suppliers can access only their assigned POs and invoices.
- Public registration can be disabled for production with `ALLOW_PUBLIC_REGISTRATION=false`.

### Admin Management

- Create, edit, activate/deactivate, and safely delete suppliers.
- Create supplier portal accounts linked to supplier records.
- Manage users and product records.
- View system-wide records through dashboards and control views.

### Procurement

- Create purchase requisitions with human-entered unit prices.
- Approve requisitions and convert them into purchase orders.
- Supplier Chain Matrix uses real supplier records from MongoDB.
- Actual quantities and prices flow through PR, PO, GRN, invoice, match, and analytics.
- Admin and Procurement users can use the AI assistant for supported procurement actions.

### Warehouse, Gate, and Yard

- Automatic gate verification workspace with live browser-camera OCR.
- Number plate scan must pass before driver-ID scan unlocks.
- Driver ID and plate checks are persisted on the truck record.
- Dock recommendation, dock assignment, and receiving are blocked until gate verification passes.
- Intelligent Yard Truck Simulation tracks the truck lifecycle from arrival to unloading and completion.
- Goods Receipt Notes update PO status, accepted quantities, inventory, and dock availability.
- The existing COCO-SSD browser object detection demo remains available.

### Supplier Portal

- Suppliers see assigned purchase orders.
- Generate a real PDF invoice from PO data.
- Upload invoice files in supported formats.
- Edit submitted invoices, including invoice number, date, line quantities, unit prices, tax, shipping, and optional replacement document.
- Finance automatically receives the latest submitted invoice for each PO.

### Finance and 3-Way Match

- Finance sees only PO-linked supplier invoices backed by trusted storage.
- Open the real invoice document from the Finance page.
- Run 3-way matching across PO, GRN, and invoice data.
- Matching checks supplier, PO number, item names, ordered quantity, accepted quantity, billed quantity, unit price, and subtotal.
- Fully matched invoices become payment-eligible.
- Partial or failed matches create payment holds.
- Older or stale invoice submissions are rejected before matching.

### Dashboards and Control Tower

- Role-specific dashboards with live MongoDB data.
- Procurement KPIs for PO count, pending orders, completed orders, spend, deliveries, and active suppliers.
- Warehouse KPIs for trucks, dock utilization, received quantity, completion, and gate OCR approvals.
- Finance KPIs for invoices, pending validation, matched invoices, exceptions, paid amount, and on-hold amount.
- Admin overview for users, suppliers, POs, trucks, invoices, and payments.
- Admin-only Control Tower, Exception Center, Inventory Planning, and Smart CCTV demo pages.

### Documents and Storage

- Cloudinary support for invoice documents.
- Persistent local demo storage when Cloudinary is not configured.
- Server-side validation for file size, extension, MIME type, and real file signature/content.
- Real PDF invoice generation with buyer and supplier details.

## End-to-End Demo Flow

1. Sign in as Admin and add or review suppliers under **Add Suppliers & Users**.
2. Sign in as Procurement and create a requisition with item, quantity, supplier, and unit price.
3. Approve the requisition and convert it to a purchase order.
4. Sign in as Warehouse and open **Receive Goods & GRN**.
5. Run gate verification: start the camera, scan the truck plate, scan the driver ID, then proceed to the yard.
6. Open **Intelligent Truck Simulation**, assign a dock, receive accepted quantities, and create the GRN.
7. Sign in as Supplier and generate or upload the invoice for the assigned PO.
8. Sign in as Finance, open the real invoice, run 3-way match, and approve payment or review the hold.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, React Router, Recharts, React Leaflet |
| Backend | Node.js 20+, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt, optional Google sign-in |
| Documents | PDFKit, Multer, Cloudinary or local demo storage |
| Vision | Browser camera, Tesseract OCR, TensorFlow.js COCO-SSD |
| AI | Groq API with deterministic local fallback |
| Testing | Node test runner, Vite production build |

## Project Structure

```text
CogniYard/
+-- client/                  React + Vite frontend
|   +-- public/
|   +-- src/
|       +-- components/
|       +-- context/
|       +-- pages/
|       +-- services/
+-- server/                  Express + MongoDB backend
|   +-- controllers/
|   +-- middleware/
|   +-- models/
|   +-- routes/
|   +-- seed/
|   +-- services/
|   +-- tests/
+-- docs/
|   +-- IMPLEMENTATION_REPORT.md
+-- .env.example
+-- START_COGNIYARD_WINDOWS.bat
+-- package.json
+-- README.md
```

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install root, client, and server workspace dependencies |
| `npm run bootstrap` | Prepare empty database and repair demo credentials safely |
| `npm run dev` | Start backend and frontend together |
| `npm run seed` | Reset and reseed the development database |
| `npm test` | Run backend tests and frontend production build |
| `npm run build` | Build the frontend |
| `npm start` | Start the production backend and serve the built frontend |

Use `npm run seed` only when you intentionally want to clear and rebuild the development dataset.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWT tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime, defaults to `7d` |
| `PORT` | No | Backend port, defaults to `5000` |
| `CLIENT_URL` | Production | Allowed browser origins |
| `ALLOW_PUBLIC_REGISTRATION` | No | Enables/disables public registration |
| `DEMO_ACCOUNTS_ENABLED` | No | Allows demo account bootstrap in development |
| `GROQ_API_KEY` | No | Enables Groq-backed AI assistance |
| `GROQ_MODEL` | No | Groq model name |
| `CLOUDINARY_URL` | No | Easiest Cloudinary setup option |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name, alternative to `CLOUDINARY_URL` |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `CLOUDINARY_INVOICE_FOLDER` | No | Folder for invoice uploads |
| `CLOUDINARY_REQUIRED` | No | Forces Cloudinary-only invoice storage when `true` |
| `GOOGLE_CLIENT_ID` | No | Server-side Google token audience |
| `VITE_GOOGLE_CLIENT_ID` | No | Enables Google sign-in button in the browser |
| `VITE_API_URL` | No | Browser API base path |
| `VITE_PORT` | No | Vite frontend port |
| `VITE_API_TARGET` | No | Backend target for the Vite `/api` proxy |
| `VITE_APP_VERSION` | No | Version label shown in the UI |
| `BUYER_COMPANY_NAME` | No | Buyer name printed on generated invoices |
| `BUYER_ADDRESS` | No | Buyer address printed on generated invoices |

Never commit real `.env` secrets.

## Invoice Upload Rules

Supported file types:

```text
PDF, JPG, JPEG, PNG, WEBP, HTML, HTM, DOC, DOCX, XLS, XLSX, CSV
```

Maximum file size is 10 MB. Executables and renamed executable files are rejected.

## Production-Like Run

Build the frontend:

```bash
npm run build
```

Set production environment values, especially `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_URL`, then start:

```bash
npm start
```

For deployment, configure Cloudinary and keep `CLOUDINARY_REQUIRED=true` if invoice documents must never fall back to local storage.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Website opens but data does not load | Start MongoDB and verify `DATABASE_URL` |
| Login says invalid credentials | Run `npm run bootstrap` or restart with `START_COGNIYARD_WINDOWS.bat` |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running, or the Atlas URL is incorrect |
| Invoice upload says Cloudinary is missing | Add `CLOUDINARY_URL`, or keep local demo storage enabled |
| Camera does not open | Use Chrome/Edge, allow camera permission, and close other camera apps |
| OCR model does not load | Connect to the internet once, refresh, and scan again in good lighting |
| Groq AI is unavailable | Add `GROQ_API_KEY`; deterministic local actions still work |
| Port is already in use | Change `PORT`, `VITE_PORT`, or `VITE_API_TARGET` in `.env` |
| Old UI keeps opening | Close old browser tabs and use the verified Windows URL `http://127.0.0.1:3101` |

## Notes

GPS movement and fixed-yard camera associations are simulated for hackathon/demo use where physical telemetry hardware is unavailable. Procurement records, authentication, supplier ownership, invoice generation/upload, document storage metadata, GRNs, 3-way matching, payments, dashboards, and role enforcement use real persisted application data.

For deeper implementation details, see [docs/IMPLEMENTATION_REPORT.md](docs/IMPLEMENTATION_REPORT.md).
