const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const Shipment = require('../models/Shipment');
const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const ASN = require('../models/ASN');
const GoodsReceipt = require('../models/GoodsReceipt');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cogniyard';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Supplier.deleteMany({});
    await PurchaseRequisition.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await Shipment.deleteMany({});
    await Truck.deleteMany({});
    await Dock.deleteMany({});
    await ASN.deleteMany({});
    await GoodsReceipt.deleteMany({});
    await Inventory.deleteMany({});
    await Invoice.deleteMany({});
    await Payment.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('Cleared existing database records.');

    // 1. Create Users
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('password123', salt);

    const users = await User.insertMany([
      { name: 'Alex Vance', email: 'procurement@cogniyard.com', password: defaultPassword, role: 'procurement_manager', department: 'Global Procurement' },
      { name: 'Marcus Brody', email: 'warehouse@cogniyard.com', password: defaultPassword, role: 'warehouse_manager', department: 'Yard & Logistics Operations' },
      { name: 'Elena Rostova', email: 'finance@cogniyard.com', password: defaultPassword, role: 'finance_user', department: 'Corporate Finance & AP' },
      { name: 'System Admin', email: 'admin@cogniyard.com', password: defaultPassword, role: 'admin', department: 'IT Operations' }
    ]);
    console.log(`Created ${users.length} Users.`);

    // 2. Create Suppliers
    const suppliers = await Supplier.insertMany([
      { name: 'Apex Industrial Safety Co.', code: 'SUP-101', email: 'orders@apexsafety.com', phone: '+1-800-555-0144', category: 'Industrial Safety', rating: 4.8, leadTimeDays: 2, otdScore: 98, status: 'ACTIVE' },
      { name: 'Global Logistics Supply Ltd.', code: 'SUP-102', email: 'sales@globallogistics.com', phone: '+1-800-555-0188', category: 'Heavy Machinery & Tools', rating: 4.5, leadTimeDays: 4, otdScore: 92, status: 'ACTIVE' },
      { name: 'Vanguard Raw Materials', code: 'SUP-103', email: 'contact@vanguardraw.com', phone: '+1-800-555-0211', category: 'Raw Materials', rating: 4.2, leadTimeDays: 5, otdScore: 88, status: 'ACTIVE' },
      { name: 'EcoPack Logistics Solutions', code: 'SUP-104', email: 'info@ecopack.com', phone: '+1-800-555-0399', category: 'Packaging', rating: 4.7, leadTimeDays: 3, otdScore: 96, status: 'ACTIVE' }
    ]);
    console.log(`Created ${suppliers.length} Suppliers.`);

    // 3. Create Products
    const products = await Product.insertMany([
      { sku: 'SKU-HLM-500', name: 'Safety Helmet - High Visibility Yellow', description: 'ANSI Z89.1 Certified Hard Hat', category: 'Industrial Safety', unit: 'pcs', defaultPrice: 45.00, currentStock: 250, reorderLevel: 50, preferredSupplier: suppliers[0]._id },
      { sku: 'SKU-GLV-200', name: 'Heavy Duty Leather Work Gloves', description: 'Cut-resistant level 5 safety gloves', category: 'Industrial Safety', unit: 'pairs', defaultPrice: 18.50, currentStock: 400, reorderLevel: 100, preferredSupplier: suppliers[0]._id },
      { sku: 'SKU-PAL-100', name: 'Standard Wooden Cargo Pallets', description: 'Euro-pallet 1200x800mm', category: 'Packaging', unit: 'pcs', defaultPrice: 22.00, currentStock: 120, reorderLevel: 40, preferredSupplier: suppliers[3]._id },
      { sku: 'SKU-WCH-800', name: 'Electric Heavy Lifting Winch 2-Ton', description: 'Industrial grade 220V motor winch', category: 'Heavy Machinery & Tools', unit: 'units', defaultPrice: 850.00, currentStock: 15, reorderLevel: 5, preferredSupplier: suppliers[1]._id }
    ]);
    console.log(`Created ${products.length} Products.`);

    // 4. Create Docks
    const docks = await Dock.insertMany([
      { dockNumber: 'DOCK-01', name: 'Receiving Dock 1 (Dry Goods)', status: 'AVAILABLE', suitableLoadTypes: ['DRY_VAN', 'FLATBED'], notes: 'Near Aisle A' },
      { dockNumber: 'DOCK-02', name: 'Receiving Dock 2 (Cold Storage)', status: 'OCCUPIED', suitableLoadTypes: ['REFRIGERATED'], notes: 'Temperature controlled bay' },
      { dockNumber: 'DOCK-03', name: 'Receiving Dock 3 (Express High Priority)', status: 'AVAILABLE', suitableLoadTypes: ['DRY_VAN', 'HAZMAT'], notes: 'Direct access to high-bay rack' },
      { dockNumber: 'DOCK-04', name: 'Receiving Dock 4 (Heavy Cargo)', status: 'MAINTENANCE', suitableLoadTypes: ['FLATBED', 'DRY_VAN'], notes: 'Hydraulic lift under repair' }
    ]);
    console.log(`Created ${docks.length} Yard Docks.`);

    // -------------------------------------------------------------
    // SCENARIO 1: SUCCESSFUL END-TO-END FLOW (PO-1001)
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
      status: 'RECEIVED'
    });

    const shp1 = await Shipment.create({
      shipmentNumber: 'SHP-1001',
      poNumber: 'PO-1001',
      supplierName: suppliers[0].name,
      origin: 'Apex Mfg Plant - Dallas, TX',
      destination: 'CogniYard Logistics Center - Bay 3',
      carrier: 'Apex Freight Corp',
      status: 'DELIVERED',
      estimatedArrival: '10:30 AM'
    });

    const truck1 = await Truck.create({
      truckId: 'TRK-9001',
      trailerId: 'TRL-4481',
      shipmentId: shp1.shipmentNumber,
      poNumber: 'PO-1001',
      driverName: 'John Miller',
      driverPhone: '+1-555-9012',
      latitude: 12.9716, // Yard Location
      longitude: 77.5946,
      status: 'UNLOADING',
      eta: '10:30 AM',
      priority: 'HIGH',
      appointmentTime: '10:30 AM',
      loadType: 'DRY_VAN',
      yardLocation: 'Zone A - Dock 03',
      assignedDock: 'DOCK-03'
    });

    const asn1 = await ASN.create({
      asnNumber: 'ASN-1001',
      poNumber: 'PO-1001',
      shipmentId: shp1.shipmentNumber,
      supplierName: suppliers[0].name,
      items: [{ productName: products[0].name, quantity: 500, lotNumber: 'LOT-2026-H1' }],
      status: 'RECEIVED'
    });

    const gr1 = await GoodsReceipt.create({
      receiptNumber: 'GR-1001',
      poNumber: 'PO-1001',
      asnNumber: asn1.asnNumber,
      receivedBy: 'Marcus Brody',
      items: [{ productName: products[0].name, orderedQuantity: 500, receivedQuantity: 500, damagedQuantity: 0, acceptedQuantity: 500 }],
      remarks: 'All 500 units inspected and verified intact.'
    });

    await Inventory.create({
      product: products[0]._id,
      sku: products[0].sku,
      productName: products[0].name,
      warehouseLocation: 'Aisle A-01 (High-Bay)',
      quantityOnHand: 750,
      availableQuantity: 750
    });

    const inv1 = await Invoice.create({
      invoiceNumber: 'INV-8801',
      supplierName: suppliers[0].name,
      poNumber: 'PO-1001',
      items: [{ productName: products[0].name, quantity: 500, unitPrice: 45.00, totalPrice: 22500.00 }],
      totalAmount: 22500.00,
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      matchStatus: 'MATCHED',
      ocrData: { matched: true, reasons: [] },
      notes: '3-Way Match Passed cleanly (PO: 500, Receipt: 500, Invoice: 500).'
    });

    await Payment.create({
      paymentNumber: 'PAY-3001',
      invoiceId: inv1._id,
      invoiceNumber: inv1.invoiceNumber,
      poNumber: 'PO-1001',
      supplierName: suppliers[0].name,
      amount: 22500.00,
      matchStatus: 'MATCHED',
      paymentStatus: 'PAID',
      paymentDate: new Date(),
      transactionId: 'TXN-99882211'
    });

    // -------------------------------------------------------------
    // SCENARIO 2: EXCEPTION SCENARIO - QUANTITY MISMATCH (PO-1002)
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

    const inv2 = await Invoice.create({
      invoiceNumber: 'INV-8802',
      supplierName: suppliers[0].name,
      poNumber: 'PO-1002',
      items: [{ productName: products[1].name, quantity: 500, unitPrice: 18.50, totalPrice: 9250.00 }],
      totalAmount: 9250.00,
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      matchStatus: 'MISMATCH',
      ocrData: {
        matched: false,
        reasons: ['Quantity Mismatch: Received/Accepted 440 units, but Invoice billed for 500 units (PO was 500 units).']
      },
      notes: 'Billed full amount $9250 despite receiving only 440 accepted units.'
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

    // Additional active delayed truck for demo
    await Truck.create({
      truckId: 'TRK-9003',
      trailerId: 'TRL-9920',
      shipmentId: 'SHP-1003',
      poNumber: 'PO-1003',
      driverName: 'Samira Khan',
      driverPhone: '+1-555-4422',
      latitude: 12.9500,
      longitude: 77.5700,
      status: 'DELAYED',
      eta: '04:45 PM (Delayed +2h)',
      priority: 'URGENT',
      appointmentTime: '02:30 PM',
      loadType: 'FLATBED',
      yardLocation: 'Highway Interstate 40'
    });

    await AuditLog.create({
      user: 'System Seed Engine',
      role: 'admin',
      action: 'SEED_DATABASE',
      entity: 'System',
      details: 'Populated CogniYard database with synthetic P2P and Yard Logistics datasets.'
    });

    console.log('✅ Database seeded successfully with synthetic SCM data!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
