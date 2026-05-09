import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './Payment.css';
import API_BASE_URL from './api';

// Displayed after PayFast redirects the student back to return_url.
// Checks if the payment was cancelled via query param, then polls the verify endpoint
// every 2.5 seconds (up to 8 attempts) until the order status becomes paid.
// If Auth0 session was lost during the PayFast redirect, redirects to login
// with returnTo so the student lands back here after re-authenticating.
// Auto-navigates to order tracking 3 seconds after confirming paid status.
function PaymentResult({ orderId }) {
  const [searchParams]                     = useSearchParams();
  const isCancelled                        = searchParams.get('cancelled') === 'true';
  const [status, setStatus]               = useState(isCancelled ? 'cancelled' : 'loading');
  const [message, setMessage]             = useState('');
  const { getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const navigate                          = useNavigate();

  // Polls /api/payments/verify/:orderId until the order is marked as paid.
  // Handles Auth0 session loss after the full-page PayFast redirect by
  // redirecting to login if isAuthenticated is false or a login_required error is thrown.
  useEffect(() => {
    if (isCancelled) return;
    if (isLoading) return;
    if (!isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: window.location.pathname + window.location.search },
      });
      return;
    }

    let attempts = 0;
    let dead = false;

    async function verify() {
      if (dead) return;
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
        });
        const res  = await fetch(`${API_BASE_URL}/api/payments/verify/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        if (data.status === 'paid') { setStatus('paid'); return; }
        if (data.status === 'failed') { setStatus('failed'); return; }

        if (++attempts < 8) setTimeout(verify, 2500);
        else setStatus('pending');
      } catch (err) {
        if (err.error === 'login_required') {
          loginWithRedirect({
            appState: { returnTo: window.location.pathname + window.location.search },
          });
          return;
        }
        setStatus('failed');
        setMessage(err.message);
      }
    }
    verify();
    return () => { dead = true; };
  }, [orderId, isCancelled, isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect]);

  // Once payment is confirmed, auto-redirect to order tracking after 3 seconds.
  useEffect(() => {
    if (status !== 'paid') return;
    const t = setTimeout(() => navigate('/dashboard/student?tab=orders'), 3000);
    return () => clearTimeout(t);
  }, [status, navigate]);

  if (status === 'loading') return (
    <div className="kd-payment-status">
      <div className="kd-payment-status-icon">⏳</div>
      <p className="kd-payment-status-title">Verifying payment…</p>
      <p className="kd-payment-status-sub">Please wait a moment.</p>
    </div>
  );

  if (status === 'pending') return (
    <div className="kd-payment-status">
      <div className="kd-payment-status-icon">⏳</div>
      <p className="kd-payment-status-title">Payment processing</p>
      <p className="kd-payment-status-sub">Your payment is being confirmed. Check your orders shortly.</p>
      <div className="kd-payment-actions">
        <Link to="/dashboard/student" className="kd-payment-action-btn primary">Go to Dashboard</Link>
      </div>
    </div>
  );

  if (status === 'paid') return (
    <div className="kd-payment-status">
      <div className="kd-payment-status-icon">✅</div>
      <p className="kd-payment-status-title success">Payment confirmed!</p>
      <p className="kd-payment-status-sub">Your vendor has been notified and is preparing your order. Redirecting to order tracking…</p>
      <div className="kd-payment-actions">
        <Link to="/dashboard/student?tab=orders" className="kd-payment-action-btn primary">Track My Order →</Link>
      </div>
    </div>
  );

  if (status === 'cancelled') return (
    <div className="kd-payment-status">
      <div className="kd-payment-status-icon">🚫</div>
      <p className="kd-payment-status-title failed">Payment cancelled</p>
      <p className="kd-payment-status-sub">You cancelled the payment. Your order has not been placed.</p>
      <div className="kd-payment-actions">
        <Link to="/cart" className="kd-payment-action-btn primary">← Return to Cart</Link>
      </div>
    </div>
  );

  return (
    <div className="kd-payment-status">
      <div className="kd-payment-status-icon">❌</div>
      <p className="kd-payment-status-title failed">Payment unsuccessful</p>
      <p className="kd-payment-status-sub">{message || 'Your payment could not be processed. Please try again.'}</p>
      <div className="kd-payment-actions">
        <Link to={`/payment/${orderId}`} className="kd-payment-action-btn primary">Try Again</Link>
        <Link to="/cart" className="kd-payment-action-btn secondary">← Back to Cart</Link>
      </div>
    </div>
  );
}

// Main payment screen rendered at /payment/:orderId.
// On mount, calls /api/payments/initiate and /api/orders/:orderId in parallel to fetch
// the PayFast form data (pfData, pfUrl) and the order total for display.
// Renders a hidden HTML form pre-filled with pfData fields. When the student clicks Pay,
// handlePay submits the form — the browser navigates to PayFast's hosted payment page.
// If showResult is true, renders PaymentResult instead (used at /payment/result/:orderId).
const PaymentPage = ({ showResult = false }) => {
  const { orderId }                        = useParams();
  const { getAccessTokenSilently }         = useAuth0();
  const formRef                            = useRef(null);

  const [pfData, setPfData]               = useState(null);
  const [pfUrl, setPfUrl]                 = useState('');
  const [totalAmount, setTotalAmount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [initError, setInitError]         = useState('');
  const [expanded, setExpanded]           = useState(false);
  const [redirecting, setRedirecting]     = useState(false);

  // Fetches PayFast form data and order total when the payment page mounts.
  // Skipped entirely when showResult is true (result page has its own data fetching).
  useEffect(() => {
    if (showResult) { setLoading(false); return; }

    async function initPayment() {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
        });

        const [intentRes, orderRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/payments/initiate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body:    JSON.stringify({ orderId }),
          }),
          fetch(`${API_BASE_URL}/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const intentData = await intentRes.json();
        if (!intentRes.ok) throw new Error(intentData.message);
        setPfData(intentData.pfData);
        setPfUrl(intentData.pfUrl);

        const orderData = await orderRes.json();
        setTotalAmount(orderData?.totalAmount ?? 0);
      } catch (err) {
        setInitError(err.message);
      } finally {
        setLoading(false);
      }
    }
    initPayment();
  }, [orderId, showResult, getAccessTokenSilently]);

  // Submits the hidden PayFast form, redirecting the browser to PayFast's payment page.
  const handlePay = () => {
    setRedirecting(true);
    formRef.current?.submit();
  };

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
            { icon: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></>, label: 'Overview' },
            { icon: <path d="M4 6h16M4 12h16M4 18h16"/>, label: 'Vendors' },
            { icon: <path d="M6 2h12v20H6zM6 6h12"/>, label: 'Cart' },
            { icon: <><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M12 8v4l3 3"/></>, label: 'Checkout', active: true },
          ].map(({ icon, label, active }) => (
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
            <h1 className="kd-page-title" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              {showResult ? 'Payment Result' : 'Secure Payment'}
            </h1>
            <p className="kd-page-sub">{showResult ? `Order #${orderId}` : 'Complete your order below'}</p>
          </section>
          <figure className="kd-avatar" style={{ fontFamily: "'Baloo 2', sans-serif" }}>KD</figure>
        </header>

        <div className="kd-payment-page">
          {showResult && <PaymentResult orderId={orderId} />}

          {!showResult && (
            <>
              {loading && (
                <div className="kd-payment-card">
                  <div className="kd-payment-skeleton" style={{ marginBottom: '1rem' }} />
                  <div className="kd-payment-skeleton" style={{ height: 80 }} />
                </div>
              )}

              {!loading && initError && (
                <div className="kd-payment-status">
                  <div className="kd-payment-status-icon">⚠️</div>
                  <p className="kd-payment-status-title failed">Could not load payment</p>
                  <p className="kd-payment-status-sub">{initError}</p>
                  <Link to="/cart" className="kd-payment-action-btn primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
                    ← Back to Cart
                  </Link>
                </div>
              )}

              {!loading && !initError && pfData && (
                <div className="kd-payment-card">
                  <h2 className="kd-payment-card-title">Complete Payment</h2>
                  <p className="kd-payment-amount-display">
                    Order total: <strong>R{totalAmount.toFixed(2)}</strong>
                  </p>
                  <p className="kd-payment-amount-display" style={{ marginTop: '-1rem' }}>
                    You will be redirected to PayFast to complete your payment securely.
                  </p>

                  {/* Hidden PayFast form — submitted programmatically */}
                  <form ref={formRef} action={pfUrl} method="POST" style={{ display: 'none' }}>
                    {Object.entries(pfData).map(([key, val]) => (
                      <input key={key} type="hidden" name={key} value={val} />
                    ))}
                  </form>

                  <button className="kd-pay-btn" onClick={handlePay} disabled={redirecting}>
                    {redirecting ? (
                      <><span className="kd-pay-btn-spinner" />Redirecting…</>
                    ) : (
                      `Pay R${totalAmount.toFixed(2)} with PayFast`
                    )}
                  </button>

                  <p className="kd-secure-badge">
                    <span>🔒</span> Secured by PayFast · South Africa's trusted payment gateway
                  </p>
                </div>
              )}

              <Link to="/checkout" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: '#64748b', fontSize: 13, textDecoration: 'none' }}>
                ← Back to Checkout
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default PaymentPage;
