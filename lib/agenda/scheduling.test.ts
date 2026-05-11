import { describe, expect, it } from 'vitest'
import { durationMinutes, overlaps, toQuarterHour } from './scheduling'

describe('agenda scheduling utils', () => {
  it('detects overlap correctly', () => {
    expect(
      overlaps('2026-05-10T10:00:00.000Z', '2026-05-10T11:00:00.000Z', '2026-05-10T10:30:00.000Z', '2026-05-10T11:30:00.000Z')
    ).toBe(true)
  })

  it('computes duration in minutes', () => {
    expect(durationMinutes('2026-05-10T10:00:00.000Z', '2026-05-10T11:45:00.000Z')).toBe(105)
  })

  it('rounds date to quarter', () => {
    const rounded = toQuarterHour(new Date('2026-05-10T10:52:12.000Z'))
    expect(rounded.getMinutes()).toBe(45)
  })
})
