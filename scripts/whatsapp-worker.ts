/**
 * Worker BullMQ para recordatorios WhatsApp (requiere REDIS_URL y Supabase service role).
 * Ejecutar: npx tsx scripts/whatsapp-worker.ts
 */
import { createWhatsappWorker, processWhatsappJob } from '../lib/whatsapp/jobs'

const worker = createWhatsappWorker(processWhatsappJob)
if (!worker) {
  console.error('No se pudo iniciar el worker: falta REDIS_URL')
  process.exit(1)
}

worker.on('failed', (job, err) => {
  console.error('[whatsapp-worker] job failed', job?.id, err)
})

worker.on('completed', (job) => {
  console.log('[whatsapp-worker] completed', job.id)
})

console.log('[whatsapp-worker] escuchando cola whatsapp-reminders…')
