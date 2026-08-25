const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: false });

const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Dock = require('../models/Dock');
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

const DATABASE_URL = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cogniyard';
const DEMO_PASSWORD = 'password123';

const demoAccounts = [
  {
    name: 'Alex Vance',
    email: 'procurement@cogniyard.com',
    role: 'procurement_manager',
    department: 'Procurement'
  },
  {
    name: 'Marcus Brody',
    email: 'warehouse@cogniyard.com',
    role: 'warehouse_manager',
    department: 'Logistics'
  },
  {
    name: 'Elena Rostova',
    email: 'finance@cogniyard.com',
    role: 'finance_user',
    department: 'Finance AP'
  },
  {
    name: 'System Admin',
    email: 'admin@cogniyard.com',
    role: 'admin',
    department: 'Executive'
  }
];

const trackedModels = [
  User,
  Product,
  Supplier,
  Dock,
  PurchaseRequisition,
  PurchaseOrder,
  Shipment,
  Truck,
  ASN,
  GoodsReceipt,
  Inventory,
  Invoice,
  Payment,
  AuditLog,
  DemandHistory
];

async function databaseIsEmpty() {
  const counts = await Promise.all(trackedModels.map(model => model.estimatedDocumentCount()));
  return counts.every(count => count === 0);
}

async function setKnownDemoPassword(user, passwordHash) {
  const passwordAlreadyWorks = user.password
    ? await bcrypt.compare(DEMO_PASSWORD, user.password)
    : false;

  if (!passwordAlreadyWorks) user.password = passwordHash;
}

async function createOrRepairDemoAccounts() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const account of demoAccounts) {
    let user = await User.findOne({ email: account.email });

    if (!user) {
      user = new User({ ...account, password: passwordHash, isActive: true });
    } else {
      user.name = account.name;
      user.role = account.role;
      user.department = account.department;
      user.isActive = true;
      await setKnownDemoPassword(user, passwordHash);
    }

    await user.save();
  }

  let supplier = await Supplier.findOne({ code: 'SUP-DEMO' });
  if (!supplier) {
    supplier = await Supplier.create({
      name: 'CogniYard Demo Supplier',
      companyName: 'CogniYard Demo Supplier',
      contactPerson: 'Demo Supplier User',
      code: 'SUP-DEMO',
      email: 'supplier@cogniyard.com',
      phone: '+1-555-0100',
      address: 'Demo Supplier Address',
      paymentTerms: 'Net 30',
      status: 'ACTIVE'
    });
  }

  let supplierUser = await User.findOne({ email: 'supplier@cogniyard.com' });
  if (!supplierUser) {
    supplierUser = new User({
      name: supplier.contactPerson || 'Demo Supplier User',
      email: 'supplier@cogniyard.com',
      password: passwordHash,
      role: 'supplier',
      department: supplier.companyName || supplier.name,
      supplier: supplier._id,
      isActive: true
    });
  } else {
    supplierUser.name = supplier.contactPerson || supplierUser.name || 'Demo Supplier User';
    supplierUser.role = 'supplier';
    supplierUser.department = supplier.companyName || supplier.name;
    supplierUser.supplier = supplier._id;
    supplierUser.isActive = true;
    await setKnownDemoPassword(supplierUser, passwordHash);
  }

  await supplierUser.save();
  supplier.userAccount = supplierUser._id;
  supplier.status = 'ACTIVE';
  await supplier.save();
}

function runFullSeedForEmptyDatabase() {
  const seedResult = spawnSync(process.execPath, [path.join(__dirname, 'seed.js')], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: 'inherit'
  });

  if (seedResult.error) throw seedResult.error;
  if (seedResult.status !== 0) {
    throw new Error(`Initial database seeding failed with exit code ${seedResult.status}.`);
  }
}

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const demoAccountsEnabled = process.env.DEMO_ACCOUNTS_ENABLED !== 'false';
  if (isProduction) {
    console.log('Demo account bootstrap skipped in production.');
    return;
  }
  if (!demoAccountsEnabled) {
    console.log('Demo account bootstrap is disabled by configuration.');
    return;
  }

  try {
    console.log('Checking CogniYard database and demo logins...');
    await mongoose.connect(DATABASE_URL, { serverSelectionTimeoutMS: 7000 });

    if (await databaseIsEmpty()) {
      console.log('Empty database detected. Creating the complete demonstration dataset...');
      await mongoose.disconnect();
      runFullSeedForEmptyDatabase();
      console.log('Demo database and login accounts are ready.');
      return;
    }

    await createOrRepairDemoAccounts();
    console.log('Demo login accounts verified. Existing application data was preserved.');
  } catch (error) {
    console.error(`Demo setup failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
}

if (require.main === module) bootstrap();

module.exports = {
  bootstrap,
  createOrRepairDemoAccounts,
  databaseIsEmpty,
  demoAccounts
};
