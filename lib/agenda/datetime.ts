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

/**
 * ISO para guardar desde el modal: hora de pared Chile sin convertir a UTC.
 * Lo que el usuario elige (ej. 23:00) es lo que debe verse en el calendario.
 */
export function modalWallClockToIso(fecha: string, hora: string): string {
  const [hh, mm] = hora.split(':')
  return `${fecha}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00`
}

export function modalWallClockFinIso(fecha: string, hora: string, duracionMin: number): string {
  const [hh, mm] = hora.split(':').map(Number)
  const totalMin = hh * 60 + mm + duracionMin
  const finHH = Math.floor(totalMin / 60)
    .toString()
    .padStart(2, '0')
  const finMM = (totalMin % 60).toString().padStart(2, '0')
  return modalWallClockToIso(fecha, `${finHH}:${finMM}`)
}

/** true si el valor en BD es timestamptz UTC correcto (no hora naive legacy). */
export function isCorrectUtcStorage(iso: string): boolean {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return true
  const parsed = new Date(iso).getTime()
  const asLocal = clinicLocalDateTimeToUtcMs(`${m[1]}-${m[2]}-${m[3]}`, `${m[4]}:${m[5]}`)
  return Math.abs(asLocal - parsed) <= 30 * 60 * 1000
}

/** Hora HH:mm para calendario y UI (misma que eligió el usuario en el modal). */
export function citaWallClockTime(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return isoToClinicLocalTime(iso)
  if (!isCorrectUtcStorage(iso)) return `${m[4]}:${m[5]}`
  return isoToClinicLocalTime(iso)
}

/** Fecha yyyy-MM-dd para agrupar citas en el calendario. */
export function citaWallClockDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return isoToClinicLocalDate(iso)
  if (!isCorrectUtcStorage(iso)) return `${m[1]}-${m[2]}-${m[3]}`
  return isoToClinicLocalDate(iso)
}

/** Instant UTC para comparar solapamientos (cualquier formato en BD). */
export function citaInstantMs(iso: string): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return new Date(iso).getTime()
  if (!isCorrectUtcStorage(iso)) {
    return clinicLocalDateTimeToUtcMs(`${m[1]}-${m[2]}-${m[3]}`, `${m[4]}:${m[5]}`)
  }
  return new Date(iso).getTime()
}

export function citaWallClockMinutes(iso: string): number {
  const t = citaWallClockTime(iso)
  const [h, mi] = t.split(':').map(Number)
  return h * 60 + mi
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

/** Hora para el formulario (misma regla que el calendario). */
export function isoToClinicLocalTimeForForm(iso: string): string {
  return citaWallClockTime(iso)
}

/** Fecha para el formulario (misma regla que el calendario). */
export function isoToClinicLocalDateForForm(iso: string): string {
  return citaWallClockDate(iso)
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
  void timeZone
  return citaInstantMs(inicioIso)
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
