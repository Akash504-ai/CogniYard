COGNIYARD v2.3.1 - VERIFIED CORRECTIONS BUILD
================================================

Before starting:
1. Install Node.js 20 or newer.
2. Install MongoDB Community Server.
3. Make sure the MongoDB Server Windows service is Running.
4. Cloudinary is recommended but no longer blocks the demo.
   Easiest real-cloud setup: paste your CLOUDINARY_URL into .env.
   Without it, invoices use persistent local demo storage automatically.

To run CogniYard:
1. Extract this ZIP into a NEW folder. Do not merge it into an older CogniYard folder.
2. Double-click START_COGNIYARD_WINDOWS.bat.
3. Wait for installation and database preparation to finish.
4. Keep the black window open.
5. Chrome opens automatically at http://127.0.0.1:3101.
6. Confirm the login page says "Verified corrections v2.3.1".

IMPORTANT: Do not use an old localhost:3000 browser tab. This corrected release
uses port 3101 so Windows cannot show an older CogniYard copy by mistake.

What to click inside the website:
Admin sees every management module. Every other account sees only its own work:
1. Admin: Add Supplier.
2. Procurement: Create Requisition -> Choose Supplier -> Purchase Order.
3. Warehouse: Gate Verification -> Start Camera 1 -> Scan Plate -> Scan Driver ID -> Proceed -> Yard Simulation -> Dock -> Receive GRN.
4. Supplier: Upload/Generate Invoice -> Edit if needed (Cloudinary when configured; local demo store otherwise; Finance receives every correction automatically).
5. Finance: REAL INVOICE -> Run 3-Way Match -> Pay Now.

The page background is clean white in light mode and black in dark mode. The interactive yard simulation is available as its own Warehouse section.
For warehouse OCR, use Chrome/Edge, allow camera access, use good lighting, and keep internet on for the first OCR-model load.
On the login page, click a demo role once to sign in directly.

You do NOT need to run npm run seed manually.

Demo password for every account: password123

Admin:       admin@cogniyard.com
Procurement: procurement@cogniyard.com
Warehouse:   warehouse@cogniyard.com
Finance:     finance@cogniyard.com
Supplier:    supplier@cogniyard.com

If startup says MongoDB is unavailable:
1. Press Windows + R.
2. Type services.msc and press Enter.
3. Find MongoDB Server.
4. Right-click it and select Start.
5. Double-click START_COGNIYARD_WINDOWS.bat again.
