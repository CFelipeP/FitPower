import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Export Utilities', () => {
    let windowOpenMock
    let mockWindow

    beforeEach(() => {
        vi.clearAllMocks()

        mockWindow = {
            document: {
                write: vi.fn(),
                close: vi.fn(),
            },
        }
        windowOpenMock = vi.fn(() => mockWindow)
        window.open = windowOpenMock
    })

    it('exportProgramToPDF opens new window with program HTML', async () => {
        const { exportProgramToPDF } = await import('../lib/export')

        const program = {
            name: 'Power Program',
            difficulty: 'Intermediate',
            durationMinutes: 45,
            trainerName: 'Coach Mike',
            weeks: 8,
            description: 'A challenging program',
            sessions: [
                { title: 'Session 1', type: 'Strength', date: '2024-01-15', start_time: '09:00' },
            ],
        }

        exportProgramToPDF(program)

        expect(windowOpenMock).toHaveBeenCalledWith('', '_blank')
        expect(mockWindow.document.write).toHaveBeenCalled()
        expect(mockWindow.document.write.mock.calls[0][0]).toContain('Power Program')
        expect(mockWindow.document.write.mock.calls[0][0]).toContain('Session 1')
        expect(mockWindow.document.write.mock.calls[0][0]).toContain('Coach Mike')
        expect(mockWindow.document.close).toHaveBeenCalled()
    })

    it('exportProgramToPDF handles minimal program data', async () => {
        const { exportProgramToPDF } = await import('../lib/export')

        exportProgramToPDF({ name: 'Minimal', sessions: [] })

        expect(windowOpenMock).toHaveBeenCalledWith('', '_blank')
        expect(mockWindow.document.write).toHaveBeenCalled()
    })

    it('exportProgramToPDF handles program with no sessions', async () => {
        const { exportProgramToPDF } = await import('../lib/export')

        exportProgramToPDF({ name: 'No Sessions' })

        expect(mockWindow.document.write).toHaveBeenCalled()
        expect(mockWindow.document.close).toHaveBeenCalled()
    })

    it('exportRoutineToPDF opens new window with routine HTML', async () => {
        const { exportRoutineToPDF } = await import('../lib/export')

        const routine = {
            title: 'Morning Routine',
            duration_minutes: 30,
            focus: 'Full Body',
            difficulty: 'Beginner',
            exercises: [
                { name: 'Push Ups', sets: 3, reps: 10, rest: 60 },
                { name: 'Squats', sets: 3, reps: 15, rest: 45 },
            ],
        }

        exportRoutineToPDF(routine)

        expect(windowOpenMock).toHaveBeenCalledWith('', '_blank')
        const html = mockWindow.document.write.mock.calls[0][0]
        expect(html).toContain('Morning Routine')
        expect(html).toContain('Push Ups')
        expect(html).toContain('Squats')
        expect(html).toContain('3')
        expect(html).toContain('10')
        expect(html).toContain('15')
        expect(mockWindow.document.close).toHaveBeenCalled()
    })

    it('exportRoutineToPDF handles minimal routine data', async () => {
        const { exportRoutineToPDF } = await import('../lib/export')

        exportRoutineToPDF({ title: 'Quick Routine', exercises: [] })

        expect(windowOpenMock).toHaveBeenCalledWith('', '_blank')
        expect(mockWindow.document.write).toHaveBeenCalled()
    })

    it('exportRoutineToPDF handles routine with no exercises', async () => {
        const { exportRoutineToPDF } = await import('../lib/export')

        exportRoutineToPDF({ title: 'Empty Routine' })

        const html = mockWindow.document.write.mock.calls[0][0]
        expect(html).toContain('Empty Routine')
        expect(mockWindow.document.close).toHaveBeenCalled()
    })
})
