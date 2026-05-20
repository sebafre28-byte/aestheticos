/** Zona horaria de la clínica (agenda y recordatorios). */
export const CLINIC_TIMEZONE = 'America/Santiago'

function parseLocalParts(fecha: string, hora: string): { y: number; mo: number; d: number; h: number; mi: number } {
  const [y, mo, d] = fecha.split('-').map(Number)
  const [h, mi] = hora.split(':').map(Number)
  return { y, mo, d, h, mi }
}

/** Instant UTC (ms) para fecha/hora wall-clock en la zona de la clínica. */
export function clinicLocalDateTimeToUtcMs(
  fecha: string,
  hora: string,
  timeZone: string = CLINIC_TIMEZONE,
): number {
  const { y, mo, d, h, mi } = parseLocalParts(fecha, hora)

  let utcGuess = Date.UTC(y, mo - 1, d, h, mi, 0)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  for (let i = 0; i < 2; i++) {
    const parts = formatter.formatToParts(new Date(utcGuess))
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value)
    const diff =
      Date.UTC(y, mo - 1, d, h, mi, 0) -
      Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
    utcGuess += diff
  }

  return utcGuess
}

/** ISO UTC (`toISOString`) para guardar en `timestamptz`. */
export function clinicLocalToIso(fecha: string, hora: string): string {
  return new Date(clinicLocalDateTimeToUtcMs(fecha, hora)).toISOString()
}

export function clinicLocalFinIso(fecha: string, hora: string, duracionMin: number): string {
  const { h, mi } = parseLocalParts(fecha, hora)
  const totalMin = h * 60 + mi + duracionMin
  const finHH = Math.floor(totalMin / 60)
    .toString()
    .padStart(2, '0')
  const finMM = (totalMin % 60).toString().padStart(2, '0')
  return clinicLocalToIso(fecha, `${finHH}:${finMM}`)
}

/** Límites UTC del día calendario `yyyy-MM-dd` en America/Santiago. */
export function clinicDayUtcBounds(fecha: string): { desdeIso: string; hastaIso: string } {
  const [y, mo, d] = fecha.split('-').map(Number)
  const next = new Date(Date.UTC(y, mo - 1, d + 1))
  const nextFecha = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
  return {
    desdeIso: clinicLocalToIso(fecha, '00:00'),
    hastaIso: new Date(clinicLocalDateTimeToUtcMs(nextFecha, '00:00') - 1).toISOString(),
  }
}

export function isoToClinicLocalDate(iso: string, timeZone: string = CLINIC_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/** Hora para el formulario: soporta citas legacy (naive) y nuevas (UTC correcto). */
export function isoToClinicLocalTimeForForm(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return isoToClinicLocalTime(iso)
  const parsed = new Date(iso).getTime()
  if (Math.abs(citaInicioToUtcMs(iso) - parsed) > 30 * 60 * 1000) {
    return `${m[4]}:${m[5]}`
  }
  return isoToClinicLocalTime(iso)
}

/** Fecha para el formulario: soporta citas legacy y nuevas. */
export function isoToClinicLocalDateForForm(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return isoToClinicLocalDate(iso)
  const parsed = new Date(iso).getTime()
  if (Math.abs(citaInicioToUtcMs(iso) - parsed) > 30 * 60 * 1000) {
    return `${m[1]}-${m[2]}-${m[3]}`
  }
  return isoToClinicLocalDate(iso)
}

export function isoToClinicLocalTime(iso: string, timeZone: string = CLINIC_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

/**
 * Convierte `inicio` de BD al instante UTC real.
 * Soporta citas legacy (hora local guardada sin offset) y citas nuevas (timestamptz correcto).
 */
export function citaInicioToUtcMs(
  inicioIso: string,
  timeZone: string = CLINIC_TIMEZONE,
): number {
  const parsed = new Date(inicioIso).getTime()
  const m = inicioIso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return parsed

  const asLocal = clinicLocalDateTimeToUtcMs(
    `${m[1]}-${m[2]}-${m[3]}`,
    `${m[4]}:${m[5]}`,
    timeZone,
  )
  const driftMs = Math.abs(asLocal - parsed)
  // Legacy: componentes wall-clock ≈ UTC almacenado (drift ≈ offset Chile). Nueva cita: drift ≈ 0.
  if (driftMs > 30 * 60 * 1000) return asLocal
  return parsed
}

export function storedInicioOffsetMs(
  trueUtcMs: number,
  timeZone: string = CLINIC_TIMEZONE,
): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(new Date(trueUtcMs))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  const storedMs = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  )
  return trueUtcMs - storedMs
}
