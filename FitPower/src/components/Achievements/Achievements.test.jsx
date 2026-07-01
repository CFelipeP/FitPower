import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Achievements from './Achievements'
import { createMockAchievement } from '../../__tests__/mocks'

vi.mock('../../lib/api', () => ({
    apiFetch: vi.fn(),
}))

const mockAchievements = [
    createMockAchievement({ id: 1, name: 'First Workout', description: 'Complete your first workout', icon: 'Dumbbell', type: 'workouts', requirement: 1, points: 10, unlocked: true, unlocked_at: '2024-01-01' }),
    createMockAchievement({ id: 2, name: '7-Day Streak', description: 'Work out 7 days in a row', icon: 'Flame', type: 'streak', requirement: 7, points: 50, unlocked: false, unlocked_at: null }),
    createMockAchievement({ id: 3, name: 'Centurion', description: 'Complete 100 workouts', icon: 'Trophy', type: 'workouts', requirement: 100, points: 500, unlocked: false, unlocked_at: null }),
]

const mockStats = [{ points: 10, workouts_completed: 1, streak_days: 0 }]

describe('Achievements Component', () => {
    let apiFetch

    beforeEach(async () => {
        vi.clearAllMocks()
        apiFetch = (await import('../../lib/api')).apiFetch
    })

    it('shows loading state initially', async () => {
        apiFetch.mockReturnValue(new Promise(() => {}))
        const { container } = render(<Achievements />)
        expect(container.querySelector('.achievements-loading')).toBeTruthy()
    })

    it('renders achievements list correctly', async () => {
        apiFetch.mockResolvedValue(mockAchievements)

        render(<Achievements />)

        await waitFor(() => {
            expect(screen.getByText('First Workout')).toBeTruthy()
        })
        expect(screen.getByText('7-Day Streak')).toBeTruthy()
        expect(screen.getByText('Centurion')).toBeTruthy()
        expect(screen.getByText('+10pts')).toBeTruthy()
        expect(screen.getByText('1/3')).toBeTruthy()
    })

    it('renders locked achievements with lock class', async () => {
        apiFetch.mockResolvedValue(mockAchievements)

        render(<Achievements />)

        await waitFor(() => {
            const lockedItems = document.querySelectorAll('.achievement-item.locked')
            expect(lockedItems.length).toBe(2)
        })
    })

    it('shows compact mode with empty state when no achievements unlocked', async () => {
        const lockedOnly = mockAchievements.map(a => ({ ...a, unlocked: false }))
        apiFetch.mockResolvedValue(lockedOnly)

        render(<Achievements compact={true} />)

        await waitFor(() => {
            expect(screen.getByText('Complete workouts to earn achievements')).toBeTruthy()
        })
    })

    it('shows compact mode with badges when achievements unlocked', async () => {
        apiFetch.mockResolvedValue(mockAchievements)

        render(<Achievements compact={true} />)

        await waitFor(() => {
            const badge = document.querySelector('.achievement-badge.unlocked')
            expect(badge).toBeTruthy()
        })
    })

    it('displays stats section when not compact', async () => {
        apiFetch.mockResolvedValueOnce(mockAchievements)
        apiFetch.mockResolvedValueOnce(mockStats)

        render(<Achievements />)

        await waitFor(() => {
            const statValues = document.querySelectorAll('.achievement-stat-value')
            expect(statValues.length).toBeGreaterThan(0)
        })
    })

    it('shows total points in stats', async () => {
        apiFetch.mockResolvedValueOnce(mockAchievements)
        apiFetch.mockResolvedValueOnce(mockStats)

        render(<Achievements />)

        await waitFor(() => {
            expect(screen.getByText('Total Points')).toBeTruthy()
        })
    })

    it('shows unlocked achievement with unlocked class', async () => {
        apiFetch.mockResolvedValue(mockAchievements)

        render(<Achievements />)

        await waitFor(() => {
            const unlockedItems = document.querySelectorAll('.achievement-item.unlocked')
            expect(unlockedItems.length).toBe(1)
        })
    })

    it('handles empty achievements gracefully', async () => {
        apiFetch.mockResolvedValue([])

        render(<Achievements />)

        await waitFor(() => {
            expect(screen.getByText('0/0')).toBeTruthy()
        })
    })

    it('renders multiple stats when data is available', async () => {
        apiFetch.mockResolvedValueOnce(mockAchievements)
        apiFetch.mockResolvedValueOnce(mockStats)

        render(<Achievements />)

        await waitFor(() => {
            const statLabels = document.querySelectorAll('.achievement-stat-label')
            expect(statLabels.length).toBe(3)
        })
    })

    it('does not show stats when data is null', async () => {
        apiFetch.mockResolvedValueOnce(mockAchievements)
        apiFetch.mockResolvedValueOnce(null)

        render(<Achievements />)

        await waitFor(() => {
            expect(screen.getByText('First Workout')).toBeTruthy()
        })
        const statsSection = document.querySelector('.achievements-stats')
        expect(statsSection).toBeNull()
    })
})
