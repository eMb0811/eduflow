import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { User, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { ApiResponse } from '@/types/api'

export async function createClient(): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Can be ignored if called from a Server Component
        }
      },
    },
  })
}

export type RequireUserSuccess = {
  user: User
  supabase: SupabaseClient<Database>
  error: null
}

export type RequireUserFailure = {
  user: null
  supabase: SupabaseClient<Database>
  error: NextResponse<ApiResponse<never>>
}

export type RequireUserResult = RequireUserSuccess | RequireUserFailure

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(
    url &&
    key &&
    !url.includes('placeholder') &&
    !url.includes('your-project') &&
    url.startsWith('http')
  )
}

/**
 * Validates the user session from cookies.
 * If unauthenticated, returns an error response with HTTP status 401.
 * If Supabase is not configured yet (dev mode), provides a demo user.
 */
export async function requireUser(): Promise<RequireUserResult> {
  if (!isSupabaseConfigured()) {
    // Development fallback when Supabase keys are not set
    const demoUser = {
      id: '00000000-0000-0000-0000-000000000000',
      app_metadata: {},
      user_metadata: { full_name: 'Fatou Ndiaye' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User

    try {
      const supabase = await createClient()
      return { user: demoUser, supabase, error: null }
    } catch {
      return { user: demoUser, supabase: null as unknown as SupabaseClient<Database>, error: null }
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        user: null,
        supabase,
        error: NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: 'Unauthorized: Session missing or invalid',
          },
          { status: 401 }
        ),
      }
    }

    return {
      user,
      supabase,
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth error'
    return {
      user: null,
      supabase: null as unknown as SupabaseClient<Database>,
      error: NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: message,
        },
        { status: 500 }
      ),
    }
  }
}
