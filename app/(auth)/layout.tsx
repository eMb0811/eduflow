import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EduFlow - Authentification",
  description: "Accédez à votre espace d'apprentissage EduFlow",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
