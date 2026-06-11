import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that are accessible without a session
const PUBLIC_ROUTES = new Set([
  '/login',
  '/register',
  '/forgot-password',
])

// API route prefixes that are public (no auth required)
const PUBLIC_API_PREFIXES = [
  '/api/book/',        // public booking flow
  '/api/whatsapp/',    // Meta webhook + provider endpoints
  '/api/stripe/',      // Stripe webhook
  '/api/captcha',      // Turnstile verification
  '/api/health',       // Health check
  '/api/cancelar',     // Public cancellation endpoint
]

// Cron routes protected by CRON_SECRET, not session
const CRON_PREFIXES = [
  '/api/cron/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public pages
  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next()

  // Allow public booking pages
  if (pathname.startsWith('/book/') || pathname === '/book') return NextResponse.next()
  if (pathname.startsWith('/cancelar/') || pathname === '/cancelar') return NextResponse.next()

  // Allow public API routes
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next()

  // Allow cron routes (they validate CRON_SECRET themselves)
  if (CRON_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next()

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // For all other routes: validate Supabase session and refresh cookies
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated: redirect pages to login, return 401 for API routes
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
