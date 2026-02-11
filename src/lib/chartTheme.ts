/**
 * Shared Recharts theme constants for dark-mode-safe styling.
 *
 * Use these in every `<Tooltip>`, `<XAxis>`, and `<YAxis>` so chart
 * text automatically adapts to the current color scheme.
 */

/** Drop this into every Recharts `<Tooltip contentStyle={…} />`. */
export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
};

/** Cursor highlight when hovering a bar chart. */
export const CHART_CURSOR = { fill: "rgba(0,0,0,0.05)" };

/** Common axis props — spread onto `<XAxis>` / `<YAxis>`. */
export const CHART_AXIS_PROPS = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;
