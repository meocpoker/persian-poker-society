import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Read the access token from cookies (set by our app after login)
  const accessToken = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value

  // If no tokens, just continue
  if (!accessToken || !refreshToken) return res

  // We only use this to verify/refresh tokens server-side if needed later
  // (No network call is required for every request in this simple MVP)
  createClient(supabaseUrl, supabaseAnonKey)

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
