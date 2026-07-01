import './LoadingSkeleton.css'

export function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', style }) {
    return <div className="skeleton" style={{ width, height, borderRadius, ...style }} />
}

export function CardSkeleton() {
    return (
        <div className="skeleton-card">
            <Skeleton height="24px" width="60%" />
            <Skeleton height="16px" />
            <Skeleton height="16px" width="80%" />
            <Skeleton height="40px" width="40%" />
        </div>
    )
}

export function TableSkeleton({ rows = 5 }) {
    return (
        <div className="skeleton-table">
            <Skeleton height="32px" width="100%" />
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} height="48px" width="100%" />
            ))}
        </div>
    )
}

export function DashboardSkeleton() {
    return (
        <div className="skeleton-dashboard">
            <div className="skeleton-kpi-row">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton-kpi">
                        <Skeleton height="48px" width="48px" borderRadius="12px" />
                        <Skeleton height="28px" width="80px" />
                        <Skeleton height="14px" width="120px" />
                    </div>
                ))}
            </div>
            <div className="skeleton-content-row">
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
