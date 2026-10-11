"use client"

import { useState, useRef, useMemo } from "react"
import { useCurrentDate } from "@/hooks/use-client-time"
import { motion } from "framer-motion"
import {
  CalendarDays,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Plus,
  Clock,
  MapPin,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  useSchedule,
  useParseSchedule,
  DAYS,
  dayOfWeekFromDate,
  subjectHue,
  timeToMinutes,
} from "@/hooks/use-schedule"
import type { DayOfWeek, ScheduleEntry } from "@/types/database"

export default function EmploiDuTempsPage() {
  const today = useCurrentDate()
  const [userSelectedDay, setUserSelectedDay] = useState<DayOfWeek | null>(null)
  const selectedDay: DayOfWeek = userSelectedDay ?? (today ? dayOfWeekFromDate(today) : "monday")
  const setSelectedDay = (day: DayOfWeek) => setUserSelectedDay(day)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: schedule, isLoading } = useSchedule()
  const parseMutation = useParseSchedule()

  // Group entries by day of week
  const entriesByDay = useMemo(() => {
    const map: Record<DayOfWeek, ScheduleEntry[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    }
    if (!schedule) return map
    schedule.forEach((entry) => {
      if (map[entry.day_of_week]) {
        map[entry.day_of_week].push(entry)
      }
    })
    // Sort each day chronologically
    DAYS.forEach(({ key }) => {
      map[key].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
    })
    return map
  }, [schedule])

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUploadSubmit = async () => {
    if (!selectedFile) return
    parseMutation.mutate(selectedFile, {
      onSuccess: () => {
        setIsUploadOpen(false)
        setSelectedFile(null)
      },
    })
  }

  const activeDayEntries = entriesByDay[selectedDay] || []

  return (
    <div className="space-y-8">
      {/* Header with Title and Import Trigger */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            Emploi du temps
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Consultez vos cours hebdomadaires et vos créneaux universitaires.
          </p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-md gap-2">
              <UploadCloud className="size-4" /> Importer un emploi du temps
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UploadCloud className="size-5 text-primary" /> Numériser un emploi du temps
              </DialogTitle>
              <DialogDescription>
                Téléversez une photo ou un fichier PDF de votre emploi du temps pour extraire automatiquement vos matières, salles et horaires.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Dropzone Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                  dragOver
                    ? "border-primary bg-primary/10"
                    : selectedFile
                    ? "border-success/60 bg-success/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="grid size-12 place-items-center rounded-xl bg-success/15 text-success">
                      <CheckCircle2 className="size-6" />
                    </span>
                    <span className="text-sm font-semibold text-foreground max-w-xs truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} Mo • Clique pour changer
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                      <UploadCloud className="size-6" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      Glisse ton fichier ici ou clique pour parcourir
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Formats supportés : PNG, JPG, JPEG, PDF (max 10 Mo)
                    </span>
                  </div>
                )}
              </div>

              {parseMutation.isPending && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 p-3 text-xs text-primary font-medium">
                  <Loader2 className="size-4 animate-spin" /> Analyse et extraction des cours en cours...
                </div>
              )}

              {parseMutation.isError && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{parseMutation.error.message || "Erreur lors de l'analyse du fichier"}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadOpen(false)
                  setSelectedFile(null)
                }}
                disabled={parseMutation.isPending}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={handleUploadSubmit}
                disabled={!selectedFile || parseMutation.isPending}
                className="rounded-xl"
              >
                {parseMutation.isPending ? "Extraction..." : "Analyser & Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS.map(({ key, label }) => {
          const isSelected = selectedDay === key
          const count = entriesByDay[key]?.length ?? 0
          return (
            <button
              key={key}
              onClick={() => setSelectedDay(key)}
              className={`relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all shrink-0 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-card/70 text-muted-foreground border border-border/80 hover:bg-card hover:text-foreground"
              }`}
            >
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Day View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold capitalize">
            {DAYS.find((d) => d.key === selectedDay)?.label}
          </h2>
          <span className="text-xs text-muted-foreground">
            {activeDayEntries.length} {activeDayEntries.length > 1 ? "cours" : "cours"} programmé(s)
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : activeDayEntries.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border/80 bg-card/40">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground mb-3">
                <CalendarDays className="size-6 text-muted-foreground" />
              </span>
              <h3 className="font-medium text-foreground">Aucun cours ce jour-là</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Tu n&apos;as pas de cours enregistré pour ce jour. Importe ton emploi du temps pour remplir ta semaine automatiquement.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="mt-4 rounded-xl gap-2"
              >
                <Plus className="size-4" /> Ajouter / Importer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {activeDayEntries.map((course, idx) => {
              const hue = subjectHue(course.subject)
              return (
                <motion.div
                  key={course.id ?? idx}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className="group relative overflow-hidden rounded-2xl border-border/80 bg-card/80 backdrop-blur-xl transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                    {/* Color accent bar */}
                    <div
                      className="absolute inset-y-0 left-0 w-1.5"
                      style={{ backgroundColor: `oklch(0.65 0.18 ${hue})` }}
                    />
                    <CardHeader className="pb-2 pl-5">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold text-foreground truncate">
                          {course.subject}
                        </CardTitle>
                        <Badge variant="outline" className="font-mono text-xs shrink-0 rounded-lg">
                          {course.start_time} - {course.end_time}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1.5 text-xs">
                        <MapPin className="size-3 text-muted-foreground" />
                        {course.room ? `Salle ${course.room}` : "Salle non assignée"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 pl-5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3" />
                          {Math.round(
                            (timeToMinutes(course.end_time) - timeToMinutes(course.start_time)) / 60
                          )}{" "}
                          heure(s)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Weekly overview card */}
      <Card className="rounded-2xl border-border/80 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Vue synthétique hebdomadaire</CardTitle>
          <CardDescription>Répartition globale des cours du lundi au samedi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {DAYS.slice(0, 6).map(({ key, label }) => {
              const count = entriesByDay[key]?.length ?? 0
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                    selectedDay === key
                      ? "border-primary bg-primary/5"
                      : "border-border/60 bg-background/50 hover:border-border"
                  }`}
                >
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold">{count}</span>
                    <span className="text-xs text-muted-foreground">cours</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
