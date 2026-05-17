import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Label,
} from "recharts";
import "./Analytics.css";
import API_BASE_URL from "../api";

const COLORS = ["#6ee7b7", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const Analytics = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [totalSales, setTotalSales]     = useState([]);
  const [vendorSales, setVendorSales]   = useState([]);
  const [peakHours, setPeakHours]       = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
        });

        const headers = { Authorization: `Bearer ${token}` };
        const ordersRes = await fetch(`${API_BASE_URL}/api/orders/admin/all`, { headers });
        const orders = await ordersRes.json();

        if (!Array.isArray(orders)) { setLoading(false); return; }

        const salesByDate = {};
        orders.forEach((order) => {
          const date = new Date(order.createdAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
          if (!salesByDate[date]) salesByDate[date] = 0;
          salesByDate[date] += order.totalAmount / 100;
        });
        setTotalSales(Object.entries(salesByDate).map(([date, total]) => ({ date, total: parseFloat(total.toFixed(2)) })));

        const salesByVendor = {};
        orders.forEach((order) => {
          const name = order.vendor?.businessName || "Unknown";
          if (!salesByVendor[name]) salesByVendor[name] = 0;
          salesByVendor[name] += order.totalAmount / 100;
        });
        setVendorSales(Object.entries(salesByVendor).map(([vendor, total]) => ({ vendor, total: parseFloat(total.toFixed(2)) })));

        const hourCounts = {};
        orders.forEach((order) => {
          const hour = new Date(order.createdAt).getHours();
          const label = `${hour}:00`;
          if (!hourCounts[label]) hourCounts[label] = 0;
          hourCounts[label]++;
        });
        setPeakHours(
          Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
        );

        const itemCounts = {};
        orders.forEach((order) => {
          const vendorName = order.vendor?.businessName || "Unknown";
          order.items?.forEach((item) => {
            const key = item.name;
            if (!itemCounts[key]) itemCounts[key] = { name: item.name, count: 0, vendor: vendorName };
            itemCounts[key].count += item.quantity;
          });
        });
        setPopularItems(
          Object.values(itemCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );

        

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();
  }, [getAccessTokenSilently]);

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="an-loading">Loading analytics...</p>;

  return (
    <section className="an-container">

      <article className="an-card">
        <header className="an-card-header">
          <h2 className="an-card-title">Total sales over time</h2>
          <button className="an-export-btn" onClick={() => exportCSV(totalSales, "total_sales")}>Export CSV</button>
        </header>
        {totalSales.length === 0 ? <p className="an-empty">No sales data available.</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={totalSales} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,231,183,0.1)" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }}>
                <Label value="Date" offset={-10} position="insideBottom" fill="#64748b" fontSize={12} />
              </XAxis>
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `R${v}`}>
                <Label value="Sales (ZAR)" angle={-90} position="insideLeft" fill="#64748b" fontSize={12} />
              </YAxis>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(110,231,183,0.2)", borderRadius: "8px" }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value) => [`R${value}`, "Sales"]}
              />
              <Line type="monotone" dataKey="total" stroke="#6ee7b7" strokeWidth={2} dot={{ fill: "#6ee7b7", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </article>

      <article className="an-card">
        <header className="an-card-header">
          <h2 className="an-card-title">Sales per vendor</h2>
          <button className="an-export-btn" onClick={() => exportCSV(vendorSales, "vendor_sales")}>Export CSV</button>
        </header>
        {vendorSales.length === 0 ? <p className="an-empty">No vendor data available.</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorSales} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,231,183,0.1)" />
              <XAxis dataKey="vendor" tick={{ fill: "#64748b", fontSize: 12 }}>
                <Label value="Vendor" offset={-10} position="insideBottom" fill="#64748b" fontSize={12} />
              </XAxis>
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `R${v}`}>
                <Label value="Sales (ZAR)" angle={-90} position="insideLeft" fill="#64748b" fontSize={12} />
              </YAxis>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(110,231,183,0.2)", borderRadius: "8px" }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value) => [`R${value}`, "Sales"]}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {vendorSales.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </article>

      <article className="an-card">
        <header className="an-card-header">
          <h2 className="an-card-title">Peak ordering hours</h2>
          <button className="an-export-btn" onClick={() => exportCSV(peakHours, "peak_hours")}>Export CSV</button>
        </header>
        {peakHours.length === 0 ? <p className="an-empty">No order data available.</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peakHours} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,231,183,0.1)" />
              <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 12 }}>
                <Label value="Time of day" offset={-10} position="insideBottom" fill="#64748b" fontSize={12} />
              </XAxis>
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }}>
                <Label value="Number of orders" angle={-90} position="insideLeft" fill="#64748b" fontSize={12} />
              </YAxis>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(110,231,183,0.2)", borderRadius: "8px" }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value) => [value, "Orders"]}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </article>

      <article className="an-card">
        <header className="an-card-header">
          <h2 className="an-card-title">Vendor order distribution</h2>
          <button className="an-export-btn" onClick={() => exportCSV(vendorSales, "vendor_distribution")}>Export CSV</button>
        </header>
        {vendorSales.length === 0 ? <p className="an-empty">No vendor data available.</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vendorSales}
                dataKey="total"
                nameKey="vendor"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ vendor, percent }) => `${vendor} ${(percent * 100).toFixed(0)}%`}
              >
                {vendorSales.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(110,231,183,0.2)", borderRadius: "8px" }}
                formatter={(value) => [`R${value}`, "Sales"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </article>

      <article className="an-card">
        <header className="an-card-header">
          <h2 className="an-card-title">Popular menu items</h2>
          <button className="an-export-btn" onClick={() => exportCSV(popularItems, "popular_items")}>Export CSV</button>
        </header>
        {popularItems.length === 0 ? <p className="an-empty">No item data available.</p> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={popularItems} layout="vertical" margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,231,183,0.1)" />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }}>
                <Label value="Number of orders" offset={-10} position="insideBottom" fill="#64748b" fontSize={12} />
              </XAxis>
              <YAxis dataKey="name" type="category" tick={{ fill: "#64748b", fontSize: 12 }} width={120}>
                <Label value="Menu item" angle={-90} position="insideLeft" fill="#64748b" fontSize={12} />
              </YAxis>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(110,231,183,0.2)", borderRadius: "8px" }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value, name, props) => [
                  `${value} orders — ${props.payload.vendor}`,
                  "Orders"
                ]}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {popularItems.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </article>

    </section>
  );
};

export default Analytics;