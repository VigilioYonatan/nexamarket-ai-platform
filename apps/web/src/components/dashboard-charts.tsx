import { useState } from "preact/hooks";
import { Icon } from "./ui";

export function SalesOverviewChart() {
  const [period, setPeriod] = useState<"7D" | "30D" | "1A">("30D");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Sales data points for each period (in Soles S/)
  const data7D = [
    { label: "Lun 04", sales: 2450, orders: 4 },
    { label: "Mar 05", sales: 3820, orders: 7 },
    { label: "Mié 06", sales: 4150, orders: 6 },
    { label: "Jue 07", sales: 3200, orders: 5 },
    { label: "Vie 08", sales: 5900, orders: 11 },
    { label: "Sáb 09", sales: 7850, orders: 15 },
    { label: "Dom 10", sales: 8420, orders: 17 },
  ];

  const data30D = [
    { label: "Sem 1", sales: 14200, orders: 28 },
    { label: "Sem 2", sales: 18900, orders: 36 },
    { label: "Sem 3", sales: 24800, orders: 49 },
    { label: "Sem 4", sales: 32400, orders: 62 },
  ];

  const data1A = [
    { label: "Ene", sales: 42000, orders: 85 },
    { label: "Feb", sales: 51200, orders: 104 },
    { label: "Mar", sales: 64800, orders: 130 },
    { label: "Abr", sales: 58900, orders: 118 },
    { label: "May", sales: 73400, orders: 146 },
    { label: "Jun", sales: 82100, orders: 165 },
    { label: "Jul", sales: 94500, orders: 190 },
    { label: "Ago", sales: 89000, orders: 178 },
    { label: "Set", sales: 102400, orders: 205 },
    { label: "Oct", sales: 118600, orders: 238 },
    { label: "Nov", sales: 136200, orders: 272 },
  ];

  const currentData = period === "7D" ? data7D : period === "30D" ? data30D : data1A;
  const maxVal = Math.max(...currentData.map((d) => d.sales)) * 1.15;
  const totalSales = currentData.reduce((acc, d) => acc + d.sales, 0);
  const totalOrders = currentData.reduce((acc, d) => acc + d.orders, 0);

  // SVG dimensions
  const width = 640;
  const height = 240;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 40;
  const graphWidth = width - padLeft - padRight;
  const graphHeight = height - padTop - padBottom;

  const points = currentData.map((d, i) => {
    const x = padLeft + (i / (currentData.length - 1 || 1)) * graphWidth;
    const y = padTop + graphHeight - (d.sales / maxVal) * graphHeight;
    return { x, y, ...d };
  });

  // Generate smooth SVG path
  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + graphHeight} L ${points[0].x} ${padTop + graphHeight} Z`;

  return (
    <div class="panel dashboard-chart-card">
      <div class="chart-header">
        <div>
          <span class="eyebrow">MÉTRICAS TRANSACCIONALES</span>
          <h3 class="chart-title">Volumen de Ventas (GMV en Soles)</h3>
          <div class="chart-summary-stat">
            <span class="chart-big-metric tnum">S/ {totalSales.toLocaleString("es-PE")}</span>
            <span class="chart-delta-badge positive">
              <Icon name="arrow" size={12} /> +24.8% vs período anterior
            </span>
          </div>
        </div>

        <div class="chart-controls">
          <div class="chart-btn-group">
            <button
              type="button"
              class={`chart-period-btn ${period === "7D" ? "active" : ""}`}
              onClick={() => { setPeriod("7D"); setHoverIndex(null); }}
            >
              7 Días
            </button>
            <button
              type="button"
              class={`chart-period-btn ${period === "30D" ? "active" : ""}`}
              onClick={() => { setPeriod("30D"); setHoverIndex(null); }}
            >
              30 Días
            </button>
            <button
              type="button"
              class={`chart-period-btn ${period === "1A" ? "active" : ""}`}
              onClick={() => { setPeriod("1A"); setHoverIndex(null); }}
            >
              1 Año
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Chart */}
      <div class="chart-canvas-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} class="chart-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2563eb" stop-opacity="0.32" />
              <stop offset="100%" stop-color="#2563eb" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padTop + graphHeight * pct;
            return (
              <line
                key={idx}
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="var(--line)"
                stroke-dasharray="4 4"
                stroke-width="1"
              />
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#salesGrad)" />

          {/* Smooth Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--brand)"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === i ? 6 : 4}
                fill={hoverIndex === i ? "#ffffff" : "var(--brand)"}
                stroke="var(--brand)"
                stroke-width={hoverIndex === i ? 3 : 2}
                class="chart-point"
                onMouseEnter={() => setHoverIndex(i)}
              />
              {/* X Axis Label */}
              <text
                x={pt.x}
                y={height - 12}
                text-anchor="middle"
                fill="var(--muted)"
                font-size="11"
                font-weight="650"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div
            class="chart-tooltip"
            style={{
              left: `${(points[hoverIndex].x / width) * 100}%`,
              top: `${(points[hoverIndex].y / height) * 100}%`,
            }}
          >
            <strong>{points[hoverIndex].label}</strong>
            <span class="tooltip-sales">S/ {points[hoverIndex].sales.toLocaleString("es-PE")}</span>
            <small>{points[hoverIndex].orders} pedidos completados</small>
          </div>
        )}
      </div>

      <div class="chart-footer-metrics">
        <div class="chart-mini-stat">
          <span class="stat-label">Total Pedidos</span>
          <strong class="stat-val tnum">{totalOrders}</strong>
        </div>
        <div class="chart-mini-stat">
          <span class="stat-label">Ticket Promedio</span>
          <strong class="stat-val tnum">S/ {Math.round(totalSales / (totalOrders || 1))}</strong>
        </div>
        <div class="chart-mini-stat">
          <span class="stat-label">Comisión NexaMarket</span>
          <strong class="stat-val tnum text-brand">S/ {Math.round(totalSales * 0.1).toLocaleString("es-PE")}</strong>
        </div>
        <div class="chart-mini-stat">
          <span class="stat-label">Tasa de Aprobación MP</span>
          <strong class="stat-val tnum text-success">98.6%</strong>
        </div>
      </div>
    </div>
  );
}

export function UserGrowthChart() {
  const months = [
    { name: "Jul", buyers: 42, sellers: 6 },
    { name: "Ago", buyers: 58, sellers: 9 },
    { name: "Set", buyers: 86, sellers: 14 },
    { name: "Oct", buyers: 124, sellers: 21 },
    { name: "Nov", buyers: 185, sellers: 32 },
  ];

  const maxUsers = 200;

  return (
    <div class="panel dashboard-chart-card">
      <div class="chart-header">
        <div>
          <span class="eyebrow">CRECIMIENTO DE COMUNIDAD</span>
          <h3 class="chart-title">Adquisición de Compradores y Sellers</h3>
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-dot dot-buyers" /> Compradores</span>
          <span class="legend-item"><span class="legend-dot dot-sellers" /> Vendedores</span>
        </div>
      </div>

      <div class="bar-chart-container">
        {months.map((m) => {
          const buyerHeight = (m.buyers / maxUsers) * 100;
          const sellerHeight = (m.sellers / maxUsers) * 100;
          return (
            <div class="bar-col-group" key={m.name}>
              <div class="bar-bars-wrapper">
                {/* Buyers Bar */}
                <div class="bar-track-col">
                  <div
                    class="bar-fill-elem bar-buyer"
                    style={{ height: `${buyerHeight}%` }}
                    title={`${m.name}: ${m.buyers} Compradores`}
                  >
                    <span class="bar-val-badge">{m.buyers}</span>
                  </div>
                </div>

                {/* Sellers Bar */}
                <div class="bar-track-col">
                  <div
                    class="bar-fill-elem bar-seller"
                    style={{ height: `${sellerHeight}%` }}
                    title={`${m.name}: ${m.sellers} Vendedores`}
                  >
                    <span class="bar-val-badge">{m.sellers}</span>
                  </div>
                </div>
              </div>
              <span class="bar-month-label">{m.name}</span>
            </div>
          );
        })}
      </div>

      <div class="chart-footer-metrics">
        <div class="chart-mini-stat">
          <span class="stat-label">Compradores Activos</span>
          <strong class="stat-val tnum">495</strong>
        </div>
        <div class="chart-mini-stat">
          <span class="stat-label">Vendedores Verificados</span>
          <strong class="stat-val tnum text-brand">82</strong>
        </div>
        <div class="chart-mini-stat">
          <span class="stat-label">Ratio de Conversión</span>
          <strong class="stat-val tnum text-success">16.5%</strong>
        </div>
      </div>
    </div>
  );
}

export function OrderStatusDonutChart() {
  const slices = [
    { label: "Pagados & Aprobados", count: 14, pct: 74, color: "#10b981" },
    { label: "En Preparación", count: 3, pct: 16, color: "#2563eb" },
    { label: "En Camino", count: 2, pct: 8, color: "#f59e0b" },
    { label: "Entregados", count: 1, pct: 2, color: "#8b5cf6" },
  ];

  return (
    <div class="panel dashboard-chart-card">
      <div class="chart-header">
        <div>
          <span class="eyebrow">FLUJO OPERATIVO</span>
          <h3 class="chart-title">Distribución de Órdenes</h3>
        </div>
        <span class="status status-success">Tiempo Real</span>
      </div>

      <div class="donut-chart-layout">
        {/* SVG Donut */}
        <div class="donut-svg-wrap">
          <svg viewBox="0 0 160 160" class="donut-svg">
            <circle cx="80" cy="80" r="60" fill="none" stroke="var(--line)" stroke-width="20" />
            {/* Pagados (74%) stroke-dasharray = 0.74 * 377 = 279, circum = 377 */}
            <circle
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke="#10b981"
              stroke-width="20"
              stroke-dasharray="278.9 377"
              stroke-dashoffset="0"
              transform="rotate(-90 80 80)"
            />
            {/* En preparacion (16%) = 60.3 */}
            <circle
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke="#2563eb"
              stroke-width="20"
              stroke-dasharray="60.3 377"
              stroke-dashoffset="-278.9"
              transform="rotate(-90 80 80)"
            />
            {/* En camino (8%) = 30 */}
            <circle
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke="#f59e0b"
              stroke-width="20"
              stroke-dasharray="30.1 377"
              stroke-dashoffset="-339.2"
              transform="rotate(-90 80 80)"
            />
          </svg>
          <div class="donut-center-text">
            <strong class="donut-total-num">19</strong>
            <small>Órdenes</small>
          </div>
        </div>

        {/* Legend List */}
        <div class="donut-legend-list">
          {slices.map((s) => (
            <div class="donut-legend-item" key={s.label}>
              <div class="legend-color-indicator" style={{ backgroundColor: s.color }} />
              <div class="legend-info">
                <span class="legend-name">{s.label}</span>
                <span class="legend-count tnum">{s.count} pedidos ({s.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
