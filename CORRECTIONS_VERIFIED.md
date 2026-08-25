# CogniYard v2.3.1 — Correction Verification

This package is deliberately isolated from earlier CogniYard copies. On Windows, run only `START_COGNIYARD_WINDOWS.bat`; it opens `http://127.0.0.1:3101` and the login screen must show **Verified corrections v2.3.1**.

1. Procurement role-guide banner removed.
2. Operational charts use distribution titles, legends, axis names and value labels.
3. Dispatch without a supplier shows a warning and does not create a PO.
4. Procurement language is parsed by a deterministic item/quantity/unit-price validator before any Groq result is used.
5. Sidebar instructions and “System Online / irrelevant modules” text removed.
6. Warehouse charts use professional distribution labels; “Only Your Work” was removed.
7. Warehouse role-guide banner removed.
8. Automatic Gate Verification is a separate tab with one live camera and dock-linked demonstration feeds.
9. Intelligent Yard Truck Simulation is a separate tab containing map, digital twin, docks, manifest and inventory.
10. A supplier can edit invoice number/date, items, quantities, unit prices, tax, shipping and the document before Finance rematches it.
11. Finance 3-way detail excludes Line Total, Tax Amount and Grand Total.
12. Admin Add Supplier shows only Supplier Name, Company Name, Phone Number, Business Email, Address, Supplier Login Email and Password.

The full-page lifecycle background was removed. Page backgrounds are white in light mode and black in dark mode. Functional live-camera, loading and yard-simulation motion remains only inside the tools where it is required.
