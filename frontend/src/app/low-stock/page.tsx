'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  IconAlertTriangle,
  IconPlus,
  IconRefresh,
  IconBox,
  IconCheck,
  IconX,
} from '../../components/ui/icons';

export default function LowStockPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Restock Modal
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState<string>('20');
  const [restockReason, setRestockReason] = useState<string>('Supplier Restock Order');
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const loadLowStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.inventory.getLowStock();
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch low-stock products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLowStock();
  }, []);

  const handleOpenRestock = (product: any) => {
    setSelectedProduct(product);
    // Recommend restock to at least double reorder level
    const recommended = Math.max(10, product.reorderLevel * 2 - product.availableStock);
    setRestockQty(String(recommended));
    setRestockReason(`Supplier Restock PO-${Date.now().toString().slice(-4)}`);
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSubmitting(true);
    try {
      await api.inventory.adjust({
        productId: selectedProduct._id,
        type: 'RECEIVED',
        quantity: parseInt(restockQty, 10),
        reason: restockReason,
      });

      setSelectedProduct(null);
      loadLowStock();
    } catch (err: any) {
      alert(err.data?.message || err.message || 'Failed to restock product');
    } finally {
      setSubmitting(false);
    }
  };

  const outOfStockCount = products.filter((p) => p.availableStock <= 0).length;
  const criticalCount = products.filter((p) => p.availableStock > 0).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Low-Stock & Out-of-Stock Alert Center"
        subtitle="Dedicated replenishment monitor for inventory at or below configured reorder thresholds"
      />

      <div className="page-content-padding" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Summary Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div
            className="card card--glass"
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>
                Out of Stock (Zero Units)
              </span>
              <IconAlertTriangle size={20} color="#ef4444" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', margin: '8px 0 2px' }}>
              {loading ? '...' : outOfStockCount}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Items cannot be sold right now</span>
          </div>

          <div
            className="card card--glass"
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              backgroundColor: 'rgba(245, 158, 11, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                Below Reorder Level
              </span>
              <IconBox size={20} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24', margin: '8px 0 2px' }}>
              {loading ? '...' : criticalCount}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Running low, restock soon</span>
          </div>

          <div
            className="card card--glass"
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Replenishment Action
              </span>
              <button
                onClick={loadLowStock}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <IconRefresh size={14} />
                Refresh
              </button>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px' }}>
              {loading ? '...' : products.length}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total SKUs requiring reorder</span>
          </div>
        </div>

        {/* Low Stock Items Table */}
        <div
          className="card card--glass"
          style={{
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconAlertTriangle size={18} color="#f87171" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Products at or below Reorder Threshold
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {products.length} products needing replenishment
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <th style={{ padding: '14px 18px' }}>SKU & Name</th>
                  <th style={{ padding: '14px 18px' }}>Category</th>
                  <th style={{ padding: '14px 18px' }}>Current Stock</th>
                  <th style={{ padding: '14px 18px' }}>Reorder Level</th>
                  <th style={{ padding: '14px 18px' }}>Deficit / Needed</th>
                  <th style={{ padding: '14px 18px' }}>Unit Cost</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Checking stock levels...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--accent)' }}>
                      🎉 Excellent! All products have healthy stock levels above their reorder thresholds.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isZero = p.availableStock <= 0;
                    const deficit = Math.max(1, p.reorderLevel * 2 - p.availableStock);

                    return (
                      <tr key={p._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {p.sku} • {p.unit || 'pcs'}
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
                            {p.category} {p.kind ? `• ${p.kind}` : ''}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontWeight: 800,
                              fontSize: '12px',
                              backgroundColor: isZero ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: isZero ? '#ef4444' : '#fbbf24',
                            }}
                          >
                            {p.availableStock} {p.unit || 'pcs'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                          {p.reorderLevel} {p.unit || 'pcs'}
                        </td>

                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#f87171' }}>
                          +{deficit} {p.unit || 'pcs'} suggested
                        </td>

                        <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                          {formatCurrency(p.purchasePrice)}
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenRestock(p)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '7px 14px',
                              backgroundColor: 'var(--accent)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px var(--accent-glow)',
                            }}
                          >
                            <IconPlus size={14} />
                            Quick Restock
                          </button>
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

      {/* Quick Restock Adjustment Modal */}
      {selectedProduct && (
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
              maxWidth: '480px',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Restock: {selectedProduct.name}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  SKU: {selectedProduct.sku} • Current Stock: {selectedProduct.availableStock}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Restock Quantity (Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Purchase Order / Supplier Reference
                </label>
                <input
                  type="text"
                  required
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. Supplier PO-1234 / Shipment Received"
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
                  padding: '12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>New Available Stock:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  {selectedProduct.availableStock + (parseInt(restockQty, 10) || 0)} {selectedProduct.unit}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
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
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 4px 14px var(--accent-glow)',
                  }}
                >
                  {submitting ? 'Updating Inventory...' : 'Confirm Stock Received'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
