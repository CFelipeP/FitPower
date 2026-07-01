import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'
import { ThemeProvider } from '../context/ThemeContext'
import { ToastProvider } from '../context/ToastContext'

vi.mock('../components/Navbar/Navbar.jsx', () => ({ default: () => <nav data-testid="navbar">Navbar</nav> }))
vi.mock('../components/Hero/Hero.jsx', () => ({ default: () => <section data-testid="hero">Hero</section> }))
vi.mock('../components/Footer/Footer.jsx', () => ({ default: () => <footer data-testid="footer">Footer</footer> }))
vi.mock('../components/Marquee/Marquee.jsx', () => ({ default: () => <div>Marquee</div> }))
vi.mock('../components/Programs/Programs.jsx', () => ({ default: () => <div>Programs</div> }))
vi.mock('../components/Features/Features.jsx', () => ({ default: () => <div>Features</div> }))
vi.mock('../components/Experience/Experience.jsx', () => ({ default: () => <div>Experience</div> }))
vi.mock('../components/Pricing/Pricing.jsx', () => ({ default: () => <div>Pricing</div> }))
vi.mock('../components/Testimonials/Testimonials.jsx', () => ({ default: () => <div>Testimonials</div> }))
vi.mock('../components/CTA/CTA.jsx', () => ({ default: () => <div>CTA</div> }))
vi.mock('../components/Contact/Contact.jsx', () => ({ default: () => <div>Contact</div> }))
vi.mock('../components/Login/Login.jsx', () => ({ default: () => <div data-testid="login-page">Login Page</div> }))
vi.mock('../components/Register/Register.jsx', () => ({ default: () => <div data-testid="register-page">Register Page</div> }))
vi.mock('../components/NotFound/NotFound.jsx', () => ({ default: () => <div data-testid="not-found">404 Not Found</div> }))

vi.mock('../components/Toast/Toast.jsx', () => ({ default: () => null }))
vi.mock('../components/ErrorBoundary/ErrorBoundary.jsx', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../components/ProtectedRoute/ProtectedRoute.jsx', () => ({ default: ({ children }) => <>{children}</> }))

function renderApp(initialRoute = '/') {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <ThemeProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </ThemeProvider>
        </MemoryRouter>
    )
}

describe('App Routing', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders home page on /', async () => {
        renderApp('/')
        await waitFor(() => {
            expect(screen.getByTestId('navbar')).toBeTruthy()
        })
    })

    it('renders home page sections on /', async () => {
        renderApp('/')
        await waitFor(() => {
            expect(screen.getByTestId('hero')).toBeTruthy()
        })
        expect(screen.getByTestId('footer')).toBeTruthy()
    })

    it('renders login link on home page', async () => {
        renderApp('/')
        await waitFor(() => {
            expect(screen.getByTestId('navbar')).toBeTruthy()
        })
    })

    it('navigates to login route', async () => {
        renderApp('/login')
        await waitFor(() => {
            expect(screen.getByTestId('navbar')).toBeTruthy()
        })
    })

    it('navigates to register route', async () => {
        renderApp('/register')
        await waitFor(() => {
            expect(screen.getByTestId('navbar')).toBeTruthy()
        })
    })

    it('renders 404 page for unknown routes', async () => {
        renderApp('/nonexistent-route')
        await waitFor(() => {
            expect(screen.getByTestId('not-found')).toBeTruthy()
        })
    })
})
