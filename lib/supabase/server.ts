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

/**
 * Validates the user session from cookies.
 * If unauthenticated, returns an error response with HTTP status 401.
 */
export async function requireUser(): Promise<RequireUserResult> {
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
}
