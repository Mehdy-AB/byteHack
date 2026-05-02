const SEV_STYLES: Record<string, React.CSSProperties> = {
  CRITICAL: { background: 'color-mix(in oklab, var(--severity-critical) 15%, transparent)', color: 'var(--severity-critical)', border: '1px solid color-mix(in oklab, var(--severity-critical) 30%, transparent)' },
  HIGH: { background: 'color-mix(in oklab, var(--severity-high) 15%, transparent)', color: 'var(--severity-high)', border: '1px solid color-mix(in oklab, var(--severity-high) 30%, transparent)' },
  MEDIUM: { background: 'color-mix(in oklab, var(--severity-medium) 15%, transparent)', color: 'var(--severity-medium)', border: '1px solid color-mix(in oklab, var(--severity-medium) 30%, transparent)' },
  LOW: { background: 'color-mix(in oklab, var(--severity-low) 15%, transparent)', color: 'var(--severity-low)', border: '1px solid color-mix(in oklab, var(--severity-low) 30%, transparent)' },
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  OPEN: { background: 'color-mix(in oklab, var(--severity-high) 12%, transparent)', color: 'var(--severity-high)', border: '1px solid color-mix(in oklab, var(--severity-high) 25%, transparent)' },
  CONTAINED: { background: 'color-mix(in oklab, var(--severity-medium) 12%, transparent)', color: 'var(--severity-medium)', border: '1px solid color-mix(in oklab, var(--severity-medium) 25%, transparent)' },
  RESOLVED: { background: 'color-mix(in oklab, var(--status-done) 12%, transparent)', color: 'var(--status-done)', border: '1px solid color-mix(in oklab, var(--status-done) 25%, transparent)' },
  CLOSED: { background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' },
  SUSPENDED: { background: 'color-mix(in oklab, var(--severity-medium) 12%, transparent)', color: 'var(--severity-medium)', border: '1px solid color-mix(in oklab, var(--severity-medium) 25%, transparent)' },
  WAITING_APPROVAL: { background: 'color-mix(in oklab, var(--severity-medium) 15%, transparent)', color: 'var(--severity-medium)', border: '1px solid color-mix(in oklab, var(--severity-medium) 30%, transparent)' },
  FAILED: { background: 'color-mix(in oklab, var(--severity-critical) 12%, transparent)', color: 'var(--severity-critical)', border: '1px solid color-mix(in oklab, var(--severity-critical) 25%, transparent)' },
  SUCCESS: { background: 'color-mix(in oklab, var(--status-done) 12%, transparent)', color: 'var(--status-done)', border: '1px solid color-mix(in oklab, var(--status-done) 25%, transparent)' },
  APPROVED: { background: 'color-mix(in oklab, var(--status-done) 12%, transparent)', color: 'var(--status-done)', border: '1px solid color-mix(in oklab, var(--status-done) 25%, transparent)' },
  PENDING: { background: 'color-mix(in oklab, var(--status-pending) 12%, transparent)', color: 'var(--status-pending)', border: '1px solid color-mix(in oklab, var(--status-pending) 25%, transparent)' },
  RUNNING: { background: 'color-mix(in oklab, var(--primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)' },
  SKIPPED: { background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' },
  ARCHIVED: { background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' },
}

const DEFAULT_STYLE: React.CSSProperties = {
  background: 'color-mix(in oklab, var(--muted) 40%, transparent)',
  color: 'var(--color-muted-foreground)',
  border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)',
}

export function SeverityBadge({ severity }: { severity: string }) {
  const style = SEV_STYLES[severity] ?? DEFAULT_STYLE
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={style}
    >
      {severity}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STYLE
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={style}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
