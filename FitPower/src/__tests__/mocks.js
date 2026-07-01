export function createMockAchievement(overrides = {}) {
    return {
        id: 1, name: 'Test Achievement', description: 'Test description',
        icon: 'Trophy', type: 'workouts', requirement: 1, points: 10,
        unlocked: false, unlocked_at: null, ...overrides,
    }
}

export function createMockPlan(overrides = {}) {
    return {
        id: 1, name: 'Test Plan', price_monthly: 19, price_yearly: 13,
        popular: false, features: [{ name: 'Feature 1' }], ...overrides,
    }
}

export function createMockPost(overrides = {}) {
    return {
        id: 1, user_id: 1, first_name: 'John', last_name: 'Doe',
        content: 'Test post', type: 'status', likes_count: 0,
        comments_count: 0, liked_by_me: false,
        created_at: new Date().toISOString(), ...overrides,
    }
}


