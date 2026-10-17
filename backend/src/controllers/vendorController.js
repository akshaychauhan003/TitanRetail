const Vendor = require('../models/Vendor');

const DEFAULT_VENDORS = [
  {
    name: 'Amul Dairy Wholesalers Ltd',
    phone: '+91 98111 22334',
    email: 'orders@amulwholesalers.in',
    address: 'Warehouse Sector 18, Industrial Area',
    category: 'Dairy',
  },
  {
    name: 'Mother Dairy Distribution Hub',
    phone: '+91 98222 33445',
    email: 'supply@motherdairyhub.in',
    address: 'Plot 42, Cold Chain Logistics Park',
    category: 'Dairy',
  },
  {
    name: 'Britannia Foods Depot',
    phone: '+91 98333 44556',
    email: 'dispatch@britannia-depot.com',
    address: 'FMCG Hub, Depot Rd #4',
    category: 'Bakery & Snacks',
  },
  {
    name: 'Hindustan Beverages Agency',
    phone: '+91 98444 55667',
    email: 'sales@hindustanbeverages.in',
    address: 'Beverage Bottling Terminal, Sector 9',
    category: 'Beverages',
  },
  {
    name: 'Nestle India Supply Depot',
    phone: '+91 98555 66778',
    email: 'orders@nestle-supply.com',
    address: 'National Highway Depot, Bay 12',
    category: 'Groceries & Confectionery',
  },
  {
    name: 'Safal Fresh & Frozen Foods Agency',
    phone: '+91 98666 77889',
    email: 'produce@safalfoods.org',
    address: 'Cold Storage Wing B, Mandi Complex',
    category: 'Frozen Foods & Produce',
  },
];

/**
 * GET /api/vendors
 * Returns all active vendors (default + database)
 */
async function getVendors(req, res, next) {
  try {
    const dbVendors = await Vendor.find({ isActive: true }).sort({ name: 1 });

    const vendorMap = new Map();

    // 1. Defaults
    DEFAULT_VENDORS.forEach((v) => {
      vendorMap.set(v.name.toLowerCase(), {
        _id: `preset-${v.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        ...v,
      });
    });

    // 2. DB records override/add
    dbVendors.forEach((v) => {
      vendorMap.set(v.name.toLowerCase(), {
        _id: v._id.toString(),
        name: v.name,
        phone: v.phone || '',
        email: v.email || '',
        address: v.address || '',
        category: v.category || '',
        isActive: v.isActive,
      });
    });

    const vendorList = Array.from(vendorMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.status(200).json({
      success: true,
      count: vendorList.length,
      data: vendorList,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/vendors
 * Create a new vendor
 */
async function createVendor(req, res, next) {
  try {
    const { name, phone = '', email = '', address = '', category = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vendor name is required.',
      });
    }

    const trimmedName = name.trim();

    // Check existing
    const existing = await Vendor.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      if (phone) existing.phone = phone.trim();
      if (email) existing.email = email.trim();
      if (address) existing.address = address.trim();
      if (category) existing.category = category.trim();
      existing.isActive = true;
      await existing.save();

      return res.status(200).json({
        success: true,
        message: `Vendor "${existing.name}" already exists and was updated.`,
        data: existing,
      });
    }

    const newVendor = await Vendor.create({
      name: trimmedName,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      category: category.trim(),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: `Vendor "${newVendor.name}" added successfully.`,
      data: newVendor,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVendors,
  createVendor,
  DEFAULT_VENDORS,
};
