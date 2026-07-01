import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import PricingPlans from './PricingPlans'
import { createMockPlan } from '../../__tests__/mocks'

vi.mock('../../lib/api', () => ({
    apiFetch: vi.fn(),
}))

vi.mock('../../context/ToastContext', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))

const mockPlans = [
    createMockPlan({ id: 1, name: 'Starter', price_monthly: 19, price_yearly: 13, popular: false, features: [{ name: 'AI Workouts' }, { name: 'Basic Analytics' }] }),
    createMockPlan({ id: 2, name: 'Pro', price_monthly: 39, price_yearly: 27, popular: true, features: [{ name: 'Everything in Starter' }, { name: 'Advanced Analytics' }, { name: 'Coach Chat' }] }),
    createMockPlan({ id: 3, name: 'Elite', price_monthly: 69, price_yearly: 48, popular: false, features: [{ name: 'Everything in Pro' }, { name: '1-on-1 Coaching' }, { name: 'Custom Meal Plans' }, { name: 'Priority Support' }] }),
]

describe('PricingPlans Component', () => {
    let apiFetch

    beforeEach(async () => {
        vi.clearAllMocks()
        apiFetch = (await import('../../lib/api')).apiFetch
        apiFetch.mockResolvedValue(mockPlans)
    })

    it('shows loading state initially', async () => {
        apiFetch.mockReturnValue(new Promise(() => {}))
        const { container } = render(<PricingPlans />)
        expect(container.querySelector('.pricing-loading')).toBeTruthy()
    })

    it('renders all plans after loading', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            expect(screen.getByText('Starter')).toBeTruthy()
        })
        expect(screen.getByText('Pro')).toBeTruthy()
        expect(screen.getByText('Elite')).toBeTruthy()
    })

    it('shows monthly prices by default', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            expect(screen.getByText('$19')).toBeTruthy()
            expect(screen.getByText('$39')).toBeTruthy()
            expect(screen.getByText('$69')).toBeTruthy()
        })
    })

    it('shows yearly prices when toggled', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            expect(screen.getByText('Starter')).toBeTruthy()
        })

        const yearlyBtn = screen.getByText('Yearly')
        await userEvent.click(yearlyBtn)

        expect(screen.getByText('$13')).toBeTruthy()
        expect(screen.getByText('$27')).toBeTruthy()
        expect(screen.getByText('$48')).toBeTruthy()
    })

    it('shows monthly prices after toggling back', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            expect(screen.getByText('Starter')).toBeTruthy()
        })

        await userEvent.click(screen.getByText('Yearly'))
        await userEvent.click(screen.getByText('Monthly'))

        expect(screen.getByText('$19')).toBeTruthy()
        expect(screen.getByText('$39')).toBeTruthy()
        expect(screen.getByText('$69')).toBeTruthy()
    })

    it('marks popular plan with badge', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            const popularBadges = document.querySelectorAll('.pricing-card-badge')
            expect(popularBadges.length).toBe(1)
            expect(popularBadges[0].textContent).toBe('Most Popular')
        })
    })

    it('marks popular card with popular class', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            const popularCards = document.querySelectorAll('.pricing-card.popular')
            expect(popularCards.length).toBe(1)
        })
    })

    it('disables subscribe button during purchase', async () => {
        apiFetch.mockResolvedValue(mockPlans)

        render(<PricingPlans />)

        await waitFor(() => {
            expect(screen.getByText('Starter')).toBeTruthy()
        })

        const subscribeBtns = document.querySelectorAll('.pricing-card-btn')
        expect(subscribeBtns.length).toBe(3)

        apiFetch.mockImplementation(() => new Promise(() => {}))
        await userEvent.click(subscribeBtns[0])

        await waitFor(() => {
            expect(subscribeBtns[0].disabled).toBe(true)
        })
    })

    it('renders feature lists for each plan', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            expect(screen.getByText('AI Workouts')).toBeTruthy()
            expect(screen.getByText('Advanced Analytics')).toBeTruthy()
            expect(screen.getByText('1-on-1 Coaching')).toBeTruthy()
        })
    })

    it('shows save amount for yearly billing', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            expect(screen.getByText('Starter')).toBeTruthy()
        })

        await userEvent.click(screen.getByText('Yearly'))

        await waitFor(() => {
            const saveElements = document.querySelectorAll('.pricing-card-save')
            expect(saveElements.length).toBe(3)
        })
    })

    it('toggles active class on billing buttons', async () => {
        render(<PricingPlans />)

        await waitFor(() => {
            expect(screen.getByText('Starter')).toBeTruthy()
        })

        const monthlyBtn = screen.getByText('Monthly')
        const yearlyBtn = screen.getByText('Yearly')

        expect(monthlyBtn.className).toContain('active')
        expect(yearlyBtn.className).not.toContain('active')

        await userEvent.click(yearlyBtn)

        expect(monthlyBtn.className).not.toContain('active')
        expect(yearlyBtn.className).toContain('active')
    })
})
