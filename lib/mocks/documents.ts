import type { Document } from "@/types/database"
import type { DocumentSummary, Flashcard, QuizResponse } from "@/types/api"

export interface SampleCourseDoc {
  id: string
  title: string
  subject: string
  color: string
  excerpt: string
  content: string
}

export const SAMPLE_COURSES: SampleCourseDoc[] = [
  {
    id: "doc-sample-1",
    title: "Algorithmique : Graphes & Plus Courts Chemins",
    subject: "Algorithmique",
    color: "#6366f1",
    excerpt: "Algorithmes de Dijkstra, Bellman-Ford, structures de données en tas et complexités temporelles.",
    content: `CHAPITRE 4 : THÉORIE DES GRAPHES ET ALGORITHMES DE PLUS COURT CHEMIN

1. Définitions Fondamentales :
Un graphe orienté et pondéré G = (V, E, w) est composé d'un ensemble de sommets V, d'un ensemble d'arêtes E, et d'une fonction de pondération w qui associe à chaque arête (u, v) un poids réel.
Le chemin le plus court entre un sommet source s et une destination t minimise la somme des poids des arêtes empruntées.

2. L'Algorithme de Dijkstra :
- Hypothèse cruciale : Tous les poids des arêtes doivent être STRICTEMENT POSITIFS ou nuls (w(e) >= 0). En présence d'un poids négatif, Dijkstra échoue car il utilise une approche gloutonne irréversible.
- Principe : On maintient un tableau de distances d[v] initialisé à l'infini pour tous les sommets sauf la source s où d[s] = 0.
- À chaque étape, on extrait le sommet non visité ayant la distance minimale d[u]. On "relâche" (relax) ensuite chaque arête sortante (u, v) : si d[u] + w(u, v) < d[v], alors d[v] = d[u] + w(u, v).
- Complexité : Avec un tableau simple, la complexité est O(|V|^2). Avec une file de priorité implémentée par un tas binaire (min-heap), elle tombe à O((|V| + |E|) log |V|). Avec un tas de Fibonacci, elle atteint l'optimum théorique O(|E| + |V| log |V|).

3. L'Algorithme de Bellman-Ford :
- Utilité : Fonctionne même si des arêtes ont des poids négatifs.
- Détection de cycle absorbant : Un cycle absorbant est un cycle dont la somme des poids est strictement négative. Si un tel cycle est accessible depuis la source, le plus court chemin n'est pas défini (on peut réduire la distance à l'infini).
- Principe : Bellman-Ford effectue (|V| - 1) itérations de relâchement sur l'ensemble des arêtes E. Une |V|-ième itération permet de détecter formellement les cycles négatifs si une distance diminue encore.
- Complexité : O(|V| * |E|), plus lent que Dijkstra mais indispensable sur graphes à poids négatifs.

4. Algorithme de Floyd-Warshall :
- Objectif : Résout le problème des plus courts chemins entre toutes les paires de sommets (All-Pairs Shortest Paths).
- Paradigme : Programmation dynamique via la relation d[i][j] = min(d[i][j], d[i][k] + d[k][j]).
- Complexité temporelle : O(|V|^3), complexité spatiale : O(|V|^2).`,
  },
  {
    id: "doc-sample-2",
    title: "Bases de Données : Indexation & Optimisation SQL",
    subject: "Bases de données",
    color: "#06b6d4",
    excerpt: "Arbres B+ Tree, index clustered vs secondary, jointures Hash Join / Nested Loop et plans d'exécution EXPLAIN.",
    content: `COURS DE BASES DE DONNÉES AVANCÉES : INDEXATION ET MOTEURS DE REQUÊTES

1. Anatomie d'un Index B+ Tree :
- Un B+ Tree est un arbre équilibré auto-balancé spécialement conçu pour les accès disque en blocs.
- Propriétés majeures :
  * Toutes les données réelles (tuples ou pointeurs TID) sont stockées exclusivement dans les nœuds feuilles.
  * Les feuilles sont reliées entre elles par une liste doublement chaînée, ce qui rend les requêtes par plage (BETWEEN, >=, <=) extrêmement rapides par simple parcours séquentiel.
  * Les nœuds internes ne contiennent que des clés de routage et des pointeurs.
- Complexité de recherche, insertion et suppression : O(log N) accès disque.

2. Types d'index :
- Index Clusterisé (Clustered Index / Table Indexée) : Détermine l'ordre physique de stockage des données sur le disque. Une table ne peut comporter qu'UN SEUL index clusterisé (généralement la clé primaire PRIMARY KEY).
- Index Secondaire (Non-Clustered) : Structure séparée dont les feuilles contiennent la valeur indexée et une référence vers la ligne physique correspondante (soit un tuple ID, soit la clé primaire).

3. Mécanismes d'Exécution des Jointures :
- Nested Loops Join : Deux boucles imbriquées. Idéal lorsque la table externe est très petite et la table interne indexée. Complexité pire cas O(N * M).
- Hash Join : Construit une table de hachage en mémoire (phase Build) sur la relation la plus petite, puis balaye la seconde (phase Probe). Idéal pour les gros volumes de données sans index existant. Complexité O(N + M).
- Merge Join : Nécessite que les deux tables soient déjà triées selon les attributs de jointure. Parcours simultané à deux pointeurs en O(N + M).

4. Utilisation de EXPLAIN ANALYZE :
- 'Seq Scan' (Sequential Scan) : Parcours séquentiel complet de la table. Coûteux si la table est volumineuse.
- 'Index Scan' : Utilisation de l'index pour aller chercher directement les pages de données.
- 'Index Only Scan' : La requête est couverte intégralement par l'index, le moteur n'accède même pas à la table principale.`,
  },
]

export const mockUserDocuments: Document[] = SAMPLE_COURSES.map((c) => ({
  id: c.id,
  user_id: "00000000-0000-0000-0000-000000000000",
  subject_id: null,
  title: c.title,
  file_url: `https://example.com/docs/${c.id}.pdf`,
  created_at: new Date().toISOString(),
}))

export const SAMPLE_SUMMARIES: Record<string, DocumentSummary> = {
  "doc-sample-1": {
    title: "Synthèse : Graphes & Plus Courts Chemins",
    overview:
      "Étude comparative rigoureuse des algorithmes de Dijkstra, Bellman-Ford et Floyd-Warshall, précisant les hypothèses d'application sur les pondérations et leurs complexités respectives.",
    key_concepts: [
      {
        concept: "Relâchement (Relaxation)",
        explanation:
          "Mise à jour conditionnelle d'une distance d[v] vers un sommet si le passage intermédiaire par u est strictement plus court : si d[u] + w(u,v) < d[v], alors d[v] = d[u] + w(u,v).",
      },
      {
        concept: "Cycle Absorbant Négatif",
        explanation:
          "Cycle dont le coût cumulé est strictement négatif (< 0). Il rend le problème du plus court chemin indéfini car la distance tend vers l'infini négatif.",
      },
      {
        concept: "Approche Gloutonne de Dijkstra",
        explanation:
          "Fixe définitivement la distance minimale du sommet non visité le plus proche. Impératif : requiert des poids strictement positifs (w >= 0).",
      },
    ],
    detailed_summary:
      "1. Dijkstra résout le problème du plus court chemin à source unique sur graphes sans arêtes négatives en O((|V| + |E|) log |V|) avec tas binaire.\n2. Bellman-Ford gère les pondérations négatives et détecte les cycles absorbants en (|V| - 1) itérations de relâchement en O(|V| * |E|).\n3. Floyd-Warshall calcule les chemins optimaux pour toutes les paires par programmation dynamique en O(|V|³).",
    key_takeaways: [
      "Ne JAMAIS utiliser Dijkstra avec des arêtes à poids négatif.",
      "Bellman-Ford détecte les cycles négatifs à la |V|-ième itération.",
      "L'usage d'un min-heap optimise Dijkstra de O(|V|²) à O((|V| + |E|) log |V|).",
    ],
  },
}

export const SAMPLE_FLASHCARDS: Record<string, Flashcard[]> = {
  "doc-sample-1": [
    {
      id: "fc-1",
      question: "Quelle condition impérative doit être respectée pour appliquer l'algorithme de Dijkstra ?",
      answer: "Toutes les arêtes doivent posséder des poids strictement positifs ou nuls (w(e) >= 0). Sur poids négatifs, la décision gloutonne irréversible devient erronée.",
      category: "Algorithmes",
    },
    {
      id: "fc-2",
      question: "Quel algorithme permet de détecter formellement un cycle absorbant négatif ?",
      answer: "L'algorithme de Bellman-Ford. Une |V|-ième itération vérifie si une distance diminue encore, attestant de la présence d'un cycle de coût négatif.",
      category: "Graphes",
    },
    {
      id: "fc-3",
      question: "Quelle est la complexité temporelle optimale de Dijkstra avec un tas binaire (min-heap) ?",
      answer: "O((|V| + |E|) log |V|), où |V| est le nombre de sommets et |E| le nombre d'arêtes.",
      category: "Complexité",
    },
    {
      id: "fc-4",
      question: "Quel principe algorithmique sous-tend l'algorithme de Floyd-Warshall et quelle est sa complexité ?",
      answer: "La programmation dynamique (All-Pairs Shortest Paths) avec une complexité temporelle de O(|V|³) et spatiale de O(|V|²).",
      category: "Programmation Dynamique",
    },
  ],
}

export const SAMPLE_QUIZZES: Record<string, QuizResponse> = {
  "doc-sample-1": {
    title: "Auto-évaluation : Graphes & Plus Courts Chemins",
    questions: [
      {
        id: "q-1",
        question: "Pourquoi l'algorithme de Dijkstra échoue-t-il sur un graphe avec des arêtes négatives ?",
        options: [
          "Il boucle indéfiniment sans s'arrêter",
          "Son approche gloutonne ne revient jamais sur un sommet déjà marqué comme visité",
          "Il ne fonctionne que sur les arbres non orientés",
          "Il nécessite une matrice d'adjacence pleine",
        ],
        correct_option_index: 1,
        explanation: "Dijkstra considère que la distance au sommet extrait est définitive. Si une arête négative ultérieure offrait un raccourci, Dijkstra ne la recalculerait pas.",
      },
      {
        id: "q-2",
        question: "Combien d'itérations complètes de relâchement Bellman-Ford effectue-t-il au maximum pour trouver les distances optimales ?",
        options: ["|V| - 1 itérations", "|V| itérations", "|E| itérations", "log(|V|) itérations"],
        correct_option_index: 0,
        explanation: "Un chemin élémentaire sans cycle comporte au plus |V| - 1 arêtes. |V| - 1 itérations suffisent donc à propager toutes les distances.",
      },
    ],
  },
}
