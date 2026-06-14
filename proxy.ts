import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// API route prefixes that are public (no auth required)
const PUBLIC_API_PREFIXES = [
  '/api/book/',
  '/api/whatsapp/',
  '/api/flow/',
  '/api/captcha',
  '/api/health',
  '/api/cancelar',
  '/api/cron/',
  '/api/consentimiento/sign',
]

// Routes that are part of the marketing site (no auth needed on any domain)
const MARKETING_PATHS = ['/', '/privacidad', '/terminos']

// Hosts that serve only the marketing landing (no dashboard access)
const MARKETING_HOSTS = ['simpliclinic.cl', 'www.simpliclinic.cl']

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // On the marketing domain: allow everything through without auth check.
  // The dashboard routes simply won't be linked from here.
  if (MARKETING_HOSTS.some(h => host === h || host.startsWith(h + ':'))) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Allow public pages
  if (
    MARKETING_PATHS.includes(pathname) ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/superadmin/login' ||
    pathname === '/auth/set-session' ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/book/') ||
    pathname === '/book' ||
    pathname.startsWith('/cancelar/') ||
    pathname.startsWith('/consentimiento/')
  ) {
    return supabaseResponse
  }

  // Allow public API routes and cron routes (they self-protect with CRON_SECRET)
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return supabaseResponse
  }

  // Allow clinica-bloqueada and superadmin routes without clinic check
  const isAdminRoute = pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin')
  const isBloqueada = pathname === '/clinica-bloqueada'

  // Unauthenticated: redirect pages to /login, return 401 for API routes
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if clinic is deactivated (skip for admin/blocked routes)
  if (!isAdminRoute && !isBloqueada && !pathname.startsWith('/api/')) {
    const { data: ucData } = await supabase
      .from('usuarios_clinica')
      .select('clinica_id, clinicas!inner(activo)')
      .eq('user_id', user.id)
      .maybeSingle()

    const activo = (ucData as { clinicas: { activo: boolean } | null } | null)?.clinicas?.activo
    if (activo === false) {
      const bloqueadaUrl = request.nextUrl.clone()
      bloqueadaUrl.pathname = '/clinica-bloqueada'
      return NextResponse.redirect(bloqueadaUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
