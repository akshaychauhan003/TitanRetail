'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  IconSearch,
  IconReceipt,
  IconRefresh,
  IconPrinter,
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconHistory,
  IconDownload,
} from '../../components/ui/icons';

export default function SalesHistoryPage() {
  const { user } = useAuth();

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Selected Sale for View Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Selected Sale for Sales Return Modal
  const [returnSale, setReturnSale] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Customer returned item');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const formatCurrency = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const loadSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (status) params.status = status;

      const res = await api.sales.getAll(params);
      if (res.success) {
        setSales(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [search, status]);

  const handleOpenReturnModal = (sale: any) => {
    setReturnSale(sale);
    setReturnError(null);
    setReturnReason('Customer returned item');

    // Pre-populate zero return quantity for each item
    const initialMap: { [key: string]: number } = {};
    sale.items?.forEach((item: any) => {
      initialMap[item.product] = 0;
    });
    setReturnItems(initialMap);
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSale) return;

    setReturnError(null);

    // Collect items with quantity > 0
    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (itemsToReturn.length === 0) {
      setReturnError('Please select at least 1 unit to return.');
      return;
    }

    setSubmittingReturn(true);
    try {
      await api.sales.returnSale(returnSale._id, {
        items: itemsToReturn,
        reason: returnReason.trim(),
      });

      setReturnSale(null);
      loadSales();
      alert('Return processed successfully! Product stock has been restored to warehouse inventory.');
    } catch (err: any) {
      setReturnError(err.data?.message || err.message || 'Failed to process return');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Calculate refund preview in return modal
  const calculateRefundPreview = () => {
    if (!returnSale) return 0;
    let totalRefund = 0;
    returnSale.items?.forEach((item: any) => {
      const qty = returnItems[item.product] || 0;
      totalRefund += item.unitPrice * qty;
    });
    return Math.round(totalRefund * 100) / 100;
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'COMPLETED':
        return { label: 'Completed', bg: 'var(--accent-muted)', color: 'var(--accent)' };
      case 'PARTIALLY_RETURNED':
        return { label: 'Partially Returned', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
      case 'RETURNED':
        return { label: 'Fully Returned', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      default:
        return { label: s, bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Sales Invoices & Returns Workflow"
        subtitle="Search transactions, inspect itemized receipts, and process customer returns with stock restoration"
      />

      {/* Workflow Navigation Bar: New Sale POS vs Sales History & Returns */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 28px 0 28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/sales"
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
            <span>🛒 New Customer Sale (POS)</span>
          </Link>

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
            <IconHistory size={16} />
            <span>Sales History & Returns (Restores Stock)</span>
          </div>
        </div>

        {/* Direct Download Sales CSV Button */}
        <a
          href={api.reports.getDownloadCsvUrl()}
          download
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 2px 8px var(--accent-glow)',
          }}
        >
          <IconDownload size={14} />
          Download Sales Report as CSV
        </a>
      </div>

      <div className="sales-history-container" style={{ padding: '20px 28px 28px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '16px 20px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ position: 'relative', minWidth: 'min(100%, 240px)', flex: '1 1 240px' }}>
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
              placeholder="Search by invoice number (e.g. INV-...) or customer name..."
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

          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: '9px 12px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PARTIALLY_RETURNED">Partially Returned</option>
              <option value="RETURNED">Fully Returned</option>
            </select>

            <button
              onClick={loadSales}
              style={{
                padding: '9px 14px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <IconRefresh size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div
          className="card card--glass"
          style={{
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <th style={{ padding: '14px 18px' }}>Invoice # & Date</th>
                  <th style={{ padding: '14px 18px' }}>Customer</th>
                  <th style={{ padding: '14px 18px' }}>Products Sold</th>
                  <th style={{ padding: '14px 18px' }}>Payment Mode</th>
                  <th style={{ padding: '14px 18px' }}>Total Amount</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading sales history...
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => {
                    const badge = getStatusBadge(sale.status);
                    const canReturn = sale.status !== 'RETURNED' && sale.status !== 'CANCELLED';

                    return (
                      <tr key={sale._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>
                            {sale.invoiceNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(sale.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customerName}</div>
                          {sale.customerPhone && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sale.customerPhone}</div>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                            {sale.items?.map((item: any, i: number) => (
                              <span key={item._id || i}>
                                {item.name} (x{item.quantity})
                                {i < sale.items.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Cashier: {sale.cashierName || 'Staff'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {sale.paymentMethod}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '14px' }}>
                            {formatCurrency(sale.totalAmount)}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Subtotal: {formatCurrency(sale.subtotal)}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(sale)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <IconReceipt size={13} />
                              Receipt
                            </button>

                            {canReturn && (
                              <button
                                type="button"
                                onClick={() => handleOpenReturnModal(sale)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#f87171',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                Return
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Receipt Modal */}
      {selectedReceipt && (
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
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #d1d5db', paddingBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>TITAN RETAIL STORE</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Official Customer Tax Receipt</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#00a884', marginTop: '6px' }}>
                {selectedReceipt.invoiceNumber}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {new Date(selectedReceipt.createdAt).toLocaleString('en-IN')}
              </div>
            </div>

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
                <strong>Customer:</strong> {selectedReceipt.customerName}
              </div>
              <div>
                <strong>Cashier:</strong> {selectedReceipt.cashierName || 'Staff'}
              </div>
            </div>

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
                  {selectedReceipt.items?.map((item: any) => (
                    <tr key={item._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 0', fontWeight: 600 }}>
                        {item.name}
                        {item.returnedQuantity > 0 && (
                          <span style={{ color: '#ef4444', fontSize: '10px', marginLeft: '4px' }}>
                            ({item.returnedQuantity} returned)
                          </span>
                        )}
                      </td>
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
                <span>₹{selectedReceipt.subtotal.toFixed(2)}</span>
              </div>
              {selectedReceipt.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>Discount ({selectedReceipt.discountPercent}%):</span>
                  <span>-₹{selectedReceipt.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {selectedReceipt.taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST Tax ({selectedReceipt.taxPercent}%):</span>
                  <span>+₹{selectedReceipt.taxAmount.toFixed(2)}</span>
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
                <span>Total Paid ({selectedReceipt.paymentMethod}):</span>
                <span>₹{selectedReceipt.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
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
                Print
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Sales-Return Workflow Modal */}
      {returnSale && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
          }}
        >
          <div
            className="card card--glass"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '20px 18px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Sales Return: {returnSale.invoiceNumber}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Select items and quantities to return back to warehouse inventory
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReturnSale(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <IconX size={20} />
              </button>
            </div>

            {returnError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {returnError}
              </div>
            )}

            <form onSubmit={handleProcessReturn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Items Eligible for Return:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {returnSale.items?.map((item: any) => {
                    const eligible = item.quantity - (item.returnedQuantity || 0);
                    if (eligible <= 0) return null;

                    return (
                      <div
                        key={item._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Rate: ₹{item.unitPrice} • Purchased: {item.quantity} (Eligible: {eligible})
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Qty to Return:</span>
                          <input
                            type="number"
                            min="0"
                            max={eligible}
                            value={returnItems[item.product] || 0}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(eligible, parseInt(e.target.value, 10) || 0));
                              setReturnItems({ ...returnItems, [item.product]: val });
                            }}
                            style={{
                              width: '60px',
                              padding: '6px 8px',
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                              textAlign: 'center',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Reason for Return *
                </label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Customer changed mind / wrong size"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
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

              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Refund Amount:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>
                  ₹{calculateRefundPreview().toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setReturnSale(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: submittingReturn ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {submittingReturn ? 'Restoring Stock...' : 'Process Return & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
