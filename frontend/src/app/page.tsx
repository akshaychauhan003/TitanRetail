'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Navbar } from '../components/Navbar';
import {
  IconTrendUp,
  IconBox,
  IconAlertTriangle,
  IconChart,
  IconPlus,
  IconReceipt,
  IconDownload,
  IconArrowRight,
  IconShield,
  IconBook,
  IconCheck,
} from '../components/ui/icons';

// Sample fallback products with authentic expiry tracking
const DEMO_PRODUCTS = [
  {
    _id: 'prod-001',
    sku: 'DAIRY-YOG-EX1',
    name: 'Epigamia Greek Yogurt Plain 100g',
    category: 'Dairy',
    availableStock: 14,
    purchasePrice: 28,
    sellingPrice: 40,
    unit: 'cup',
    expiryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // Expired 4d ago
  },
  {
    _id: 'prod-002',
    sku: 'BAKE-BN-EX2',
    name: 'Fresh French Baguette 250g',
    category: 'Bakery',
    availableStock: 6,
    purchasePrice: 40,
    sellingPrice: 65,
    unit: 'loaf',
    expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Expired 2d ago
  },
  {
    _id: 'prod-003',
    sku: 'DAIRY-MILK-001',
    name: 'Amul Taaza Fresh Toned Milk 500ml',
    category: 'Dairy',
    availableStock: 45,
    purchasePrice: 24,
    sellingPrice: 28,
    unit: 'pouch',
    expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day left
  },
  {
    _id: 'prod-004',
    sku: 'BAKE-BRD-001',
    name: 'Britannia Whole Wheat Bread 400g',
    category: 'Bakery',
    availableStock: 22,
    purchasePrice: 35,
    sellingPrice: 45,
    unit: 'loaf',
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days left
  },
  {
    _id: 'prod-005',
    sku: 'DAIRY-PAN-003',
    name: 'Fresh Malai Paneer 200g',
    category: 'Dairy',
    availableStock: 18,
    purchasePrice: 70,
    sellingPrice: 90,
    unit: 'pack',
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days left
  },
  {
    _id: 'prod-006',
    sku: 'DAIRY-CURD-002',
    name: 'Mother Dairy Classic Curd 400g',
    category: 'Dairy',
    availableStock: 25,
    purchasePrice: 32,
    sellingPrice: 40,
    unit: 'tub',
    expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days left
  },
  {
    _id: 'prod-007',
    sku: 'DAIRY-CHS-004',
    name: 'Amul Processed Cheese Slices 200g',
    category: 'Dairy',
    availableStock: 30,
    purchasePrice: 110,
    sellingPrice: 140,
    unit: 'pack',
    expiryDate: new Date(Date.now() + 165 * 24 * 60 * 60 * 1000).toISOString(), // 165 days
  },
  {
    _id: 'prod-008',
    sku: 'DAIRY-BUT-005',
    name: 'Amul Butter Salted 100g',
    category: 'Dairy',
    availableStock: 4,
    purchasePrice: 45,
    sellingPrice: 56,
    unit: 'pack',
    expiryDate: new Date(Date.now() + 170 * 24 * 60 * 60 * 1000).toISOString(), // 170 days left (Fresh)
  },
];

// Visual helper for category colors and icons
const getCategoryStyle = (categoryName: string) => {
  const norm = (categoryName || '').toLowerCase().trim();
  if (norm.includes('dairy')) {
    return {
      icon: '🥛',
      color: '#0284c7',
      gradient: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
      bg: 'rgba(2, 132, 199, 0.1)',
      border: 'rgba(2, 132, 199, 0.25)',
    };
  }
  if (norm.includes('bakery')) {
    return {
      icon: '🍞',
      color: '#ea580c',
      gradient: 'linear-gradient(90deg, #ea580c 0%, #fb923c 100%)',
      bg: 'rgba(234, 88, 12, 0.1)',
      border: 'rgba(234, 88, 12, 0.25)',
    };
  }
  if (norm.includes('bev')) {
    return {
      icon: '🥤',
      color: '#8b5cf6',
      gradient: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)',
      bg: 'rgba(139, 92, 246, 0.1)',
      border: 'rgba(139, 92, 246, 0.25)',
    };
  }
  if (norm.includes('snack')) {
    return {
      icon: '🍿',
      color: '#0d9488',
      gradient: 'linear-gradient(90deg, #0d9488 0%, #14b8a6 100%)',
      bg: 'rgba(13, 148, 136, 0.1)',
      border: 'rgba(13, 148, 136, 0.25)',
    };
  }
  return {
    icon: '📦',
    color: '#6366f1',
    gradient: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
    bg: 'rgba(99, 102, 241, 0.1)',
    border: 'rgba(99, 102, 241, 0.25)',
  };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>(DEMO_PRODUCTS);
  const [error, setError] = useState<string | null>(null);

  // Expiry tab filter: 'all' | 'expired' | 'soon' | 'fresh'
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'soon' | 'fresh'>('all');

  // Chart range: '7' or '14' days
  const [chartRange, setChartRange] = useState<'7' | '14'>('7');

  // Quick Add Product Modal state - Blank by default
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdDays, setNewProdDays] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, prodRes] = await Promise.all([
        api.reports.getDashboard().catch(() => null),
        api.products.getAll({ limit: 100 }).catch(() => null),
      ]);

      if (dashRes && dashRes.success) {
        setMetrics(dashRes.data);
      } else {
        // Fallback default metrics
        setMetrics({
          totalSales: 48650,
          todaySales: 6420,
          totalTransactions: 38,
          todayTransactions: 9,
          totalProfit: 14850,
          profitMargin: 30.5,
          lowStockCount: 2,
          outOfStockCount: 1,
        });
      }

      if (prodRes && prodRes.success && prodRes.data && prodRes.data.length > 0) {
        setProducts(prodRes.data);
      }
    } catch (err: any) {
      console.warn('Backend reporting connection notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute Expiry Status for products
  const productsWithExpiry = useMemo(() => {
    const now = new Date().getTime();
    return products.map((p) => {
      let expiryTime = p.expiryDate ? new Date(p.expiryDate).getTime() : now + 30 * 86400000;
      const diffMs = expiryTime - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let status: 'expired' | 'soon' | 'fresh' = 'fresh';
      let label = `Fresh (${diffDays} days)`;
      let badgeColor = 'var(--color-success)';
      let badgeBg = 'var(--color-success-bg)';

      if (diffDays <= 0) {
        status = 'expired';
        label = `Expired (${Math.abs(diffDays)}d ago)`;
        badgeColor = 'var(--color-error)';
        badgeBg = 'var(--color-error-bg)';
      } else if (diffDays <= 7) {
        status = 'soon';
        label = diffDays === 1 ? 'Expiring Tomorrow' : `Expiring in ${diffDays} days`;
        badgeColor = 'var(--color-warning)';
        badgeBg = 'var(--color-warning-bg)';
      }

      return {
        ...p,
        diffDays,
        expiryStatus: status,
        expiryLabel: label,
        badgeColor,
        badgeBg,
      };
    });
  }, [products]);

  // Freshness status counts and stock volume units
  const {
    expiredCount,
    soonCount,
    freshCount,
    expiredUnits,
    soonUnits,
    freshUnits,
    totalInventoryStock,
  } = useMemo(() => {
    let expCount = 0;
    let snCount = 0;
    let frCount = 0;
    let expUnits = 0;
    let snUnits = 0;
    let frUnits = 0;
    let totalStock = 0;

    productsWithExpiry.forEach((p) => {
      const stock = Number(p.availableStock) || 0;
      totalStock += stock;
      if (p.expiryStatus === 'expired') {
        expCount += 1;
        expUnits += stock;
      } else if (p.expiryStatus === 'soon') {
        snCount += 1;
        snUnits += stock;
      } else if (p.expiryStatus === 'fresh') {
        frCount += 1;
        frUnits += stock;
      }
    });

    return {
      expiredCount: expCount,
      soonCount: snCount,
      freshCount: frCount,
      expiredUnits: expUnits,
      soonUnits: snUnits,
      freshUnits: frUnits,
      totalInventoryStock: totalStock,
    };
  }, [productsWithExpiry]);

  // Proportional percentages
  const totalProductsCount = productsWithExpiry.length || 1;
  const freshPct = Math.round((freshCount / totalProductsCount) * 100);
  const soonPct = Math.round((soonCount / totalProductsCount) * 100);
  const expiredPct = Math.max(0, 100 - freshPct - soonPct);

  // Filtered products for Expiry Watch list
  const filteredProducts = useMemo(() => {
    if (expiryFilter === 'all') return productsWithExpiry;
    return productsWithExpiry.filter((p) => p.expiryStatus === expiryFilter);
  }, [productsWithExpiry, expiryFilter]);

  // Daily Chart Trend Data (Sales vs Purchases)
  const chartDays = chartRange === '7' ? 7 : 14;
  const trendData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      // Realistic demo sales and inward purchase data
      const baseSales = 3500 + Math.floor(Math.sin(i * 1.5) * 1200) + (i % 2 === 0 ? 800 : 0);
      const basePurchases = 2800 + Math.floor(Math.cos(i * 1.2) * 1100);
      days.push({
        label,
        sales: baseSales,
        purchases: basePurchases,
      });
    }
    return days;
  }, [chartDays]);

  const maxChartVal = useMemo(() => {
    return Math.max(...trendData.map((d) => Math.max(d.sales, d.purchases)), 5000);
  }, [trendData]);

  // Category Distribution and Volume Data
  const categories = useMemo(() => {
    const map: Record<string, { count: number; stock: number; fresh: number; soon: number; expired: number }> = {};
    let totalStock = 0;

    productsWithExpiry.forEach((p) => {
      const cat = p.category || 'General';
      if (!map[cat]) {
        map[cat] = { count: 0, stock: 0, fresh: 0, soon: 0, expired: 0 };
      }
      map[cat].count += 1;
      const stock = Number(p.availableStock) || 0;
      map[cat].stock += stock;
      totalStock += stock;

      if (p.expiryStatus === 'fresh') map[cat].fresh += 1;
      else if (p.expiryStatus === 'soon') map[cat].soon += 1;
      else if (p.expiryStatus === 'expired') map[cat].expired += 1;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        count: data.count,
        stock: data.stock,
        percentage: totalStock > 0 ? Math.round((data.stock / totalStock) * 100) : 0,
        fresh: data.fresh,
        soon: data.soon,
        expired: data.expired,
      }))
      .sort((a, b) => b.stock - a.stock);
  }, [productsWithExpiry]);

  // Handle Quick Add Product Submit
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const days = parseInt(newProdDays) || 7;
    const newProduct = {
      _id: 'prod-new-' + Date.now(),
      sku: `${(newProdCategory || 'GEN').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      name: newProdName.trim(),
      category: newProdCategory || 'General',
      availableStock: parseInt(newProdStock) || 0,
      purchasePrice: parseFloat(newProdCost) || 0,
      sellingPrice: parseFloat(newProdPrice) || 0,
      unit: 'pack',
      expiryDate: new Date(Date.now() + days * 86400000).toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);
    setAddSuccessMsg(`Successfully added "${newProduct.name}"!`);
    setTimeout(() => setAddSuccessMsg(null), 3000);
    setShowAddModal(false);
    setNewProdName('');
    setNewProdCategory('');
    setNewProdPrice('');
    setNewProdCost('');
    setNewProdStock('');
    setNewProdDays('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Store Manager Dashboard"
        subtitle={`Welcome, ${user?.name || 'Store Manager'} • TITAN Retail Operations`}
      />

      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Top Notification / Success Alert */}
        {addSuccessMsg && (
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
            <span>{addSuccessMsg}</span>
          </div>
        )}

        {/* TWO PRIMARY HUBS: SELLER & PURCHASER (CRYSTAL CLEAR) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* 1. SELLER PORTAL */}
          <Link
            href="/sales"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              border: '2px solid var(--accent)',
              borderRadius: '16px',
              textDecoration: 'none',
              boxShadow: '0 6px 20px var(--accent-glow)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="card-hover"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                🛒 SELLER / CASHIER ROLE
              </span>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconTrendUp size={22} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Seller Portal (Customer Sales)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Sell products to walk-in customers, scan barcodes, take Cash/UPI, and print customer receipts.
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: 'auto',
                paddingTop: '10px',
                color: 'var(--accent)',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              <span>Open Seller Register (POS)</span>
              <span>➔</span>
            </div>
          </Link>

          {/* 2. PURCHASER PORTAL */}
          <Link
            href="/purchases"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '16px',
              textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(59, 130, 246, 0.08)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="card-hover"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                🚚 PURCHASER / INWARD ROLE
              </span>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconBook size={22} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Purchaser Portal (Supplier Purchases)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Buy goods from distributors & suppliers, record purchase invoices, and increase warehouse stock.
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: 'auto',
                paddingTop: '10px',
                color: '#60a5fa',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              <span>Open Purchaser Inward Bill</span>
              <span>➔</span>
            </div>
          </Link>
        </div>

        {/* SECONDARY QUICK ACTIONS: Add Product & View Reports */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            className="card-hover"
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconPlus size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                + Add New Product
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Create SKU, set MRP & expiry
              </div>
            </div>
          </button>

          <Link
            href="/products"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              textDecoration: 'none',
            }}
            className="card-hover"
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconBox size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Products Catalog
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                View all inventory stock
              </div>
            </div>
          </Link>

          <Link
            href="/reports"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              textDecoration: 'none',
            }}
            className="card-hover"
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconChart size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Reports & Analytics
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Profit, sales & CSV export
              </div>
            </div>
          </Link>
        </div>

        {/* 4 Top Metric KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '18px',
          }}
        >
          {/* Card 1: Seller Revenue */}
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🛒 Seller (Customer Sales)
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconTrendUp size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px' }}>
              {loading ? '...' : formatCurrency(metrics?.totalSales || 48650)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
              Today's Sales: {formatCurrency(metrics?.todaySales || 6420)}
            </div>
          </div>

          {/* Card 2: Purchaser Inward */}
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🚚 Purchaser (Supplier Inward)
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconBook size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px' }}>
              {loading ? '...' : (metrics?.totalTransactions || 38)} Bills
            </div>
            <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>
              Goods inwarded from 4 active suppliers
            </div>
          </div>

          {/* Card 3: Net Profit */}
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📈 Net Profit & Margin
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconChart size={18} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px' }}>
              {loading ? '...' : formatCurrency(metrics?.totalProfit || 14850)}
            </div>
            <div style={{ fontSize: '12px', color: '#c084fc', fontWeight: 600 }}>
              Operating Margin: {metrics?.profitMargin || 30.5}%
            </div>
          </div>

          {/* Card 4: Expiry Alerts */}
          <div
            className="card"
            style={{
              padding: '20px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-secondary)',
              border: expiredCount > 0 ? '1px solid var(--color-error)' : '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: expiredCount > 0 ? 'var(--color-error)' : 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ⚠️ Expiry Alert Watch
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: expiredCount > 0 ? 'var(--color-error-bg)' : 'var(--color-warning-bg)',
                  color: expiredCount > 0 ? 'var(--color-error)' : 'var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconAlertTriangle size={18} />
              </div>
            </div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: expiredCount > 0 ? 'var(--color-error)' : 'var(--text-primary)',
                margin: '10px 0 4px',
              }}
            >
              {expiredCount} Expired
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600 }}>
              {soonCount} items expiring in &lt; 7 days
            </div>
          </div>
        </div>

        {/* ========================================================
            GRAPHS & CHARTS SECTION
            ======================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
          {/* Chart 1: Seller vs Purchaser Trend */}
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Seller Sales vs. Purchaser Stock Inward
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Cash collected from customer sales (Seller) vs. stock bought from suppliers (Purchaser)
                </span>
              </div>

              {/* Range Toggle */}
              <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-tertiary)', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setChartRange('7')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: chartRange === '7' ? 'var(--accent)' : 'transparent',
                    color: chartRange === '7' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setChartRange('14')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: chartRange === '14' ? 'var(--accent)' : 'transparent',
                    color: chartRange === '14' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  14 Days
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--accent)' }} />
                <span>Seller: Customer Sales (₹)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--color-info)' }} />
                <span>Purchaser: Supplier Inward (₹)</span>
              </div>
            </div>

            {/* Bar Chart Visual */}
            <div
              style={{
                height: '190px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '8px',
                paddingTop: '20px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              {trendData.map((item, index) => {
                const salesHeight = Math.max(12, Math.round((item.sales / maxChartVal) * 160));
                const purchaseHeight = Math.max(10, Math.round((item.purchases / maxChartVal) * 160));

                return (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                    title={`${item.label} — Sales: ₹${item.sales} | Purchases: ₹${item.purchases}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                      {/* Sales Bar */}
                      <div
                        style={{
                          width: '42%',
                          maxWidth: '14px',
                          height: `${salesHeight}px`,
                          backgroundColor: 'var(--accent)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.4s ease',
                        }}
                      />
                      {/* Purchases Bar */}
                      <div
                        style={{
                          width: '42%',
                          maxWidth: '14px',
                          height: `${purchaseHeight}px`,
                          backgroundColor: 'var(--color-info)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.4s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {item.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Category Breakdown & Freshness Gauge */}
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Header with Title and Volume Badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Inventory Health & Categories
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    Active
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Freshness status and stock volume by category
                </span>
              </div>

              {/* Total Stock Volume Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>●</span>
                <span>{totalInventoryStock} units</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--text-secondary)' }}>{productsWithExpiry.length} SKUs</span>
              </div>
            </div>

            {/* Freshness Status & Gauge Section */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Freshness 3-Column Stats Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                }}
              >
                {/* 🟢 Fresh Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.28)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🟢</span> Fresh
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981' }}>
                      {freshPct}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                      {freshCount}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      SKUs
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {freshUnits} units in stock
                  </span>
                </div>

                {/* 🟠 Expiring Soon Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.28)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🟠</span> Expiring Soon
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b' }}>
                      {soonPct}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                      {soonCount}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      SKUs
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {soonUnits} units in stock
                  </span>
                </div>

                {/* 🔴 Expired Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.28)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🔴</span> Expired
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444' }}>
                      {expiredPct}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>
                      {expiredCount}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      SKUs
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {expiredUnits} units expired
                  </span>
                </div>
              </div>

              {/* Segmented Freshness Bar */}
              <div
                style={{
                  height: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-elevated)',
                  display: 'flex',
                  overflow: 'hidden',
                  gap: '2px',
                  padding: '2px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
                }}
              >
                {freshPct > 0 && (
                  <div
                    style={{
                      width: `${freshPct}%`,
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                      transition: 'width 0.4s ease',
                    }}
                    title={`Fresh: ${freshCount} SKUs (${freshUnits} units - ${freshPct}%)`}
                  >
                    {freshPct >= 15 ? `${freshPct}%` : ''}
                  </div>
                )}
                {soonPct > 0 && (
                  <div
                    style={{
                      width: `${soonPct}%`,
                      background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#111b21',
                      fontSize: '10px',
                      fontWeight: 900,
                      transition: 'width 0.4s ease',
                    }}
                    title={`Expiring Soon: ${soonCount} SKUs (${soonUnits} units - ${soonPct}%)`}
                  >
                    {soonPct >= 15 ? `${soonPct}%` : ''}
                  </div>
                )}
                {expiredPct > 0 && (
                  <div
                    style={{
                      width: `${expiredPct}%`,
                      background: 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                      transition: 'width 0.4s ease',
                    }}
                    title={`Expired: ${expiredCount} SKUs (${expiredUnits} units - ${expiredPct}%)`}
                  >
                    {expiredPct >= 15 ? `${expiredPct}%` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Category Stock Volume Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                  Stock Volume by Category
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {categories.length} Categories • {totalInventoryStock} Units
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categories.map((cat) => {
                  const style = getCategoryStyle(cat.name);
                  return (
                    <div
                      key={cat.name}
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Category Label Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{style.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {cat.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: style.bg,
                              color: style.color,
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            {cat.count} SKUs
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                            {cat.stock} units
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: style.color }}>
                            ({cat.percentage}%)
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div
                        style={{
                          height: '8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-elevated)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${cat.percentage}%`,
                            background: style.gradient,
                            borderRadius: '4px',
                            boxShadow: `0 0 10px ${style.color}40`,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>

                      {/* Freshness breakdown badges for this category */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {cat.fresh > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                            {cat.fresh} Fresh
                          </span>
                        )}
                        {cat.soon > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                            {cat.soon} Expiring Soon
                          </span>
                        )}
                        {cat.expired > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            {cat.expired} Expired
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            PRODUCT EXPIRY MONITORING CENTER (With Distinct Colors)
            ======================================================== */}
        <div
          className="card"
          style={{
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Product Expiry Watch Center
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Color-coded tracking: 🔴 Expired in Red, 🟠 Expiring Soon in Amber, 🟢 Fresh in Green
              </span>
            </div>

            {/* Expiry Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setExpiryFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  backgroundColor: expiryFilter === 'all' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: expiryFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                All Products ({productsWithExpiry.length})
              </button>
              <button
                type="button"
                onClick={() => setExpiryFilter('expired')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid var(--color-error)',
                  backgroundColor: expiryFilter === 'expired' ? 'var(--color-error)' : 'var(--color-error-bg)',
                  color: expiryFilter === 'expired' ? '#ffffff' : 'var(--color-error)',
                }}
              >
                🔴 Expired ({expiredCount})
              </button>
              <button
                type="button"
                onClick={() => setExpiryFilter('soon')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid var(--color-warning)',
                  backgroundColor: expiryFilter === 'soon' ? 'var(--color-warning)' : 'var(--color-warning-bg)',
                  color: expiryFilter === 'soon' ? 'var(--text-inverse)' : 'var(--color-warning)',
                }}
              >
                🟠 Expiring Soon ({soonCount})
              </button>
              <button
                type="button"
                onClick={() => setExpiryFilter('fresh')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid var(--color-success)',
                  backgroundColor: expiryFilter === 'fresh' ? 'var(--color-success)' : 'var(--color-success-bg)',
                  color: expiryFilter === 'fresh' ? '#ffffff' : 'var(--color-success)',
                }}
              >
                🟢 Fresh Stock ({freshCount})
              </button>
            </div>
          </div>

          {/* Product Expiry Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>PRODUCT NAME</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>SKU</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>CATEGORY</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>STOCK</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>EXPIRY STATUS</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr
                    key={p._id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor:
                        p.expiryStatus === 'expired'
                          ? 'var(--color-error-bg)'
                          : p.expiryStatus === 'soon'
                          ? 'var(--color-warning-bg)'
                          : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {p.sku}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {p.category}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {p.availableStock} {p.unit || 'pcs'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: p.badgeBg,
                          color: p.badgeColor,
                          border: `1px solid ${p.badgeColor}`,
                        }}
                      >
                        {p.expiryStatus === 'expired' ? '🔴' : p.expiryStatus === 'soon' ? '🟠' : '🟢'}
                        {p.expiryLabel}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {p.expiryStatus === 'expired' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProducts((prev) => prev.filter((item) => item._id !== p._id));
                            setAddSuccessMsg(`Marked ${p.name} as disposed from store inventory.`);
                            setTimeout(() => setAddSuccessMsg(null), 3000);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-error)',
                            backgroundColor: 'transparent',
                            color: 'var(--color-error)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Dispose / Write-Off
                        </button>
                      ) : p.expiryStatus === 'soon' ? (
                        <Link
                          href="/sales"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-warning)',
                            backgroundColor: 'transparent',
                            color: 'var(--color-warning)',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-block',
                          }}
                        >
                          Clearance POS
                        </Link>
                      ) : (
                        <Link
                          href="/products"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-block',
                          }}
                        >
                          View Details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUICK ADD PRODUCT MODAL */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '30px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-muted)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconPlus size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Add Product to Store
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amul Butter Salted 100g"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select Category...</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Personal Care">Personal Care</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Available Stock
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 20"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newProdCost}
                    onChange={(e) => setNewProdCost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Shelf Life / Expiry in Days
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 7"
                  value={newProdDays}
                  onChange={(e) => setNewProdDays(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px var(--accent-glow)',
                  }}
                >
                  Save & Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
