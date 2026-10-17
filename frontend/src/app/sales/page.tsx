'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  IconSearch,
  IconPlus,
  IconMinus,
  IconTrash,
  IconReceipt,
  IconCheck,
  IconAlertTriangle,
  IconPrinter,
  IconX,
  IconHistory,
  IconDownload,
  IconUser,
  IconShield,
} from '../../components/ui/icons';

interface CartItem {
  product: any;
  quantity: number;
}

export default function SalesPOSPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Cart State - Blank by default
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<any | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Payment Options
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>('PAID');
  const [partialPercent, setPartialPercent] = useState<number>(50); // Default 50% for partial
  const [customPaidAmount, setCustomPaidAmount] = useState<string>('');

  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(5); // 5% GST default
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Checkout Status
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const formatCurrency = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Debounced Customer Auto-lookup by Mobile Number
  useEffect(() => {
    const term = customerPhone.trim();
    if (!term || term.length < 3) {
      setMatchedCustomer(null);
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingCustomer(true);
        const res = await api.customers.search(term);
        if (res.success) {
          if (res.found && res.customer) {
            setMatchedCustomer(res.customer);
            // Auto-fill customer name if empty or default
            if (!customerName || customerName === 'Walk-in Customer') {
              setCustomerName(res.customer.name);
            }
          } else {
            setMatchedCustomer(null);
          }
          setCustomerSuggestions(res.candidates || []);
        }
      } catch (err) {
        console.error('Customer lookup error:', err);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [customerPhone]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await api.products.getAll({ search, category: selectedCategory });
      if (res.success) {
        setProducts(res.data);
        if (res.categories) setCategories(res.categories);
      }
    } catch (err: any) {
      console.error('Error loading products for POS:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [search, selectedCategory]);

  const addToCart = (product: any) => {
    if (product.availableStock <= 0) {
      alert(`"${product.name}" is completely out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.availableStock) {
          alert(`Cannot add more. Available stock for "${product.name}" is ${product.availableStock}.`);
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.availableStock) {
              alert(`Maximum available stock is ${item.product.availableStock}.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountPercent(0);
    setCheckoutError(null);
  };

  // Live Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Live Payment Calculations (Paid vs Due)
  const calcPaidAmount = () => {
    if (paymentStatus === 'UNPAID') return 0;
    if (paymentStatus === 'PAID') return totalAmount;
    if (customPaidAmount !== '' && !isNaN(Number(customPaidAmount))) {
      return Math.max(0, Math.min(totalAmount, Math.round(Number(customPaidAmount) * 100) / 100));
    }
    return Math.round(totalAmount * (partialPercent / 100) * 100) / 100;
  };

  const paidAmount = calcPaidAmount();
  const dueAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
  const paymentPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  // Checkout Submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutError('Please add at least one product to the sale.');
      return;
    }

    // Client-side stock check validation
    for (const item of cart) {
      if (item.quantity > item.product.availableStock) {
        setCheckoutError(
          `Insufficient stock for "${item.product.name}". Available: ${item.product.availableStock}, in cart: ${item.quantity}.`
        );
        return;
      }
    }

    setSubmitting(true);
    setCheckoutError(null);

    try {
      const payload = {
        items: cart.map((i) => ({
          productId: i.product._id,
          quantity: i.quantity,
        })),
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim(),
        discountPercent,
        taxPercent,
        paymentMethod,
        paymentStatus,
        paidAmount,
        dueAmount,
        paymentPercent,
      };

      const res = await api.sales.create(payload);
      if (res.success && res.data) {
        setCompletedSale(res.data);
        setShowReceiptModal(true);
        clearCart();
        setCustomerPhone('');
        setCustomerName('');
        setMatchedCustomer(null);
        setCustomPaidAmount('');
        setPaymentStatus('PAID');
        loadCatalog(); // Refresh available stock levels in catalog
      } else {
        setCheckoutError(res.message || 'Sale could not be processed.');
      }
    } catch (err: any) {
      setCheckoutError(
        err.data?.message || err.message || 'Failed to complete transaction. Inventory not altered.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Seller Portal — Customer Sale & Billing (POS)"
        subtitle="Sell products to customers, record Cash / UPI / Card payments, and print customer bills"
      />

      {/* Workflow Navigation Bar: New Sale POS vs Sales History & Returns */}
      <div
        className="sales-workflow-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px 0 24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 2px 8px var(--accent-glow)',
            }}
          >
            <span>🛒 New Customer Sale (POS)</span>
          </div>

          <Link
            href="/sales-history"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <IconHistory size={16} />
            <span>Sales History & Returns</span>
          </Link>
        </div>

        <Link
          href="/reports"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <IconDownload size={14} />
          <span>Download Sales CSV Report</span>
        </Link>
      </div>

      <div
        className="sales-pos-layout"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '20px',
          padding: '24px',
          minHeight: 0,
        }}
      >
        {/* Left Side: Product Selector Catalog */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 0,
          }}
        >
          {/* Search & Category Pills */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                <IconSearch size={16} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Quick search products or SKU..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: selectedCategory === '' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  backgroundColor: selectedCategory === '' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: selectedCategory === '' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                All Products
              </button>
              {['Dairy', 'Bakery', 'Beverages', 'Snacks', 'Personal Care', 'Groceries'].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: selectedCategory === cat ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    backgroundColor: selectedCategory === cat ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div
            className="sales-product-grid"
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
              alignContent: 'start',
            }}
          >
            {loading ? (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading available catalog...
              </div>
            ) : products.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active products found.
              </div>
            ) : (
              products.map((product) => {
                const isOutOfStock = product.availableStock <= 0;
                const isLowStock = product.availableStock > 0 && product.availableStock <= product.reorderLevel;

                return (
                  <div
                    key={product._id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      border: isOutOfStock
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid var(--border-subtle)',
                      opacity: isOutOfStock ? 0.5 : 1,
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.1s ease, border-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isOutOfStock) e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isOutOfStock) e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                        }}
                      >
                        {product.sku}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: '4px 0 8px',
                          lineHeight: 1.3,
                        }}
                      >
                        {product.name}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {product.category} {product.kind ? `• ${product.kind}` : ''}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '12px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>
                        {formatCurrency(product.sellingPrice)}
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isOutOfStock ? '#ef4444' : isLowStock ? '#fbbf24' : 'var(--text-muted)',
                        }}
                      >
                        {isOutOfStock ? 'Out' : `${product.availableStock} in stock`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Invoice Billing Slip / Active Cart */}
        <div
          className="card card--glass"
          style={{
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-secondary)',
            overflow: 'hidden',
          }}
        >
          {/* Cart Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconReceipt size={18} color="var(--accent)" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Active Invoice Cart
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {cart.reduce((a, c) => a + c.quantity, 0)} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <IconTrash size={12} />
                Clear
              </button>
            )}
          </div>

          {/* Customer Inputs (Mobile Number First with Auto-fill & Repeating Customer indicator) */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              position: 'relative',
            }}
          >
            <div className="sales-customer-inputs" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr', gap: '10px' }}>
              {/* 1. Mobile Number (First) */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Mobile Number (Lookup)
                  </label>
                  {isSearchingCustomer && (
                    <span style={{ fontSize: '10px', color: 'var(--accent)' }}>Searching...</span>
                  )}
                </div>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="+91..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: `1px solid ${matchedCustomer ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && customerSuggestions.length > 0 && !matchedCustomer && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 60,
                      marginTop: '4px',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Existing Customer Suggestions
                    </div>
                    {customerSuggestions.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => {
                          setCustomerPhone(c.phone);
                          setCustomerName(c.name);
                          setMatchedCustomer(c);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '12px',
                        }}
                        className="nav-hover"
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.phone}</div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}>
                          {c.totalOrders || 1} visits
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Customer Name (Auto-filled if matched) */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Returning Customer / New Customer Information Badge */}
            {matchedCustomer ? (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-muted)',
                  border: '1px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⭐</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                    Returning Customer: {matchedCustomer.name}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    • {matchedCustomer.totalOrders || 1} previous visits • Spent {formatCurrency(matchedCustomer.totalSpent || 0)}
                  </span>
                </div>
                {matchedCustomer.totalDue > 0 && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      fontWeight: 700,
                      fontSize: '10px',
                    }}
                  >
                    ⚠️ Pending Due: {formatCurrency(matchedCustomer.totalDue)}
                  </span>
                )}
              </div>
            ) : customerPhone.trim().length >= 4 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✨</span> New Customer — Name & Mobile will be registered automatically upon sale
              </div>
            ) : null}
          </div>

          {/* Checkout Error Message */}
          {checkoutError && (
            <div
              style={{
                margin: '12px 20px 0',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <IconAlertTriangle size={16} />
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Cart Items List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {cart.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  gap: '8px',
                }}
              >
                <IconReceipt size={32} />
                <span style={{ fontSize: '13px' }}>Cart is empty. Select products from the catalog.</span>
              </div>
            ) : (
              cart.map(({ product, quantity }) => (
                <div
                  key={product._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {product.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatCurrency(product.sellingPrice)} each • Stock: {product.availableStock}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 12px' }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product._id, -1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconMinus size={12} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product._id, 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconPlus size={12} />
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div style={{ textAlign: 'right', minWidth: '70px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)' }}>
                      {formatCurrency(product.sellingPrice * quantity)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(product._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: 0,
                        marginTop: '2px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Billing Breakdown & Payment Controls */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Discount, Tax & Payment Method Bar */}
            <div className="sales-discount-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  GST / Tax (%)
                </label>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value={0}>0% (Tax-Free)</option>
                  <option value={5}>5% (Essential Retail)</option>
                  <option value={12}>12% (Standard)</option>
                  <option value={18}>18% (General)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Credit">Store Credit</option>
                </select>
              </div>
            </div>

            {/* Payment Status (Full / Partial with % / Unpaid) & Mode */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Payment Option
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: paymentStatus === 'PAID' ? '#10b981' : paymentStatus === 'PARTIAL' ? '#fbbf24' : '#f87171' }}>
                  {paymentStatus === 'PAID' ? 'Fully Paid' : paymentStatus === 'PARTIAL' ? `Partial (${partialPercent}%)` : 'Unpaid (100% Credit Due)'}
                </span>
              </div>

              {/* 3 Payment Status Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PAID')}
                  style={{
                    padding: '7px 6px',
                    borderRadius: '6px',
                    border: paymentStatus === 'PAID' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    backgroundColor: paymentStatus === 'PAID' ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: paymentStatus === 'PAID' ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ✅ Paid (100%)
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStatus('PARTIAL')}
                  style={{
                    padding: '7px 6px',
                    borderRadius: '6px',
                    border: paymentStatus === 'PARTIAL' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                    backgroundColor: paymentStatus === 'PARTIAL' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-tertiary)',
                    color: paymentStatus === 'PARTIAL' ? '#fbbf24' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ⚖️ Partial %
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStatus('UNPAID')}
                  style={{
                    padding: '7px 6px',
                    borderRadius: '6px',
                    border: paymentStatus === 'UNPAID' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                    backgroundColor: paymentStatus === 'UNPAID' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-tertiary)',
                    color: paymentStatus === 'UNPAID' ? '#f87171' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ⏳ Unpaid / Credit
                </button>
              </div>

              {/* Partial Payment Percentage Presets & Controls */}
              {paymentStatus === 'PARTIAL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick %:</span>
                    {[25, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setPartialPercent(pct);
                          setCustomPaidAmount('');
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: partialPercent === pct && customPaidAmount === '' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                          backgroundColor: partialPercent === pct && customPaidAmount === '' ? '#f59e0b' : 'var(--bg-tertiary)',
                          color: partialPercent === pct && customPaidAmount === '' ? '#ffffff' : 'var(--text-primary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max={totalAmount}
                        placeholder="Custom ₹ paid"
                        value={customPaidAmount}
                        onChange={(e) => setCustomPaidAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Discount ({discountPercent}%):</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {taxPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Tax ({taxPercent}%):</span>
                  <span>+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span>Total Amount:</span>
                <span style={{ color: 'var(--accent)' }}>{formatCurrency(totalAmount)}</span>
              </div>

              {/* Paid vs Due Amount live preview */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: paymentStatus === 'PAID' ? 'var(--accent-muted)' : paymentStatus === 'PARTIAL' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginTop: '2px',
                }}
              >
                <div style={{ color: paymentStatus === 'PAID' ? 'var(--accent)' : paymentStatus === 'PARTIAL' ? '#fbbf24' : '#f87171' }}>
                  Paid: {formatCurrency(paidAmount)} ({paymentPercent}%)
                </div>
                {dueAmount > 0 && (
                  <div style={{ color: '#ef4444' }}>
                    Due / Credit: {formatCurrency(dueAmount)}
                  </div>
                )}
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={handleCheckout}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 800,
                cursor: submitting || cart.length === 0 ? 'not-allowed' : 'pointer',
                opacity: submitting || cart.length === 0 ? 0.6 : 1,
                boxShadow: '0 4px 14px var(--accent-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <IconCheck size={18} />
              {submitting ? 'Validating Stock & Processing...' : `Complete Sale • ${formatCurrency(totalAmount)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal / Thermal Receipt View */}
      {showReceiptModal && completedSale && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
          }}
        >
          <div
            className="card card--glass modal-receipt-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '20px 18px',
              backgroundColor: '#ffffff',
              color: '#111827',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              boxSizing: 'border-box',
            }}
          >
            {/* Receipt Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #d1d5db', paddingBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.05em' }}>
                TITAN RETAIL STORE
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0' }}>
                Official Sales Invoice & Tax Receipt
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#00a884', marginTop: '6px' }}>
                {completedSale.invoiceNumber}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {new Date(completedSale.createdAt).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Customer & Cashier info */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px dashed #d1d5db',
                fontSize: '11px',
                color: '#4b5563',
              }}
            >
              <div>
                <strong>Customer:</strong> {completedSale.customerName}
                {completedSale.customerPhone && ` (${completedSale.customerPhone})`}
              </div>
              <div>
                <strong>Cashier:</strong> {completedSale.cashierName || user?.name || 'Staff'}
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ padding: '12px 0', borderBottom: '1px dashed #d1d5db' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ color: '#6b7280', textAlign: 'left' }}>
                    <th style={{ paddingBottom: '6px' }}>Item</th>
                    <th style={{ textAlign: 'center', paddingBottom: '6px' }}>Qty</th>
                    <th style={{ textAlign: 'right', paddingBottom: '6px' }}>Rate</th>
                    <th style={{ textAlign: 'right', paddingBottom: '6px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.items?.map((item: any) => (
                    <tr key={item._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 0', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ textAlign: 'center', padding: '6px 0' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{item.unitPrice.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700 }}>
                        ₹{item.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div
              style={{
                padding: '12px 0',
                borderBottom: '1px dashed #d1d5db',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '11px',
                color: '#374151',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{completedSale.subtotal.toFixed(2)}</span>
              </div>
              {completedSale.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>Discount ({completedSale.discountPercent}%):</span>
                  <span>-₹{completedSale.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {completedSale.taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST Tax ({completedSale.taxPercent}%):</span>
                  <span>+₹{completedSale.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#111827',
                  paddingTop: '6px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <span>Total Paid ({completedSale.paymentMethod}):</span>
                <span>₹{completedSale.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer & Actions */}
            <div style={{ textAlign: 'center', paddingTop: '16px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '14px' }}>
                Thank you for shopping with us! • Goods once sold can be returned within 7 days.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#111827',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <IconPrinter size={14} />
                  Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#00a884',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Start Next Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
