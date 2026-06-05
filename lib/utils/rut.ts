// RUT utilities for Chile — always store in canonical format "XXXXXXXX-D" (no dots)

export function normalizarRut(rut: string): string {
  const clean = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return `${body}-${dv}`
}

export function validarRut(rut: string): boolean {
  const clean = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  if (!/^\d+$/.test(body)) return false
  const num = parseInt(body, 10)
  if (isNaN(num)) return false
  let sum = 0
  let multiplier = 2
  let n = num
  while (n > 0) {
    sum += (n % 10) * multiplier
    n = Math.floor(n / 10)
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  const remainder = 11 - (sum % 11)
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)
  return dv === expected
}
