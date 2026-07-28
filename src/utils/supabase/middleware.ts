import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Requests for these are meant to work for anyone, logged in or not — a
// browser fetches manifest.json and registers sw.js on every page load
// (including /login itself, before any session exists), and the pwa-icon /
// apple-icon / icon routes back the <link rel="icon"> tags in <head>. The
// matcher in src/proxy.ts only excludes a handful of static image
// extensions, so without this allowlist these requests fell through to the
// "no user -> redirect to /login" check below. That meant an unauthenticated
// visitor's manifest.json request came back as the /login page's HTML
// instead of JSON, which is why the browser console showed
// "Manifest: Line: 1, column: 1, Syntax error" — it was trying to parse a
// full HTML redirect target as JSON.
// Plain startsWith (no trailing-slash requirement) on purpose: Next's
// file-based icon routes (icon.tsx, apple-icon.tsx) get served with a
// generated extension appended — /icon.png, /apple-icon.png?<hash>, etc. —
// not at the bare /icon path, so a stricter "/icon/" prefix match would
// miss the actual request.
const PUBLIC_ASSET_PREFIXES = ['/manifest.json', '/sw.js', '/apple-icon', '/icon', '/pwa-icon']

function isPublicAsset(pathname: string) {
  return PUBLIC_ASSET_PREFIXES.some(p => pathname.startsWith(p))
}

export async function updateSession(request: NextRequest) {
  if (isPublicAsset(request.nextUrl.pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect all routes under / (except /login, /signup, and public assets)
  // If no user is logged in, redirect to login page
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const role = user?.app_metadata?.role || 'merchant'
  const status = user?.app_metadata?.status || 'pending'

  // Block unapproved non-admin users from accessing the app
  if (
    user && 
    role !== 'admin' && 
    status !== 'approved' && 
    !request.nextUrl.pathname.startsWith('/pending') &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/pending'
    return NextResponse.redirect(url)
  }

  // Prevent users on /pending from accessing if they shouldn't be there
  if (request.nextUrl.pathname.startsWith('/pending')) {
    if (user) {
      if (role === 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/dashboard'
        return NextResponse.redirect(url)
      } else if (status === 'approved') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  // Admin RBAC Check
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const role = user?.app_metadata?.role || 'merchant'
    if (!user || role !== 'admin') {
      // Redirect unauthorized users away from admin dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirect root to dashboard if logged in
  if (request.nextUrl.pathname === '/') {
    if (user) {
      const url = request.nextUrl.clone()
      if (role === 'admin') {
        url.pathname = '/admin/dashboard'
      } else if (status === 'approved') {
        url.pathname = '/dashboard'
      } else {
        url.pathname = '/pending'
      }
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
