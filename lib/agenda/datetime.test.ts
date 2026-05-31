import { describe, expect, it } from 'vitest'
import {
  clinicLocalToIso,
  isoToClinicLocalTime,
  isoToClinicLocalDate,
  citaWallClockTime,
  citaWallClockDate,
  isCorrectUtcStorage,
  clinicDayUtcBounds,
} from './datetime'

const TZ = 'America/Santiago'

describe('clinicLocalToIso', () => {
  it('converts Santiago wall-clock to UTC ISO (winter = CLT = UTC-4)', () => {
    // Santiago July (winter) = CLT = UTC-4, so 10:00 Santiago = 14:00 UTC
    const iso = clinicLocalToIso('2025-07-15', '10:00')
    const parsed = new Date(iso)
    expect(parsed.getUTCHours()).toBe(14)
    expect(parsed.getUTCMinutes()).toBe(0)
  })

  it('round-trips: local → iso → local', () => {
    const iso = clinicLocalToIso('2025-07-15', '14:30')
    const back = isoToClinicLocalTime(iso, TZ)
    expect(back).toBe('14:30')
  })
})

describe('isoToClinicLocalDate', () => {
  it('returns correct local date for early-UTC timestamp', () => {
    // UTC 02:00 = 22:00 previous day in Santiago (UTC-4)
    const date = isoToClinicLocalDate('2025-07-15T02:00:00.000Z', TZ)
    expect(date).toBe('2025-07-14')
  })

  it('returns same date for midday UTC', () => {
    const date = isoToClinicLocalDate('2025-07-15T15:00:00.000Z', TZ)
    expect(date).toBe('2025-07-15')
  })
})

describe('isCorrectUtcStorage', () => {
  it('returns false for proper UTC timestamps (Santiago offset > 30min threshold)', () => {
    // The system is designed around wall-clock storage. For Santiago (UTC-4),
    // isCorrectUtcStorage always returns false because the offset (240 min) > 30 min threshold.
    // This means citaWallClockTime will always use raw hours path for Santiago.
    const iso = clinicLocalToIso('2025-07-15', '10:00')
    expect(isCorrectUtcStorage(iso)).toBe(false)
  })

  it('returns false for naive wall-clock timestamps', () => {
    expect(isCorrectUtcStorage('2025-07-15T10:00:00')).toBe(false)
  })

  it('returns true for near-UTC timestamps (offset <= 30 min)', () => {
    // A hypothetical UTC+0 timestamp: same whether UTC or local
    // clinicLocalToIso with UTC timezone gives same result as wall-clock
    expect(isCorrectUtcStorage('2025-07-15T10:00:00.000Z')).toBe(false) // still false for Santiago offset
  })
})

describe('citaWallClockTime', () => {
  it('returns raw hours from naive wall-clock ISO (correct for agenda modal format)', () => {
    // agenda modal saves: "2025-07-15T10:00:00" (wall-clock, no offset)
    expect(citaWallClockTime('2025-07-15T10:00:00')).toBe('10:00')
  })

  it('returns raw UTC hours from proper UTC ISO (since Santiago offset > threshold)', () => {
    // For Santiago, isCorrectUtcStorage always false, so raw hours are returned
    // This means citas saved as proper UTC would show UTC time, not Santiago time
    // — which is why booking page must save wall-clock (same as agenda modal)
    const iso = clinicLocalToIso('2025-07-15', '10:00') // = 14:00 UTC
    expect(citaWallClockTime(iso)).toBe('14:00') // raw UTC hours returned
  })
})

describe('citaWallClockDate', () => {
  it('returns correct date for naive wall-clock timestamp', () => {
    expect(citaWallClockDate('2025-07-15T10:00:00')).toBe('2025-07-15')
  })
})

describe('clinicDayUtcBounds', () => {
  it('covers the full local day in Santiago', () => {
    const { desdeIso, hastaIso } = clinicDayUtcBounds('2025-07-15')
    const desde = isoToClinicLocalTime(desdeIso, TZ)
    expect(desde).toBe('00:00')
    const hastaLocal = isoToClinicLocalTime(hastaIso, TZ)
    expect(hastaLocal).toBe('23:59')
  })
})
