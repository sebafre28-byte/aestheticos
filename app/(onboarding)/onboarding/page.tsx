import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { needsOnboarding } from '@/lib/onboarding/queries-server'

export default async function OnboardingPage() {
  const pendiente = await needsOnboarding()
  if (!pendiente) {
    redirect('/dashboard')
  }
  return <OnboardingWizard />
}
