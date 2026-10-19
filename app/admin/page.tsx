"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  KeyRound,
  Edit2,
  Trash2,
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Timer,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Lock,
  Radio,
  Globe,
  Wifi,
  Sparkles,
  Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AdminUserItem {
  id: string;
  email: string;
  role: "superadmin" | "admin" | "student" | string;
  lastActiveAt?: string | null;
  lastActivePath?: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    id?: string;
    fullName: string | null;
    academicLevel: string | null;
    fieldOfStudy: string | null;
    avatarUrl: string | null;
    onboardingCompleted: boolean;
  } | null;
  counts: {
    documents: number;
    flashcards: number;
    quizzes: number;
    scheduleEntries: number;
    pomodoroSessions: number;
    chatSessions: number;
  };
}

interface OnlineUserItem {
  id: string;
  email: string;
  role: "superadmin" | "admin" | "student" | string;
  fullName: string;
  academicLevel: string;
  fieldOfStudy: string;
  avatarUrl?: string | null;
  lastActiveAt: string | null;
  lastActivePath: string;
  status: "online" | "idle" | "offline";
  secondsAgo: number;
}

interface OnlineStats {
  totalUsers: number;
  onlineCount: number;
  idleCount: number;
  offlineCount: number;
}

interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalSuperAdmins?: number;
  totalStudents: number;
  totalDocuments: number;
  totalQuizzes: number;
  totalPomodoro: number;
}

const ACADEMIC_LEVELS = [
  { value: "licence_1", label: "Licence 1 (L1)" },
  { value: "licence_2", label: "Licence 2 (L2)" },
  { value: "licence_3", label: "Licence 3 (L3)" },
  { value: "master_1", label: "Master 1 (M1)" },
  { value: "master_2", label: "Master 2 (M2)" },
  { value: "doctorat", label: "Doctorat" },
  { value: "prepa", label: "Classe Préparatoire" },
  { value: "autre", label: "Autre cursus" },
];

function formatAcademicLevel(level?: string | null): string {
  if (!level) return "Non renseigné";
  const found = ACADEMIC_LEVELS.find((l) => l.value.toLowerCase() === level.toLowerCase());
  return found ? found.label : level;
}

function formatPathFriendly(path?: string | null): string {
  if (!path) return "Accueil";
  if (path.startsWith("/courses")) return "Espace Étude & Révisions";
  if (path.startsWith("/planning") || path.startsWith("/schedule")) return "Planning & Emploi du temps";
  if (path.startsWith("/chat")) return "Assistant Kocc Barma";
  if (path.startsWith("/pomodoro")) return "Session Pomodoro";
  if (path.startsWith("/admin")) return "Console d'Administration";
  if (path.startsWith("/dashboard")) return "Tableau de bord";
  return path;
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 10) return "À l'instant";
  if (seconds < 60) return `Il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `Il y a ${hours}h`;
}

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();
  const isSuperAdmin = currentAdmin?.role === "superadmin";

  const [activeTab, setActiveTab] = React.useState<"users" | "online">("users");

  const [users, setUsers] = React.useState<AdminUserItem[]>([]);
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Supervision en temps réel (Super Utilisateur uniquement)
  const [onlineUsers, setOnlineUsers] = React.useState<OnlineUserItem[]>([]);
  const [onlineStats, setOnlineStats] = React.useState<OnlineStats | null>(null);
  const [isLoadingOnline, setIsLoadingOnline] = React.useState(true);
  const [isRefreshingOnline, setIsRefreshingOnline] = React.useState(false);
  const [autoRefreshOnline, setAutoRefreshOnline] = React.useState(true);
  const [lastOnlineSync, setLastOnlineSync] = React.useState<Date | null>(null);

  // Filtres & Recherche
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [levelFilter, setLevelFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Modales
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);

  // Utilisateur ciblé par une modale
  const [selectedUser, setSelectedUser] = React.useState<AdminUserItem | null>(null);

  // Formulaire Nouvel Utilisateur
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newFullName, setNewFullName] = React.useState("");
  const [newRole, setNewRole] = React.useState<"student" | "admin" | "superadmin">("student");
  const [newLevel, setNewLevel] = React.useState("licence_1");
  const [newField, setNewField] = React.useState("");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false);

  // Formulaire Édition Utilisateur
  const [editFullName, setEditFullName] = React.useState("");
  const [editRole, setEditRole] = React.useState<"student" | "admin" | "superadmin">("student");
  const [editLevel, setEditLevel] = React.useState("");
  const [editField, setEditField] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // Formulaire Réinitialisation Mot de passe
  const [resetPasswordValue, setResetPasswordValue] = React.useState("");
  const [resetError, setResetError] = React.useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = React.useState<string | null>(null);
  const [isSubmittingReset, setIsSubmittingReset] = React.useState(false);

  // Formulaire Suppression
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = React.useState(false);

  // Notification d'action globale
  const [notification, setNotification] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Récupération des utilisateurs en ligne (Super Administrateur uniquement)
  const fetchOnlineUsers = React.useCallback(async (silent = false) => {
    if (!isSuperAdmin) return;
    if (!silent) setIsRefreshingOnline(true);
    try {
      const res = await fetch("/api/admin/online-users");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOnlineUsers(json.data.users);
          setOnlineStats(json.data.stats);
          setLastOnlineSync(new Date());
        }
      }
    } catch (err) {
      console.error("Erreur récupération utilisateurs en ligne :", err);
    } finally {
      setIsLoadingOnline(false);
      if (!silent) setIsRefreshingOnline(false);
    }
  }, [isSuperAdmin]);

  React.useEffect(() => {
    if (isSuperAdmin) {
      fetchOnlineUsers(true);
      const interval = setInterval(() => {
        if (autoRefreshOnline && (activeTab === "online" || (typeof document !== "undefined" && document.visibilityState === "visible"))) {
          fetchOnlineUsers(true);
        }
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin, activeTab, autoRefreshOnline, fetchOnlineUsers]);

  const fetchUsers = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (levelFilter !== "all") params.set("level", levelFilter);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUsers(json.data.users);
          setStats(json.data.stats);
          setTotalCount(json.data.pagination.total);
          setTotalPages(json.data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des utilisateurs :", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, roleFilter, levelFilter, page]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce pour la recherche
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Création utilisateur
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmittingCreate(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
          fullName: newFullName || undefined,
          academicLevel: newLevel || undefined,
          fieldOfStudy: newField || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setCreateError(json.error || json.message || "Erreur lors de la création.");
        return;
      }

      setCreateModalOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      setNewField("");
      setNotification({
        type: "success",
        message: `Compte utilisateur ${newEmail} créé avec succès.`,
      });
      fetchUsers();
    } catch (err) {
      setCreateError("Erreur réseau lors de la création.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Ouvrir modal d'édition
  const openEditModal = (u: AdminUserItem) => {
    setSelectedUser(u);
    setEditFullName(u.profile?.fullName || "");
    setEditRole((u.role as "student" | "admin" | "superadmin") || "student");
    setEditLevel(u.profile?.academicLevel || "licence_1");
    setEditField(u.profile?.fieldOfStudy || "");
    setEditError(null);
    setEditModalOpen(true);
  };

  // Enregistrer édition utilisateur
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          fullName: editFullName,
          academicLevel: editLevel,
          fieldOfStudy: editField,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setEditError(json.error || json.message || "Erreur lors de la modification.");
        return;
      }

      setEditModalOpen(false);
      setNotification({
        type: "success",
        message: `Profil de ${selectedUser.email} mis à jour avec succès.`,
      });
      fetchUsers();
    } catch {
      setEditError("Erreur réseau lors de la mise à jour.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Ouvrir modal réinitialisation mot de passe
  const openResetPasswordModal = (u: AdminUserItem) => {
    setSelectedUser(u);
    setResetPasswordValue("");
    setResetError(null);
    setResetSuccess(null);
    setResetPasswordModalOpen(true);
  };

  // Générateur de mot de passe sécurisé
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordValue(pwd);
  };

  // Exécuter réinitialisation mot de passe
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setResetError(null);
    setIsSubmittingReset(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: resetPasswordValue,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setResetError(json.error || json.message || "Erreur lors de la réinitialisation.");
        return;
      }

      setResetSuccess(
        `Nouveau mot de passe enregistré pour ${selectedUser.email} : ${resetPasswordValue}`
      );
      setNotification({
        type: "success",
        message: `Mot de passe réinitialisé avec succès pour ${selectedUser.email}.`,
      });
    } catch {
      setResetError("Erreur réseau lors de la réinitialisation.");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Ouvrir modal de suppression
  const openDeleteModal = (u: AdminUserItem) => {
    setSelectedUser(u);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  // Confirmer suppression utilisateur
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleteError(null);
    setIsSubmittingDelete(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setDeleteError(json.error || json.message || "Erreur lors de la suppression.");
        return;
      }

      setDeleteModalOpen(false);
      setNotification({
        type: "success",
        message: `Compte ${selectedUser.email} supprimé définitivement.`,
      });
      fetchUsers();
    } catch {
      setDeleteError("Erreur réseau lors de la suppression.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE DE LA SECTION ADMINISTRATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-amber-400 dark:bg-slate-800 border border-slate-700">
              <Users className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Gestion des Utilisateurs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervisez les comptes étudiants, l&apos;unique Super Administrateur et inspectez l&apos;activité académique.
          </p>
        </div>

        {/* Boutons d'action : Actualiser & Créer */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRefreshing(true);
              fetchUsers();
            }}
            disabled={isRefreshing}
            className="h-9 px-3 text-xs gap-1.5 border-[#E8E4DC] dark:border-slate-800 bg-white dark:bg-slate-900"
            title="Actualiser la liste"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCreateError(null);
              setCreateModalOpen(true);
            }}
            className="h-9 px-3.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 gap-1.5 shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5 text-amber-400" />
            <span>Nouvel utilisateur</span>
          </Button>
        </div>
      </div>

      {/* 2. BANNIÈRE DE NOTIFICATION */}
      {notification && (
        <div
          className={cn(
            "p-3 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 border",
            notification.type === "success"
              ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border-emerald-500/30"
              : "bg-red-500/10 text-red-900 dark:text-red-300 border-red-500/30"
          )}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* SÉLECTEUR D'ONGLET PRINCIPAL */}
      <div className="flex items-center gap-2 border-b border-[#E8E4DC] dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={cn(
            "px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
            activeTab === "users"
              ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          )}
        >
          <Users className="h-4 w-4 text-amber-400" />
          <span>Annuaire des Utilisateurs</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
            {stats?.totalUsers ?? users.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isSuperAdmin) {
              setNotification({
                type: "error",
                message:
                  "Accès refusé : La vue des utilisateurs en ligne est réservée exclusivement à l'unique Super Utilisateur.",
              });
              return;
            }
            setActiveTab("online");
            fetchOnlineUsers();
          }}
          className={cn(
            "relative px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
            activeTab === "online"
              ? "bg-slate-900 text-white border border-slate-700 shadow-xs dark:bg-slate-800"
              : isSuperAdmin
              ? "text-slate-800 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-900 dark:hover:text-amber-300"
              : "text-slate-400 dark:text-slate-500 hover:bg-slate-100/50 cursor-not-allowed opacity-75"
          )}
          title={
            !isSuperAdmin
              ? "Réservé exclusivement au Super Utilisateur"
              : "Surveillance en temps réel des utilisateurs connectés"
          }
        >
          <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span>Surveillance en Direct (En Ligne)</span>
          {isSuperAdmin ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              {onlineStats?.onlineCount ?? 0} en ligne
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-500">
              <Lock className="h-2.5 w-2.5" />
              Super Admin
            </span>
          )}
        </button>
      </div>

      {/* ONGLET 1 : ANNUAIRE DES UTILISATEURS */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* 3. CARTES KPI / STATISTIQUES GLOBALES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total utilisateurs */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Utilisateurs
            </span>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats ? stats.totalUsers : "..."}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {stats ? `${stats.totalStudents} étudiants • ${stats.totalSuperAdmins ?? 1} superadmin` : "Chargement..."}
            </p>
          </CardContent>
        </Card>

        {/* Super Administrateur */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Super Administrateur
            </span>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats ? (stats.totalSuperAdmins ?? 1) : "..."}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Administrateur unique du site
            </p>
          </CardContent>
        </Card>

        {/* Supports & Documents */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Supports &amp; Packs
            </span>
            <BookOpen className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats ? stats.totalDocuments : "..."}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Cours analysés par l&apos;IA
            </p>
          </CardContent>
        </Card>

        {/* Quiz passés */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Évaluations QCM
            </span>
            <GraduationCap className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats ? stats.totalQuizzes : "..."}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Générés et évalués
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. BARRE D'OUTILS : RECHERCHE ET FILTRES */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#E8E4DC] dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
        {/* Champ de recherche */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            id="admin-user-search"
            type="text"
            placeholder="Rechercher par nom, email, filière..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9 h-9 text-xs bg-slate-50/50 dark:bg-slate-950/50 border-[#E8E4DC] dark:border-slate-800"
          />
        </div>

        {/* Filtres par Rôle et Niveau */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre Rôle */}
          <Select
            value={roleFilter}
            onValueChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs bg-slate-50/50 dark:bg-slate-950/50 border-[#E8E4DC] dark:border-slate-800">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="student">Étudiants</SelectItem>
              <SelectItem value="superadmin">Super Administrateur</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtre Niveau */}
          <Select
            value={levelFilter}
            onValueChange={(val) => {
              setLevelFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs bg-slate-50/50 dark:bg-slate-950/50 border-[#E8E4DC] dark:border-slate-800">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              {ACADEMIC_LEVELS.map((lvl) => (
                <SelectItem key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || roleFilter !== "all" || levelFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setLevelFilter("all");
                setPage(1);
              }}
              className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800"
            >
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* 5. TABLEAU DES UTILISATEURS */}
      <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-3">Rôle</th>
                <th className="py-3 px-3">Niveau &amp; Filière</th>
                <th className="py-3 px-3">Activité</th>
                <th className="py-3 px-3">Inscription</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC]/80 dark:divide-slate-800/80">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="h-2.5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-7 w-7 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Aucun utilisateur trouvé
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Essayez d&apos;ajuster vos critères de recherche ou vos filtres.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const displayName = u.profile?.fullName || u.email.split("@")[0];
                  const initials =
                    displayName
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase() || "UT";

                  const isSuperAdminUser = u.role === "superadmin";
                  const isAdmin = u.role === "admin";
                  const isCurrent = currentAdmin?.id === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      {/* Utilisateur */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="h-8 w-8 ring-1 ring-[#E8E4DC] dark:ring-slate-800">
                              {u.profile?.avatarUrl && (
                                <AvatarImage src={u.profile.avatarUrl} alt={displayName} />
                              )}
                              <AvatarFallback
                                className={cn(
                                  "text-xs font-semibold",
                                  isSuperAdminUser
                                    ? "bg-slate-900 text-amber-400 border border-slate-700 dark:bg-slate-800"
                                    : isAdmin
                                    ? "bg-slate-900 text-amber-400 dark:bg-slate-800"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                )}
                              >
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {/* Pastille de présence en direct (visible par le Super Utilisateur) */}
                            {isSuperAdmin && u.lastActiveAt && (
                              <span
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-950",
                                  (Date.now() - new Date(u.lastActiveAt).getTime()) <= 120000
                                    ? "bg-emerald-500 animate-pulse"
                                    : (Date.now() - new Date(u.lastActiveAt).getTime()) <= 600000
                                    ? "bg-amber-400"
                                    : "bg-slate-300 dark:bg-slate-600"
                                )}
                                title={
                                  (Date.now() - new Date(u.lastActiveAt).getTime()) <= 120000
                                    ? "En ligne maintenant"
                                    : "Inactif récent"
                                }
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                                {displayName}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1 py-0.2 rounded">
                                  (Vous)
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rôle */}
                      <td className="py-3 px-3">
                        {isSuperAdminUser ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                            <ShieldCheck className="h-3 w-3 text-amber-500" />
                            Super Admin
                          </span>
                        ) : isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                            <ShieldCheck className="h-3 w-3 text-amber-500" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <GraduationCap className="h-3 w-3 text-slate-500" />
                            Étudiant
                          </span>
                        )}
                      </td>

                      {/* Niveau & Filière */}
                      <td className="py-3 px-3">
                        <div className="text-xs text-slate-900 dark:text-slate-200 font-medium">
                          {formatAcademicLevel(u.profile?.academicLevel)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                          {u.profile?.fieldOfStudy || "Filière non spécifiée"}
                        </div>
                      </td>

                      {/* Activité */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                          <span title={`${u.counts.documents} supports déposés`} className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            {u.counts.documents}
                          </span>
                          <span title={`${u.counts.quizzes} quiz passés`} className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {u.counts.quizzes}
                          </span>
                          <span title={`${u.counts.scheduleEntries} cours dans l'emploi du temps`} className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-amber-500" />
                            {u.counts.scheduleEntries}
                          </span>
                        </div>
                      </td>

                      {/* Date d'inscription */}
                      <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              aria-label="Actions utilisateur"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuLabel className="text-[11px] font-semibold text-slate-500">
                              Options du compte
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(u);
                                setDetailsModalOpen(true);
                              }}
                              className="cursor-pointer gap-2"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Consulter l&apos;activité</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditModal(u)}
                              className="cursor-pointer gap-2"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Modifier profil &amp; rôle</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openResetPasswordModal(u)}
                              className="cursor-pointer gap-2"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              <span>Réinitialiser mot de passe</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={isCurrent || isSuperAdminUser}
                              onClick={() => openDeleteModal(u)}
                              className="cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{isSuperAdminUser ? "Super Admin protégé" : "Supprimer l'utilisateur"}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E4DC] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-xs text-slate-500">
          <div>
            Affichage de <span className="font-semibold text-slate-800 dark:text-slate-200">{users.length}</span> sur{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalCount}</span> utilisateur(s)
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 border-[#E8E4DC] dark:border-slate-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs font-semibold">
              Page {page} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 p-0 border-[#E8E4DC] dark:border-slate-800"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
      </div>
      )}

      {/* ONGLET 2 : SUPERVISION EN DIRECT (RÉSERVÉ EXCLUSIVEMENT AU SUPER UTILISATEUR) */}
      {activeTab === "online" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Bannière explicative Super Utilisateur */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 dark:border-amber-500/20 dark:from-amber-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400 dark:bg-amber-500 dark:text-slate-950 shadow-xs">
                  <Radio className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Supervision des Connexions en Direct
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                      <ShieldCheck className="h-3 w-3" />
                      Accès Super Utilisateur
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Vous êtes le seul compte autorisé à observer la présence et l&apos;activité en temps réel des utilisateurs sur la plateforme.
                  </p>
                </div>
              </div>

              {/* Contrôles de rafraîchissement */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[#E8E4DC] dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-[11px] text-slate-600 dark:text-slate-400">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      autoRefreshOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    )}
                  />
                  <span>Auto-scan (6s)</span>
                  <button
                    type="button"
                    onClick={() => setAutoRefreshOnline(!autoRefreshOnline)}
                    className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer ml-1"
                  >
                    {autoRefreshOnline ? "Pause" : "Activer"}
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchOnlineUsers(false)}
                  disabled={isRefreshingOnline}
                  className="h-8 px-2.5 text-xs gap-1.5 border-[#E8E4DC] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
                  title="Forcer la détection immédiate"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingOnline && "animate-spin")} />
                  <span className="hidden sm:inline">Scanner</span>
                </Button>
              </div>
            </div>
            {lastOnlineSync && (
              <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Dernière synchronisation effectuée à {lastOnlineSync.toLocaleTimeString("fr-FR")}</span>
              </div>
            )}
          </div>

          {/* Cartes KPI en direct */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* 1. En ligne maintenant */}
            <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs border-emerald-500/30">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  En ligne maintenant
                </span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {onlineStats ? onlineStats.onlineCount : "..."}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Actifs ces 2 dernières minutes
                </p>
              </CardContent>
            </Card>

            {/* 2. En veille / récent */}
            <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  En veille / Récent
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {onlineStats ? onlineStats.idleCount : "..."}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Activité entre 2 et 10 min
                </p>
              </CardContent>
            </Card>

            {/* 3. Hors ligne */}
            <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Hors ligne
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {onlineStats ? onlineStats.offlineCount : "..."}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Aucune session active
                </p>
              </CardContent>
            </Card>

            {/* 4. Total inscrits */}
            <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Base Utilisateurs
                </span>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {onlineStats ? onlineStats.totalUsers : "..."}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Total des comptes enregistrés
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des utilisateurs en ligne et récents */}
          <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E8E4DC] dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-emerald-500" />
                  <span>Flux d&apos;activité des utilisateurs en direct</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Détection instantanée par signal de présence (heartbeat) et navigation
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-b border-[#E8E4DC] dark:border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-3">Rôle</th>
                    <th className="py-3 px-3">Présence en direct</th>
                    <th className="py-3 px-3">Page consultée</th>
                    <th className="py-3 px-3">Dernière activité</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DC]/60 dark:divide-slate-800/60">
                  {isLoadingOnline ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-3"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-3"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-3"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-3"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : onlineUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <Radio className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Aucun utilisateur actif détecté récemment
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Les utilisateurs connectés apparaîtront automatiquement dès qu&apos;ils navigueront sur la plateforme.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    onlineUsers.map((u) => {
                      const isOnline = u.status === "online";
                      const isIdle = u.status === "idle";
                      const isSuper = u.role === "superadmin";
                      const isAdmin = u.role === "admin";
                      const isSelf = currentAdmin?.id === u.id;

                      const initials =
                        u.fullName
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase() || "UT";

                      return (
                        <tr
                          key={u.id}
                          className={cn(
                            "transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/60",
                            isOnline && "bg-emerald-500/[0.02]"
                          )}
                        >
                          {/* Utilisateur */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-8 w-8 ring-1 ring-[#E8E4DC] dark:ring-slate-800 shrink-0">
                                  {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.fullName} />}
                                  <AvatarFallback
                                    className={cn(
                                      "text-xs font-semibold",
                                      isSuper
                                        ? "bg-slate-900 text-amber-400 border border-amber-500/40 dark:bg-slate-950"
                                        : isAdmin
                                        ? "bg-slate-900 text-amber-400 dark:bg-slate-800"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    )}
                                  >
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span
                                  className={cn(
                                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-950",
                                    isOnline
                                      ? "bg-emerald-500 animate-pulse"
                                      : isIdle
                                      ? "bg-amber-400"
                                      : "bg-slate-300 dark:bg-slate-600"
                                  )}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                                    {u.fullName}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-500/15 px-1 py-0.2 rounded">
                                      (Vous)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Rôle */}
                          <td className="py-3 px-3">
                            {isSuper ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-900 text-amber-400 border border-amber-500/30">
                                <ShieldCheck className="h-3 w-3 text-amber-400" />
                                Super Admin
                              </span>
                            ) : isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                                <ShieldCheck className="h-3 w-3 text-amber-500" />
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <GraduationCap className="h-3 w-3 text-slate-500" />
                                Étudiant
                              </span>
                            )}
                          </td>

                          {/* Présence en direct */}
                          <td className="py-3 px-3">
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                <span>En ligne</span>
                                <span className="text-[10px] opacity-75 font-normal">({formatTimeAgo(u.secondsAgo)})</span>
                              </span>
                            ) : isIdle ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                                <span>En veille</span>
                                <span className="text-[10px] opacity-75 font-normal">({formatTimeAgo(u.secondsAgo)})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                                <span>Déconnecté</span>
                              </span>
                            )}
                          </td>

                          {/* Page consultée */}
                          <td className="py-3 px-3">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <Globe className="h-3 w-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[160px]">{formatPathFriendly(u.lastActivePath)}</span>
                            </div>
                          </td>

                          {/* Dernière activité */}
                          <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                            {u.lastActiveAt ? (
                              <div>
                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                  {new Date(u.lastActiveAt).toLocaleTimeString("fr-FR")}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(u.lastActiveAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const target = users.find((x) => x.id === u.id);
                                if (target) {
                                  setSelectedUser(target);
                                  setDetailsModalOpen(true);
                                } else {
                                  try {
                                    const res = await fetch(`/api/admin/users/${u.id}`);
                                    const json = await res.json();
                                    if (json.success && json.data) {
                                      setSelectedUser(json.data as any);
                                      setDetailsModalOpen(true);
                                    }
                                  } catch {}
                                }
                              }}
                              className="h-7 px-2 text-xs gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Inspecter</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODALE 1 : CRÉATION D'UN UTILISATEUR
      ========================================================================= */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-500" />
              <span>Créer un nouvel utilisateur</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Renseignez les informations d&apos;identification et le niveau académique du compte.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-lg text-xs bg-red-500/10 text-red-900 dark:text-red-300 border border-red-500/30">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label htmlFor="create-email" className="text-xs font-semibold">
                Adresse email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                required
                placeholder="etudiant@universite.sn"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-password" className="text-xs font-semibold">
                Mot de passe initial <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-password"
                type="text"
                required
                minLength={6}
                placeholder="Au moins 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-name" className="text-xs font-semibold">
                  Nom complet
                </Label>
                <Input
                  id="create-name"
                  type="text"
                  placeholder="Ex: Cheikh Anta Diop"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Rôle</Label>
                <Select value={newRole} onValueChange={(val: "student" | "admin" | "superadmin") => setNewRole(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Étudiant (Accès standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Niveau d&apos;études</Label>
                <Select value={newLevel} onValueChange={setNewLevel}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_LEVELS.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-field" className="text-xs font-semibold">
                  Filière / Spécialité
                </Label>
                <Input
                  id="create-field"
                  type="text"
                  placeholder="Ex: Informatique, Droit..."
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingCreate}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800"
              >
                {isSubmittingCreate ? "Création en cours..." : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODALE 2 : ÉDITION DU PROFIL & DU RÔLE
      ========================================================================= */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-amber-500" />
              <span>Modifier le compte</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mettez à jour le rôle ou les données académiques de {selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="p-3 rounded-lg text-xs bg-red-500/10 text-red-900 dark:text-red-300 border border-red-500/30">
              {editError}
            </div>
          )}

          <form onSubmit={handleEditUser} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label htmlFor="edit-name" className="text-xs font-semibold">
                Nom complet
              </Label>
              <Input
                id="edit-name"
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Rôle attribué</Label>
              <Select
                value={editRole}
                onValueChange={(val: "student" | "admin" | "superadmin") => setEditRole(val)}
                disabled={selectedUser?.role === "superadmin"}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Étudiant (Accès standard)</SelectItem>
                  {selectedUser?.role === "superadmin" && (
                    <SelectItem value="superadmin">
                      Super Administrateur (Gestionnaire unique du site)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedUser?.role === "superadmin" && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Ce compte est l&apos;unique Super Administrateur autorisé à administrer le site.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Niveau d&apos;études</Label>
                <Select value={editLevel} onValueChange={setEditLevel}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_LEVELS.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-field" className="text-xs font-semibold">
                  Filière / Spécialité
                </Label>
                <Input
                  id="edit-field"
                  type="text"
                  value={editField}
                  onChange={(e) => setEditField(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingEdit}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800"
              >
                {isSubmittingEdit ? "Mise à jour..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODALE 3 : RÉINITIALISATION DU MOT DE PASSE
      ========================================================================= */}
      <Dialog open={resetPasswordModalOpen} onOpenChange={setResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              <span>Réinitialiser le mot de passe</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Définissez un nouveau mot de passe pour {selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>

          {resetError && (
            <div className="p-3 rounded-lg text-xs bg-red-500/10 text-red-900 dark:text-red-300 border border-red-500/30">
              {resetError}
            </div>
          )}

          {resetSuccess && (
            <div className="p-3 rounded-lg text-xs bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border border-emerald-500/30 break-all font-mono">
              {resetSuccess}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="reset-pwd" className="text-xs font-semibold">
                  Nouveau mot de passe
                </Label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-amber-600 hover:underline font-medium cursor-pointer"
                >
                  Générer aléatoirement
                </button>
              </div>
              <Input
                id="reset-pwd"
                type="text"
                required
                minLength={6}
                placeholder="Nouveau mot de passe sécurisé"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                className="text-xs h-9 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Minimum 6 caractères. L&apos;étudiant pourra se connecter immédiatement avec cette clé.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetPasswordModalOpen(false)}
                className="text-xs"
              >
                Fermer
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingReset || resetPasswordValue.length < 6}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800"
              >
                {isSubmittingReset ? "Mise à jour..." : "Appliquer le mot de passe"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODALE 4 : SUPPRESSION D'UN UTILISATEUR
      ========================================================================= */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>Supprimer définitivement l&apos;utilisateur</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cette action est irréversible. Toutes les données associées à ce compte seront effacées.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 rounded-lg text-xs bg-red-500/10 text-red-900 dark:text-red-300 border border-red-500/30">
              {deleteError}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {selectedUser?.profile?.fullName || "Utilisateur"} ({selectedUser?.email})
            </p>
            <p className="text-slate-500 text-[11px]">
              Seront supprimés en cascade : {selectedUser?.counts.documents || 0} support(s),{" "}
              {selectedUser?.counts.flashcards || 0} flashcard(s), {selectedUser?.counts.quizzes || 0} quiz, et{" "}
              {selectedUser?.counts.scheduleEntries || 0} cours d&apos;emploi du temps.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingDelete}
              onClick={handleDeleteUser}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmittingDelete ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODALE 5 : FICHE ACTIVITÉ DÉTAILLÉE DE L'UTILISATEUR
      ========================================================================= */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-500" />
              <span>Fiche d&apos;activité détaillée</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vue synthétique du profil et des statistiques d&apos;apprentissage de l&apos;utilisateur.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 text-xs">
              {/* Entête profil */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-[#E8E4DC] dark:border-slate-800">
                <Avatar className="h-10 w-10 ring-1 ring-slate-300 dark:ring-slate-700">
                  <AvatarFallback className="bg-slate-900 text-white text-xs font-bold">
                    {(selectedUser.profile?.fullName || selectedUser.email)
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedUser.profile?.fullName || "Non renseigné"}
                  </h4>
                  <p className="text-[11px] text-slate-500">{selectedUser.email}</p>
                </div>
                <div className="ml-auto">
                  <Badge variant={selectedUser.role === "admin" ? "default" : "secondary"}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>

              {/* Infos académiques */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-[#E8E4DC] dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Niveau académique
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {formatAcademicLevel(selectedUser.profile?.academicLevel)}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[#E8E4DC] dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Filière
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {selectedUser.profile?.fieldOfStudy || "Général"}
                  </span>
                </div>
              </div>

              {/* Compteurs d'activité */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Volume de travail &amp; révisions
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-900/[0.04] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 block">
                      {selectedUser.counts.documents}
                    </span>
                    <span className="text-[10px] text-slate-500">Supports</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-base font-bold text-amber-700 dark:text-amber-300 block">
                      {selectedUser.counts.flashcards}
                    </span>
                    <span className="text-[10px] text-slate-500">Flashcards</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 block">
                      {selectedUser.counts.quizzes}
                    </span>
                    <span className="text-[10px] text-slate-500">Quiz passés</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span>Inscrit le {new Date(selectedUser.createdAt).toLocaleDateString("fr-FR")}</span>
                <span>ID: {selectedUser.id.substring(0, 8)}...</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setDetailsModalOpen(false)}
              className="text-xs w-full sm:w-auto"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
