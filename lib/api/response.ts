import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';

/**
 * Standard HTTP JSON Response Helpers
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function apiError(
  message: string,
  status = 400,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  );
}
