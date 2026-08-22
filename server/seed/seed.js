const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cogniyard';

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
      AuditLog.deleteMany({})
    ]);

    // -------------------------------------------------------------
    // USERS (4 DISTINCT ROLES)
    // -------------------------------------------------------------
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = await User.create([
      { name: 'Alex Vance', email: 'procurement@cogniyard.com', password: hashedPassword, role: 'procurement_manager', department: 'Procurement' },
      { name: 'Marcus Brody', email: 'warehouse@cogniyard.com', password: hashedPassword, role: 'warehouse_manager', department: 'Logistics' },
      { name: 'Elena Rostova', email: 'finance@cogniyard.com', password: hashedPassword, role: 'finance_user', department: 'Finance AP' },
      { name: 'System Admin', email: 'admin@cogniyard.com', password: hashedPassword, role: 'admin', department: 'Executive' }
    ]);
    console.log(`Created ${users.length} Users with roles: procurement_manager, warehouse_manager, finance_user, admin.`);

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
        name: 'Apex Industrial Safety Co.',
        code: 'SUP-001',
        email: 'orders@apexindustrial.com',
        phone: '+1-800-555-0199',
        rating: 4.9,
        leadTimeDays: 2,
        otdScore: 98
      },
      {
        name: 'Vanguard Logistics & Supply Ltd.',
        code: 'SUP-002',
        email: 'sales@vanguardlogistics.com',
        phone: '+1-800-555-0288',
        rating: 4.4,
        leadTimeDays: 4,
        otdScore: 91
      }
    ]);
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
      asnNumber: 'ASN-1002',
      receivedBy: 'Marcus Brody',
      items: [{ productName: products[1].name, orderedQuantity: 500, receivedQuantity: 450, damagedQuantity: 10, acceptedQuantity: 440 }],
      remarks: '50 units short shipment from supplier, 10 units damaged in transit.'
    });

    await Inventory.create({
      product: products[1]._id,
      sku: products[1].sku,
      productName: products[1].name,
      warehouseLocation: 'Aisle B-04',
      quantityOnHand: 440,
      availableQuantity: 440
    });

    const inv2 = await Invoice.create({
      invoiceNumber: 'INV-8802',
      supplierName: suppliers[0].name,
      poNumber: 'PO-1002',
      items: [{ productName: products[1].name, quantity: 500, unitPrice: 18.50, totalPrice: 9250.00 }],
      totalAmount: 9250.00,
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      matchStatus: 'MISMATCH',
      ocrData: { matched: false, reasons: ['❌ Quantity Mismatch: Received/Accepted 440 units, but Invoice billed for 500 units.'] },
      notes: 'Payment placed ON_HOLD due to quantity mismatch discrepancy.'
    });

    await Payment.create({
      paymentNumber: 'PAY-3002',
      invoiceId: inv2._id,
      invoiceNumber: inv2.invoiceNumber,
      poNumber: 'PO-1002',
      supplierName: suppliers[0].name,
      amount: 9250.00,
      matchStatus: 'MISMATCH',
      paymentStatus: 'ON_HOLD'
    });

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
