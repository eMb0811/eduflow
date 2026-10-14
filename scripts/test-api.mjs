/**
 * EduFlow Automated Health & API Test Suite
 * Tests all core routes, endpoints, data schemas and fallback resilience.
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const tests = [
  {
    name: "Page d'accueil / Tableau de bord",
    path: "/",
    method: "GET",
    expectStatus: 200,
  },
  {
    name: "Page Emploi du temps",
    path: "/emploi-du-temps",
    method: "GET",
    expectStatus: 200,
  },
  {
    name: "Page Cours & Quiz",
    path: "/cours",
    method: "GET",
    expectStatus: 200,
  },
  {
    name: "Page Assistant d'études IA",
    path: "/assistant",
    method: "GET",
    expectStatus: 200,
  },
  {
    name: "Page Minuteur Pomodoro",
    path: "/pomodoro",
    method: "GET",
    expectStatus: 200,
  },
  {
    name: "Page Profil académique",
    path: "/profil",
    method: "GET",
    expectStatus: 200,
  },
  {
    name: "API Profil Étudiant (GET /api/profile)",
    path: "/api/profile",
    method: "GET",
    expectStatus: 200,
    validate: (json) => json.success && json.data && typeof json.data.full_name === "string",
  },
  {
    name: "API Emploi du temps (GET /api/schedule)",
    path: "/api/schedule",
    method: "GET",
    expectStatus: 200,
    validate: (json) => json.success && Array.isArray(json.data) && json.data.length > 0,
  },
  {
    name: "API Examens à venir (GET /api/exams?upcoming=true)",
    path: "/api/exams?upcoming=true",
    method: "GET",
    expectStatus: 200,
    validate: (json) => json.success && Array.isArray(json.data),
  },
  {
    name: "API Statistiques Pomodoro (GET /api/pomodoro/stats)",
    path: "/api/pomodoro/stats",
    method: "GET",
    expectStatus: 200,
    validate: (json) =>
      json.success &&
      json.data &&
      json.data.stats &&
      Array.isArray(json.data.stats.weekly_study_minutes) &&
      typeof json.data.stats.total_sessions_count === "number",
  },
  {
    name: "API Planning de révision intelligent (POST /api/schedule/generate-planning)",
    path: "/api/schedule/generate-planning",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ day_of_week: "monday" }),
    expectStatus: 200,
    validate: (json) =>
      json.success &&
      json.data &&
      Array.isArray(json.data.slots) &&
      json.data.slots.length > 0 &&
      json.data.slots.every((s) => typeof s.subject === "string" && s.start_time && s.end_time),
  },
];

async function runTestSuite() {
  console.log(`\n🚀 Lancement de la suite de tests automatisée sur : ${BASE_URL}\n`);
  let passed = 0;
  let failed = 0;
  const startTotal = Date.now();

  for (const test of tests) {
    const url = `${BASE_URL}${test.path}`;
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: test.method,
        headers: test.headers,
        body: test.body,
      });

      const duration = Date.now() - start;
      const isStatusOk = res.status === test.expectStatus;

      let isDataValid = true;
      if (test.validate) {
        try {
          const json = await res.json();
          isDataValid = test.validate(json);
        } catch {
          isDataValid = false;
        }
      }

      if (isStatusOk && isDataValid) {
        console.log(`  ✅ [${res.status}] ${test.name} (${duration}ms)`);
        passed++;
      } else {
        console.error(
          `  ❌ [${res.status} attendu ${test.expectStatus}] ${test.name} (${duration}ms)`
        );
        failed++;
      }
    } catch (err) {
      const duration = Date.now() - start;
      console.error(`  ❌ [CRASH] ${test.name} : ${err.message} (${duration}ms)`);
      failed++;
    }
  }

  const totalDuration = Date.now() - startTotal;
  console.log(`\n------------------------------------------------------------`);
  console.log(`📊 Résultat : ${passed} réussis, ${failed} échoués sur ${tests.length} tests (${totalDuration}ms)`);
  console.log(`------------------------------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
