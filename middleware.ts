import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "eduflow_session";
const JWT_SECRET = process.env.JWT_SECRET || "eduflow-secret-key-development-hackathon-2026-fallback";
const key = new TextEncoder().encode(JWT_SECRET);

// Routes protégées nécessitant une session active
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/schedule",
  "/planning",
  "/chat",
  "/courses",
  "/pomodoro",
  "/onboarding",
  "/admin",
];

// Routes d'authentification réservées aux anonymes
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Extraction et validation du token JWT
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  let isAuthenticated = false;
  let userRole = "student";

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      isAuthenticated = true;
      userRole = (payload.role as string) || "student";
    } catch {
      isAuthenticated = false;
    }
  }

  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  // 2. Utilisateur non connecté tentant d'accéder à une page protégée
  if (!isAuthenticated && (isProtectedPath || isAdminPath)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Utilisateur non connecté accédant à une API protégée
  if (!isAuthenticated && pathname.startsWith("/api/")) {
    const isPublicApi =
      pathname.startsWith("/api/auth/") || pathname === "/api/health";
    if (!isPublicApi) {
      return NextResponse.json(
        { success: false, message: "Authentification requise" },
        { status: 401 }
      );
    }
  }

  // 4. Contrôle d'accès strict : SEUL le Super Utilisateur est l'administrateur du site
  if (isAuthenticated && userRole !== "superadmin") {
    if (isAdminPath) {
      // Redirection silencieuse de tout non-superadmin vers le tableau de bord
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isAdminApi) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès refusé. L'accès à l'administration est réservé exclusivement au Super Utilisateur du site.",
        },
        { status: 403 }
      );
    }
  }

  // 5. Utilisateur déjà connecté accédant à /login ou /register -> redirection vers /admin pour l'admin, sinon /dashboard
  if (isAuthenticated && isAuthRoute) {
    if (userRole === "superadmin" || userRole === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 6. Navigation sur la page racine '/'
  if (pathname === "/") {
    if (isAuthenticated) {
      if (userRole === "superadmin" || userRole === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
