# CogniYard v2.3.1 Verified Corrections Build — Implementation Report

## 1. Summary

The existing CogniYard React/Express/MongoDB project was inspected and extended in place. Existing navigation, procurement pages, yard map, digital twin, planning, exceptions, and the COCO-SSD object-detection engine were retained. This release removes the distracting background lifecycle animation and role banners, separates gate verification from yard simulation, adds professional data-labelled dashboards, makes supplier invoices editable end-to-end, validates procurement language deterministically, simplifies Admin supplier onboarding, and tightens Finance matching.

## 2. Main files modified or added

### Root and configuration

- `package.json` — npm workspaces and one-command scripts.
- `package-lock.json` — reproducible clean install.
- `.env.example` — single documented configuration template.
- `.gitignore` — excludes secrets, dependencies, builds, logs, and local uploads.
- `START_COGNIYARD_WINDOWS.bat` — one-click dependency install, safe database bootstrap, and dual-server startup.
- `README.md` — noob-friendly setup and workflow guide.

### Frontend

- `client/src/App.jsx` — role home, strict route-level access, and clean white/black application backgrounds.
- `client/src/context/AuthContext.jsx` — supplier role and labels.
- `client/src/services/api.js` — supplier, invoice generation/upload, and matching APIs.
- `client/src/components/Sidebar.jsx` — managers see only their job; Admin sees every management and supervision module.
- `client/src/components/WarehouseGateVision.jsx` — one live browser camera, dock-aware demo camera placeholders, existing object detections, sequential plate/driver OCR, and proceed gate.
- `client/src/services/ocrEngine.js` — camera-frame crop, contrast preprocessing, and Tesseract text recognition.
- `client/src/components/Navbar.jsx` — removed inactive menu choices and limited AI to Admin/Procurement.
- `client/src/components/AIAssistantModal.jsx` — connected confirmation handling and Groq naming.
- `client/src/pages/AdminPage.jsx` — simplified seven-field supplier CRUD, portal account, users, and products.
- `client/src/pages/ProcurementPage.jsx` — required human unit price and editable PO lines.
- `client/src/pages/LogisticsPage.jsx` — separate Gate Verification and Intelligent Yard Truck Simulation workspaces for Warehouse/Admin, with gate enforcement before dock/GRN actions.
- `client/src/pages/FinancePage.jsx` — automatic PO-linked supplier invoice fetch, match audit, and locked payment UI.
- `client/src/pages/SupplierPortal.jsx` — upload/generation, full invoice editing, optional file replacement, and automatic Finance refresh.
- `client/src/pages/Dashboard.jsx` — role-specific live analytics with distribution titles, descriptions, axis/value labels and legends.
- `client/vite.config.js` — `/api` proxy and accessible dev host.

### Backend

- `server/server.js` — security middleware, CORS, environment loading, health, uploads, production client serving, and safe errors.
- `server/middleware/auth.js` — live-user JWT authorization with supplier identity.
- `server/middleware/fileUpload.js` — file size, extension, and MIME validation.
- `server/controllers/authController.js` — supplier-aware token data, verified Google token handling, safe registration policy.
- `server/controllers/supplierController.js` — Admin supplier lifecycle and supplier invoice workspace.
- `server/controllers/procurementController.js` — human pricing validation and actual-price propagation.
- `server/controllers/logisticsController.js` — OCR identity matching, gate enforcement, state enum, GRN pricing, inventory sync, completion, and dock release.
- `server/controllers/financeController.js` — final invoice, upload/link ingestion, real document, match, and payments.
- `server/controllers/analyticsController.js` — role-specific data aggregation.
- `server/controllers/aiController.js` — Groq integration, safe tool execution, local fallback, real data actions.
- `server/services/procurementIntentService.js` — deterministic item, quantity, and human unit-price extraction for procurement requests.
- `server/services/documentStorage.js` — `CLOUDINARY_URL` support, Cloudinary persistence, strict mode, and persistent local demo fallback.
- `server/services/gateVerificationService.js` — deterministic identity derivation and OCR normalization/matching.
- `server/services/invoicePdfService.js` — real PDF invoice generation.
- `server/services/invoiceService.js` — invoice context, calculations, storage, and 3-way match engine.
- `server/services/yardSimulationService.js` — no false completion/restart loop.
- `server/routes/*.js` — route-level RBAC and new supplier/invoice endpoints.
- `server/seed/seed.js` — supplier account and connected demonstration records.
- `server/seed/bootstrap.js` — non-destructive first-run data setup and demo-credential repair.
- `server/tests/fileUpload.test.js` — upload validation tests.
- `server/tests/invoiceService.test.js` — exact matching and unit-price tests.
- `server/tests/gateVerification.test.js` — plate/driver text normalization and matching tests.
- `server/tests/documentStorage.test.js` — non-blocking local fallback and storage metadata test.
- `server/tests/aiProcurementParser.test.js` — high-confidence procurement language extraction tests.

## 3. Database/schema changes

| Entity | Important additions |
| --- | --- |
| User | `supplier` role and linked `supplier` ID |
| Supplier | company/contact/address/tax/payment/bank-mask/status/portal-account fields and virtual supplier ID |
| Purchase Order | subtotal, tax rate, and tax amount alongside authoritative item price |
| Goods Receipt | PO and supplier references; product, unit price, and received line total |
| Invoice | PO/supplier/user references, document metadata, invoice items, tax/shipping, source, submission state, match details |
| Payment | full match-state values |
| Truck | consistent state enum, plate, driver-ID serial, persisted gate results/confidence/objects, and arrival/unloading/completion timestamps |

Existing collections were extended rather than replaced. Legacy invoice lookup by `poNumber` remains supported where an older record lacks a PO object reference.

## 4. New API routes

### Admin supplier management

- `GET /api/admin/suppliers`
- `POST /api/admin/suppliers`
- `PATCH /api/admin/suppliers/:id`
- `PATCH /api/admin/suppliers/:id/status`
- `DELETE /api/admin/suppliers/:id`

### Supplier portal

- `GET /api/supplier/profile`
- `GET /api/supplier/purchase-orders`
- `GET /api/supplier/invoices`
- `POST /api/supplier/invoices/generate/:poNumber`
- `POST /api/supplier/invoices/upload`
- `PATCH /api/supplier/invoices/:id`
- `POST /api/supplier/invoices/:id/submit`

### Finance invoice lifecycle

- `GET /api/invoices/ready-purchase-orders`
- `GET /api/invoices/:id/document`
- `POST /api/invoices/:id/match`

### Live warehouse gate

- `POST /api/trucks/:truckId/gate-verification`
- `POST /api/trucks/:truckId/gate-proceed`

Existing routes were retained where possible.

## 5. Authentication and roles

Roles are Admin, Procurement Manager, Warehouse/Dock Manager, Finance, and Supplier. JWT middleware reloads the live user on every protected request, so deactivation and role changes take effect. Supplier queries always use the supplier ID from the authenticated user rather than trusting a browser-supplied supplier ID. Exceptions, inventory planning, Smart CCTV, and their APIs are Admin-only. Groq assistance is limited to Admin and Procurement, where it supports sourcing decisions.

Admin role editing cannot turn a normal account into an unlinked supplier account. Supplier accounts are created from Supplier Management so ownership remains connected. Public production registration is disabled unless `ALLOW_PUBLIC_REGISTRATION=true` is intentionally configured.

## 6. Cloudinary changes

- All credentials remain server-side.
- Uploads use Cloudinary `resource_type: auto`.
- The uploaded/generated URL and metadata are stored on the Invoice record.
- Supported formats: PDF, JPG/JPEG, PNG, WEBP, HTML/HTM, DOC/DOCX, XLS/XLSX, CSV.
- Maximum file size: 10 MB.
- One `CLOUDINARY_URL` or the three separate credential values are supported.
- When credentials are configured, Supplier documents go directly to Cloudinary.
- When credentials are absent and strict mode is off, persistent local demo storage keeps the hackathon workflow operational.
- `CLOUDINARY_REQUIRED=true` enforces Cloudinary-only behavior for deployment.
- Finance queries only submitted supplier invoices backed by the trusted Cloudinary/local storage service.

## 7. Groq/AI changes

- The incorrect xAI endpoint/key naming was replaced by Groq's OpenAI-compatible chat-completions endpoint.
- The API key is read only on the backend.
- Supported tool responses query MongoDB records instead of returning fixed values.
- PR generation requires a human price and confirmation.
- Supplier recommendations use active supplier records.
- Dock recommendations use available docks, load type, and priority.
- Business-critical procurement entities are parsed by a deterministic validation layer, so phrases such as “80 banana at Rs 5 per unit” resolve to the correct item, quantity and price without model hallucination.
- Failures fall back to the deterministic local intent engine and return a useful user message.
- CCTV remains explicitly identified as real browser object detection plus demo vehicle-to-PO association where physical cameras are unavailable.

## 8. Invoice workflow

Finance shows only received POs with a GRN. The Supplier generates a real PDF or uploads a supported document; the server stores it in Cloudinary when configured or persistent local demo storage otherwise, persists the URL, rejects older submissions for the same PO, and submits the new invoice to Finance in the same request. Suppliers can edit invoice number/date, items, quantities, unit prices, tax, shipping, and optionally replace the file. If no replacement is supplied, the server generates a corrected PDF. Finance is refreshed automatically and any previous match is reset. Paid invoices are locked.

The REAL INVOICE action uses the actual persisted document. No document produces the explicit “Invoice not generated/uploaded yet” state.

## 9. 3-way matching

The server compares supplier, PO number, each item, ordered/accepted/billed quantity, unit price, unexpected invoice items, and subtotal. The requested Line Total, Tax Amount, and Grand Total rows were removed from both calculation and display. Each comparison is persisted and displayed in a PO/GRN/Invoice table. Payments are approved only for `MATCHED`; partial or critical differences create a hold.

The latest submitted supplier invoice is authoritative for a PO. Attempts to match an older, Finance-created, externally linked, draft, or unrelated invoice are rejected before comparison.

## 10. Dashboard changes

Procurement uses PO counts/status, actual spend by supplier/month, and supplier performance. Warehouse uses truck status, dock utilization, arrivals, accepted receiving quantities, and persisted live gate-verification status. Finance uses real invoice/match/payment records. All dashboards explicitly name distributions, show axis titles/value labels/legends, and display “No data available” instead of invented values.

## 11. Truck workflow

The lifecycle uses one backend/frontend enum:

`SCHEDULED → IN_TRANSIT → AT_GATE → IN_YARD → WAITING_FOR_DOCK → AT_DOCK → UNLOADING → COMPLETED`

The simulation may move a truck to `AT_GATE`, then it pauses until both OCR checks are approved. Plate matching unlocks driver-ID matching; both unlock the proceed action. The backend also rejects dock recommendation, dock assignment, and receiving until the gate result is approved. Only an actual receiving/GRN action completes the truck. Full receiving persists `COMPLETED`, sets `completedAt`, updates inventory and PO status, releases the dock, and removes the truck from active unloading.

## 12. Exact run commands

```bash
npm install
npm run bootstrap
npm run dev
```

The Windows starter runs `npm run bootstrap` automatically. It fully seeds only an empty database and otherwise repairs the demo accounts without clearing existing application data.

Production build/check:

```bash
npm test
npm run build
npm start
```

## 13. Required configuration

Minimum local configuration:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/cogniyard
JWT_SECRET=replace_with_a_long_random_secret
```

See the root `.env.example` for optional Cloudinary, Groq, Google, buyer, port, CORS, and registration settings. Cloudinary is recommended for deployment but is not required for the offline hackathon demo.

## 14. Verification performed

- Node syntax validation for all server JavaScript files.
- Nineteen backend unit tests: procurement language extraction, Cloudinary URL parsing, storage fallback, supported file types, executable/disguised-file rejection, valid PDF signature, OCR normalization/identity matching, full match, partial mismatch, supplier mismatch, mandatory human price, Finance-invoice rejection, and trusted document validation.
- Reproducible root workspace lockfile retained; no dependency versions were changed by this feature release.
- Vite production build: successful.
- Node syntax validation for every backend JavaScript file: successful.

## 15. Remaining limitations

- A live database-backed browser test still requires the user's MongoDB service and configured environment file.
- Live Cloudinary and Groq calls need the owner's valid credentials and therefore cannot be truthfully marked live-tested in this package.
- Arbitrary binary invoice OCR is not claimed. Invoice lines are loaded from the correct PO, confirmed/edited by an authorized human, validated on the server, and attached to the real uploaded document.
- Gate plate/ID OCR is real browser-camera text recognition, not certified ANPR/KYC. Good lighting and readable text are required, and the first OCR model load needs internet.
- GPS and fixed-yard hardware telemetry remain simulated; the interface and lifecycle are ready for real telemetry adapters later.
- The frontend build has a non-blocking large-bundle warning because maps, charts, and CCTV libraries are shipped together; functionality and build are unaffected.
