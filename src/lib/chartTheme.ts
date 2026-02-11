/**
 * Shared Recharts theme constants for dark-mode-safe styling.
 *
 * Use these in every `<Tooltip>`, `<XAxis>`, and `<YAxis>` so chart
 * text automatically adapts to the current color scheme.
 */

/** Drop this into every Recharts `<Tooltip contentStyle={…} />`. */
export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  borderRadius: "8px",
  color: "var(--foreground)",
};

/** Shared label style for tooltips. */
export const CHART_TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: "var(--foreground)",
  fontWeight: "600",
};

/** Shared item style for tooltip content. */
export const CHART_TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: "var(--muted-foreground)",
};

/** Cursor highlight when hovering a bar chart. */
export const CHART_CURSOR = { fill: "rgba(255,255,255,0.05)" };

/** Common axis props — spread onto `<XAxis>` / `<YAxis>`. */
export const CHART_AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;
