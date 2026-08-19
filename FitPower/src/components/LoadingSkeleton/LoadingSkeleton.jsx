import './LoadingSkeleton.css'

const numberToCss = (v) => (typeof v === 'number' ? `${v}px` : v)

export function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', style }) {
    return (
        <div
            className="skeleton"
            aria-hidden="true"
            style={{ width: numberToCss(width), height: numberToCss(height), borderRadius: numberToCss(borderRadius), ...style }}
        />
    )
}

export function CardSkeleton() {
    return (
        <div className="skeleton-card" aria-hidden="true">
            <Skeleton height="24px" width="60%" />
            <Skeleton height="16px" />
            <Skeleton height="16px" width="80%" />
            <Skeleton height="40px" width="40%" />
        </div>
    )
}

export function TableSkeleton({ rows = 5 }) {
    const safeRows = Number.isFinite(rows) && rows > 0 ? Math.min(rows, 50) : 5
    return (
        <div className="skeleton-table" aria-hidden="true">
            <Skeleton height="32px" width="100%" />
            {Array.from({ length: safeRows }).map((_, i) => (
                <Skeleton key={i} height="48px" width="100%" />
            ))}
        </div>
    )
}

export function DashboardSkeleton() {
    return (
        <div className="skeleton-dashboard" role="status" aria-label="Loading dashboard">
            <span className="sr-only">Loading dashboard content</span>
            <div className="skeleton-kpi-row" aria-hidden="true">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton-kpi">
                        <Skeleton height="48px" width="48px" borderRadius="12px" />
                        <Skeleton height="28px" width="100%" />
                        <Skeleton height="14px" width="100%" />
                    </div>
                ))}
            </div>
            <div className="skeleton-content-row" aria-hidden="true">
                <div className="skeleton-main-content">
                    <Skeleton height="200px" />
                    <Skeleton height="120px" />
                </div>
                <div className="skeleton-sidebar-content">
                    <Skeleton height="200px" />
                    <Skeleton height="120px" />
                </div>
            </div>
        </div>
    )
}
