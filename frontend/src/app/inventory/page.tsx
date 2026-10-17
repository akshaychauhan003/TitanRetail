'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconBook,
  IconX,
  IconCheck,
  IconAlertTriangle,
} from '../../components/ui/icons';

export default function InventoryAdjustmentsPage() {
  const { user } = useAuth();

  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState('');
  const [filterSku, setFilterSku] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State - Blank by default
  const [formData, setFormData] = useState({
    productId: '',
    type: '',
    quantity: '',
    reason: '',
    referenceId: '',
  });

  const loadMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (selectedType) params.type = selectedType;
      if (filterSku) params.sku = filterSku;

      const res = await api.inventory.getMovements(params);
      if (res.success) {
        setMovements(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.products.getAll({ limit: 200 });
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMovements();
    loadProducts();
  }, [selectedType, filterSku]);

  const handleOpenModal = () => {
    setFormError(null);
    setFormData({
      productId: '',
      type: '',
      quantity: '',
      reason: '',
      referenceId: '',
    });
    setShowModal(true);
  };

  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await api.inventory.adjust({
        productId: formData.productId,
        type: formData.type,
        quantity: parseInt(formData.quantity, 10),
        reason: formData.reason.trim(),
        referenceId: formData.referenceId.trim(),
      });

      setShowModal(false);
      loadMovements();
      loadProducts();
    } catch (err: any) {
      setFormError(err.data?.message || err.message || 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p._id === formData.productId);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'RECEIVED':
        return { label: 'Stock Received', bg: 'var(--accent-muted)', color: 'var(--accent)' };
      case 'SALE':
        return { label: 'Sale Deduction', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      case 'RETURN':
        return { label: 'Sales Return', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
      case 'MANUAL_ADD':
        return { label: 'Manual Add', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
      case 'MANUAL_SUBTRACT':
        return { label: 'Manual Subtract', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
      case 'DAMAGE':
        return { label: 'Damaged Write-off', bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
      case 'EXPIRED':
        return { label: 'Expired Disposal', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' };
      default:
        return { label: type, bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Stock Audit & Purchaser Inward History"
        subtitle="Chronological log of goods received from suppliers (Purchaser), customer sales (Seller), and stock movements"
      />

      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Toolbar */}
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
          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
            <input
              type="text"
              value={filterSku}
              onChange={(e) => setFilterSku(e.target.value)}
              placeholder="Filter by SKU or Product Code..."
              style={{
                padding: '9px 12px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                minWidth: '220px',
              }}
            />

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
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
              <option value="">All Movement Types</option>
              <option value="RECEIVED">Stock Received (Shipment)</option>
              <option value="SALE">Customer Sale</option>
              <option value="RETURN">Sales Return</option>
              <option value="MANUAL_ADD">Manual Add</option>
              <option value="MANUAL_SUBTRACT">Manual Subtract</option>
              <option value="DAMAGE">Damaged Stock</option>
              <option value="EXPIRED">Expired Batch</option>
            </select>

            <button
              onClick={loadMovements}
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

          {/* Action button */}
          <button
            type="button"
            onClick={handleOpenModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px var(--accent-glow)',
            }}
          >
            <IconPlus size={16} />
            Record Stock Adjustment
          </button>
        </div>

        {/* Movements Table */}
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
                  <th style={{ padding: '14px 18px' }}>Date & Time</th>
                  <th style={{ padding: '14px 18px' }}>Product & SKU</th>
                  <th style={{ padding: '14px 18px' }}>Movement Type</th>
                  <th style={{ padding: '14px 18px' }}>Quantity Change</th>
                  <th style={{ padding: '14px 18px' }}>Stock Progression</th>
                  <th style={{ padding: '14px 18px' }}>Reference / PO</th>
                  <th style={{ padding: '14px 18px' }}>User / Cashier</th>
                  <th style={{ padding: '14px 18px' }}>Reason / Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading audit movements...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No inventory movements recorded for this filter.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const badge = getTypeBadge(m.type);
                    const isPositive = m.quantity > 0;

                    return (
                      <tr key={m._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {new Date(m.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.productName}</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {m.sku}
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

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '13px',
                              color: isPositive ? 'var(--accent)' : '#f87171',
                            }}
                          >
                            {isPositive ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{m.previousStock}</span>
                          <span style={{ margin: '0 6px', color: 'var(--text-secondary)' }}>→</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.newStock}</span>
                        </td>

                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {m.referenceId || 'N/A'}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {m.userName}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            ({m.userRole})
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {m.reason || '-'}
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

      {/* Record Adjustment Modal */}
      {showModal && (
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
              maxWidth: '520px',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Record Inventory Adjustment
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Update warehouse stock and create an immutable audit record
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <IconX size={20} />
              </button>
            </div>

            {formError && (
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
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Product Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Select Product *
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
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
                >
                  <option value="">Select Product...</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku}) — Available Stock: {p.availableStock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Adjustment Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
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
                  >
                    <option value="">Select Adjustment Type...</option>
                    <option value="RECEIVED">RECEIVED (Supplier Restock +)</option>
                    <option value="MANUAL_ADD">MANUAL ADD (Physical Surplus +)</option>
                    <option value="MANUAL_SUBTRACT">MANUAL SUBTRACT (Deficit -)</option>
                    <option value="DAMAGE">DAMAGE (Broken / Defective -)</option>
                    <option value="EXPIRED">EXPIRED (Batch Disposal -)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Quantity Units *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 10"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
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
              </div>

              {/* Reference & Reason */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Reference ID / Purchase Order
                </label>
                <input
                  type="text"
                  value={formData.referenceId}
                  onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                  placeholder="e.g. PO-8921"
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Reason / Audit Explanation *
                </label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Monthly physical inventory verification"
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

              {/* Preview Box */}
              {selectedProduct && (
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
                  <span>
                    Current: <strong>{selectedProduct.availableStock}</strong>
                  </span>
                  <span>
                    New Projected Stock:{' '}
                    <strong style={{ color: 'var(--accent)' }}>
                      {formData.type === 'RECEIVED' || formData.type === 'MANUAL_ADD'
                        ? selectedProduct.availableStock + (parseInt(formData.quantity, 10) || 0)
                        : selectedProduct.availableStock - (parseInt(formData.quantity, 10) || 0)}
                    </strong>
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {submitting ? 'Recording Movement...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
