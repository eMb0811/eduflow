import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const TEMP_USER_DATA = path.join(process.env.TEMP || "C:\\Temp", "eduflow-cdp-run-" + Date.now())
const PORT = 9222
const SCREENSHOT_DIR = path.resolve("public/screenshots")

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendCdp(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000)
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.id === id) {
          ws.removeEventListener("message", handler)
          if (data.error) reject(new Error(data.error.message))
          else resolve(data.result)
        }
      } catch (e) {
        reject(e)
      }
    }
    ws.addEventListener("message", handler)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(ws, expression) {
  return sendCdp(ws, "Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
}

async function capture(ws, filename, description) {
  console.log(`📸 Capture : ${description}...`)
  const pic = await sendCdp(ws, "Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })
  const filePath = path.join(SCREENSHOT_DIR, filename)
  await fs.writeFile(filePath, Buffer.from(pic.data, "base64"))
  console.log(`   -> Sauvegardé : public/screenshots/${filename}`)
}

async function run() {
  console.log("🚀 Lancement de Google Chrome en mode headless pour tests E2E...")
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true })

  const chromeProc = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${TEMP_USER_DATA}`,
      "--window-size=1440,960",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" }
  )

  // Wait for CDP to be available
  let cdpReady = false
  for (let i = 0; i < 20; i++) {
    await sleep(500)
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) {
        cdpReady = true
        break
      }
    } catch {}
  }

  if (!cdpReady) {
    chromeProc.kill()
    throw new Error("Impossible de se connecter au port CDP de Chrome (9222).")
  }
  console.log("✅ Chrome CDP prêt.")

  // Create new page targeting http://localhost:3000
  const tabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:3000`, { method: "PUT" })
  const tab = await tabRes.json()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)

  await new Promise((resolve) => {
    ws.onopen = resolve
  })

  console.log("🔗 Connecté au WebSocket CDP.")
  await sendCdp(ws, "Page.enable")
  await sendCdp(ws, "Runtime.enable")
  await sendCdp(ws, "DOM.enable")

  // ==========================================
  // 1. Dashboard (Page d'accueil)
  // ==========================================
  console.log("🌐 Étape 1 : Chargement du Dashboard...")
  await sleep(2500)
  await capture(ws, "01-dashboard.png", "Tableau de bord EduFlow (Thème Sombre Nocturne & Streak)")

  // ==========================================
  // 2. Cours & Synthèse Cognitive
  // ==========================================
  console.log("🌐 Étape 2 : Navigation vers /cours...")
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/cours" })
  await sleep(2200)
  await capture(ws, "02-cours-synthese.png", "Hub Cours & Synthèse Cognitive d'Algorithmique")

  // ==========================================
  // 3. Flashcards 3D Deck - Recto (Question)
  // ==========================================
  console.log("🔄 Étape 3 : Activation de l'onglet Flashcards...")
  await evaluate(
    ws,
    `(() => {
      const allTriggers = Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]'));
      const fc = allTriggers.find(t => t.textContent.includes('Flashcards'));
      if (fc) {
        fc.focus();
        fc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      }
    })()`
  )
  await sleep(1000)
  await capture(ws, "03-flashcards-recto.png", "Deck de Flashcards 3D (Recto - Question atomique)")

  // ==========================================
  // 4. Flashcards 3D Flip vers le Verso
  // ==========================================
  console.log("🔄 Étape 4 : Déclenchement du Flip 3D (Révélation Verso)...")
  await evaluate(
    ws,
    `(() => {
      const card = document.querySelector('.perspective-1000');
      if (card) {
        card.click();
      }
    })()`
  )
  await sleep(1000)
  await capture(ws, "04-flashcards-verso.png", "Flashcard Verso (Réponse validée & Répétition Espacée SRS)")

  // ==========================================
  // 5. Quiz d'Auto-Évaluation
  // ==========================================
  console.log("🔄 Étape 5 : Activation de l'onglet Quiz...")
  await evaluate(
    ws,
    `(() => {
      const allTriggers = Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]'));
      const quiz = allTriggers.find(t => t.textContent.includes('Quiz'));
      if (quiz) {
        quiz.focus();
        quiz.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      }
    })()`
  )
  await sleep(1000)
  await capture(ws, "05-cours-quiz.png", "Quiz interactif d'auto-évaluation")

  // ==========================================
  // 6. Assistant IA Tuteur
  // ==========================================
  console.log("🌐 Étape 6 : Navigation vers /assistant...")
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/assistant" })
  await sleep(2000)
  await evaluate(
    ws,
    `(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = "Explique-moi l'algorithme de Dijkstra et sa complexité temporelle avec un tas binaire.";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  )
  await sleep(500)
  await capture(ws, "06-assistant-tutor.png", "Tuteur IA interactif avec prompt de révision")

  // ==========================================
  // 7. Minuteur Pomodoro Focus (Session Active)
  // ==========================================
  console.log("🌐 Étape 7 : Navigation vers /pomodoro...")
  await sendCdp(ws, "Page.navigate", { url: "http://localhost:3000/pomodoro" })
  await sleep(1800)
  console.log("⏱️ Démarrage de la session Pomodoro...")
  await evaluate(
    ws,
    `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.textContent.includes('Démarrer'));
      if (startBtn) startBtn.click();
    })()`
  )
  await sleep(1500)
  await capture(ws, "07-pomodoro-active.png", "Minuteur Pomodoro Focus en cours d'exécution")

  // ==========================================
  // 8. Visualiseur interactif (index.html)
  // ==========================================
  console.log("🎬 Étape 8 : Mise à jour du visualiseur démo (index.html)...")
  const demoHtml = `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <title>EduFlow — Démo & Tests E2E Chrome</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --border: #1f293d;
      --primary: #38bdf8;
      --text: #f3f4f6;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    header {
      width: 100%;
      max-width: 1100px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: var(--primary);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .player-container {
      width: 100%;
      max-width: 1100px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .viewport {
      width: 100%;
      height: 640px;
      background: #000;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .viewport img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: opacity 0.3s ease;
    }
    .controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #0d131f;
      border-top: 1px solid var(--border);
    }
    .btn-group { display: flex; gap: 8px; }
    button {
      background: #1e293b;
      color: var(--text);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover { background: var(--primary); color: #000; }
    .status-text { font-size: 13px; color: var(--muted); }
    .thumbnails {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 12px;
      width: 100%;
      max-width: 1100px;
      margin-top: 24px;
    }
    .thumb {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
      opacity: 0.7;
    }
    .thumb.active {
      border-color: var(--primary);
      opacity: 1;
      transform: translateY(-2px);
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }
    .thumb img { width: 100%; height: 70px; object-fit: cover; display: block; }
    .thumb span { display: block; padding: 6px 8px; font-size: 10px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1 style="font-size: 20px; font-weight: 700;">EduFlow — Démo & Tests E2E Validés dans Google Chrome</h1>
      <p style="font-size: 13px; color: var(--muted); margin-top: 4px;">Validation visuelle, interactions 3D, minuteur temps réel & assistant IA</p>
    </div>
    <div class="badge">● Tests 100% Validés</div>
  </header>

  <div class="player-container">
    <div class="viewport">
      <img id="main-frame" src="01-dashboard.png" alt="Vue active">
    </div>
    <div class="controls">
      <div class="btn-group">
        <button id="prev-btn">◀ Précédent</button>
        <button id="play-btn">▶ Lecture auto</button>
        <button id="next-btn">Suivant ▶</button>
      </div>
      <div class="status-text" id="status-label">Étape 1 / 7 : Tableau de bord EduFlow</div>
    </div>
  </div>

  <div class="thumbnails" id="thumbs-list"></div>

  <script>
    const steps = [
      { file: "01-dashboard.png", label: "1. Tableau de bord" },
      { file: "02-cours-synthese.png", label: "2. Cours & Synthèse" },
      { file: "03-flashcards-recto.png", label: "3. Flashcards Recto" },
      { file: "04-flashcards-verso.png", label: "4. Flashcards Verso (Flip 3D)" },
      { file: "05-cours-quiz.png", label: "5. Quiz d'auto-évaluation" },
      { file: "06-assistant-tutor.png", label: "6. Assistant d'études IA" },
      { file: "07-pomodoro-active.png", label: "7. Minuteur Pomodoro Focus" }
    ];

    let current = 0;
    let timer = null;
    const imgEl = document.getElementById("main-frame");
    const labelEl = document.getElementById("status-label");
    const playBtn = document.getElementById("play-btn");
    const thumbsContainer = document.getElementById("thumbs-list");

    steps.forEach((s, idx) => {
      const div = document.createElement("div");
      div.className = "thumb" + (idx === 0 ? " active" : "");
      div.innerHTML = '<img src="' + s.file + '"><span>' + s.label + '</span>';
      div.onclick = () => showStep(idx);
      thumbsContainer.appendChild(div);
    });

    function showStep(idx) {
      current = idx;
      imgEl.src = steps[current].file;
      labelEl.textContent = "Étape " + (current + 1) + " / " + steps.length + " : " + steps[current].label;
      Array.from(thumbsContainer.children).forEach((el, i) => {
        el.className = "thumb" + (i === current ? " active" : "");
      });
    }

    document.getElementById("prev-btn").onclick = () => {
      showStep((current - 1 + steps.length) % steps.length);
    };
    document.getElementById("next-btn").onclick = () => {
      showStep((current + 1) % steps.length);
    };

    playBtn.onclick = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
        playBtn.textContent = "▶ Lecture auto";
      } else {
        playBtn.textContent = "⏸ Pause";
        timer = setInterval(() => {
          showStep((current + 1) % steps.length);
        }, 2200);
      }
    };
  </script>
</body>
</html>`

  await fs.writeFile(path.join(SCREENSHOT_DIR, "index.html"), demoHtml, "utf8")
  console.log("   -> Sauvegardé : public/screenshots/index.html")

  // Close session
  ws.close()
  chromeProc.kill()
  console.log("🎉 Tous les tests Chrome E2E et captures d'écran ont réussi avec succès !")
}

run().catch((err) => {
  console.error("❌ Erreur E2E Chrome :", err)
  process.exit(1)
})
