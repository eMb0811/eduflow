import { redirect } from "next/navigation";

/**
 * Page racine d'EduFlow : redirige automatiquement vers le dashboard principal
 */
export default function HomePage() {
  redirect("/dashboard");
}
