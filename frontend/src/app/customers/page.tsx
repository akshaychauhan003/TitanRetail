'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  IconUsers,
  IconSearch,
  IconPlus,
  IconChart,
  IconDollar,
  IconReceipt,
  IconAlertTriangle,
  IconCheckCircle,
  IconRefresh,
  IconDownload,
  IconX,
  IconEye,
  IconEdit,
  IconClock,
  IconTrendUp,
  IconUserCircle,
} from '../../components/ui/icons';

interface CustomerItem {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  totalDue: number;
  totalProfit: number;
  firstVisit?: string;
  lastVisit?: string;
  avgOrderValue?: number;
  profitMargin?: number;
  customerType?: 'REGULAR' | 'OCCASIONAL' | 'RARE';
}

interface PurchasedProductStat {
  productId: string;
  sku?: string;
  name: string;
  category: string;
  unit?: string;
  totalQuantity: number;
  totalSpent: number;
  totalProfit: number;
  orderCount: number;
}

export default function CustomersPage() {
  const { user } = useAuth();

  // Data state
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'REGULAR' | 'OCCASIONAL' | 'RARE' | 'WITH_DUE'>('ALL');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'profit' | 'due' | 'recent'>('spent');

  // Analytics summary state
  const [analyticsSummary, setAnalyticsSummary] = useState<{
    totalCustomers: number;
    regularCount: number;
    occasionalCount: number;
    rareCount: number;
    totalDueOutstanding: number;
    totalRevenue: number;
    totalProfit: number;
    avgLifetimeValue: number;
  } | null>(null);

  // Selected Customer for Deep-Dive Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Collect Due Modal State
  const [settlingCustomer, setSettlingCustomer] = useState<CustomerItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [payNote, setPayNote] = useState<string>('');
  const [settlingLoading, setSettlingLoading] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState<string | null>(null);

  // Create Customer Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    phone: '',
    name: '',
    email: '',
    address: '',
    notes: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const formatCurrency = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Fetch summary KPIs
  const loadAnalytics = async () => {
    try {
      const res = await api.customers.getAnalytics();
      if (res.success && res.summary) {
        setAnalyticsSummary(res.summary);
      }
    } catch (err: any) {
      console.error('Failed to load customer analytics:', err);
    }
  };

  // Fetch customer list
  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        sortBy,
        limit: 50,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (activeTab !== 'ALL') {
        params.type = activeTab;
      }

      const res = await api.customers.getAll(params);
      if (res.success) {
        setCustomers(res.data || []);
      } else {
        setError(res.message || 'Failed to load customers');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, sortBy]);

  // View Customer Deep Dive Details
  const handleOpenCustomerDetails = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingDetails(true);
    try {
      const res = await api.customers.getById(id);
      if (res.success && res.data) {
        setCustomerDetails(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching customer details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Settle / Pay Due
  const handleOpenSettle = (c: CustomerItem) => {
    setSettlingCustomer(c);
    setPayAmount(String(c.totalDue || ''));
    setPayMethod('Cash');
    setPayNote('');
    setSettleSuccess(null);
  };

  const handleSettleDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingCustomer) return;
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive payment amount');
      return;
    }

    setSettlingLoading(true);
    try {
      const res = await api.customers.payDue(settlingCustomer._id, {
        amount: amountNum,
        paymentMethod: payMethod,
        note: payNote,
      });

      if (res.success) {
        setSettleSuccess(`Recorded payment of ${formatCurrency(amountNum)}. Remaining due: ${formatCurrency(res.customer.totalDue)}`);
        // Refresh active list and analytics
        loadCustomers();
        loadAnalytics();
        if (selectedCustomerId === settlingCustomer._id) {
          handleOpenCustomerDetails(settlingCustomer._id);
        }
        setTimeout(() => {
          setSettlingCustomer(null);
          setSettleSuccess(null);
        }, 1500);
      } else {
        alert(res.message || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording due payment');
    } finally {
      setSettlingLoading(false);
    }
  };

  // Create new customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.phone.trim() || !newCustomer.name.trim()) {
      setCreateError('Mobile Number and Customer Name are required.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await api.customers.create(newCustomer);
      if (res.success) {
        setShowCreateModal(false);
        setNewCustomer({ phone: '', name: '', email: '', address: '', notes: '' });
        loadCustomers();
        loadAnalytics();
      } else {
        setCreateError(res.message || 'Failed to create customer');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Error creating customer');
    } finally {
      setCreateLoading(false);
    }
  };

  // Export Customer List as CSV
  const handleExportCSV = () => {
    if (customers.length === 0) return;
    const headers = ['Name', 'Phone', 'Email', 'Customer Type', 'Visits', 'Total Spent', 'Avg Order Value', 'Profit Earned', 'Profit Margin %', 'Total Due', 'Last Visit'];
    const rows = customers.map((c) => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.customerType || 'RARE'}"`,
      c.totalOrders,
      c.totalSpent,
      c.avgOrderValue || (c.totalOrders > 0 ? (c.totalSpent / c.totalOrders).toFixed(2) : 0),
      c.totalProfit || 0,
      c.profitMargin ? `${c.profitMargin}%` : '0%',
      c.totalDue || 0,
      c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : 'Never',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customers_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Loyalty Badge
  const renderLoyaltyBadge = (c: CustomerItem) => {
    const isRegular = c.totalOrders >= 3 || c.totalSpent >= 2000;
    const isOccasional = c.totalOrders === 2;

    if (isRegular) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(5, 150, 105, 0.12)',
            color: '#059669',
            border: '1px solid rgba(5, 150, 105, 0.3)',
          }}
        >
          ⭐ Regular Shopper
        </span>
      );
    }

    if (isOccasional) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(2, 132, 199, 0.1)',
            color: '#0284c7',
            border: '1px solid rgba(2, 132, 199, 0.25)',
          }}
        >
          🔄 Occasional (2 visits)
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: 'rgba(217, 119, 6, 0.1)',
          color: '#d97706',
          border: '1px solid rgba(217, 119, 6, 0.25)',
        }}
      >
        🌱 Rare Shopper (1 visit)
      </span>
    );
  };

  // Maximum quantity for relative chart bar width calculation in profile
  const maxPurchasedQty = useMemo(() => {
    if (!customerDetails?.analytics?.topPurchasedProducts?.length) return 1;
    return Math.max(...customerDetails.analytics.topPurchasedProducts.map((p: PurchasedProductStat) => p.totalQuantity), 1);
  }, [customerDetails]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <Navbar />

      <main
        className="customers-page-main"
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '1.5rem',
        }}
      >
        {/* Page Top Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'var(--accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                }}
              >
                <IconUsers size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  Customers & CRM
                </h1>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Track repeat vs rare shoppers, profit earned, avg order value, and top purchase insights
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleExportCSV}
              disabled={customers.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: customers.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <IconDownload size={16} />
              Export Report
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
              }}
            >
              <IconPlus size={16} />
              Register Customer
            </button>
          </div>
        </div>

        {/* Analytics Top KPI Cards */}
        {analyticsSummary && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem',
            }}
          >
            {/* Total Customers */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.15rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Customers
                </span>
                <span style={{ color: 'var(--accent)' }}>
                  <IconUsers size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{analyticsSummary.totalCustomers}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Registered in store database
              </div>
            </div>

            {/* Regular Customers */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(5, 150, 105, 0.3)',
                borderRadius: '12px',
                padding: '1.15rem',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase' }}>
                  ⭐ Regular Shoppers
                </span>
                <span style={{ color: '#059669' }}>
                  <IconTrendUp size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669' }}>
                {analyticsSummary.regularCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {analyticsSummary.totalCustomers > 0
                  ? `${Math.round((analyticsSummary.regularCount / analyticsSummary.totalCustomers) * 100)}% of customer base (≥3 visits)`
                  : 'High frequency shoppers'}
              </div>
            </div>

            {/* Rare Shoppers */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.15rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
                  🌱 Rare / Occasional
                </span>
                <span style={{ color: '#d97706' }}>
                  <IconClock size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>
                {analyticsSummary.rareCount + analyticsSummary.occasionalCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {analyticsSummary.rareCount} rare (1 visit) • {analyticsSummary.occasionalCount} occasional (2 visits)
              </div>
            </div>

            {/* Total Profit Earned */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.15rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Profit Earned
                </span>
                <span style={{ color: '#059669' }}>
                  <IconDollar size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669' }}>
                {formatCurrency(analyticsSummary.totalProfit)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Revenue: {formatCurrency(analyticsSummary.totalRevenue)}
              </div>
            </div>

            {/* Outstanding Due (Khata) */}
            <div
              style={{
                background: analyticsSummary.totalDueOutstanding > 0 ? 'rgba(225, 29, 72, 0.04)' : 'var(--bg-secondary)',
                border: analyticsSummary.totalDueOutstanding > 0 ? '1px solid rgba(225, 29, 72, 0.3)' : '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.15rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: analyticsSummary.totalDueOutstanding > 0 ? '#e11d48' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Pending Due (Khata)
                </span>
                <span style={{ color: analyticsSummary.totalDueOutstanding > 0 ? '#e11d48' : 'var(--text-muted)' }}>
                  <IconAlertTriangle size={18} />
                </span>
              </div>
              <div
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: analyticsSummary.totalDueOutstanding > 0 ? '#e11d48' : 'var(--text-primary)',
                }}
              >
                {formatCurrency(analyticsSummary.totalDueOutstanding)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Unpaid customer credit balances
              </div>
            </div>
          </div>
        )}

        {/* Filters, Tabs & Search Controls */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {/* Classification Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('ALL')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: activeTab === 'ALL' ? 'var(--accent)' : 'var(--border-color)',
                background: activeTab === 'ALL' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'ALL' ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              All ({analyticsSummary ? analyticsSummary.totalCustomers : customers.length})
            </button>

            <button
              onClick={() => setActiveTab('REGULAR')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: activeTab === 'REGULAR' ? '#059669' : 'var(--border-color)',
                background: activeTab === 'REGULAR' ? '#059669' : 'transparent',
                color: activeTab === 'REGULAR' ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              ⭐ Regular Shoppers {analyticsSummary ? `(${analyticsSummary.regularCount})` : ''}
            </button>

            <button
              onClick={() => setActiveTab('OCCASIONAL')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: activeTab === 'OCCASIONAL' ? '#0284c7' : 'var(--border-color)',
                background: activeTab === 'OCCASIONAL' ? '#0284c7' : 'transparent',
                color: activeTab === 'OCCASIONAL' ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              🔄 Occasional (2 visits)
            </button>

            <button
              onClick={() => setActiveTab('RARE')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: activeTab === 'RARE' ? '#d97706' : 'var(--border-color)',
                background: activeTab === 'RARE' ? '#d97706' : 'transparent',
                color: activeTab === 'RARE' ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              🌱 Rare / 1-Time {analyticsSummary ? `(${analyticsSummary.rareCount})` : ''}
            </button>

            <button
              onClick={() => setActiveTab('WITH_DUE')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: activeTab === 'WITH_DUE' ? '#e11d48' : 'var(--border-color)',
                background: activeTab === 'WITH_DUE' ? '#e11d48' : 'transparent',
                color: activeTab === 'WITH_DUE' ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              ⚠️ Pending Due
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                border: '1px solid var(--border-color)',
                minWidth: '240px',
              }}
            >
              <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                <IconSearch size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone or name..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 0,
                  }}
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="spent">Highest Spend</option>
                <option value="profit">Highest Profit</option>
                <option value="orders">Most Visits</option>
                <option value="due">Highest Due</option>
                <option value="recent">Recently Visited</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Table List */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ margin: '0 auto 0.75rem', display: 'flex', justifyContent: 'center' }}>
                <IconRefresh size={24} className="animate-spin" />
              </div>
              <div>Loading customers & analytics...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#e11d48' }}>
              <div style={{ margin: '0 auto 0.5rem', display: 'flex', justifyContent: 'center' }}>
                <IconAlertTriangle size={24} />
              </div>
              <div>{error}</div>
            </div>
          ) : customers.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ margin: '0 auto 1rem', opacity: 0.5, display: 'flex', justifyContent: 'center' }}>
                <IconUsers size={36} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                No customers found
              </div>
              <p style={{ margin: '0.5rem 0 1.5rem', fontSize: '0.875rem' }}>
                {searchQuery ? `No results matching "${searchQuery}"` : 'No customers match the active filter.'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Register First Customer
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>Mobile Number & Customer</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Loyalty Tier</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'center' }}>Visits</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Total Spent</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Avg Per Sale (AOV)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Profit Earned</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Pending Due</th>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const aov = c.avgOrderValue || (c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0);
                    const margin = c.profitMargin || (c.totalSpent > 0 ? ((c.totalProfit || 0) / c.totalSpent) * 100 : 0);

                    return (
                      <tr
                        key={c._id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Mobile Number & Customer Name */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                color: 'var(--accent)',
                                fontSize: '0.9rem',
                              }}
                            >
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                {c.phone}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {c.name}
                              </div>
                              {c.lastVisit && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  Last in store: {new Date(c.lastVisit).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Loyalty Tier */}
                        <td style={{ padding: '1rem 1rem' }}>{renderLoyaltyBadge(c)}</td>

                        {/* Total Orders / Visits */}
                        <td style={{ padding: '1rem 1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              background: 'var(--bg-tertiary)',
                            }}
                          >
                            {c.totalOrders} {c.totalOrders === 1 ? 'visit' : 'visits'}
                          </span>
                        </td>

                        {/* Total Spent */}
                        <td style={{ padding: '1rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(c.totalSpent)}
                        </td>

                        {/* Avg Amount Per Sale */}
                        <td style={{ padding: '1rem 1rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
                            {formatCurrency(aov)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Avg invoice
                          </div>
                        </td>

                        {/* Profit Earned by that Customer */}
                        <td style={{ padding: '1rem 1rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#059669' }}>
                            {formatCurrency(c.totalProfit || 0)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {margin.toFixed(1)}% margin
                          </div>
                        </td>

                        {/* Due Amount / Khata */}
                        <td style={{ padding: '1rem 1rem', textAlign: 'right' }}>
                          {c.totalDue && c.totalDue > 0 ? (
                            <div>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(225, 29, 72, 0.1)',
                                  color: '#e11d48',
                                  fontWeight: 800,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {formatCurrency(c.totalDue)}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
                              ✓ Clear
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                            {c.totalDue && c.totalDue > 0 ? (
                              <button
                                onClick={() => handleOpenSettle(c)}
                                title="Settle Outstanding Due"
                                style={{
                                  padding: '0.4rem 0.65rem',
                                  borderRadius: '6px',
                                  background: 'rgba(225, 29, 72, 0.12)',
                                  color: '#e11d48',
                                  border: '1px solid rgba(225, 29, 72, 0.3)',
                                  fontSize: '0.775rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Collect Due
                              </button>
                            ) : null}

                            <button
                              onClick={() => handleOpenCustomerDetails(c._id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <IconEye size={14} />
                              View Report
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          DEEP-DIVE CUSTOMER ANALYTICS & PROFILE MODAL
          - Shows Profit Earned, Average Amount Per Sale
          - Visual Graph & Bar Charts for "What They Purchase Most"
          - Complete Invoice History
          ========================================================================= */}
      {selectedCustomerId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedCustomerId(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              padding: '1.75rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDetails || !customerDetails ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ margin: '0 auto 1rem', display: 'flex', justifyContent: 'center' }}>
                  <IconRefresh size={28} className="animate-spin" />
                </div>
                <div>Loading customer analytics & purchase breakdown...</div>
              </div>
            ) : (
              <div>
                {/* Modal Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '1.25rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'var(--accent)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                      }}
                    >
                      {customerDetails.customer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                          {customerDetails.customer.name}
                        </h2>
                        {renderLoyaltyBadge(customerDetails.customer)}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>📱 {customerDetails.customer.phone}</span>
                        {customerDetails.customer.email && <span>✉️ {customerDetails.customer.email}</span>}
                        {customerDetails.customer.lastVisit && (
                          <span>🗓️ Last visit: {new Date(customerDetails.customer.lastVisit).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCustomerId(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '8px',
                    }}
                  >
                    <IconX size={20} />
                  </button>
                </div>

                {/* Key Metrics Grid: Profit Earned & AOV */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.75rem',
                  }}
                >
                  {/* Total Lifetime Spend */}
                  <div
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Lifetime Spend
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem' }}>
                      {formatCurrency(customerDetails.analytics.totalSpent)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Across {customerDetails.analytics.totalOrders} total visits
                    </div>
                  </div>

                  {/* Profit Earned by this Customer */}
                  <div
                    style={{
                      background: 'rgba(5, 150, 105, 0.08)',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(5, 150, 105, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                      Store Profit Earned
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
                      {formatCurrency(customerDetails.analytics.totalProfit)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.2rem' }}>
                      {customerDetails.analytics.profitMargin.toFixed(1)}% profit margin
                    </div>
                  </div>

                  {/* Average Amount Per Sale (AOV) */}
                  <div
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Avg Amount Per Sale (AOV)
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.25rem' }}>
                      {formatCurrency(customerDetails.analytics.avgOrderValue)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Mean basket size per checkout
                    </div>
                  </div>

                  {/* Outstanding Due */}
                  <div
                    style={{
                      background: customerDetails.analytics.totalDue > 0 ? 'rgba(225, 29, 72, 0.08)' : 'var(--bg-tertiary)',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: customerDetails.analytics.totalDue > 0 ? '1px solid rgba(225, 29, 72, 0.3)' : '1px solid var(--border-color)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: customerDetails.analytics.totalDue > 0 ? '#e11d48' : 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Pending Due (Khata)
                    </div>
                    <div
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: customerDetails.analytics.totalDue > 0 ? '#e11d48' : '#059669',
                        marginTop: '0.25rem',
                      }}
                    >
                      {formatCurrency(customerDetails.analytics.totalDue)}
                    </div>
                    {customerDetails.analytics.totalDue > 0 ? (
                      <button
                        onClick={() => handleOpenSettle(customerDetails.customer)}
                        style={{
                          marginTop: '0.4rem',
                          padding: '0.25rem 0.6rem',
                          background: '#e11d48',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Settle Balance
                      </button>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.2rem' }}>
                        All bills fully settled
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================================
                    WHAT THEY PURCHASE MOST: VISUAL CHARTS & GRAPHS
                    ================================================================= */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    padding: '1.25rem',
                    marginBottom: '1.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--accent)' }}>
                          <IconChart size={18} />
                        </span>
                        What They Purchase Most (Item Breakdown & Volume)
                      </h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Ranked by total quantity units purchased, sales spend, and store profit contribution
                      </p>
                    </div>
                  </div>

                  {!customerDetails.analytics.topPurchasedProducts ||
                  customerDetails.analytics.topPurchasedProducts.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No purchase history available for this customer.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {customerDetails.analytics.topPurchasedProducts.map((prod: PurchasedProductStat, idx: number) => {
                        const percentOfMax = Math.min(100, Math.round((prod.totalQuantity / maxPurchasedQty) * 100));

                        return (
                          <div
                            key={prod.productId || idx}
                            style={{
                              background: 'var(--bg-secondary)',
                              padding: '0.85rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: idx === 0 ? 'var(--accent)' : 'var(--bg-tertiary)',
                                    color: idx === 0 ? '#fff' : 'var(--text-muted)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {idx + 1}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                  {prod.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '4px',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {prod.category}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Qty: </span>
                                  <strong style={{ color: 'var(--accent)' }}>
                                    {prod.totalQuantity} {prod.unit || 'units'}
                                  </strong>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Spent: </span>
                                  <strong>{formatCurrency(prod.totalSpent)}</strong>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Profit: </span>
                                  <strong style={{ color: '#059669' }}>{formatCurrency(prod.totalProfit)}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Visual Progress Bar Chart */}
                            <div
                              style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${percentOfMax}%`,
                                  height: '100%',
                                  background:
                                    idx === 0
                                      ? 'linear-gradient(90deg, #059669, #10b981)'
                                      : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                                  borderRadius: '9999px',
                                  transition: 'width 0.5s ease',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* =================================================================
                    INVOICES & PURCHASE TIMELINE
                    ================================================================= */}
                <div>
                  <h3 style={{ margin: '0 0 0.85rem', fontSize: '1.05rem', fontWeight: 800 }}>
                    Sales Invoices & Billing History
                  </h3>

                  {!customerDetails.invoices || customerDetails.invoices.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No past invoices recorded.
                    </div>
                  ) : (
                    <div
                      style={{
                        maxHeight: '260px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                      }}
                    >
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                        <thead>
                          <tr
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              borderBottom: '1px solid var(--border-color)',
                            }}
                          >
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>Invoice #</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Items</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Total Bill</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Paid</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Due</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Payment Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerDetails.invoices.map((inv: any) => {
                            const pStatus = inv.paymentStatus || (inv.dueAmount > 0 ? 'PARTIAL' : 'PAID');
                            return (
                              <tr
                                key={inv._id}
                                style={{
                                  borderBottom: '1px solid var(--border-color)',
                                }}
                              >
                                <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>
                                  {inv.invoiceNumber}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>
                                  {new Date(inv.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                                  {inv.items?.length || 0}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700 }}>
                                  {formatCurrency(inv.totalAmount)}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                                  {formatCurrency(inv.paidAmount ?? inv.totalAmount)}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                                  {inv.dueAmount && inv.dueAmount > 0 ? (
                                    <span style={{ color: '#e11d48', fontWeight: 700 }}>
                                      {formatCurrency(inv.dueAmount)}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>₹0.00</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      background:
                                        pStatus === 'PAID'
                                          ? 'rgba(5, 150, 105, 0.1)'
                                          : pStatus === 'PARTIAL'
                                          ? 'rgba(2, 132, 199, 0.1)'
                                          : 'rgba(225, 29, 72, 0.1)',
                                      color:
                                        pStatus === 'PAID'
                                          ? '#059669'
                                          : pStatus === 'PARTIAL'
                                          ? '#0284c7'
                                          : '#e11d48',
                                    }}
                                  >
                                    {pStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          COLLECT DUE / SETTLE KHATA MODAL
          ========================================================================= */}
      {settlingCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.5rem',
          }}
          onClick={() => setSettlingCustomer(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#e11d48' }}>
                  <IconAlertTriangle size={20} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  Collect Due / Settle Khata
                </h3>
              </div>
              <button
                onClick={() => setSettlingCustomer(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <IconX size={18} />
              </button>
            </div>

            <div
              style={{
                background: 'rgba(225, 29, 72, 0.08)',
                border: '1px solid rgba(225, 29, 72, 0.25)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e11d48' }}>
                Customer: {settlingCustomer.name} ({settlingCustomer.phone})
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.25rem', color: '#e11d48' }}>
                Outstanding Due: {formatCurrency(settlingCustomer.totalDue)}
              </div>
            </div>

            {settleSuccess ? (
              <div
                style={{
                  background: 'rgba(5, 150, 105, 0.1)',
                  color: '#059669',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <IconCheckCircle size={18} />
                {settleSuccess}
              </div>
            ) : (
              <form onSubmit={handleSettleDue}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Payment Amount to Settle (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={settlingCustomer.totalDue}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontWeight: 700,
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(settlingCustomer.totalDue))}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Full Amount (100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Math.round((settlingCustomer.totalDue / 2) * 100) / 100))}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      50% Balance
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Payment Mode
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI / QR">UPI / QR</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Note / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="e.g. Settle partial credit via GPay"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setSettlingCustomer(null)}
                    style={{
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settlingLoading}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#059669',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: settlingLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {settlingLoading ? 'Recording...' : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          REGISTER NEW CUSTOMER MODAL
          - Phone first, then Customer Name, as requested!
          ========================================================================= */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.5rem',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--accent)' }}>
                  <IconUsers size={22} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  Register New Customer
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <IconX size={18} />
              </button>
            </div>

            {createError && (
              <div
                style={{
                  background: 'rgba(225, 29, 72, 0.1)',
                  color: '#e11d48',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer}>
              {/* Mobile Number First */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Mobile Number * (Primary Identifier)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Name Second */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Address / City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sector 18, Noida"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: createLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {createLoading ? 'Saving...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
