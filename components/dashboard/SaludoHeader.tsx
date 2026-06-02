'use client'

import { useState, useEffect } from 'react'

export default function SaludoHeader() {
  const [texto, setTexto] = useState<{ saludo: string; fecha: string } | null>(null)

  useEffect(() => {
    const now = new Date()
    const h = now.getHours()
    const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
    const fecha = now.toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    setTexto({ saludo, fecha })
  }, [])

  if (!texto) return null

  return (
    <>
      <h1 className="text-[22px] font-bold text-[#0B132B]">{texto.saludo} 👋</h1>
      <p className="text-[13px] text-gray-400 mt-0.5 capitalize">{texto.fecha}</p>
    </>
  )
}
