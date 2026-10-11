import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, isSupabaseConfigured } from '@/lib/supabase/server'
import { getDevStore } from '@/lib/supabase/dev-store'
import { ApiResponse } from '@/types/api'
import { Profile, Database } from '@/types/database'

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name cannot be empty').max(120).optional().nullable(),
  academic_level: z.string().trim().max(100).optional().nullable(),
  field_of_study: z.string().trim().max(120).optional().nullable(),
  academic_goals: z.string().trim().max(1000).optional().nullable(),
  avatar_url: z.string().url('Invalid avatar URL').optional().nullable().or(z.literal('')),
})

export async function GET(): Promise<NextResponse<ApiResponse<Profile>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    if (!isSupabaseConfigured()) {
      const devProfile = getDevStore().profile
      return NextResponse.json<ApiResponse<Profile>>({
        success: true,
        data: devProfile,
      })
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json<ApiResponse<Profile>>(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json<ApiResponse<Profile>>(
        {
          success: false,
          error: 'Profile not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<Profile>>(
      {
        success: true,
        data,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json<ApiResponse<Profile>>(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<Profile>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json<ApiResponse<Profile>>(
        {
          success: false,
          error: 'Malformed JSON payload',
        },
        { status: 400 }
      )
    }

    const parseResult = updateProfileSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json<ApiResponse<Profile>>(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const validatedData = parseResult.data

    const updatePayload: Database['public']['Tables']['profiles']['Update'] = {
      ...validatedData,
      avatar_url: validatedData.avatar_url || null,
      updated_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured()) {
      const current = getDevStore().profile
      const updated: Profile = {
        ...current,
        ...updatePayload,
      }
      getDevStore().profile = updated
      return NextResponse.json<ApiResponse<Profile>>({
        success: true,
        data: updated,
      })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json<ApiResponse<Profile>>(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json<ApiResponse<Profile>>(
        {
          success: false,
          error: 'Profile not found or not permitted to update',
        },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<Profile>>(
      {
        success: true,
        data,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json<ApiResponse<Profile>>(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
