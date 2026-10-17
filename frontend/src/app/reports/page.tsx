'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import {
  IconChart,
  IconDownload,
  IconRefresh,
  IconCalendar,
  IconTrendUp,
  IconBox,
} from '../../components/ui/icons';

export default function ReportsPage() {
  const { isAdmin } = useAuth();

  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report Data
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any>(null);

  const formatCurrency = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const applyPreset = (preset: 'all' | 'today' | '7days' | 'month') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    const params: Record<string, any> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
      const promises: Promise<any>[] = [api.reports.getSales(params)];
      if (isAdmin) {
        promises.push(api.reports.getProfit(params));
      }

      const results = await Promise.all(promises);
      const salesRes = results[0];
      const profitRes = results[1];

      if (salesRes.success) {
        setSalesSummary(salesRes.summary);
        setTimeline(salesRes.timeline || []);
        setCategoryBreakdown(salesRes.categoryBreakdown || []);
      }

      if (profitRes && profitRes.success) {
        setProfitData(profitRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  const csvDownloadUrl = api.reports.getDownloadCsvUrl({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Sales Analytics & Financial Profitability"
        subtitle="Gross revenue, Cost of Goods Sold (COGS), profit margins, category breakdowns, and CSV export"
      />

      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Date Filter & Export Toolbar */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: datePreset === 'all' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                backgroundColor: datePreset === 'all' ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: datePreset === 'all' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: datePreset === 'today' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                backgroundColor: datePreset === 'today' ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: datePreset === 'today' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset('7days')}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: datePreset === '7days' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                backgroundColor: datePreset === '7days' ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: datePreset === '7days' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset('month')}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: datePreset === 'month' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                backgroundColor: datePreset === 'month' ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: datePreset === 'month' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              This Month
            </button>
          </div>

          {/* Custom Date Pickers & CSV Export */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                style={{
                  padding: '7px 10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                style={{
                  padding: '7px 10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            <a
              href={csvDownloadUrl}
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
              Download CSV Report
            </a>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div
            className="card card--glass"
            style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Gross Revenue
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px' }}>
              {loading ? '...' : formatCurrency(salesSummary?.totalRevenue || 0)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              From {salesSummary?.transactionCount || 0} completed orders
            </span>
          </div>

          <div
            className="card card--glass"
            style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Cost of Goods Sold (COGS)
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#94a3b8', margin: '8px 0 2px' }}>
              {loading ? '...' : formatCurrency(salesSummary?.totalCost || 0)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Inventory cost of sold products</span>
          </div>

          <div
            className="card card--glass"
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--accent-glow)',
              backgroundColor: 'var(--accent-muted)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
              Gross Profit
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent)', margin: '8px 0 2px' }}>
              {loading ? '...' : formatCurrency(salesSummary?.grossProfit || 0)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent)' }}>Revenue minus Cost of Goods</span>
          </div>

          <div
            className="card card--glass"
            style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
              Profit Margin %
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#c084fc', margin: '8px 0 2px' }}>
              {loading ? '...' : `${salesSummary?.profitMargin || 0}%`}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Net margin efficiency</span>
          </div>
        </div>

        {/* 2-Column Split: Sales Timeline & Category Revenue */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {/* Timeline Breakdown */}
          <div
            className="card card--glass"
            style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>
              Sales Timeline Breakdown
            </h3>
            {timeline.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No sales data in selected date range.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {timeline.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-tertiary)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item._id}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {item.transactions} orders completed
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)' }}>
                        {formatCurrency(item.sales)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#10b981' }}>
                        Profit: {formatCurrency(item.sales - item.cost)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div
            className="card card--glass"
            style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>
              Revenue by Category
            </h3>
            {categoryBreakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No category data available.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categoryBreakdown.map((cat) => {
                  const percent =
                    salesSummary?.totalRevenue > 0
                      ? Math.round((cat.revenue / salesSummary.totalRevenue) * 100)
                      : 0;

                  return (
                    <div key={cat._id || 'General'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cat._id || 'Uncategorized'}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {formatCurrency(cat.revenue)} ({percent}%)
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div
                        style={{
                          height: '6px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${percent}%`,
                            backgroundColor: 'var(--accent)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Product Profitability Matrix (Admin Only) */}
        {isAdmin && profitData && (
          <div
            className="card card--glass"
            style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Product Profitability & Unit Economics (Admin Privilege)
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Individual product revenue, unit costs, gross profit, and margin percentage
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
                    <th style={{ padding: '14px 18px' }}>Product & SKU</th>
                    <th style={{ padding: '14px 18px' }}>Category & Kind</th>
                    <th style={{ padding: '14px 18px' }}>Units Sold</th>
                    <th style={{ padding: '14px 18px' }}>Revenue Generated</th>
                    <th style={{ padding: '14px 18px' }}>Total Cost (COGS)</th>
                    <th style={{ padding: '14px 18px' }}>Gross Profit</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {profitData.products?.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No product sales recorded in this date range.
                      </td>
                    </tr>
                  ) : (
                    profitData.products?.map((item: any) => (
                      <tr key={item._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {item.sku}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                          {item.category} {item.kind ? `• ${item.kind}` : ''}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 700 }}>{item.totalSoldQuantity}</td>
                        <td style={{ padding: '14px 18px' }}>{formatCurrency(item.totalRevenue)}</td>
                        <td style={{ padding: '14px 18px', color: '#94a3b8' }}>{formatCurrency(item.totalCost)}</td>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--accent)' }}>
                          {formatCurrency(item.grossProfit)}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#c084fc' }}>
                          {item.profitMargin}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
