"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import { DateRangePicker } from "@/components/date-range-picker"
import { MethodologySwitcher } from "@/components/methodology-switcher"
import { generateEmissionsSeries, type SeriesPoint, type Granularity } from "@/lib/data-generator"

type TrendView = "line" | "bar" | "area"
type BreakdownView = "pie" | "bar"

const EMISSION_ORDER = [
  { key: "fuel", label: "Fuel Combustion" },
  { key: "flaring", label: "Flaring" },
  { key: "venting", label: "Venting" },
  { key: "fugitive", label: "Fugitive Emissions" },
  { key: "total", label: "Total" }, // TOTAL UVEK POSLEDNJI
] as const

const SERIES_META: Record<string, { label: string; colorVar: string }> = {
  fuel: { label: "Fuel Combustion", colorVar: "--chart-2" },
  flaring: { label: "Flaring", colorVar: "--chart-3" },
  venting: { label: "Venting", colorVar: "--chart-4" },
  fugitive: { label: "Fugitive Emissions", colorVar: "--chart-5" },
  total: { label: "Total", colorVar: "--chart-1" }, // total (deblji)
}

function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function clampRange(from: Date, to: Date) {
  if (from > to) return { from: to, to: from }
  return { from, to }
}

export default function Page() {
  const today = startOfToday()
  const defaultFrom = addDays(today, -90)

  const [granularity, setGranularity] = React.useState<Granularity>("monthly")
  const [trendView, setTrendView] = React.useState<TrendView>("line")
  const [breakdownView, setBreakdownView] = React.useState<BreakdownView>("pie")

  const [range, setRange] = React.useState<{ from: Date; to: Date }>(clampRange(defaultFrom, today))

  const [methodology, setMethodology] = React.useState<string>("ISO 14064 / ISO 14067")
  const [factor, setFactor] = React.useState<number>(1.05)

  const series: SeriesPoint[] = React.useMemo(() => {
    return generateEmissionsSeries({
      from: range.from,
      to: range.to,
      granularity,
      factor,
    })
  }, [range.from, range.to, granularity, factor])

  const totals = React.useMemo(() => {
    const acc = { fuel: 0, flaring: 0, venting: 0, fugitive: 0, total: 0 }
    for (const p of series) {
      acc.fuel += p.fuel
      acc.flaring += p.flaring
      acc.venting += p.venting
      acc.fugitive += p.fugitive
      acc.total += p.total
    }
    return acc
  }, [series])

  const breakdownData = React.useMemo(
    () => [
      { name: "Fuel Combustion", value: totals.fuel, key: "fuel" },
      { name: "Flaring", value: totals.flaring, key: "flaring" },
      { name: "Venting", value: totals.venting, key: "venting" },
      { name: "Fugitive Emissions", value: totals.fugitive, key: "fugitive" },
      { name: "Total", value: totals.total, key: "total" },
    ],
    [totals]
  )

  return (
    <div className="min-h-screen w-full bg-app text-foreground">
      <div className="px-6 py-5">
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* BIGGER logo, transparent-friendly */}
            <div className="relative h-30 w-30 overflow-hidden rounded-xl bg-transparent ring-1 ring-white/10">
              <Image
                src="/logo.png"
                alt="DigitalOps Consulting"
                fill
                className="object-contain brand-logo"
                priority
              />
            </div>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground/95">DigitalOps Consulting</div>
              <div className="text-xs text-foreground/70">GHG Emissions Platform</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[140px]">
              <div className="mb-1 text-xs font-medium text-foreground/70">Granularity</div>
              <select
                className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-400/30 [color-scheme:dark]"
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as Granularity)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="min-w-[360px]">
            <DateRangePicker
  value={range}
  onChange={(v) => {
    if (!v?.from || !v?.to) return
    setRange(clampRange(v.from, v.to))
  }}
/>

            </div>

            <div className="min-w-[240px]">
              <div className="mb-1 text-xs font-medium text-foreground/70">Methodology</div>
              <MethodologySwitcher
                value={methodology}
                onChange={(m) => {
                  setMethodology(m.label)
                  setFactor(m.factor)
                }}
              />
            </div>

            
          </div>
        </div>

        {/* Title card */}
        <Card className="mb-6 border-white/10 bg-card/60 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">GHG Emissions Dashboard</h1>
              <div className="text-sm text-foreground/70">
                Methodology: {methodology} (factor {factor.toFixed(2)})
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Fuel Combustion" value={totals.fuel} colorKey="fuel" />
          <KpiCard title="Flaring" value={totals.flaring} colorKey="flaring" />
          <KpiCard title="Venting" value={totals.venting} colorKey="venting" />
          <KpiCard title="Fugitive Emissions" value={totals.fugitive} colorKey="fugitive" />
          <KpiCard title="Total" value={totals.total} colorKey="total" />
        </div>

        {/* Charts row */}
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {/* LEFT */}
          <Card className="xl:col-span-2 border-white/10 bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Emissions Trend</CardTitle>
              <div className="inline-flex rounded-md border border-white/10 bg-white/5 p-1">
                <TabBtn active={trendView === "line"} onClick={() => setTrendView("line")}>Line</TabBtn>
                <TabBtn active={trendView === "bar"} onClick={() => setTrendView("bar")}>Bar</TabBtn>
                <TabBtn active={trendView === "area"} onClick={() => setTrendView("area")}>Area</TabBtn>
              </div>
            </CardHeader>

            <CardContent className="pb-6">
              <div className="h-[380px] w-full">
                {trendView === "line" && <TrendLineChart data={series} />}
                {trendView === "bar" && <TrendBarChart data={series} />}
                {trendView === "area" && <TrendAreaChart data={series} />}
              </div>
            </CardContent>
          </Card>

          {/* RIGHT */}
          <Card className="border-white/10 bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Breakdown</CardTitle>
              <div className="inline-flex rounded-md border border-white/10 bg-white/5 p-1">
                <TabBtn active={breakdownView === "pie"} onClick={() => setBreakdownView("pie")}>Pie</TabBtn>
                <TabBtn active={breakdownView === "bar"} onClick={() => setBreakdownView("bar")}>Bar</TabBtn>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-6">
              {/* smaller list */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-xs font-medium text-foreground/70">Selected period totals</div>

                <div className="space-y-2 text-sm">
                  {EMISSION_ORDER.map(({ key, label }) => {
                    const meta = SERIES_META[key]
                    const val = (totals as any)[key] as number
                    return (
                      <React.Fragment key={key}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: `hsl(var(${meta.colorVar}))` }}
                            />
                            <span className="text-foreground/90">{label}</span>
                          </div>
                          <span className="tabular-nums text-foreground/95">
                            {formatNumber(val)} tCO₂e
                          </span>
                        </div>

                        {/* line under Fugitive -> Total as sum */}
                        {key === "fugitive" && <div className="my-2 h-px w-full bg-white/10" />}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>

              {/* bigger chart */}
              <div className="h-[330px] w-full">
                {breakdownView === "pie" && <BreakdownPie data={breakdownData} />}
                {breakdownView === "bar" && <BreakdownBar data={breakdownData} />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded px-3 text-sm font-medium transition",
        "text-foreground/80 hover:text-foreground",
        active && "bg-white/10 text-foreground ring-1 ring-white/15"
      )}
      type="button"
    >
      {children}
    </button>
  )
}

function KpiCard({
  title,
  value,
  colorKey,
}: {
  title: string
  value: number
  colorKey: keyof typeof SERIES_META
}) {
  const colorVar = SERIES_META[colorKey].colorVar
  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-foreground/80">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums" style={{ color: `hsl(var(${colorVar}))` }}>
          {formatNumber(value)} tCO₂e
        </div>
        <div className="text-xs text-foreground/60">Selected period</div>
      </CardContent>
    </Card>
  )
}

function commonTooltip() {
  return (
    <Tooltip
      contentStyle={{
        background: "rgba(10, 15, 12, 0.92)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
      }}
      labelStyle={{ color: "rgba(255,255,255,0.85)" }}
      itemStyle={{ color: "rgba(255,255,255,0.9)" }}
      formatter={(v: any, name: any) => [`${formatNumber(Number(v))}`, name]}
    />
  )
}

function TrendLineChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.55)" tick={{ fontSize: 11 }} />
        <YAxis
  stroke="rgba(255,255,255,0.55)"
  tick={{ fontSize: 11 }}
  tickFormatter={(v: number) => formatNumber(v)}
/>

        {commonTooltip()}
        <Legend
  itemSorter={(item: any) => {
    const order = ["fuel", "flaring", "venting", "fugitive", "total"]
    return order.indexOf(item.dataKey)
  }}
/>


        {EMISSION_ORDER.map(({ key }) => {
          const meta = SERIES_META[key]
          const isTotal = key === "total"
          return (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={meta.label}
              dot={false}
              stroke={`hsl(var(${meta.colorVar}))`}
              strokeWidth={isTotal ? 3 : 2}
              opacity={isTotal ? 1 : 0.9}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

function TrendAreaChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.55)" tick={{ fontSize: 11 }} />
        <YAxis
  stroke="rgba(255,255,255,0.55)"
  tick={{ fontSize: 11 }}
  tickFormatter={(v: number) => formatNumber(v)}
/>

        {commonTooltip()}
        <Legend
  itemSorter={(item: any) => {
    const order = ["fuel", "flaring", "venting", "fugitive", "total"]
    return order.indexOf(item.dataKey)
  }}
/>



        {EMISSION_ORDER.map(({ key }) => {
          const meta = SERIES_META[key]
          const isTotal = key === "total"
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={meta.label}
              stroke={`hsl(var(${meta.colorVar}))`}
              fill={`hsl(var(${meta.colorVar}))`}
              fillOpacity={isTotal ? 0.12 : 0.08}
              strokeWidth={isTotal ? 3 : 2}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}

function TrendBarChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.55)" tick={{ fontSize: 11 }} />
        <YAxis
  stroke="rgba(255,255,255,0.55)"
  tick={{ fontSize: 11 }}
  tickFormatter={(v: number) => formatNumber(v)}
/>

        {commonTooltip()}
        <Legend
  itemSorter={(item: any) => {
    const order = ["fuel", "flaring", "venting", "fugitive", "total"]
    return order.indexOf(item.dataKey)
  }}
/>



        {EMISSION_ORDER.map(({ key }) => {
          const meta = SERIES_META[key]
          return (
            <Bar
              key={key}
              dataKey={key}
              name={meta.label}
              fill={`hsl(var(${meta.colorVar}))`}
              fillOpacity={key === "total" ? 0.95 : 0.75}
              radius={[6, 6, 0, 0]}
            />
          )
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}

function BreakdownPie({ data }: { data: { name: string; value: number; key: string }[] }) {
  // total not a "slice" (would dominate) -> exclude from pie
  const pieData = data.filter((d) => d.key !== "total")

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={110} paddingAngle={2}>
          {pieData.map((entry) => {
            const meta = SERIES_META[entry.key]
            return <Cell key={entry.key} fill={`hsl(var(${meta.colorVar}))`} />
          })}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "rgba(10, 15, 12, 0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
          }}
          formatter={(v: any, name: any) => [`${formatNumber(Number(v))} tCO₂e`, name]}
        />
        <Legend
  itemSorter={(item: any) => {
    const idx = EMISSION_ORDER.findIndex((x) => x.key === item.dataKey)
    return idx === -1 ? 999 : idx
  }}
/>

      </PieChart>
    </ResponsiveContainer>
  )
}

function BreakdownBar({ data }: { data: { name: string; value: number; key: string }[] }) {
  const ordered = EMISSION_ORDER.map(({ key }) => data.find((d) => d.key === key)!)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={ordered} margin={{ left: 10, right: 10, top: 10, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
        <XAxis
          dataKey="name"
          stroke="rgba(255,255,255,0.55)"
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={60}
        />
        <YAxis
  stroke="rgba(255,255,255,0.55)"
  tick={{ fontSize: 11 }}
  tickFormatter={(v: number) => formatNumber(v)}
/>

        <Tooltip
          contentStyle={{
            background: "rgba(10, 15, 12, 0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
          }}
          formatter={(v: any) => [`${formatNumber(Number(v))} tCO₂e`, "Value"]}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {ordered.map((entry) => {
            const meta = SERIES_META[entry.key]
            return (
              <Cell
                key={entry.key}
                fill={`hsl(var(${meta.colorVar}))`}
                fillOpacity={entry.key === "total" ? 0.95 : 0.8}
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
