"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Profile } from "@/types/database"
import type { UpdateProfileRequest } from "@/types/api"
import { apiFetch, ApiError } from "@/hooks/api-client"

export const profileKey = ["profile"] as const

/** GET /api/profile — returns ApiResponse<Profile>. */
export function useProfile() {
  return useQuery<Profile, ApiError>({
    queryKey: profileKey,
    queryFn: () => apiFetch<Profile>("/api/profile"),
  })
}

/** PUT /api/profile — returns ApiResponse<Profile>. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation<Profile, ApiError, UpdateProfileRequest>({
    mutationFn: (body) =>
      apiFetch<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey, profile)
      toast.success("Profil enregistré")
    },
    onError: (error) => {
      toast.error("Impossible d'enregistrer le profil", { description: error.message })
    },
  })
}

/** A profile is considered complete once the academic fields are filled. */
export function isProfileComplete(profile: Profile | undefined) {
  return Boolean(profile?.full_name && profile.academic_level && profile.field_of_study)
}
