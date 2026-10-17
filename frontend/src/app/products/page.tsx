'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconBox,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconRefresh,
} from '../../components/ui/icons';

/**
 * Safely parse 'YYYY-MM-DD' into local Date object without UTC timezone shifting.
 */
function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

/**
 * Format a Date object as 'YYYY-MM-DD' using local date components.
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate expiry date from DOM, shelf life value, and shelf life unit.
 */
function calculateExpiryDate(domStr: string, shelfLifeVal: number | string, unit: string): string {
  const dom = parseLocalDate(domStr);
  const val = typeof shelfLifeVal === 'number' ? shelfLifeVal : parseInt(shelfLifeVal, 10);
  if (!dom || isNaN(val) || val <= 0) return '';

  const expiry = new Date(dom.getTime());
  if (unit === 'days') {
    expiry.setDate(expiry.getDate() + val);
  } else if (unit === 'months') {
    const targetMonth = expiry.getMonth() + val;
    expiry.setMonth(targetMonth);
    // Rollover guard for varying month lengths (e.g. Jan 31 + 1 month -> Feb 28/29)
    if (expiry.getMonth() !== ((targetMonth % 12) + 12) % 12) {
      expiry.setDate(0);
    }
  } else if (unit === 'years') {
    const targetYear = expiry.getFullYear() + val;
    expiry.setFullYear(targetYear);
    if (dom.getMonth() === 1 && dom.getDate() === 29 && expiry.getMonth() !== 1) {
      expiry.setDate(0);
    }
  }
  return formatLocalDate(expiry);
}

/**
 * Calculate shelf life (value & unit) given DOM and Expiry Date.
 */
function calculateShelfLifeFromDates(
  domStr: string,
  expiryStr: string,
  preferredUnit?: string
): { value: string; unit: string; error?: string } {
  const dom = parseLocalDate(domStr);
  const exp = parseLocalDate(expiryStr);

  if (!dom || !exp) {
    return { value: '', unit: preferredUnit || 'days' };
  }

  const diffMs = exp.getTime() - dom.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      value: '',
      unit: preferredUnit || 'days',
      error: 'Expiry date must be after Date of Manufacture',
    };
  }

  // If user selected 'years'
  if (preferredUnit === 'years') {
    const yearDiff = exp.getFullYear() - dom.getFullYear();
    if (yearDiff > 0 && exp.getMonth() === dom.getMonth() && exp.getDate() === dom.getDate()) {
      return { value: String(yearDiff), unit: 'years' };
    }
    const approxYears = Math.max(1, Math.round(diffDays / 365.25));
    return { value: String(approxYears), unit: 'years' };
  }

  // If user selected 'months'
  if (preferredUnit === 'months') {
    const monthDiff = (exp.getFullYear() - dom.getFullYear()) * 12 + (exp.getMonth() - dom.getMonth());
    if (monthDiff > 0 && exp.getDate() === dom.getDate()) {
      return { value: String(monthDiff), unit: 'months' };
    }
    const approxMonths = Math.max(1, Math.round(diffDays / 30.4375));
    return { value: String(approxMonths), unit: 'months' };
  }

  // When preferredUnit is 'days' or not specified:
  // Check if it's exact whole years (e.g. 2026-10-17 to 2027-10-17)
  const isExactYear =
    exp.getFullYear() > dom.getFullYear() &&
    exp.getMonth() === dom.getMonth() &&
    exp.getDate() === dom.getDate();

  if (isExactYear && !preferredUnit) {
    return { value: String(exp.getFullYear() - dom.getFullYear()), unit: 'years' };
  }

  // Check if it's exact whole months (e.g. 2026-10-17 to 2027-04-17)
  const monthDiff = (exp.getFullYear() - dom.getFullYear()) * 12 + (exp.getMonth() - dom.getMonth());
  const isExactMonth = monthDiff > 0 && exp.getDate() === dom.getDate();

  if (isExactMonth && monthDiff < 12 && !preferredUnit) {
    return { value: String(monthDiff), unit: 'months' };
  }

  return { value: String(diffDays), unit: preferredUnit || 'days' };
}

export default function ProductsPage() {
  const { isAdmin } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryObjects, setCategoryObjects] = useState<any[]>([]);
  const [kindsMap, setKindsMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Category Modal State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryKinds, setNewCategoryKinds] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedKind, setSelectedKind] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dateWarning, setDateWarning] = useState<string | null>(null);
  const [lastCalculatedField, setLastCalculatedField] = useState<'expiry' | 'shelfLife' | null>(null);

  // Form State - Blank by default
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    kind: '',
    purchasePrice: '',
    sellingPrice: '',
    availableStock: '',
    reorderLevel: '',
    dateOfManufacture: '',
    shelfLifeValue: '',
    shelfLifeUnit: 'days',
    expiryDate: '',
    unit: '',
    description: '',
  });

  const formatCurrency = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const loadCategories = async () => {
    try {
      const res = await api.categories.getAll();
      if (res.success && res.data) {
        setCategoryObjects(res.data);
        const names = res.data.map((c: any) => c.name);
        setCategories((prev) => Array.from(new Set([...names, ...prev])));
        const map: Record<string, string[]> = {};
        res.data.forEach((c: any) => {
          if (c.kinds && c.kinds.length) {
            map[c.name] = c.kinds;
          }
        });
        setKindsMap((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {
      console.warn('Backend categories notice:', e);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedKind) params.kind = selectedKind;
      if (stockStatus) params.stockStatus = stockStatus;

      const res = await api.products.getAll(params);
      if (res.success) {
        setProducts(res.data);
        if (res.categories) {
          setCategories((prev) => Array.from(new Set([...prev, ...res.categories])));
        }
        if (res.categoryKindsMap) {
          setKindsMap((prev) => ({ ...res.categoryKindsMap, ...prev }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, selectedCategory, selectedKind, stockStatus]);

  // Compute product suggestions list based on the chosen category
  const categoryProductSuggestions = React.useMemo(() => {
    if (!formData.category) return [];
    const catObj = categoryObjects.find(
      (c) => c.name.toLowerCase() === formData.category.toLowerCase()
    );
    const fromCat = catObj?.commonProducts || [];
    const fromExisting = products
      .filter((p) => p.category?.toLowerCase() === formData.category.toLowerCase())
      .map((p) => p.name);
    return Array.from(new Set([...fromCat, ...fromExisting]));
  }, [formData.category, categoryObjects, products]);

  // Handle product selected from the category's product list
  const handleSelectProductTemplate = (selectedName: string) => {
    if (!selectedName) return;
    const existing = products.find(
      (p) => p.name.toLowerCase() === selectedName.toLowerCase()
    );

    // Auto-generate SKU if blank
    const catCode = (formData.category || 'PROD').slice(0, 4).toUpperCase();
    const nameCode = selectedName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
    const suggestedSku = existing?.sku || `${catCode}-${nameCode}-${Math.floor(100 + Math.random() * 900)}`;

    // Guess kind
    const kinds = kindsMap[formData.category] || [];
    const matchedKind = kinds.find((k) => selectedName.toLowerCase().includes(k.toLowerCase())) || existing?.kind || kinds[0] || '';

    setFormData((prev) => ({
      ...prev,
      name: selectedName,
      sku: prev.sku ? prev.sku : suggestedSku,
      unit: existing?.unit || prev.unit || 'pcs',
      kind: prev.kind ? prev.kind : matchedKind,
      purchasePrice: existing?.purchasePrice ? String(existing.purchasePrice) : prev.purchasePrice,
      sellingPrice: existing?.sellingPrice ? String(existing.sellingPrice) : prev.sellingPrice,
    }));
  };

  // Handle adding a brand new category on the fly
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

      const res = await api.categories.create({
        name: catName,
        kinds: kindsArray,
      });

      const newObj = res.data || { name: catName, kinds: kindsArray, commonProducts: [] };
      setCategoryObjects((prev) => [...prev.filter((c) => c.name.toLowerCase() !== catName.toLowerCase()), newObj]);
      setCategories((prev) => Array.from(new Set([catName, ...prev])));
      if (kindsArray.length) {
        setKindsMap((prev) => ({ ...prev, [catName]: kindsArray }));
      }

      // Automatically select the new category for the product being added
      setFormData((prev) => ({ ...prev, category: catName, kind: kindsArray[0] || '' }));
      setNewCategoryName('');
      setNewCategoryKinds('');
      setShowAddCategoryModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add category');
    } finally {
      setAddingCategory(false);
    }
  };

  // Dynamic bi-directional handlers for DOM, Shelf Life, and Expiry Date
  const handleDOMChange = (newDOM: string) => {
    setDateWarning(null);
    setFormData((prev) => {
      // If shelf life value exists and valid, calculate expiry from DOM + shelf life
      if (prev.shelfLifeValue && parseInt(prev.shelfLifeValue, 10) > 0) {
        const newExpiry = calculateExpiryDate(newDOM, prev.shelfLifeValue, prev.shelfLifeUnit);
        setLastCalculatedField('expiry');
        return { ...prev, dateOfManufacture: newDOM, expiryDate: newExpiry };
      }
      // Else if expiry date exists, calculate shelf life from DOM and expiry date
      if (newDOM && prev.expiryDate) {
        const result = calculateShelfLifeFromDates(newDOM, prev.expiryDate, prev.shelfLifeUnit);
        if (result.error) {
          setDateWarning(result.error);
          return { ...prev, dateOfManufacture: newDOM, shelfLifeValue: '' };
        }
        setLastCalculatedField('shelfLife');
        return {
          ...prev,
          dateOfManufacture: newDOM,
          shelfLifeValue: result.value,
          shelfLifeUnit: result.unit,
        };
      }
      return { ...prev, dateOfManufacture: newDOM };
    });
  };

  const handleShelfLifeValueChange = (newVal: string) => {
    setDateWarning(null);
    setFormData((prev) => {
      if (prev.dateOfManufacture && newVal && parseInt(newVal, 10) > 0) {
        const newExpiry = calculateExpiryDate(prev.dateOfManufacture, newVal, prev.shelfLifeUnit);
        setLastCalculatedField('expiry');
        return { ...prev, shelfLifeValue: newVal, expiryDate: newExpiry };
      }
      return { ...prev, shelfLifeValue: newVal };
    });
  };

  const handleShelfLifeUnitChange = (newUnit: string) => {
    setDateWarning(null);
    setFormData((prev) => {
      // If shelfLifeValue exists and DOM exists, recalculate expiry date
      if (prev.dateOfManufacture && prev.shelfLifeValue && parseInt(prev.shelfLifeValue, 10) > 0) {
        const newExpiry = calculateExpiryDate(prev.dateOfManufacture, prev.shelfLifeValue, newUnit);
        setLastCalculatedField('expiry');
        return { ...prev, shelfLifeUnit: newUnit, expiryDate: newExpiry };
      }
      // Else if DOM and expiryDate exist, recalculate shelfLifeValue for the new unit
      if (prev.dateOfManufacture && prev.expiryDate) {
        const result = calculateShelfLifeFromDates(prev.dateOfManufacture, prev.expiryDate, newUnit);
        if (result.error) {
          setDateWarning(result.error);
          return { ...prev, shelfLifeUnit: newUnit, shelfLifeValue: '' };
        }
        setLastCalculatedField('shelfLife');
        return {
          ...prev,
          shelfLifeUnit: newUnit,
          shelfLifeValue: result.value,
        };
      }
      return { ...prev, shelfLifeUnit: newUnit };
    });
  };

  const handleExpiryDateChange = (newExpiry: string) => {
    setDateWarning(null);
    setFormData((prev) => {
      if (prev.dateOfManufacture && newExpiry) {
        const result = calculateShelfLifeFromDates(prev.dateOfManufacture, newExpiry, prev.shelfLifeUnit);
        if (result.error) {
          setDateWarning(result.error);
          return { ...prev, expiryDate: newExpiry, shelfLifeValue: '' };
        }
        setLastCalculatedField('shelfLife');
        return {
          ...prev,
          expiryDate: newExpiry,
          shelfLifeValue: result.value,
          shelfLifeUnit: result.unit,
        };
      }
      return { ...prev, expiryDate: newExpiry };
    });
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormError(null);
    setDateWarning(null);
    setLastCalculatedField(null);
    setFormData({
      sku: '',
      name: '',
      category: '',
      kind: '',
      purchasePrice: '',
      sellingPrice: '',
      availableStock: '',
      reorderLevel: '',
      dateOfManufacture: '',
      shelfLifeValue: '',
      shelfLifeUnit: 'days',
      expiryDate: '',
      unit: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
    setFormError(null);
    setDateWarning(null);
    setLastCalculatedField(null);

    const domStr = product.dateOfManufacture ? product.dateOfManufacture.slice(0, 10) : '';
    const expStr = product.expiryDate ? product.expiryDate.slice(0, 10) : '';
    let initialShelfVal = product.shelfLifeValue ? String(product.shelfLifeValue) : '';
    let initialShelfUnit = product.shelfLifeUnit || 'days';

    // Auto-calculate shelf life if DOM and Expiry exist but shelfLifeValue was not stored
    if (!initialShelfVal && domStr && expStr) {
      const calc = calculateShelfLifeFromDates(domStr, expStr, initialShelfUnit);
      if (!calc.error && calc.value) {
        initialShelfVal = calc.value;
        initialShelfUnit = calc.unit;
      }
    }

    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      kind: product.kind || '',
      purchasePrice: String(product.purchasePrice),
      sellingPrice: String(product.sellingPrice),
      availableStock: String(product.availableStock),
      reorderLevel: String(product.reorderLevel),
      dateOfManufacture: domStr,
      shelfLifeValue: initialShelfVal,
      shelfLifeUnit: initialShelfUnit,
      expiryDate: expStr,
      unit: product.unit || 'pcs',
      description: product.description || '',
    });
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      // Validate date order if both are present
      if (formData.dateOfManufacture && formData.expiryDate) {
        const dom = parseLocalDate(formData.dateOfManufacture);
        const exp = parseLocalDate(formData.expiryDate);
        if (dom && exp && exp <= dom) {
          setFormError('Expiry Date must be after Date of Manufacture (DOM).');
          setFormSubmitting(false);
          return;
        }
      }

      const payload = {
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        kind: formData.kind,
        purchasePrice: parseFloat(formData.purchasePrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        availableStock: parseInt(formData.availableStock, 10),
        reorderLevel: parseInt(formData.reorderLevel, 10),
        dateOfManufacture: formData.dateOfManufacture || null,
        shelfLifeValue: formData.shelfLifeValue ? parseInt(formData.shelfLifeValue, 10) : null,
        shelfLifeUnit: formData.shelfLifeUnit,
        expiryDate: formData.expiryDate || null,
        unit: formData.unit,
        description: formData.description,
      };

      if (editingProduct) {
        await api.products.update(editingProduct._id, payload);
      } else {
        await api.products.create(payload);
      }

      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      setFormError(err.data?.message || err.message || 'Error saving product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (product: any) => {
    if (!isAdmin) {
      alert('Only administrators can deactivate products.');
      return;
    }
    try {
      await api.products.toggleStatus(product._id);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const getStockBadge = (p: any) => {
    if (p.expiryDate && new Date(p.expiryDate) < new Date()) {
      return { label: 'Expired', bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
    }
    if (p.availableStock <= 0) {
      return { label: 'Out of Stock', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
    }
    if (p.availableStock <= p.reorderLevel) {
      return { label: `Low Stock (${p.availableStock})`, bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
    }
    return { label: `In Stock (${p.availableStock})`, bg: 'var(--accent-muted)', color: 'var(--accent)' };
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Product Catalog & Stock Management"
        subtitle="Manage product SKUs, stock levels, categories, shelf life, and expiry tracking"
      />

      <div className="page-content-padding" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Filter and Action Toolbar */}
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
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px' }}>
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
              placeholder="Search by product name or SKU..."
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

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedKind('');
              }}
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
              <option value="">All Categories</option>
              <option value="Dairy">Dairy</option>
              <option value="Bakery">Bakery</option>
              <option value="Beverages">Beverages</option>
              <option value="Snacks">Snacks</option>
              <option value="Personal Care">Personal Care</option>
              <option value="Groceries">Groceries</option>
            </select>

            {/* Kind filter (dynamically available if category selected) */}
            {selectedCategory && kindsMap[selectedCategory] && (
              <select
                value={selectedKind}
                onChange={(e) => setSelectedKind(e.target.value)}
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
                <option value="">All Kinds ({selectedCategory})</option>
                {kindsMap[selectedCategory].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            )}

            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
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
              <option value="">All Stock Levels</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <button
              onClick={handleOpenAddModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--accent-glow)',
              }}
            >
              <IconPlus size={16} />
              Add Product
            </button>
          </div>
        </div>

        {/* Product Table */}
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
                  <th style={{ padding: '14px 18px' }}>SKU & Name</th>
                  <th style={{ padding: '14px 18px' }}>Category & Kind</th>
                  <th style={{ padding: '14px 18px' }}>Cost Price</th>
                  <th style={{ padding: '14px 18px' }}>Selling Price</th>
                  <th style={{ padding: '14px 18px' }}>Available Stock</th>
                  <th style={{ padding: '14px 18px' }}>Expiry Date</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading product catalog...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No products match your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const badge = getStockBadge(p);
                    const isDeactivated = !p.isActive;

                    return (
                      <tr
                        key={p._id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: isDeactivated ? 'rgba(0,0,0,0.2)' : 'transparent',
                          opacity: isDeactivated ? 0.6 : 1,
                        }}
                      >
                        {/* SKU & Name */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div
                            style={{
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                            }}
                          >
                            {p.sku} • {p.unit || 'pcs'}
                          </div>
                        </td>

                        {/* Category & Kind */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                              fontWeight: 600,
                            }}
                          >
                            {p.category}
                          </span>
                          {p.kind && (
                            <span
                              style={{
                                fontSize: '11px',
                                marginLeft: '6px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--accent-muted)',
                                color: 'var(--accent)',
                                fontWeight: 500,
                              }}
                            >
                              {p.kind}
                            </span>
                          )}
                        </td>

                        {/* Prices */}
                        <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                          {formatCurrency(p.purchasePrice)}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--accent)' }}>
                          {formatCurrency(p.sellingPrice)}
                        </td>

                        {/* Available Stock */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: p.availableStock <= p.reorderLevel ? '#f87171' : 'var(--text-primary)',
                            }}
                          >
                            {p.availableStock} {p.unit || 'pcs'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                            (Reorder: {p.reorderLevel})
                          </span>
                        </td>

                        {/* Expiry Date */}
                        <td style={{ padding: '14px 18px' }}>
                          {p.expiryDate ? (
                            <div>
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: new Date(p.expiryDate) < new Date() ? '#ef4444' : 'var(--text-secondary)',
                                  fontWeight: 500,
                                }}
                              >
                                {new Date(p.expiryDate).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              {p.shelfLifeValue && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  Shelf: {p.shelfLifeValue} {p.shelfLifeUnit}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>N/A</span>
                          )}
                        </td>

                        {/* Status Badge */}
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

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              title="Edit Product"
                              style={{
                                padding: '6px 8px',
                                backgroundColor: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <IconEdit size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(p)}
                              title={p.isActive ? 'Deactivate' : 'Activate'}
                              style={{
                                padding: '6px 8px',
                                backgroundColor: p.isActive ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-muted)',
                                border: `1px solid ${p.isActive ? 'rgba(239, 68, 68, 0.3)' : 'var(--accent-glow)'}`,
                                color: p.isActive ? '#ef4444' : 'var(--accent)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              {p.isActive ? <IconTrash size={14} /> : <IconCheck size={14} />}
                            </button>
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

      {/* Add / Edit Product Modal */}
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
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              padding: '28px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {editingProduct ? 'Edit Product' : 'Add New Retail Product'}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Configure product details, category kind, manufacturing date, and auto expiry
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
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
                  marginBottom: '18px',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. Category Selection FIRST with + button (User requirement) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Step 1: Choose Product Category *
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
                  value={formData.category}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setFormData({ ...formData, category: newCat, kind: '' });
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- Select Product Category (e.g. Dairy, Bakery, Food...) --</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Product Name Chosen From List (User requirement) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                  Step 2: Choose Product Name from List *
                </label>

                {/* Dropdown to pick from category product list */}
                <div>
                  <select
                    value={categoryProductSuggestions.includes(formData.name) ? formData.name : ''}
                    onChange={(e) => handleSelectProductTemplate(e.target.value)}
                    disabled={!formData.category}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: formData.category ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: formData.category ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">
                      {!formData.category
                        ? '← Please choose category in Step 1 first'
                        : `-- Pick a product name from ${formData.category} list --`}
                    </option>
                    {categoryProductSuggestions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Direct text input for product name */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Or type / refine product name:
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Amul Taaza Toned Milk 500ml"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
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

              {/* 3. SKU Code & Kind of Product */}
              <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. DAIRY-MILK-001"
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
                    Kind of Product (Subcategory)
                  </label>
                  <input
                    type="text"
                    value={formData.kind}
                    onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                    placeholder="e.g. Milk, Curd, Paneer, Cheese"
                    list="kind-suggestions"
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
                  <datalist id="kind-suggestions">
                    {formData.category && kindsMap[formData.category]?.map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Quick Kind Selector Pills */}
              {formData.category && kindsMap[formData.category] && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>
                    Quick Select Kind:
                  </span>
                  <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {kindsMap[formData.category].map((k) => (
                      <button
                        type="button"
                        key={k}
                        onClick={() => setFormData({ ...formData, kind: k })}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          border: formData.kind === k ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                          backgroundColor: formData.kind === k ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                          color: formData.kind === k ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing & Stock */}
              <div className="modal-grid-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Cost Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="0.00"
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
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0.00"
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
                    Available Stock *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.availableStock}
                    onChange={(e) => setFormData({ ...formData, availableStock: e.target.value })}
                    placeholder="e.g. 10"
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
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    placeholder="e.g. 5"
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

              {/* Manufacturing Date & Shelf Life (Dynamic Bi-directional Calculation) */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '10px',
                  border: dateWarning ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                    Shelf Life & Dynamic Expiry Calculation
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Bi-directional auto calculation
                  </div>
                </div>

                <div className="modal-grid-3col" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr', gap: '12px' }}>
                  {/* DOM */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Date of Manufacture (DOM)
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfManufacture}
                      onChange={(e) => handleDOMChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
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

                  {/* Good For (Shelf Life) */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Good For (Shelf Life)
                      </label>
                      {lastCalculatedField === 'shelfLife' && formData.shelfLifeValue && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          Auto-set
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="number"
                        min="1"
                        value={formData.shelfLifeValue}
                        onChange={(e) => handleShelfLifeValueChange(e.target.value)}
                        placeholder="e.g. 7"
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          backgroundColor: 'var(--bg-elevated)',
                          border: lastCalculatedField === 'shelfLife' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.2s',
                        }}
                      />
                      <select
                        value={formData.shelfLifeUnit}
                        onChange={(e) => handleShelfLifeUnitChange(e.target.value)}
                        style={{
                          padding: '8px 6px',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Expiry Date (Auto-Calculated)
                      </label>
                      {lastCalculatedField === 'expiry' && formData.expiryDate && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: 'var(--accent)',
                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          Auto-set
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => handleExpiryDateChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--accent)',
                        borderRadius: '6px',
                        color: 'var(--accent)',
                        fontWeight: 600,
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Date Warning or Helper Info */}
                {dateWarning ? (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️</span>
                    <span>{dateWarning}</span>
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>💡</span>
                    <span>Enter DOM + Good For to calculate Expiry, or enter DOM + Expiry Date to calculate Good For (Shelf Life).</span>
                  </div>
                )}
              </div>

              {/* Unit & Description */}
              <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Package Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                    <option value="">Select Package Unit...</option>
                    <option value="pack">Pack</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="pouch">Pouch</option>
                    <option value="bottle">Bottle</option>
                    <option value="can">Can</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="liter">Liter (L)</option>
                    <option value="box">Box</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Description / Notes
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short product description"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
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
                  disabled={formSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 4px 14px var(--accent-glow)',
                  }}
                >
                  {formSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Category Modal */}
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
                  Create a new category of food or goods for your inventory
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
                  placeholder="e.g. Frozen Food, Organic, Sweets"
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
                  placeholder="e.g. Peas, French Fries, Ice Cream"
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
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  These will appear as quick tags when adding products to this category.
                </span>
              </div>

              {/* Quick food category preset tags */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Suggested Food Categories:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['Frozen Food', 'Organic Produce', 'Sweets & Mithai', 'Canned Foods', 'Spices & Condiments'].map((cat) => (
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
    </div>
  );
}
