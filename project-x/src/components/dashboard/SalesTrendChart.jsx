import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatCurrency(value, currency = 'INR', compact = false) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  }).format(Number(value) || 0)
}

function formatDateLabel(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

function SalesTrendTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-white/8 bg-[#0F172A]/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-xs font-medium text-slate-400">{formatDateLabel(label)}</p>
      <p className="mt-1 text-sm font-semibold text-slate-50">
        {formatCurrency(payload[0]?.value, currency)}
      </p>
    </div>
  )
}

function SalesTrendChart({ currency = 'INR', data = [] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0F172A]/60">
        <p className="text-sm text-slate-400">No data</p>
      </div>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={28}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            tickFormatter={formatDateLabel}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, currency, true)}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<SalesTrendTooltip currency={currency} />} cursor={false} />
          <Line
            dataKey="revenue"
            dot={false}
            stroke="#38BDF8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SalesTrendChart
