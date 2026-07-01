import { useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import './DriverTour.css'

const steps = [
    {
        element: '.sb-sidebar',
        popover: {
            title: 'Navigation Menu',
            description: 'Access all sections of your coach dashboard — Dashboard, Schedule, Clients, Programs, Workout Builder, Analytics, and more.',
            side: 'right',
            align: 'center',
        }
    },
    {
        element: '.cd-search-input',
        popover: {
            title: 'Quick Search',
            description: 'Search for clients, programs, or sessions instantly.',
            side: 'bottom',
            align: 'start',
        }
    },
    {
        element: '.cd-kpi-grid',
        popover: {
            title: 'Performance Overview',
            description: 'Track your key metrics at a glance — active clients, today\'s sessions, completion rate, and average rating.',
            side: 'bottom',
            align: 'center',
        }
    },
    {
        element: '.cd-session-list',
        popover: {
            title: 'Today\'s Schedule',
            description: 'View and manage your upcoming sessions. Click any session for details or click "View Schedule" to see your full calendar.',
            side: 'left',
            align: 'center',
        }
    },
    {
        element: '.cd-client-progress',
        popover: {
            title: 'Client Progress',
            description: 'Monitor each client\'s progress through their program. Green bars indicate on-track performance.',
            side: 'left',
            align: 'center',
        }
    },
    {
        element: '.cd-weekly-bar-chart',
        popover: {
            title: 'Weekly Volume',
            description: 'Visualize your weekly session distribution. Spot trends and balance your workload across the week.',
            side: 'top',
            align: 'center',
        }
    },
    {
        element: '.cd-prog-list',
        popover: {
            title: 'My Programs',
            description: 'Manage your training programs. Create new programs, track enrollments, and monitor engagement.',
            side: 'left',
            align: 'center',
        }
    },
    {
        element: '.cd-earnings-total',
        popover: {
            title: 'Earnings Overview',
            description: 'Track your revenue from coaching sessions, programs, and royalties.',
            side: 'left',
            align: 'center',
        }
    },
    {
        element: '.cd-roster',
        popover: {
            title: 'Client Roster',
            description: 'View your full client list with their current program and status. Click a client to see their profile.',
            side: 'top',
            align: 'center',
        }
    },
    {
        element: '.cd-attention-list',
        popover: {
            title: 'Attention Required',
            description: 'Stay on top of important actions — missed sessions, client messages, and pending items appear here.',
            side: 'top',
            align: 'center',
        }
    },
]

export default function DriverTour({ visible }) {
    const startTour = useCallback(() => {
        const isMobile = window.innerWidth <= 768
        const driverObj = driver({
            animate: !isMobile,
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            steps,
            popoverClass: 'driver-tour-theme',
            stagePadding: isMobile ? 4 : 8,
            overlayPadding: isMobile ? 2 : 4,
        })
        driverObj.drive()
    }, [])

    if (!visible) return null

    return (
        <button className="driver-tour-fab" onClick={startTour} title="Tour Guide">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
            </svg>
        </button>
    )
}
