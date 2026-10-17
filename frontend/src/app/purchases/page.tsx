'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconBook,
  IconCheck,
  IconBox,
  IconTrendUp,
  IconAlertTriangle,
  IconX,
} from '../../components/ui/icons';

interface PurchaseRecord {
  id: string;
  invoiceNo: string;
  supplierName: string;
  supplierPhone: string;
  productName: string;
  category: string;
  sku: string;
  quantity: number;
  unit: string;
  costPrice: number;
  totalCost: number;
  expiryDate: string;
  paymentStatus: 'PAID' | 'CREDIT' | 'PENDING';
  date: string;
}

interface VendorItem {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
}

const DEFAULT_VENDORS: VendorItem[] = [
  {
    _id: 'v-amul',
    name: 'Amul Dairy Wholesalers Ltd',
    phone: '+91 98111 22334',
    email: 'orders@amulwholesalers.in',
    category: 'Dairy',
  },
  {
    _id: 'v-motherdairy',
    name: 'Mother Dairy Distribution Hub',
    phone: '+91 98222 33445',
    email: 'supply@motherdairyhub.in',
    category: 'Dairy',
  },
  {
    _id: 'v-britannia',
    name: 'Britannia Foods Depot',
    phone: '+91 98333 44556',
    email: 'dispatch@britannia-depot.com',
    category: 'Bakery & Snacks',
  },
  {
    _id: 'v-hindustan',
    name: 'Hindustan Beverages Agency',
    phone: '+91 98444 55667',
    email: 'sales@hindustanbeverages.in',
    category: 'Beverages',
  },
  {
    _id: 'v-nestle',
    name: 'Nestle India Supply Depot',
    phone: '+91 98555 66778',
    email: 'orders@nestle-supply.com',
    category: 'Groceries & Confectionery',
  },
  {
    _id: 'v-safal',
    name: 'Safal Fresh & Frozen Produce Agency',
    phone: '+91 98666 77889',
    email: 'produce@safalfoods.org',
    category: 'Frozen Foods & Produce',
  },
];

const DEFAULT_PURCHASES: PurchaseRecord[] = [
  {
    id: 'PUR-001',
    invoiceNo: 'SUP-INV-8492',
    supplierName: 'Amul Dairy Wholesalers Ltd',
    supplierPhone: '+91 98111 22334',
    productName: 'Amul Taaza Fresh Toned Milk 500ml',
    category: 'Dairy',
    sku: 'DAIRY-MILK-001',
    quantity: 50,
    unit: 'pouch',
    costPrice: 24,
    totalCost: 1200,
    expiryDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    paymentStatus: 'PAID',
    date: 'Today, 09:30 AM',
  },
  {
    id: 'PUR-002',
    invoiceNo: 'SUP-INV-8490',
    supplierName: 'Mother Dairy Distribution Hub',
    supplierPhone: '+91 98222 33445',
    productName: 'Mother Dairy Classic Curd 400g',
    category: 'Dairy',
    sku: 'DAIRY-CURD-002',
    quantity: 30,
    unit: 'tub',
    costPrice: 32,
    totalCost: 960,
    expiryDate: new Date(Date.now() + 6 * 86400000).toISOString(),
    paymentStatus: 'PAID',
    date: 'Yesterday, 04:15 PM',
  },
  {
    id: 'PUR-003',
    invoiceNo: 'SUP-INV-8321',
    supplierName: 'Britannia Foods Depot',
    supplierPhone: '+91 98333 44556',
    productName: 'Britannia Whole Wheat Bread 400g',
    category: 'Bakery',
    sku: 'BAKE-BRD-001',
    quantity: 40,
    unit: 'loaf',
    costPrice: 35,
    totalCost: 1400,
    expiryDate: new Date(Date.now() + 4 * 86400000).toISOString(),
    paymentStatus: 'CREDIT',
    date: '12 Oct 2026',
  },
  {
    id: 'PUR-004',
    invoiceNo: 'SUP-INV-8219',
    supplierName: 'Hindustan Beverages Agency',
    supplierPhone: '+91 98444 55667',
    productName: 'Coca-Cola 750ml PET Bottle',
    category: 'Beverages',
    sku: 'BEV-SODA-001',
    quantity: 60,
    unit: 'bottle',
    costPrice: 32,
    totalCost: 1920,
    expiryDate: new Date(Date.now() + 150 * 86400000).toISOString(),
    paymentStatus: 'PAID',
    date: '10 Oct 2026',
  },
];

export default function PurchasesPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(DEFAULT_PURCHASES);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Vendor list state
  const [vendors, setVendors] = useState<VendorItem[]>(DEFAULT_VENDORS);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  // Category state
  const [categories, setCategories] = useState<string[]>([
    'Dairy',
    'Bakery',
    'Beverages',
    'Snacks',
    'Groceries',
    'Frozen Foods',
    'Sweets & Confectionery',
    'Personal Care',
  ]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Form Fields - Blank by default
  const [supplierInvoice, setSupplierInvoice] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [expiryDays, setExpiryDays] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'CREDIT' | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Modal 1: Add New Vendor Modal
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorCategory, setNewVendorCategory] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);

  // Modal 2: Add New Category Modal
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryKinds, setNewCategoryKinds] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Modal 3: Quick Add Product under selected category
  const [showQuickAddProductModal, setShowQuickAddProductModal] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductSku, setQuickProductSku] = useState('');
  const [quickProductPurchasePrice, setQuickProductPurchasePrice] = useState('');
  const [quickProductSellingPrice, setQuickProductSellingPrice] = useState('');
  const [quickProductUnit, setQuickProductUnit] = useState('pcs');
  const [creatingProduct, setCreatingProduct] = useState(false);

  const loadVendors = async () => {
    try {
      const res = await api.vendors.getAll();
      if (res.success && res.data && res.data.length) {
        setVendors(res.data);
      }
    } catch (e) {
      console.warn('Backend vendors notice:', e);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.categories.getAll();
      if (res.success && res.data && res.data.length) {
        const names = res.data.map((c: any) => c.name);
        setCategories((prev) => Array.from(new Set([...names, ...prev])));
      }
    } catch (e) {
      console.warn('Backend categories notice:', e);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.products.getAll({ limit: 150 });
      if (res.success && res.data) {
        setProducts(res.data);
        if (res.categories && res.categories.length) {
          setCategories((prev) => Array.from(new Set([...prev, ...res.categories])));
        }
      }
    } catch (e) {
      console.warn('Backend load notice:', e);
    }
  };

  useEffect(() => {
    loadVendors();
    loadCategories();
    loadProducts();
  }, []);

  // Filter products by selected category
  const productsInCategory = React.useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter(
      (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [products, selectedCategory]);

  // Handle vendor dropdown change
  const handleVendorSelect = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    const vendor = vendors.find((v) => v._id === vendorId);
    if (vendor) {
      setSupplierName(vendor.name);
      setSupplierPhone(vendor.phone || '');
    } else {
      setSupplierName('');
      setSupplierPhone('');
    }
  };

  // Handle category change
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    // Reset product selection when category changes
    setSelectedProductId('');
    setCostPrice('');
  };

  // Handle product dropdown change
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) {
      setCostPrice('');
      return;
    }
    const prod = products.find((p) => p._id === prodId);
    if (prod && prod.purchasePrice) {
      setCostPrice(String(prod.purchasePrice));
    }
  };

  // Create new vendor handler
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    setAddingVendor(true);
    try {
      const payload = {
        name: newVendorName.trim(),
        phone: newVendorPhone.trim(),
        email: newVendorEmail.trim(),
        category: newVendorCategory.trim() || selectedCategory || '',
      };
      const res = await api.vendors.create(payload);
      const created = res.data || {
        _id: `v-${Date.now()}`,
        ...payload,
      };

      setVendors((prev) => [...prev.filter((v) => v.name.toLowerCase() !== created.name.toLowerCase()), created]);
      setSelectedVendorId(created._id);
      setSupplierName(created.name);
      setSupplierPhone(created.phone || '');

      setNewVendorName('');
      setNewVendorPhone('');
      setNewVendorEmail('');
      setNewVendorCategory('');
      setShowAddVendorModal(false);
      setSuccessMsg(`Vendor "${created.name}" added and selected!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to add vendor');
    } finally {
      setAddingVendor(false);
    }
  };

  // Create new category handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const catName = newCategoryName.trim();
    setAddingCategory(true);
    try {
      const kindsArray = newCategoryKinds
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      await api.categories.create({
        name: catName,
        kinds: kindsArray,
      });

      setCategories((prev) => Array.from(new Set([catName, ...prev])));
      setSelectedCategory(catName);
      setSelectedProductId('');
      setCostPrice('');

      setNewCategoryName('');
      setNewCategoryKinds('');
      setShowAddCategoryModal(false);
      setSuccessMsg(`Category "${catName}" added! Now select or inward products for it.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to add category');
    } finally {
      setAddingCategory(false);
    }
  };

  // Quick add product handler under selected category
  const handleQuickAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductName.trim() || !selectedCategory) return;
    setCreatingProduct(true);
    try {
      const catCode = selectedCategory.slice(0, 4).toUpperCase();
      const nameCode = quickProductName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
      const generatedSku = quickProductSku.trim().toUpperCase() || `${catCode}-${nameCode}-${Math.floor(100 + Math.random() * 900)}`;
      const pPrice = parseFloat(quickProductPurchasePrice) || 0;
      const sPrice = parseFloat(quickProductSellingPrice) || pPrice * 1.25;

      const payload = {
        sku: generatedSku,
        name: quickProductName.trim(),
        category: selectedCategory,
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        availableStock: 0,
        reorderLevel: 5,
        unit: quickProductUnit || 'pcs',
      };

      const res = await api.products.create(payload);
      const createdProd = res.data;

      // Update product list and auto-select this product for purchasing
      setProducts((prev) => [createdProd, ...prev]);
      setSelectedProductId(createdProd._id);
      setCostPrice(String(pPrice));

      setQuickProductName('');
      setQuickProductSku('');
      setQuickProductPurchasePrice('');
      setQuickProductSellingPrice('');
      setShowQuickAddProductModal(false);
      setSuccessMsg(`Product "${createdProd.name}" added to ${selectedCategory} and selected for purchase inward!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('Please select or add a supplier/vendor.');
      return;
    }
    if (!selectedCategory) {
      alert('Please choose the product category first.');
      return;
    }
    if (!selectedProductId) {
      alert('Please select a product from the list to inward.');
      return;
    }
    const qty = parseInt(quantity, 10);
    const rate = parseFloat(costPrice);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }
    setSubmitting(true);

    const selectedProd = products.find((p) => p._id === selectedProductId) || {
      name: 'Item',
      sku: 'SKU',
      unit: 'pcs',
      category: selectedCategory,
    };

    // Record adjustment via API if online
    try {
      await api.inventory.adjust({
        productId: selectedProductId,
        type: 'RECEIVED',
        quantity: qty,
        reason: `Supplier Inward from ${supplierName} (Bill #${supplierInvoice})`,
        referenceId: supplierInvoice,
      });
      // Refresh products to show updated stock counts
      loadProducts();
    } catch (err) {
      console.warn('API sync warning:', err);
    }

    const newPurchase: PurchaseRecord = {
      id: `PUR-${Date.now().toString().slice(-4)}`,
      invoiceNo: supplierInvoice || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone || '+91 98' + Math.floor(10000000 + Math.random() * 90000000),
      productName: selectedProd.name,
      category: selectedCategory,
      sku: selectedProd.sku,
      quantity: qty,
      unit: selectedProd.unit || 'pcs',
      costPrice: rate,
      totalCost: qty * rate,
      expiryDate: new Date(Date.now() + (parseInt(expiryDays) || 7) * 86400000).toISOString(),
      paymentStatus: (paymentStatus || 'PAID') as 'PAID' | 'CREDIT' | 'PENDING',
      date: 'Just Now',
    };

    setPurchases((prev) => [newPurchase, ...prev]);
    setSuccessMsg(`Successfully received ${qty} ${selectedProd.unit || 'units'} of "${selectedProd.name}" from ${supplierName}!`);
    setTimeout(() => setSuccessMsg(null), 4500);

    // Reset Form fields
    setSelectedProductId('');
    setQuantity('');
    setCostPrice('');
    setExpiryDays('');
    setSubmitting(false);
  };

  const formatCurrency = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const totalUnitsReceived = purchases.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Purchaser Portal — Supplier Stock Inward"
        subtitle="Buy goods from suppliers, choose category first, select products from list, and manage vendors"
      />

      <div className="purchases-page-container" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Navigation Breadcrumb / Role Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-secondary)',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
              }}
            >
              Purchaser Inward Role
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Record goods received from distributors, vendors & suppliers with category and vendor selection
            </span>
          </div>

          <Link
            href="/sales"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--accent)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Switch to Seller (POS Billing) ➔
          </Link>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success)',
              color: 'var(--color-success)',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <IconCheck size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Top Purchaser KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div
            className="card"
            style={{
              padding: '18px 20px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Purchases (Inward)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px' }}>
              {formatCurrency(totalPurchaseValue)}
            </div>
            <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>
              {purchases.length} supplier orders received
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '18px 20px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Units Inwarded
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px' }}>
              {totalUnitsReceived} units
            </div>
            <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
              Stock added directly to store shelves
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '18px 20px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Active Verified Vendors
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px' }}>
              {vendors.length} Vendors
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Click + to add new suppliers & distributors
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Inward Entry Form & Inward Purchase Register */}
        <div className="purchases-split-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
          {/* Purchaser Form: Receive Stock Inward */}
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPlus size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  New Stock Inward (Purchaser Entry)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Choose vendor, select category first, and pick product from list
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPurchase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. VENDOR SELECTION WITH + BUTTON (User requirement) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    1. Supplier / Vendor *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddVendorModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <IconPlus size={13} />
                    <span>+ New Vendor</span>
                  </button>
                </div>

                <select
                  value={selectedVendorId}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="">-- Choose Vendor from List (or click + to add new) --</option>
                  {vendors.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} {v.phone ? `(${v.phone})` : ''} {v.category ? `• ${v.category}` : ''}
                    </option>
                  ))}
                </select>

                {supplierName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', padding: '2px 4px' }}>
                    <span>Selected: <strong>{supplierName}</strong></span>
                    {supplierPhone && <span>Phone: {supplierPhone}</span>}
                  </div>
                )}
              </div>

              {/* 2. PRODUCT CATEGORY SELECTION FIRST WITH + BUTTON (User requirement) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    2. Product Category * (Choose First)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: 'rgba(5, 150, 105, 0.12)',
                      border: '1px solid var(--accent)',
                      borderRadius: '6px',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <IconPlus size={13} />
                    <span>+ New Category</span>
                  </button>
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="">-- Select Product Category (e.g. Dairy, Bakery, Food...) --</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {selectedCategory && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 4px' }}>
                    {productsInCategory.length} products found in <strong>{selectedCategory}</strong>
                  </div>
                )}
              </div>

              {/* 3. PRODUCT NAME CHOSEN FROM LIST (User requirement) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    3. Choose Product Name from List *
                  </label>
                  {selectedCategory && (
                    <button
                      type="button"
                      onClick={() => setShowQuickAddProductModal(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <IconPlus size={11} />
                      <span>+ Inward New Item</span>
                    </button>
                  )}
                </div>

                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  disabled={!selectedCategory}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: selectedCategory ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: selectedCategory ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="">
                    {!selectedCategory
                      ? '← Please choose product category in Step 2 first'
                      : productsInCategory.length === 0
                      ? `-- No products in "${selectedCategory}" yet. Click + Inward New Item above --`
                      : `-- Select Product under ${selectedCategory} --`}
                  </option>
                  {productsInCategory.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Current Stock: {p.availableStock} {p.unit || 'pcs'} • Buy Rate: ₹{p.purchasePrice || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. BILL INVOICE & PAYMENT STATUS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Supplier Bill / Invoice #
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierInvoice}
                    onChange={(e) => setSupplierInvoice(e.target.value)}
                    placeholder="e.g. SUP-2974"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">Select Payment Status...</option>
                    <option value="PAID">PAID (Cash / UPI / Bank)</option>
                    <option value="CREDIT">CREDIT (Pay Later)</option>
                  </select>
                </div>
              </div>

              {/* 5. QUANTITY & RATE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Quantity Inwarded
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 25"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Purchase Cost Rate (₹/unit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="e.g. 45.00"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* 6. EXPIRY DAYS */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Shelf Life / Expiry in Days
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="e.g. 7"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Total Calculation summary */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Inward Bill Amount:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatCurrency((parseInt(quantity) || 0) * (parseFloat(costPrice) || 0))}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '13px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <IconCheck size={18} />
                {submitting ? 'Adding Stock...' : 'Confirm Stock Inward & Add to Inventory'}
              </button>
            </form>
          </div>

          {/* Purchaser Log: Inward Purchase Bills */}
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Supplier Purchase Bills (Inward Register)
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                History of stock purchased and inwarded by the store purchaser
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '550px' }}>
              {purchases.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {p.supplierName}
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: p.paymentStatus === 'PAID' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                        color: p.paymentStatus === 'PAID' ? 'var(--color-success)' : 'var(--color-warning)',
                        border: `1px solid ${p.paymentStatus === 'PAID' ? 'var(--color-success)' : 'var(--color-warning)'}`,
                      }}
                    >
                      {p.paymentStatus}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>
                      {p.productName} × <strong>{p.quantity} {p.unit}</strong>
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                      {formatCurrency(p.totalCost)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '2px' }}>
                    <span>Category: <strong style={{ color: 'var(--text-secondary)' }}>{p.category || 'General'}</strong> • Bill: {p.invoiceNo}</span>
                    <span>{p.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD NEW VENDOR MODAL */}
      {showAddVendorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 120,
          }}
        >
          <div
            className="card card--glass"
            style={{
              width: '100%',
              maxWidth: '480px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              padding: '24px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  + Add New Supplier / Vendor
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Register a distributor or vendor from whom you purchase goods
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Vendor / Company Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="e.g. Parle Agro Wholesalers Ltd"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVendorPhone}
                    onChange={(e) => setNewVendorPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={newVendorEmail}
                    onChange={(e) => setNewVendorEmail(e.target.value)}
                    placeholder="orders@vendor.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Category Supplied (Optional)
                </label>
                <input
                  type="text"
                  value={newVendorCategory}
                  onChange={(e) => setNewVendorCategory(e.target.value)}
                  placeholder="e.g. Dairy, Bakery, Beverages"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  style={{
                    padding: '9px 15px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVendor}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: addingVendor ? 'not-allowed' : 'pointer',
                  }}
                >
                  {addingVendor ? 'Saving...' : 'Save & Select Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 120,
          }}
        >
          <div
            className="card card--glass"
            style={{
              width: '100%',
              maxWidth: '460px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              padding: '24px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  + Add New Category
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Create a new category of food or goods for inward purchasing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Frozen Food, Organic Produce, Fast Food"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Subcategory Kinds (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  value={newCategoryKinds}
                  onChange={(e) => setNewCategoryKinds(e.target.value)}
                  placeholder="e.g. French Fries, Frozen Peas, Nuggets"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Quick Preset Chips */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Suggested Categories:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['Frozen Food', 'Organic Produce', 'Sweets & Desserts', 'Canned Goods', 'Meat & Seafood'].map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setNewCategoryName(cat)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      + {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  style={{
                    padding: '9px 15px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCategory}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: addingCategory ? 'not-allowed' : 'pointer',
                  }}
                >
                  {addingCategory ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK ADD PRODUCT UNDER SELECTED CATEGORY */}
      {showQuickAddProductModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 120,
          }}
        >
          <div
            className="card card--glass"
            style={{
              width: '100%',
              maxWidth: '480px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              padding: '24px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  + Inward New Item to "{selectedCategory}"
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Define product to receive under category {selectedCategory}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddProductModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickProductName}
                  onChange={(e) => setQuickProductName(e.target.value)}
                  placeholder="e.g. McCain French Fries 450g"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Purchase Cost Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickProductPurchasePrice}
                    onChange={(e) => setQuickProductPurchasePrice(e.target.value)}
                    placeholder="e.g. 75"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Selling Retail Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickProductSellingPrice}
                    onChange={(e) => setQuickProductSellingPrice(e.target.value)}
                    placeholder="e.g. 95"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Unit of Measure
                  </label>
                  <select
                    value={quickProductUnit}
                    onChange={(e) => setQuickProductUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="pack">pack (Pack)</option>
                    <option value="pouch">pouch (Pouch)</option>
                    <option value="bottle">bottle (Bottle)</option>
                    <option value="loaf">loaf (Loaf)</option>
                    <option value="tub">tub (Tub)</option>
                    <option value="kg">kg (Kilogram)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    SKU Code (Auto if empty)
                  </label>
                  <input
                    type="text"
                    value={quickProductSku}
                    onChange={(e) => setQuickProductSku(e.target.value.toUpperCase())}
                    placeholder="Auto generated"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickAddProductModal(false)}
                  style={{
                    padding: '9px 15px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: creatingProduct ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creatingProduct ? 'Creating...' : 'Save & Select Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
