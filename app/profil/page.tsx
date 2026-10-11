"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  UserRound,
  GraduationCap,
  BookOpen,
  Target,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile, useUpdateProfile, isProfileComplete } from "@/hooks/use-profile"
import type { UpdateProfileRequest } from "@/types/api"

const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Le nom doit comporter au moins 2 caractères")
    .max(120, "Le nom ne doit pas dépasser 120 caractères")
    .nullable()
    .optional(),
  academic_level: z
    .string()
    .max(100, "Le niveau ne doit pas dépasser 100 caractères")
    .nullable()
    .optional(),
  field_of_study: z
    .string()
    .max(120, "La filière ne doit pas dépasser 120 caractères")
    .nullable()
    .optional(),
  academic_goals: z
    .string()
    .max(1000, "Les objectifs ne doivent pas dépasser 1000 caractères")
    .nullable()
    .optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilPage() {
  const { data: profile, isLoading } = useProfile()
  const updateMutation = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      academic_level: "",
      field_of_study: "",
      academic_goals: "",
    },
  })

  // Populate form with existing profile data
  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? "",
        academic_level: profile.academic_level ?? "",
        field_of_study: profile.field_of_study ?? "",
        academic_goals: profile.academic_goals ?? "",
      })
    }
  }, [profile, reset])

  const onSubmit = (data: ProfileFormData) => {
    const payload: UpdateProfileRequest = {
      full_name: data.full_name || undefined,
      academic_level: data.academic_level || undefined,
      field_of_study: data.field_of_study || undefined,
      academic_goals: data.academic_goals || undefined,
    }
    updateMutation.mutate(payload)
  }

  const complete = isProfileComplete(profile)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            Profil académique
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Gérez vos informations universitaires pour personnaliser vos plannings de travail et vos sessions de révision.
          </p>
        </div>

        <div>
          {isLoading ? (
            <Skeleton className="h-7 w-28 rounded-md" />
          ) : (
            <Badge
              variant={complete ? "secondary" : "outline"}
              className={`rounded-md px-2.5 py-1 text-xs gap-1.5 ${
                complete ? "text-success border-success/30 bg-success/10" : "text-warning border-warning/30 bg-warning/10"
              }`}
            >
              {complete ? (
                <>
                  <CheckCircle2 className="size-3.5" /> Profil complet
                </>
              ) : (
                <>
                  <AlertCircle className="size-3.5" /> Informations incomplètes
                </>
              )}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Profile Form Card */}
      <Card className="rounded-3xl border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserRound className="size-5 text-primary" /> Informations personnelles & études
          </CardTitle>
          <CardDescription>
            Ces données sont utilisées uniquement pour calibrer les recommandations de l&apos;assistant IA.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium">
                  Nom complet
                </Label>
                <div className="relative">
                  <Input
                    id="full_name"
                    placeholder="Ex: Fatou Ndiaye"
                    {...register("full_name")}
                    className="rounded-xl pl-3.5"
                  />
                </div>
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              {/* Academic Level & Field Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="academic_level" className="text-sm font-medium flex items-center gap-1.5">
                    <GraduationCap className="size-3.5 text-muted-foreground" /> Niveau d&apos;études
                  </Label>
                  <Input
                    id="academic_level"
                    placeholder="Ex: Licence 3, Master 1, Prépa..."
                    {...register("academic_level")}
                    className="rounded-xl"
                  />
                  {errors.academic_level && (
                    <p className="text-xs text-destructive">{errors.academic_level.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field_of_study" className="text-sm font-medium flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-muted-foreground" /> Filière / Spécialité
                  </Label>
                  <Input
                    id="field_of_study"
                    placeholder="Ex: Informatique, Droit, Médecine..."
                    {...register("field_of_study")}
                    className="rounded-xl"
                  />
                  {errors.field_of_study && (
                    <p className="text-xs text-destructive">{errors.field_of_study.message}</p>
                  )}
                </div>
              </div>

              {/* Academic Goals */}
              <div className="space-y-2">
                <Label htmlFor="academic_goals" className="text-sm font-medium flex items-center gap-1.5">
                  <Target className="size-3.5 text-muted-foreground" /> Objectifs académiques
                </Label>
                <Textarea
                  id="academic_goals"
                  rows={4}
                  placeholder="Ex: Valider mon semestre avec mention Bien, maîtriser les structures de données en algorithmique et me préparer au concours d'ingénierie."
                  {...register("academic_goals")}
                  className="rounded-xl resize-none"
                />
                {errors.academic_goals && (
                  <p className="text-xs text-destructive">{errors.academic_goals.message}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  L&apos;IA analysera ces objectifs pour prioriser tes matières lors de la génération automatique du planning de révisions.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl px-6 gap-2 shadow-md shadow-primary/20"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" /> Enregistrer les modifications
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
