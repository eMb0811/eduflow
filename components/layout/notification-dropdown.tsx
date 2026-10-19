"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ClipboardList,
  Timer,
  Sparkles,
  CheckCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "course" | "revision" | "kocc" | "achievement";
  href: string;
  createdAt: string;
}

const STORAGE_KEY = "eduflow_read_notifications";

export function NotificationDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  // Charger les identifiants déjà lus depuis le localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage parse error
    }
  }, []);

  // Récupérer les notifications calculées en temps réel
  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.notifications)) {
          setNotifications(json.data.notifications);
        }
      }
    } catch (err) {
      console.error("Erreur chargement notifications :", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
    } catch {
      // Ignore storage error
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    setIsOpen(false);
    router.push(notif.href);
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "course":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "revision":
        return <ClipboardList className="h-4 w-4 text-amber-500" />;
      case "achievement":
        return <Timer className="h-4 w-4 text-emerald-500" />;
      case "kocc":
        return <Sparkles className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          aria-label={`Notifications (${unreadCount} non lues)`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950 ring-2 ring-white dark:ring-slate-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl"
      >
        {/* En-tête du volet */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-300 border border-amber-500/30">
                {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 font-medium transition-colors cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Liste des notifications */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Aucune notification pour le moment.
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !readIds.includes(notif.id);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    isUnread && "bg-amber-500/[0.05] dark:bg-amber-400/[0.06]"
                  )}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-xs truncate",
                        isUnread
                          ? "font-semibold text-slate-900 dark:text-white"
                          : "font-medium text-slate-700 dark:text-slate-300"
                      )}>
                        {notif.title}
                      </p>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.description}
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 dark:text-slate-600 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
