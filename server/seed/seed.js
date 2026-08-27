const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: false });

const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const YardDock = require('../models/Dock');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const Shipment = require('../models/Shipment');
const Truck = require('../models/Truck');
const ASN = require('../models/ASN');
const GoodsReceipt = require('../models/GoodsReceipt');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const DemandHistory = require('../models/DemandHistory');
const { generateInvoicePdf } = require('../services/invoicePdfService');
const { storeDocument } = require('../services/documentStorage');

const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/cogniyard';

async function seedDatabase() {
  try {
    console.log('🌱 Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGODB_URI);

    console.log('🧹 Clearing existing database records...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Supplier.deleteMany({}),
      YardDock.deleteMany({}),
      PurchaseRequisition.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      Shipment.deleteMany({}),
      Truck.deleteMany({}),
      ASN.deleteMany({}),
      GoodsReceipt.deleteMany({}),
      Inventory.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
      AuditLog.deleteMany({}),
      DemandHistory.deleteMany({})
    ]);

    // -------------------------------------------------------------
    // INTERNAL USERS (SUPPLIER USER IS LINKED AFTER SUPPLIER CREATION)
    // -------------------------------------------------------------
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = await User.create([
      { name: 'Alex Vance', email: 'procurement@cogniyard.com', password: hashedPassword, role: 'procurement_manager', department: 'Procurement' },
      { name: 'Marcus Brody', email: 'warehouse@cogniyard.com', password: hashedPassword, role: 'warehouse_manager', department: 'Logistics' },
      { name: 'Elena Rostova', email: 'finance@cogniyard.com', password: hashedPassword, role: 'finance_user', department: 'Finance AP' },
      { name: 'System Admin', email: 'admin@cogniyard.com', password: hashedPassword, role: 'admin', department: 'Executive' }
    ]);
    console.log(`Created ${users.length} internal Users.`);

    // -------------------------------------------------------------
    // PRODUCTS
    // -------------------------------------------------------------
    const products = await Product.create([
      { sku: 'SKU-HLMT-01', name: 'Safety Helmet - High Visibility Yellow', category: 'PPE', defaultPrice: 45.00, unit: 'units', description: 'ANSI Z89.1 Certified Type I Class E Hard Hat' },
      { sku: 'SKU-GLVS-02', name: 'Heavy-Duty Cut Resistant Gloves (Pair)', category: 'PPE', defaultPrice: 18.50, unit: 'pairs', description: 'ANSI Cut Level A4 Nitrile Coated Gloves' },
      { sku: 'SKU-VEST-03', name: 'Reflective Safety Vest - Class 2', category: 'PPE', defaultPrice: 24.00, unit: 'units', description: 'ANSI/ISEA 107-2020 High Vis Reflective Vest' }
    ]);
    console.log(`Created ${products.length} Products.`);

    // -------------------------------------------------------------
    // SUPPLIERS
    // -------------------------------------------------------------
    const suppliers = await Supplier.create([
      {
        name: 'CogniYard Demo Supplier',
        companyName: 'CogniYard Demo Supplier',
        contactPerson: 'Demo Supplier User',
        code: 'SUP-DEMO',
        email: 'supplier@cogniyard.com',
        phone: '+1-555-0100',
        address: 'Demo Supplier Address',
        taxId: 'GST-DEMO-1001',
        paymentTerms: 'Net 30',

        // Supplier performance
        rating: 4.8,
        leadTimeDays: 3,
        otdScore: 95,
        category: 'Industrial Safety',
        // AI recommendation
        aiSupplierScore: 90.4,
        aiPreferred: true,
        aiRank: 1
      },
      {
        name: 'Apex Industrial Safety Co.',
        companyName: 'Apex Industrial Safety Co.',
        contactPerson: 'Riya Mehta',
        code: 'SUP-1001',
        email: 'orders@apexindustrial.com',
        phone: '+1-800-555-0199',
        address: '45 Industrial Avenue, Bengaluru',
        taxId: 'GST-29-AAPEX-1001',
        paymentTerms: 'Net 30',

        rating: 4.8,
        leadTimeDays: 2,
        otdScore: 98,

        aiSupplierScore: 88.7,
        aiPreferred: false,
        aiRank: 2
      },
      {
        name: 'Vanguard Logistics & Supply Ltd.',
        companyName: 'Vanguard Logistics & Supply Ltd.',
        contactPerson: 'Arjun Das',
        code: 'SUP-1002',
        email: 'sales@vanguardlogistics.com',
        phone: '+1-800-555-0288',

        rating: 4.4,
        leadTimeDays: 4,
        otdScore: 91,

        aiSupplierScore: 82.3,
        aiPreferred: false,
        aiRank: 3
      }
    ]);
    const supplierUser = await User.create({
      name: suppliers[0].contactPerson,
      email: 'supplier@cogniyard.com',
      password: hashedPassword,
      role: 'supplier',
      department: suppliers[0].companyName,
      supplier: suppliers[0]._id,
      isActive: true
    });
    suppliers[0].userAccount = supplierUser._id;
    await suppliers[0].save();
    console.log(`Created ${suppliers.length} Suppliers with AI Scores.`);

    // -------------------------------------------------------------
    // YARD DOCKS
    // -------------------------------------------------------------
    const docks = await YardDock.create([
      { dockNumber: 'DOCK-01', name: 'Receiving Dock 1 (High Bay)', status: 'AVAILABLE', suitableLoadTypes: ['DRY_VAN', 'REFRIGERATED'], notes: 'Standard pallet receiving' },
      { dockNumber: 'DOCK-02', name: 'Receiving Dock 2 (Cold Storage)', status: 'AVAILABLE', suitableLoadTypes: ['REFRIGERATED'], notes: 'Temperature control bay' },
      { dockNumber: 'DOCK-03', name: 'Receiving Dock 3 (Fast Track)', status: 'AVAILABLE', suitableLoadTypes: ['DRY_VAN', 'FLATBED'], notes: 'Priority unloading zone' },
      { dockNumber: 'DOCK-04', name: 'Receiving Dock 4 (Heavy Cargo)', status: 'MAINTENANCE', suitableLoadTypes: ['FLATBED', 'DRY_VAN'], notes: 'Hydraulic lift under repair' }
    ]);
    console.log(`Created ${docks.length} Yard Docks.`);

    // -------------------------------------------------------------
    // SCENARIO 1: LIVE DEMO INBOUND SHIPMENT (PO-1001 & TRK-9001)
    // -------------------------------------------------------------
    const pr1 = await PurchaseRequisition.create({
      prNumber: 'PR-1001',
      requestedBy: 'Alex Vance',
      items: [{ product: products[0]._id, productName: products[0].name, quantity: 500, estimatedUnitPrice: 45.00, totalPrice: 22500.00 }],
      totalAmount: 22500.00,
      status: 'CONVERTED_TO_PO',
      priority: 'HIGH',
      aiGenerated: true,
      notes: 'Requested via AI Procurement Assistant for Warehouse expansion'
    });

    const po1 = await PurchaseOrder.create({
      poNumber: 'PO-1001',
      prId: pr1._id,
      supplier: suppliers[0]._id,
      supplierName: suppliers[0].name,
      items: [{ product: products[0]._id, productName: products[0].name, quantity: 500, unitPrice: 45.00, totalPrice: 22500.00 }],
      totalAmount: 22500.00,
      status: 'ISSUED'
    });

    const shp1 = await Shipment.create({
      shipmentNumber: 'SHP-1001',
      poNumber: 'PO-1001',
      supplierName: suppliers[0].name,
      origin: 'Apex Mfg Plant - Dallas, TX',
      destination: 'CogniYard Logistics Center - Bay 3',
      carrier: 'Apex Freight Corp',
      status: 'IN_TRANSIT',
      estimatedArrival: '10:30 AM'
    });

    const truck1 = await Truck.create({
      truckId: 'TRK-9001',
      trailerId: 'TRL-4481',
      shipmentId: shp1.shipmentNumber,
      poNumber: 'PO-1001',
      driverName: 'John Miller',
      driverPhone: '+1-555-9012',
      licensePlate: 'CY-9001',
      driverIdSerial: 'DRV-9001',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'IN_TRANSIT',
      eta: '10:30 AM',
      priority: 'HIGH',
      appointmentTime: '10:30 AM',
      loadType: 'DRY_VAN',
      yardLocation: 'In Transit to Yard Gate',
      assignedDock: null
    });

    const asn1 = await ASN.create({
      asnNumber: 'ASN-1001',
      poNumber: 'PO-1001',
      shipmentId: shp1.shipmentNumber,
      supplierName: suppliers[0].name,
      items: [{ productName: products[0].name, quantity: 500, lotNumber: 'LOT-2026-H1' }],
      status: 'IN_TRANSIT'
    });

    await Inventory.create({
      product: products[0]._id,
      sku: products[0].sku,
      productName: products[0].name,
      warehouseLocation: 'Aisle A-01 (High-Bay)',
      quantityOnHand: 260,
      availableQuantity: 260
    });

    // -------------------------------------------------------------
    // SCENARIO 2: PARTIAL RECEIVING & MISMATCH TEST (PO-1002)
    // -------------------------------------------------------------
    const pr2 = await PurchaseRequisition.create({
      prNumber: 'PR-1002',
      requestedBy: 'Alex Vance',
      items: [{ product: products[1]._id, productName: products[1].name, quantity: 500, estimatedUnitPrice: 18.50, totalPrice: 9250.00 }],
      totalAmount: 9250.00,
      status: 'CONVERTED_TO_PO',
      priority: 'MEDIUM',
      aiGenerated: false
    });

    const po2 = await PurchaseOrder.create({
      poNumber: 'PO-1002',
      prId: pr2._id,
      supplier: suppliers[0]._id,
      supplierName: suppliers[0].name,
      items: [{ product: products[1]._id, productName: products[1].name, quantity: 500, unitPrice: 18.50, totalPrice: 9250.00 }],
      totalAmount: 9250.00,
      status: 'PARTIALLY_RECEIVED'
    });

    const shp2 = await Shipment.create({
      shipmentNumber: 'SHP-1002',
      poNumber: 'PO-1002',
      supplierName: suppliers[0].name,
      origin: 'Apex Mfg Plant - Dallas, TX',
      destination: 'CogniYard Logistics Center',
      carrier: 'CogniExpress Logistics',
      status: 'IN_TRANSIT',
      estimatedArrival: '02:00 PM'
    });

    const truck2 = await Truck.create({
      truckId: 'TRK-9002',
      trailerId: 'TRL-1102',
      shipmentId: shp2.shipmentNumber,
      poNumber: 'PO-1002',
      driverName: 'Robert Vance',
      driverPhone: '+1-555-8833',
      licensePlate: 'CY-9002',
      driverIdSerial: 'DRV-9002',
      latitude: 12.9650,
      longitude: 77.5900,
      status: 'IN_TRANSIT',
      eta: '02:00 PM',
      priority: 'MEDIUM',
      appointmentTime: '02:15 PM',
      loadType: 'DRY_VAN',
      yardLocation: 'Approaching Gate 2'
    });

    const gr2 = await GoodsReceipt.create({
      receiptNumber: 'GR-1002',
      poNumber: 'PO-1002',
      purchaseOrder: po2._id,
      supplier: suppliers[0]._id,
      supplierName: suppliers[0].name,
      asnNumber: 'ASN-1002',
      receivedBy: 'Marcus Brody',
      items: [{ product: products[1]._id, productName: products[1].name, orderedQuantity: 500, receivedQuantity: 450, damagedQuantity: 10, acceptedQuantity: 440, unitPrice: 18.50, totalPrice: 8140 }],
      remarks: '50 units short shipment from supplier, 10 units damaged in transit.'
    });

    await Inventory.create({
      product: products[1]._id,
      sku: products[1].sku,
      productName: products[1].name,
      warehouseLocation: 'Aisle B-04',
      quantityOnHand: 40,
      availableQuantity: 40
    });

    await Inventory.create({
      product: products[2]._id,
      sku: products[2].sku,
      productName: products[2].name,
      warehouseLocation: 'Aisle C-12',
      quantityOnHand: 1200,
      availableQuantity: 1200
    });

    // Update Product models currentStock fields
    await Product.findByIdAndUpdate(products[0]._id, { currentStock: 260 });
    await Product.findByIdAndUpdate(products[1]._id, { currentStock: 40 });
    await Product.findByIdAndUpdate(products[2]._id, { currentStock: 1200 });

    const inv2 = new Invoice({
      invoiceNumber: 'INV-8802',
      purchaseOrder: po2._id,
      supplier: suppliers[0]._id,
      supplierUser: supplierUser._id,
      supplierName: suppliers[0].name,
      poNumber: 'PO-1002',
      items: [{ productName: products[1].name, quantity: 500, unitPrice: 18.50, totalPrice: 9250.00 }],
      subtotal: 9250.00,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 9250.00,
      sourceType: 'SUPPLIER_GENERATED',
      submissionStatus: 'SUBMITTED',
      submittedBy: supplierUser._id,
      matchStatus: 'PARTIALLY_MATCHED',
      ocrData: { matched: false, reasons: ['❌ Quantity Mismatch: Received/Accepted 440 units, but Invoice billed for 500 units.'] },
      notes: 'Payment placed ON_HOLD due to quantity mismatch discrepancy.'
    });
    const inv2Pdf = await generateInvoicePdf(inv2, po2, suppliers[0]);
    inv2.document = await storeDocument(inv2Pdf, { originalName: 'INV-8802.pdf', mimeType: 'application/pdf', fallbackExtension: '.pdf', publicBaseUrl: `http://localhost:${process.env.PORT || 5000}` });
    inv2.fileUrl = inv2.document.url;
    await inv2.save();

    await Payment.create({
      paymentNumber: 'PAY-3002',
      invoiceId: inv2._id,
      invoiceNumber: inv2.invoiceNumber,
      poNumber: 'PO-1002',
      supplierName: suppliers[0].name,
      amount: 9250.00,
      matchStatus: 'PARTIALLY_MATCHED',
      paymentStatus: 'ON_HOLD'
    });

    // -------------------------------------------------------------
    // SCENARIO 3: COMPLETED LIFECYCLE DEMO (PO-1003 & TRK-1003)
    // -------------------------------------------------------------
    const pr3 = await PurchaseRequisition.create({
      prNumber: 'PR-1003',
      requestedBy: 'Alex Vance',
      items: [{ product: products[0]._id, productName: 'Industrial Cooling Fan', quantity: 50, estimatedUnitPrice: 5000.00, totalPrice: 250000.00 }],
      totalAmount: 250000.00,
      status: 'CONVERTED_TO_PO',
      priority: 'HIGH',
      aiGenerated: false
    });

    const po3 = await PurchaseOrder.create({
      poNumber: 'PO-1003',
      prId: pr3._id,
      supplier: suppliers[0]._id,
      supplierName: suppliers[0].name,
      items: [{ product: products[0]._id, productName: 'Industrial Cooling Fan', quantity: 50, unitPrice: 5000.00, totalPrice: 250000.00 }],
      totalAmount: 250000.00,
      status: 'RECEIVED'
    });

    const shp3 = await Shipment.create({
      shipmentNumber: 'SHP-1003',
      poNumber: 'PO-1003',
      supplierName: suppliers[0].name,
      origin: 'Apex Industrial Plant',
      destination: 'CogniYard Main Dock',
      carrier: 'Apex Express Heavy',
      status: 'DELIVERED',
      estimatedArrival: '10:30 AM'
    });

    const truck3 = await Truck.create({
      truckId: 'TRK-1003',
      trailerId: 'TRL-3303',
      shipmentId: shp3.shipmentNumber,
      poNumber: 'PO-1003',
      driverName: 'Marcus Miller',
      driverPhone: '+1-555-3399',
      licensePlate: 'CY-9003',
      driverIdSerial: 'DRV-9003',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'COMPLETED',
      completedAt: new Date(),
      eta: '10:30 AM',
      priority: 'HIGH',
      appointmentTime: '10:30 AM',
      loadType: 'DRY_VAN',
      yardLocation: 'Dock Bay 1'
    });

    const gr3 = await GoodsReceipt.create({
      receiptNumber: 'GR-1003',
      poNumber: 'PO-1003',
      purchaseOrder: po3._id,
      supplier: suppliers[0]._id,
      supplierName: suppliers[0].name,
      asnNumber: 'ASN-1003',
      receivedBy: 'Warehouse Manager',
      items: [{ product: products[0]._id, productName: 'Industrial Cooling Fan', orderedQuantity: 50, receivedQuantity: 50, damagedQuantity: 0, acceptedQuantity: 50, unitPrice: 5000.00, totalPrice: 250000.00 }],
      remarks: 'All 50 units accepted into stock.'
    });

    const inv3 = new Invoice({
      invoiceNumber: 'INV-3333',
      purchaseOrder: po3._id,
      supplier: suppliers[0]._id,
      supplierUser: supplierUser._id,
      supplierName: suppliers[0].name,
      poNumber: 'PO-1003',
      items: [{ product: products[0]._id, productName: 'Industrial Cooling Fan', quantity: 50, unitPrice: 5000.00, totalPrice: 250000.00 }],
      subtotal: 250000.00,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 250000.00,
      sourceType: 'SUPPLIER_GENERATED',
      submissionStatus: 'VALIDATED',
      submittedBy: supplierUser._id,
      matchStatus: 'MATCHED',
      ocrData: { matched: true, reasons: [] },
      notes: '3-Way Match verified cleanly.'
    });
    const inv3Pdf = await generateInvoicePdf(inv3, po3, suppliers[0]);
    inv3.document = await storeDocument(inv3Pdf, { originalName: 'INV-3333.pdf', mimeType: 'application/pdf', fallbackExtension: '.pdf', publicBaseUrl: `http://localhost:${process.env.PORT || 5000}` });
    inv3.fileUrl = inv3.document.url;
    await inv3.save();

    await Payment.create({
      paymentNumber: 'PAY-3003',
      invoiceId: inv3._id,
      invoiceNumber: inv3.invoiceNumber,
      poNumber: 'PO-1003',
      supplierName: suppliers[0].name,
      amount: 250000.00,
      matchStatus: 'MATCHED',
      paymentStatus: 'PAID'
    });

    // -------------------------------------------------------------
    // DEMAND HISTORY (6-MONTH DETERMINISTIC DATA FOR PLANNING ENGINE)
    // -------------------------------------------------------------
    await DemandHistory.create([
      // SKU-HLMT-01 (Safety Helmet - Scenario 2: REORDER_RECOMMENDED)
      { product: products[0]._id, sku: products[0].sku, productName: products[0].name, period: '2026-03', monthName: 'March', quantity: 1800 },
      { product: products[0]._id, sku: products[0].sku, productName: products[0].name, period: '2026-04', monthName: 'April', quantity: 1950 },
      { product: products[0]._id, sku: products[0].sku, productName: products[0].name, period: '2026-05', monthName: 'May', quantity: 2010 },
      { product: products[0]._id, sku: products[0].sku, productName: products[0].name, period: '2026-06', monthName: 'June', quantity: 2100 },
      { product: products[0]._id, sku: products[0].sku, productName: products[0].name, period: '2026-07', monthName: 'July', quantity: 2050 },
      { product: products[0]._id, sku: products[0].sku, productName: products[0].name, period: '2026-08', monthName: 'August', quantity: 2150 },

      // SKU-GLVS-02 (Cut Resistant Gloves - Scenario 3: URGENT_REORDER)
      { product: products[1]._id, sku: products[1].sku, productName: products[1].name, period: '2026-03', monthName: 'March', quantity: 1400 },
      { product: products[1]._id, sku: products[1].sku, productName: products[1].name, period: '2026-04', monthName: 'April', quantity: 1550 },
      { product: products[1]._id, sku: products[1].sku, productName: products[1].name, period: '2026-05', monthName: 'May', quantity: 1600 },
      { product: products[1]._id, sku: products[1].sku, productName: products[1].name, period: '2026-06', monthName: 'June', quantity: 1750 },
      { product: products[1]._id, sku: products[1].sku, productName: products[1].name, period: '2026-07', monthName: 'July', quantity: 1800 },
      { product: products[1]._id, sku: products[1].sku, productName: products[1].name, period: '2026-08', monthName: 'August', quantity: 1900 },

      // SKU-VEST-03 (Reflective Safety Vest - Scenario 1: HEALTHY)
      { product: products[2]._id, sku: products[2].sku, productName: products[2].name, period: '2026-03', monthName: 'March', quantity: 210 },
      { product: products[2]._id, sku: products[2].sku, productName: products[2].name, period: '2026-04', monthName: 'April', quantity: 230 },
      { product: products[2]._id, sku: products[2].sku, productName: products[2].name, period: '2026-05', monthName: 'May', quantity: 220 },
      { product: products[2]._id, sku: products[2].sku, productName: products[2].name, period: '2026-06', monthName: 'June', quantity: 240 },
      { product: products[2]._id, sku: products[2].sku, productName: products[2].name, period: '2026-07', monthName: 'July', quantity: 250 },
      { product: products[2]._id, sku: products[2].sku, productName: products[2].name, period: '2026-08', monthName: 'August', quantity: 260 }
    ]);
    console.log('Created 18 DemandHistory records across 3 products.');

    // -------------------------------------------------------------
    // INITIAL AUDIT LOGS
    // -------------------------------------------------------------
    await AuditLog.create([
      { user: 'System Admin', role: 'admin', action: 'SEED_DATABASE', entity: 'System', details: 'Initialized CogniYard Hackathon MVP Seed Data.' },
      { user: 'Alex Vance', role: 'procurement_manager', action: 'CREATE_PO', entity: 'PurchaseOrder', entityId: 'PO-1001', details: 'Issued PO-1001 to Apex Industrial Safety Co.' }
    ]);

    console.log('✅ CogniYard Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
}

seedDatabase();
