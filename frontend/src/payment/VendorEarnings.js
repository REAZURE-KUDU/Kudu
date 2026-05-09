import React, { useState, useEffect, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './VendorEarnings.css';
import API_BASE_URL from './api';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const VendorEarnings = () => {
  const { getAccessTokenSilently }          = useAuth0();
  const [orders, setOrders]                 = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [expanded, setExpanded]             = useState(false);
  const [search, setSearch]                 = useState('');
  const [openRow, setOpenRow]               = useState(null);

  useEffect(() => {
    async function fetchEarnings() {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
        });
        const res  = await fetch(`${API_BASE_URL}/api/payments/vendor/earnings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setOrders(data.orders ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEarnings();
  }, [getAccessTokenSilently]);

  const stats = useMemo(() => {
    const total      = orders.reduce((s, o) => s + o.totalAmount, 0);
    const today      = new Date().toDateString();
    const todayTotal = orders.filter(o => o.paidAt && new Date(o.paidAt).toDateString() === today)
                             .reduce((s, o) => s + o.totalAmount, 0);
    return { total, count: orders.length, todayTotal };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return orders;
    return orders.filter(o =>
      o._id.toLowerCase().includes(q) ||
      o.items?.some(i => i.name.toLowerCase().includes(q))
    );
  }, [orders, search]);

  return (
    <main className="kd-app">
      <aside
        className={`kd-sidebar ${expanded ? 'expanded' : ''}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <header className="kd-logo">{expanded ? 'KuduDash' : 'KD'}</header>
        <nav className="kd-nav">
          {[
            { label: 'Overview', icon: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></> },
            { label: 'Orders',   icon: <path d="M6 2h12v20H6zM6 6h12"/> },
            { label: 'Earnings', icon: <path d="M12 2v20M2 12h20"/>, active: true },
            { label: 'Settings', icon: <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8 4a8 8 0 11-16 0 8 8 0 0116 0z"/> },
          ].map(({ label, icon, active }) => (
            <button key={label} className={`kd-nav-item${active ? ' active' : ''}`}>
              <svg viewBox="0 0 24 24" className="kd-icon">{icon}</svg>
              {expanded && <p className="kd-nav-text">{label}</p>}
            </button>
          ))}
        </nav>
      </aside>

      <section className="kd-main">
        <header className="kd-topbar">
          <section>
            <h1 className="kd-page-title" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Earnings</h1>
            <p className="kd-page-sub">Confirmed payments · live data</p>
          </section>
          <figure className="kd-avatar" style={{ fontFamily: "'Baloo 2', sans-serif" }}>KD</figure>
        </header>

        <div className="kd-earnings-container">
          <div className="kd-earnings-stats">
            <div className="kd-stat-card">
              <p className="kd-stat-card-label">Total Earnings</p>
              <p className="kd-stat-card-value">R{stats.total.toFixed(2)}</p>
              <p className="kd-stat-card-sub">All confirmed payments</p>
            </div>
            <div className="kd-stat-card">
              <p className="kd-stat-card-label">Paid Orders</p>
              <p className="kd-stat-card-value">{stats.count}</p>
              <p className="kd-stat-card-sub">Successfully completed</p>
            </div>
            <div className="kd-stat-card">
              <p className="kd-stat-card-label">Today's Revenue</p>
              <p className="kd-stat-card-value">R{stats.todayTotal.toFixed(2)}</p>
              <p className="kd-stat-card-sub">{new Date().toLocaleDateString('en-ZA', { weekday: 'long' })}</p>
            </div>
          </div>

          <div className="kd-earnings-toolbar">
            <input
              className="kd-earnings-search"
              placeholder="Search order ID or item…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#475569' }}>
              {filtered.length} order{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="kd-earnings-table-wrapper">
            {loading && <div className="kd-earnings-loading">Loading earnings…</div>}
            {!loading && error && <div className="kd-earnings-loading" style={{ color: '#f87171' }}>⚠ {error}</div>}
            {!loading && !error && filtered.length === 0 && (
              <div className="kd-earnings-empty">
                <div className="kd-earnings-empty-icon">🌳</div>
                <p className="kd-earnings-empty-text">No confirmed payments yet</p>
              </div>
            )}
            {!loading && !error && filtered.length > 0 && (
              <table className="kd-earnings-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Date Paid</th><th>Items</th><th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <React.Fragment key={order._id}>
                      <tr onClick={() => setOpenRow(p => p === order._id ? null : order._id)} style={{ cursor: 'pointer' }}>
                        <td><span className="kd-earnings-order-id">#{order._id.slice(-8).toUpperCase()}</span></td>
                        <td>{formatDate(order.paidAt)}</td>
                        <td>
                          {order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0} item(s){' '}
                          <span style={{ color: '#475569', fontSize: 11 }}>{openRow === order._id ? '▲' : '▼'}</span>
                        </td>
                        <td>
                          <span className="kd-status-badge paid">✓ Paid</span>
                        </td>
                        <td className="kd-earnings-amount" style={{ textAlign: 'right' }}>
                          R{order.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                      {openRow === order._id && (
                        <tr className="kd-earnings-items-row">
                          <td colSpan={5}>
                            <div className="kd-earnings-items-list">
                              {order.items?.map((item, idx) => (
                                <div key={idx} className="kd-earnings-item-row">
                                  <span>{item.quantity}× {item.name}</span>
                                  <span>R{item.subtotal.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default VendorEarnings;
