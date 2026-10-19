export interface AutoCourseAnalysis {
  cleanTitle: string;
  subjectName: string;
  subjectColor: string;
  summary: string;
  keyConcepts: string[];
  flashcards: Array<{
    question: string;
    answer: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  quizQuestions: Array<{
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }>;
}

/**
 * Nettoie un nom de fichier ou de chapitre brut pour en faire un intitulé académique propre
 */
export function formatAcademicTitle(rawName: string): string {
  const withoutExt = rawName.replace(/\.[a-zA-Z0-9]{2,5}$/, '');
  const spaced = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!spaced) return 'Support de cours universitaire';

  if (spaced.includes('—') || spaced.includes(':')) {
    return spaced;
  }

  return spaced
    .split(' ')
    .map((w, idx) => {
      const lower = w.toLowerCase();
      if (
        idx > 0 &&
        ['de', 'du', 'des', 'et', 'en', 'sur', 'pour', 'la', 'le', 'les', 'aux', 'dans', 'par'].includes(
          lower
        )
      ) {
        return lower;
      }
      if (
        [
          'sql',
          '3nf',
          'bcnf',
          'avl',
          'risc',
          'cpu',
          'tcp',
          'ip',
          'osi',
          'ia',
          'tp',
          'td',
          'cm',
          'dns',
          'dhcp',
          'ldap',
          'snmp',
          'ssh',
          'http',
          'rest',
          'jwt',
          'api',
          'rpc',
          'rmi',
          'cap',
          'pwa',
          'bd',
        ].includes(lower)
      ) {
        return lower.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Génère automatiquement un pack complet de révision (Synthèse + Concepts + Flashcards + Quiz QCM)
 * à partir d'un fichier, d'une matière de l'emploi du temps ou d'un thème saisi sans PDF.
 */
export function analyzeCourseAutomatically(
  rawName: string,
  extractedText: string | null,
  scheduleSubjects: Array<{ name: string; color: string }>,
  explicitSubjectName?: string
): AutoCourseAnalysis {
  const cleanTitle = formatAcademicTitle(rawName);
  const corpus = `${explicitSubjectName || ''} ${rawName} ${extractedText || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const domainRules: Array<{
    keywords: string[];
    defaultSubject: string;
    color: string;
    concepts: string[];
    summary: string;
    flashcards: AutoCourseAnalysis['flashcards'];
    quizQuestions: AutoCourseAnalysis['quizQuestions'];
  }> = [
    {
      keywords: [
        'reparti',
        'distribue',
        'horloge',
        'lamport',
        'vectoriel',
        'consensus',
        'exclusion mutuelle',
        'ricart',
        'agrawala',
        'rpc',
        'rmi',
        'cap',
        'raft',
        'paxos',
        'middleware',
        'grpc',
      ],
      defaultSubject: 'Systèmes répartis',
      color: '#4F46E5',
      concepts: [
        'Relation causale Happened-Before & Horloges de Lamport',
        'Horloges vectorielles & états globaux cohérents (Chandy-Lamport)',
        'Exclusion mutuelle distribuée (Ricart-Agrawala & Anneau à jeton)',
        'Théorème CAP, Consensus & tolérance aux pannes',
      ],
      summary: `### Synthèse Académique — ${cleanTitle}\n\nCe module couvre l'architecture et les algorithmes fondamentaux des **Systèmes répartis** :\n- **Absence d'horloge globale et causalité** : Dans un système asynchrone communicant par passage de messages, l'ordre causal est formalisé par la relation *Happened-Before* ($a \\rightarrow b$) de Lamport. Les **horloges vectorielles** caractérisent exactement la causalité ($V(a) < V(b) \\iff a \\rightarrow b$).\n- **Exclusion mutuelle et synchronisation distribuée** : Accès coordonné à une section critique sans mémoire partagée via l'algorithme centralisé, l'algorithme à permissions de **Ricart-Agrawala** ($2(N-1)$ messages) ou l'anneau à jeton.\n- **Cohérence, réplication et théorème CAP** : En présence d'un partitionnement réseau ($P$), un système distribué doit arbitrer entre la cohérence stricte ($C$, linéarisabilité) et la disponibilité immédiate ($A$).`,
      flashcards: [
        {
          question:
            'Dans un système réparti, que garantit l’horloge logique scalaire de Lamport et quelle est sa limite par rapport aux horloges vectorielles ?',
          answer:
            'Si a -> b (ordre causal), alors L(a) < L(b). Mais la réciproque est fausse avec une horloge scalaire : seules les horloges vectorielles garantissent V(a) < V(b) <=> a -> b.',
          difficulty: 'medium',
        },
        {
          question:
            'Quel est le coût en nombre de messages de l’algorithme d’exclusion mutuelle distribuée de Ricart-Agrawala pour N processus ?',
          answer:
            '2(N - 1) messages par entrée en section critique : (N - 1) requêtes diffusées en multicast estampillé et (N - 1) réponses d’accord.',
          difficulty: 'hard',
        },
        {
          question:
            'Quelles sont les trois propriétés mises en tension par le théorème CAP de Brewer ?',
          answer:
            'Consistency (Cohérence forte : tous les nœuds voient la même donnée au même instant), Availability (Disponibilité : toute requête reçoit une réponse), Partition Tolerance (Tolérance au cloisonnement réseau).',
          difficulty: 'easy',
        },
        {
          question:
            'Quel est le rôle d’une coupure cohérente (Consistent Cut) capturée par l’algorithme de Chandy-Lamport ?',
          answer:
            'Enregistrer un état global cohérent du système réparti (sans arrêter l’exécution) tel que si la réception d’un message appartient à la coupure, son émission y appartient aussi.',
          difficulty: 'hard',
        },
      ],
      quizQuestions: [
        {
          question:
            'Dans un système réparti asynchrone, quelle structure d’estampillage permet de détecter avec certitude si deux événements sont concurrents (a || b) ?',
          options: [
            'L’horloge physique locale de chaque machine',
            'L’horloge logique scalaire de Lamport',
            'Les horloges vectorielles (Vector Clocks)',
            'Le compteur de sauts TTL du paquet IP',
          ],
          correctAnswerIndex: 2,
          explanation:
            'Deux événements sont concurrents si et seulement si leurs vecteurs d’horloge V(a) et V(b) sont incomparables (ni V(a) < V(b) ni V(b) < V(a)).',
        },
        {
          question:
            'Dans l’algorithme de Ricart-Agrawala, comment deux processus qui demandent simultanément la section critique départagent-ils la priorité ?',
          options: [
            'Le processus ayant la plus petite estampille logique (couple [horloge, id_processus]) est prioritaire',
            'Le serveur maître choisit aléatoirement',
            'Les deux processus entrent ensemble en section critique',
            'Le processus ayant la plus grande adresse IP gagne',
          ],
          correctAnswerIndex: 0,
          explanation:
            'L’ordre total sur les couples (estampille de Lamport, identifiant du site) départage sans ambiguïté toutes les requêtes concurrentes.',
        },
        {
          question:
            'Selon le théorème CAP, que doit choisir un système distribué lorsqu’une partition réseau (P) survient entre deux sous-ensembles de nœuds ?',
          options: [
            'Il peut garantir simultanément une cohérence forte (C) et une disponibilité totale (A)',
            'Il doit privilégier soit la Cohérence stricte (CP), soit la Disponibilité (AP)',
            'Il désactive automatiquement le protocole TCP/IP',
            'Il supprime toutes les répliques existantes',
          ],
          correctAnswerIndex: 1,
          explanation:
            'Lors d’une partition réseau, accepter les écritures des deux côtés préserve la disponibilité (AP) au prix de divergences temporaires, tandis que bloquer un côté préserve la cohérence (CP).',
        },
      ],
    },
    {
      keywords: [
        'administration',
        'admin system',
        'service',
        'reseau',
        'dns',
        'dhcp',
        'ldap',
        'bind',
        'active directory',
        'iptables',
        'nftables',
        'pare-feu',
        'firewall',
        'snmp',
        'ssh',
        'proxy',
        'nginx',
        'apache',
        'vlan',
        'commutation',
        'routage',
        'cisco',
        'ccna',
        'routeur',
        'switch',
        'ospf',
        'bgp',
        'lan',
        'wan',
      ],
      defaultSubject: 'Administration de services réseaux',
      color: '#10B981',
      concepts: [
        'Résolution de noms DNS (Zones directes/inverses, A, AAAA, CNAME, MX, PTR)',
        'Attribution dynamique DHCP & cycle DORA (Discover, Offer, Request, Ack)',
        'Annuaires centralisés LDAP, comptes & permissions systèmes',
        'Sécurisation des flux (Pare-feu, Reverse Proxy, SSH) & supervision SNMP',
      ],
      summary: `### Synthèse Académique — ${cleanTitle}\n\nCe cours maîtrise le déploiement, la configuration et la sécurisation en **Administration Systèmes & Réseaux** :\n- **Service de noms de domaine (DNS — BIND9)** : Hiérarchie de l'espace de noms, délégation d'autorité (SOA, NS), enregistrements directs (**A** en IPv4, **AAAA** en IPv6, **CNAME**, **MX**) et zone de résolution inverse (**PTR** sous \`in-addr.arpa\`).\n- **Configuration automatique (DHCP)** : Attribution dynamique de baux IP (adresse, masque, passerelle par défaut, serveurs DNS) selon les 4 échanges **DORA** (*DHCPDISCOVER*, *DHCPOFFER*, *DHCPREQUEST*, *DHCPACK*) et relais DHCP (*dhcrelay*).\n- **Supervision et sécurisation système** : Gestion des services systemd, filtrage netfilter/nftables, serveur mandataire inverse (*Reverse Proxy* TLS), annuaire **LDAP** et supervision proactive par **SNMP** (agents, MIB, Traps).`,
      flashcards: [
        {
          question:
            'Quelles sont les 4 étapes successives (cycle DORA) lors de l’attribution d’une adresse IP par un serveur DHCP ?',
          answer:
            '1. DHCPDISCOVER (diffusion client), 2. DHCPOFFER (proposition serveur), 3. DHCPREQUEST (sélection de l’offre par le client), 4. DHCPACK (validation du bail par le serveur).',
          difficulty: 'easy',
        },
        {
          question:
            'Quelle est la différence entre un enregistrement DNS de type A, CNAME et PTR ?',
          answer:
            'A associe un nom d’hôte à une adresse IPv4 ; CNAME définit un alias canonique vers un autre nom de domaine ; PTR assure la résolution inverse d’une adresse IP vers un nom de domaine.',
          difficulty: 'medium',
        },
        {
          question:
            'Pourquoi un agent relais DHCP (DHCP Relay / IP Helper) est-il nécessaire dans une architecture segmentée en plusieurs VLANs ?',
          answer:
            'Parce que les requêtes DHCPDISCOVER sont envoyées en broadcast de niveau 2 et ne traversent pas les routeurs sans qu’un relais les convertisse en unicast vers le serveur DHCP central.',
          difficulty: 'hard',
        },
        {
          question:
            'Dans l’administration réseau avec SNMP, quelle est la différence entre un Polling (GET) et un Trap SNMP ?',
          answer:
            'Le Polling est une interrogation périodique initiée par le serveur de supervision vers l’agent, tandis que le Trap est une alerte asynchrone envoyée spontanément par l’équipement lors d’un incident.',
          difficulty: 'medium',
        },
      ],
      quizQuestions: [
        {
          question:
            'Quel enregistrement DNS est indispensable dans une zone inverse pour traduire une adresse IP en nom d’hôte qualifié (FQDN) ?',
          options: ['Enregistrement MX', 'Enregistrement PTR', 'Enregistrement TXT', 'Enregistrement CNAME'],
          correctAnswerIndex: 1,
          explanation:
            'L’enregistrement PTR (Pointer Record) assure la résolution inverse IP -> Nom d’hôte.',
        },
        {
          question:
            'Sur quels ports UDP fonctionnent respectivement le serveur DHCP et le client DHCP en IPv4 ?',
          options: [
            'Port 67 (Serveur) et Port 68 (Client)',
            'Port 53 (Serveur) et Port 80 (Client)',
            'Port 22 (Serveur) et Port 443 (Client)',
            'Port 161 (Serveur) et Port 162 (Client)',
          ],
          correctAnswerIndex: 0,
          explanation:
            'Le protocole DHCP utilise UDP 67 côté serveur et UDP 68 côté client (tandis que DNS utilise le port 53 et SNMP les ports 161/162).',
        },
        {
          question:
            'Quel avantage principal procure la mise en place d’un Reverse Proxy (ex: Nginx) devant des serveurs applicatifs internes ?',
          options: [
            'Remplacer le câblage Ethernet par du Wi-Fi',
            'Assurer la terminaison TLS/SSL, la répartition de charge (Load Balancing) et masquer l’adressage interne des serveurs',
            'Attribuer les adresses MAC aux cartes réseau',
            'Désactiver le protocole ARP sur le réseau local',
          ],
          correctAnswerIndex: 1,
          explanation:
            'Le Reverse Proxy centralise la sécurité TLS, filtre les requêtes entrantes et répartit la charge vers les backends.',
        },
      ],
    },
    {
      keywords: [
        'web',
        'mobile',
        'front-end',
        'back-end',
        'frontend',
        'backend',
        'react',
        'native',
        'flutter',
        'html',
        'css',
        'next',
        'js',
        'javascript',
        'typescript',
        'api',
        'rest',
        'jwt',
        'pwa',
        'android',
        'ios',
      ],
      defaultSubject: 'Développement web et mobile',
      color: '#0EA5E9',
      concepts: [
        'Architecture Client-Serveur, API RESTful & codes HTTP',
        'Composants déclaratifs, cycle de vie & gestion d’état (Front-end & Mobile)',
        'Persistance locale, middlewares Back-end & ORM',
        'Sécurité applicative : JWT HttpOnly, CORS, validation de schémas & OAuth2',
      ],
      summary: `### Synthèse Académique — ${cleanTitle}\n\nCe cours structure la conception et le développement d'applications en **Ingénierie Web & Mobile** :\n- **Architecture Client-Serveur & API REST** : Découplage entre l'interface Front-end (Web réactif / Mobile) et le Back-end via des endpoints REST stateless utilisant les verbes HTTP (\`GET\`, \`POST\`, \`PUT\`, \`PATCH\`, \`DELETE\`).\n- **Gestion d'état et performances** : Flux de données unidirectionnel (Props / State), mémorisation des rendus, listes virtualisées et chargement asynchrone tolérant aux latences réseau.\n- **Persistance et sécurité** : Protection des jetons d'authentification (**JWT HttpOnly** sur Web, **SecureStore / Keychain** sur Mobile), hachage de mots de passe et validation stricte des entrées côté serveur.`,
      flashcards: [
        {
          question:
            'Pourquoi ne faut-il jamais stocker un jeton sensible en clair dans localStorage (Web) ou AsyncStorage non chiffré (Mobile) ?',
          answer:
            'Sur le Web, localStorage est vulnérable au vol par script XSS (préférer un cookie HttpOnly) ; sur Mobile, AsyncStorage non chiffré est lisible sur un appareil compromis (préférer Keychain / Keystore sécurisé).',
          difficulty: 'medium',
        },
        {
          question:
            'Que signifie le principe Stateless (sans état) d’une API REST entre un client mobile/web et le serveur ?',
          answer:
            'Le serveur ne conserve aucun contexte de session client en mémoire entre deux requêtes : chaque requête doit contenir toutes les informations nécessaires à son traitement et à son authentification.',
          difficulty: 'easy',
        },
        {
          question:
            'Sur mobile ou dans un tableau volumineux, pourquoi utilise-t-on une liste virtualisée plutôt qu’un rendu complet de tous les éléments ?',
          answer:
            'Pour ne monter en mémoire et ne dessiner à l’écran que les éléments visibles dans la fenêtre de défilement, évitant les chutes de FPS et la saturation de la RAM.',
          difficulty: 'medium',
        },
        {
          question:
            'Quelle différence sépare les méthodes HTTP PUT et PATCH dans une API REST ?',
          answer:
            'PUT remplace intégralement la ressource cible (et est idempotent), tandis que PATCH applique une modification partielle uniquement sur les champs fournis.',
          difficulty: 'hard',
        },
      ],
      quizQuestions: [
        {
          question:
            'Quel mécanisme de sécurité du navigateur contrôle les requêtes HTTP effectuées par une application Front-end vers une API Back-end hébergée sur un domaine différent ?',
          options: [
            'CORS (Cross-Origin Resource Sharing)',
            'Le protocole DHCP',
            'La table de routage BGP',
            'L’algorithme de tri rapide',
          ],
          correctAnswerIndex: 0,
          explanation:
            'Les en-têtes CORS (Access-Control-Allow-Origin, etc.) définissent quelles origines externes sont autorisées à interroger l’API.',
        },
        {
          question:
            'Dans une application réactive, quel problème survient lorsqu’on déclenche un appel API dans un effet sans tableau de dépendances ni condition d’arrêt ?',
          options: [
            'L’écran passe automatiquement en mode sombre',
            'Une boucle infinie de requêtes réseau et de re-rendus (re-render loop)',
            'La base de données SQL supprime ses index',
            'Le compilateur refuse de démarrer',
          ],
          correctAnswerIndex: 1,
          explanation:
            'Mettre à jour l’état à la réception de la réponse provoque un nouveau rendu, qui relance l’effet indéfiniment si les dépendances ne sont pas bornées.',
        },
        {
          question:
            'Quel code de statut HTTP une API REST renvoie-t-elle lorsqu’un utilisateur non authentifié tente d’accéder à une ressource protégée ?',
          options: ['200 OK', '301 Moved Permanently', '401 Unauthorized', '500 Internal Server Error'],
          correctAnswerIndex: 2,
          explanation:
            '401 Unauthorized indique que la requête nécessite une authentification valide.',
        },
      ],
    },
    {
      keywords: ['sql', 'base', 'donn', 'bdd', 'admin bd', 'normalisation', '3nf', 'bcnf', 'relationnel', 'index', 'transaction', 'acid', 'sauvegarde', 'privileg'],
      defaultSubject: 'Bases de Données Relationnelles',
      color: '#0EA5E9',
      concepts: [
        'Administration SGBD : Utilisateurs, Rôles & Privilèges (GRANT / REVOKE)',
        'Transactions ACID, Verrouillage & Niveaux d’isolation',
        'Optimisation de requêtes, Index B-Tree & Plans d’exécution',
        'Sauvegarde à chaud/froid, Journalisation (WAL / Redo Log) & Reprise sur panne',
      ],
      summary: `### Synthèse Académique — ${cleanTitle}\n\nCe cours formalise l'administration, la sécurité et l'optimisation des **Bases de Données** :\n- **Sécurité et contrôle d'accès** : Gestion granulaire des comptes, rôles et privilèges SQL (\`GRANT\`, \`REVOKE\`, vues sécurisées) selon le principe du moindre privilège.\n- **Concurrence et intégrité transactionnelle** : Garantie des propriétés **ACID**, niveaux d'isolation (*Read Committed*, *Repeatable Read*, *Serializable*) et journalisation anticipée (*Write-Ahead Logging* — WAL) pour la reprise après panne.\n- **Indexation et optimisation** : Analyse du plan d'exécution (\`EXPLAIN\`), index B+Tree composites et stratégies de sauvegarde/restauration.`,
      flashcards: [
        {
          question: 'Quel est le rôle du journal des transactions (Redo Log / WAL — Write-Ahead Logging) dans l’administration d’un SGBD ?',
          answer: 'Enregistrer sur disque toute modification avant l’écriture effective dans les fichiers de données afin de garantir la Durabilité (D de ACID) et rejouer les transactions validées (REDO) ou annuler celles interrompues (UNDO) après un crash.',
          difficulty: 'medium',
        },
        {
          question: 'Quelles commandes SQL DCL permettent d’attribuer et de retirer des droits d’accès à un utilisateur ou un rôle ?',
          answer: 'GRANT (pour accorder des privilèges) et REVOKE (pour les révoquer).',
          difficulty: 'easy',
        },
        {
          question: 'Pourquoi utilise-t-on un index B+Tree sur une colonne fréquemment filtrée ou jointe ?',
          answer: 'Pour réduire le coût de recherche d’un balayage séquentiel complet (Full Table Scan en O(N)) à une traversée logarithmique O(log N).',
          difficulty: 'medium',
        },
      ],
      quizQuestions: [
        {
          question: 'Quelle propriété du modèle ACID garantit que les modifications d’une transaction validée (COMMIT) survivent à une panne électrique du serveur ?',
          options: ['Atomicité', 'Cohérence', 'Isolation', 'Durabilité'],
          correctAnswerIndex: 3,
          explanation: 'La Durabilité s’appuie sur les journaux de transactions (Redo Logs / WAL) écrits sur mémoire non volatile.',
        },
        {
          question: 'Quelle commande SQL permet d’inspecter le plan d’exécution choisi par l’optimiseur de requêtes (usage d’index vs scan complet) ?',
          options: ['EXPLAIN', 'TRUNCATE', 'ALTER TABLE', 'REVOKE'],
          correctAnswerIndex: 0,
          explanation: 'EXPLAIN affiche le plan d’exécution détaillé et le coût estimé par l’optimiseur du SGBD.',
        },
      ],
    },
    {
      keywords: ['algo', 'arbre', 'avl', 'graphe', 'complexit', 'tri', 'recurs', 'programmation', 'structure'],
      defaultSubject: 'Algorithmique Avancée',
      color: '#4F46E5',
      concepts: ['Complexité asymptotique O(n log n)', 'Équilibrage AVL & rotations', 'Parcours infixe et hauteur', 'Invariant de structure'],
      summary: `### Synthèse Académique — ${cleanTitle}\n\nCe cours examine les propriétés structurelles et algorithmiques essentielles :\n- **Définition et invariants** : Maintien de l'équilibre logarithmique $h = \\mathcal{O}(\\log n)$ garantissant des opérations de recherche, d'insertion et de suppression optimales.\n- **Mécanismes de rééquilibrage** : Application des rotations simples et doubles lorsque le facteur d'équilibre dépasse $|-1, +1|$.\n- **Analyse de complexité** : Comparaison entre le pire cas d'un ABR dégénéré $\\mathcal{O}(n)$ et la borne stricte garantie par la structure équilibrée.`,
      flashcards: [
        {
          question: `Quelle est la complexité temporelle dans le pire des cas d'une recherche dans un arbre équilibré étudié dans « ${cleanTitle} » ?`,
          answer: 'O(log n), car la hauteur de l’arbre est maintenue logarithmique par rapport au nombre de nœuds n.',
          difficulty: 'easy',
        },
        {
          question: 'Quel est le critère de validité du facteur d’équilibre d’un nœud dans un arbre AVL ?',
          answer: 'La différence de hauteur entre son sous-arbre gauche et son sous-arbre droit doit appartenir à {-1, 0, +1}.',
          difficulty: 'medium',
        },
      ],
      quizQuestions: [
        {
          question: 'Quelle propriété distingue fondamentalement un arbre AVL d’un arbre binaire de recherche quelconque ?',
          options: [
            'Chaque nœud possède exactement deux fils',
            'L’écart de hauteur entre les sous-arbres d’un même nœud n’excède jamais 1',
            'Les clés sont stockées uniquement dans les feuilles',
            'L’insertion s’effectue toujours en temps constant O(1)',
          ],
          correctAnswerIndex: 1,
          explanation: 'La condition d’équilibre AVL impose |h(G) - h(D)| <= 1 pour tout nœud.',
        },
      ],
    },
  ];

  // Si l'étudiant a explicitement choisi une matière de son emploi du temps
  const explicitScheduleMatch = explicitSubjectName
    ? scheduleSubjects.find(
        (s) => s.name.trim().toLowerCase() === explicitSubjectName.trim().toLowerCase()
      ) || { name: explicitSubjectName.trim(), color: '#4F46E5' }
    : null;

  for (const rule of domainRules) {
    if (rule.keywords.some((kw) => corpus.includes(kw))) {
      const fromSchedule =
        explicitScheduleMatch ||
        scheduleSubjects.find((s) =>
          rule.keywords.some((kw) =>
            s.name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .includes(kw)
          )
        );
      const matchedSubject = fromSchedule ? fromSchedule.name : rule.defaultSubject;
      const matchedColor = fromSchedule ? fromSchedule.color : rule.color;

      const customNotesSection =
        extractedText && extractedText.trim().length > 15 && !extractedText.startsWith('###')
          ? `\n\n- **Focus de votre chapitre / notes** : ${extractedText.trim()}`
          : '';

      return {
        cleanTitle,
        subjectName: matchedSubject,
        subjectColor: matchedColor,
        summary: `${rule.summary}${customNotesSection}`,
        keyConcepts: rule.concepts,
        flashcards: rule.flashcards,
        quizQuestions: rule.quizQuestions,
      };
    }
  }

  // Vérifier une correspondance directe avec une matière de l'emploi du temps
  const directScheduleMatch =
    explicitScheduleMatch ||
    scheduleSubjects.find((s) =>
      s.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .some((w) => corpus.includes(w))
    );

  if (directScheduleMatch) {
    let customNotes = '';
    if (extractedText && extractedText.trim().length > 10) {
      const cleanSlice = extractedText
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 450);
      customNotes = `\n- **Aperçu des notions abordées** : ${cleanSlice}...`;
    }

    return {
      cleanTitle,
      subjectName: directScheduleMatch.name,
      subjectColor: directScheduleMatch.color,
      summary: `### Synthèse Académique — ${cleanTitle}\n\nCe pack de révision couvre les fondements théoriques et méthodologiques de **${directScheduleMatch.name}** :\n- **Définitions structurantes** : Identification des concepts clés, protocoles et modèles de référence du programme.\n- **Mécanismes et propriétés** : Articulation logique entre les hypothèses techniques, les architectures étudiées et leurs garanties.\n- **Applications pratiques** : Résolution d'études de cas et exercices types d'examen.${customNotes}`,
      keyConcepts: [
        `Concepts clés : ${cleanTitle}`,
        `Architecture & Modèles (${directScheduleMatch.name})`,
        'Méthodologie de résolution',
        'Cas d’application aux évaluations',
      ],
      flashcards: [
        {
          question: `Quels sont les objectifs fondamentaux à maîtriser dans « ${cleanTitle} » (${directScheduleMatch.name}) ?`,
          answer: `Comprendre les définitions de référence, savoir justifier les choix d'architecture ou de méthode, et résoudre les cas pratiques associés en ${directScheduleMatch.name}.`,
          difficulty: 'easy',
        },
        {
          question: `Quelle démarche adopter face à un exercice d’examen portant sur « ${cleanTitle} » ?`,
          answer:
            '1. Identifier les hypothèses et contraintes de l’énoncé, 2. Mobiliser le modèle ou protocole approprié, 3. Vérifier la cohérence et les cas limites.',
          difficulty: 'medium',
        },
        {
          question: `Quel compromis technique faut-il systématiquement analyser en ${directScheduleMatch.name} ?`,
          answer:
            'L’équilibre entre performance (temps de réponse / débit), fiabilité (tolérance aux pannes / cohérence) et sécurité.',
          difficulty: 'hard',
        },
      ],
      quizQuestions: [
        {
          question: `Dans l'étude de « ${cleanTitle} » (${directScheduleMatch.name}), quelle étape garantit la validité d'une solution technique ?`,
          options: [
            'Vérifier les préconditions et contraintes de l’architecture avant d’appliquer la méthode',
            'Généraliser à partir d’un seul cas particulier sans vérification',
            'Ignorer les cas d’erreur ou de panne',
            'Réciter une définition sans l’appliquer au contexte',
          ],
          correctAnswerIndex: 0,
          explanation:
            'Une solution rigoureuse valide systématiquement les hypothèses et contraintes du problème posé.',
        },
        {
          question:
            'Quelle stratégie de révision permet d’ancrer durablement un chapitre même sans support PDF initial ?',
          options: [
            'La relecture passive unique',
            'L’alternance entre fiche de synthèse structurée, rappel actif par flashcards et validation par QCM',
            'Attendre la veille de l’examen',
            'Ignorer les matières sans polycopié',
          ],
          correctAnswerIndex: 1,
          explanation:
            'Le rappel actif (flashcards + quiz) couplé à une synthèse structurée multiplie la rétention à long terme.',
        },
      ],
    };
  }

  const fallbackSubject = explicitSubjectName || 'Cours Général';

  return {
    cleanTitle,
    subjectName: fallbackSubject,
    subjectColor: '#4F46E5',
    summary: `### Synthèse Académique — ${cleanTitle}\n\nCe support couvre les notions et définitions clés de **${fallbackSubject}** :\n- **Concepts clés** : Notions théoriques, vocabulaire et modèles fondamentaux.\n- **Mécanismes** : Principes d'application et cas pratiques associés.`,
    keyConcepts: [
      `Concepts : ${cleanTitle}`,
      'Méthodes & Outils',
      'Cas pratiques d’examen',
    ],
    flashcards: [
      {
        question: `Quel est l’enjeu principal développé dans « ${cleanTitle} » ?`,
        answer: `Acquérir les définitions fondamentales et maîtriser la résolution des exercices de ${fallbackSubject}.`,
        difficulty: 'easy',
      },
      {
        question: `Quelle démarche appliquer aux problèmes rencontrés dans « ${cleanTitle} » ?`,
        answer: 'Identifier les contraintes initiales, sélectionner la méthode appropriée et valider les résultats obtenus.',
        difficulty: 'medium',
      },
    ],
    quizQuestions: [
      {
        question: `Dans l'apprentissage de « ${cleanTitle} », quelle étape est indispensable ?`,
        options: [
          'Valider systématiquement les hypothèses avant d’appliquer une solution',
          'Apprendre par cœur sans comprendre les concepts',
          'Ignorer les cas limites',
          'Ne réviser que la veille de l’examen',
        ],
        correctAnswerIndex: 0,
        explanation: 'La rigueur d’analyse suppose de vérifier les hypothèses avant toute mise en œuvre.',
      },
    ],
  };
}
