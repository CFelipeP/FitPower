import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import SocialFeed from './SocialFeed'
import { createMockPost } from '../../__tests__/mocks'

vi.mock('../../lib/api', () => ({
    apiFetch: vi.fn(),
}))

vi.mock('../../context/ToastContext', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))

const mockPosts = [
    createMockPost({ id: 1, user_id: 1, first_name: 'John', last_name: 'Doe', content: 'Just crushed my PR! 💪', type: 'workout', likes_count: 5, comments_count: 2, liked_by_me: false }),
    createMockPost({ id: 2, user_id: 2, first_name: 'Jane', last_name: 'Smith', content: 'New achievement unlocked!', type: 'achievement', likes_count: 3, comments_count: 0, liked_by_me: true }),
]

describe('SocialFeed Component', () => {
    let apiFetch

    beforeEach(async () => {
        vi.clearAllMocks()
        apiFetch = (await import('../../lib/api')).apiFetch
    })

    it('shows loading state initially', () => {
        apiFetch.mockReturnValue(new Promise(() => {}))
        const { container } = render(<SocialFeed />)
        expect(container.querySelector('.spin')).toBeTruthy()
    })

    it('renders posts after loading', async () => {
        apiFetch.mockResolvedValue(mockPosts)

        render(<SocialFeed />)

        await waitFor(() => {
            expect(screen.getByText('Just crushed my PR! 💪')).toBeTruthy()
        })
        expect(screen.getByText('New achievement unlocked!')).toBeTruthy()
    })

    it('shows post author names', async () => {
        apiFetch.mockResolvedValue(mockPosts)

        render(<SocialFeed />)

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeTruthy()
            expect(screen.getByText('Jane Smith')).toBeTruthy()
        })
    })

    it('shows like counts', async () => {
        apiFetch.mockResolvedValue(mockPosts)

        render(<SocialFeed />)

        await waitFor(() => {
            expect(screen.getAllByText('5').length).toBeGreaterThan(0)
        })
    })

    it('shows comment counts', async () => {
        apiFetch.mockResolvedValue(mockPosts)

        render(<SocialFeed />)

        await waitFor(() => {
            expect(screen.getAllByText('2').length).toBeGreaterThan(0)
        })
    })

    it('shows empty state when no posts', async () => {
        apiFetch.mockResolvedValue([])

        render(<SocialFeed />)

        await waitFor(() => {
            expect(screen.getByText(/No posts yet/i)).toBeTruthy()
        })
    })

    it('does not show composer in compact mode', async () => {
        apiFetch.mockResolvedValue(mockPosts)

        render(<SocialFeed compact={true} />)

        await waitFor(() => {
            expect(screen.getByText('Just crushed my PR! 💪')).toBeTruthy()
        })

        expect(document.querySelector('.social-feed-composer')).toBeNull()
    })

    it('shows composer by default', async () => {
        apiFetch.mockResolvedValue(mockPosts)

        render(<SocialFeed />)

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Share something with your followers...')).toBeTruthy()
        })
    })

    it('marks liked posts with liked class', async () => {
        apiFetch.mockResolvedValue(mockPosts)

        render(<SocialFeed />)

        await waitFor(() => {
            const likedBtns = document.querySelectorAll('.social-feed-action-btn.liked')
            expect(likedBtns.length).toBe(1)
        })
    })

    it('renders post type icons for achievement', async () => {
        apiFetch.mockResolvedValue(mockPosts)

        render(<SocialFeed />)

        await waitFor(() => {
            const typeIcons = document.querySelectorAll('.social-feed-type-icon')
            expect(typeIcons.length).toBe(2)
        })
    })
})
