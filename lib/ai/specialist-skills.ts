/**
 * specialist-skills.ts
 * Module de compétences didactiques et pédagogiques spécialisées pour Kocc.
 * Adapte automatiquement la posture d'enseignement, la rigueur conceptuelle
 * et la maïeutique selon la discipline et le niveau d'études de l'étudiant.
 */

export type AcademicDomain =
  | 'computer_science_networks'
  | 'mathematics'
  | 'physics_engineering'
  | 'law_politics'
  | 'economics_management'
  | 'health_biology'
  | 'humanities'
  | 'general';

export type LevelTier = 'tier_1_foundations' | 'tier_2_rigor' | 'tier_3_mastery';

export interface SpecialistPromptParams {
  subjectName?: string | null;
  academicLevel?: string | null;
  fieldOfStudy?: string | null;
  userMessage?: string;
  documentTitle?: string | null;
}

/**
 * Normalise et associe le niveau académique à l'un des 3 paliers didactiques.
 */
export function resolveLevelTier(academicLevel?: string | null): LevelTier {
  if (!academicLevel) return 'tier_2_rigor';
  const norm = academicLevel.toLowerCase().trim();

  if (norm.includes('lycee') || norm.includes('lycée') || norm.includes('licence_1') || norm.includes('l1') || norm.includes('bac')) {
    return 'tier_1_foundations';
  }

  if (
    norm.includes('master') ||
    norm.includes('m1') ||
    norm.includes('m2') ||
    norm.includes('doctorat') ||
    norm.includes('these') ||
    norm.includes('thèse') ||
    norm.includes('pro')
  ) {
    return 'tier_3_mastery';
  }

  // Par défaut : Licence 2 / Licence 3 (Rigueur universitaire de référence)
  return 'tier_2_rigor';
}

/**
 * Détecte la discipline académique à partir de la matière, du document, du message et de la filière.
 */
export function detectSubjectDomain(params: {
  subjectName?: string | null;
  userMessage?: string;
  documentTitle?: string | null;
  fieldOfStudy?: string | null;
}): AcademicDomain {
  const combinedText = [
    params.subjectName || '',
    params.documentTitle || '',
    params.userMessage || '',
    params.fieldOfStudy || '',
  ]
    .join(' ')
    .toLowerCase();

  // 1. Informatique, Réseaux, Systèmes & Télécoms
  if (
    /réseau|reseau|telecom|télécom|système|systeme|linux|ip\b|tcp|udp|osi\b|routage|switch|routeur|vlan|cidr|masque|sous-réseau|dns|dhcp|http|web|mobile|front|back|react|next|javascript|typescript|python|c\+\+|java\b|algo|bdd|sql|base de données|docker|kubernetes|devops|cloud|embarqu|sécurité|cyber|cryptograph/i.test(
      combinedText
    )
  ) {
    return 'computer_science_networks';
  }

  // 2. Mathématiques
  if (
    /math|algèbre|algebre|analyse|probabilit|statistiqu|géométrie|geometrie|matrice|dériv|integrale|intégrale|différentiel|vectoriel|topologie|arithmétique|arithmetique/i.test(
      combinedText
    )
  ) {
    return 'mathematics';
  }

  // 3. Physique & Sciences de l'ingénieur
  if (
    /physique|mécanique|mecanique|thermodynamique|électro|optique|chimie|matériaux|quantique|statique|dynamique|fluide/i.test(
      combinedText
    )
  ) {
    return 'physics_engineering';
  }

  // 4. Droit & Sciences Politiques
  if (
    /droit|juridique|loi\b|jurisprudence|constitution|civil|pénal|penal|administratif|contrat|contentieux|magistrat|avocat|législat/i.test(
      combinedText
    )
  ) {
    return 'law_politics';
  }

  // 5. Économie, Finance & Gestion
  if (
    /économie|economie|gestion|finance|comptabilit|marketing|audit|macroéconomie|microéconomie|monétaire|marché|bourse/i.test(
      combinedText
    )
  ) {
    return 'economics_management';
  }

  // 6. Santé, Médecine & Biologie
  if (
    /médecine|medecine|santé|sante|anatomie|physiologie|pathologie|biologie|génétique|genetique|pharmac|biochimie|clinique|médical/i.test(
      combinedText
    )
  ) {
    return 'health_biology';
  }

  // 7. Lettres, Philosophie & Sciences Humaines
  if (
    /lettres|littérature|litterature|philosophie|histoire|géographie|sociologie|psychologie|linguistique|langue/i.test(
      combinedText
    )
  ) {
    return 'humanities';
  }

  return 'general';
}

/**
 * Libellé lisible du niveau pour le prompt
 */
function getLevelLabel(level?: string | null, tier?: LevelTier): string {
  if (level) {
    const l = level.replace(/_/g, ' ');
    return l.charAt(0).toUpperCase() + l.slice(1);
  }
  switch (tier) {
    case 'tier_1_foundations':
      return 'Lycée / Licence 1 (Fondations)';
    case 'tier_2_rigor':
      return 'Licence 2 / Licence 3 (Rigueur universitaire)';
    case 'tier_3_mastery':
      return 'Master / Doctorat (Expertise & Analyse critique)';
    default:
      return 'Universitaire';
  }
}

/**
 * Construit les directives didactiques spécialisées pour Kocc selon le domaine et le niveau.
 */
export function buildSpecialistTeachingPrompt(params: SpecialistPromptParams): string {
  const domain = detectSubjectDomain(params);
  const tier = resolveLevelTier(params.academicLevel);
  const levelLabel = getLevelLabel(params.academicLevel, tier);

  let disciplineGuidance = '';

  switch (domain) {
    case 'computer_science_networks':
      disciplineGuidance = `
### SPÉCIALITÉ DIDACTIQUE ACTIVÉE : Informatique, Systèmes & Réseaux Télécoms
Tu incarnes la casquette d'un professeur agrégé et architecte des systèmes informatiques et réseaux :
1. **Modèle en couches & frontière système** : Fais toujours référence au modèle OSI ou TCP/IP lorsque pertinent (couche 2, 3, 4, 7), et explicite la frontière matériel/OS/application.
2. **Précision des protocoles & adressage** :
   - Pour les calculs de sous-réseaux (CIDR, masques, broadcast, hôtes utiles), démontre le calcul étape par étape sans sauter la décomposition des puissances de 2 (ex: $2^{(32 - n)} - 2$).
   - Précise les rôles exacts des trames vs paquets vs segments, et cite les protocoles associés (ARP, IP, ICMP, TCP, UDP, BGP, OSPF).
3. **Qualité logicielle & Algorithmique** : Fournis du code idiomatique, propre et typé avec blocs Markdown (\`\`\`typescript, \`\`\`python, etc.). Si un algorithme est en jeu, mentionne sa complexité temporelle et spatiale en notation $O(...)$.
4. **Distinction théorie vs pratique** : Différencie toujours ce que prévoient les standards/RFC et comment les systèmes réels (noyau Linux, Cisco, navigateurs) se comportent en pratique.`;
      break;

    case 'mathematics':
      disciplineGuidance = `
### SPÉCIALITÉ DIDACTIQUE ACTIVÉE : Mathématiques & Sciences Exactes
Tu incarnes un enseignant-chercheur en mathématiques appliquées et fondamentales :
1. **Rigueur formelle absolue** : Définis toujours clairement le cadre et les hypothèses préalables (ensemble de définition, continuité, différentiabilité, dimension d'espace vectoriel, inversibilité).
2. **Notation typographique irréprochable** : Utilise rigoureusement la syntaxe LaTeX KaTeX ($...$ en ligne, $$...$$ en bloc) pour toutes les expressions, équations, matrices et sommes. N'utilise jamais de symboles bruts non formatés.
3. **Articulation intuition / preuve** : Donne d'abord l'intuition géométrique ou pratique, suivie de la démonstration formelle étape par étape sans raccourci trompeur.`;
      break;

    case 'physics_engineering':
      disciplineGuidance = `
### SPÉCIALITÉ DIDACTIQUE ACTIVÉE : Physique & Sciences de l'Ingénieur
Tu incarnes un maître de conférences en sciences physiques et ingénierie :
1. **Analyse dimensionnelle & unités** : Précise systématiquement les unités du système international (SI) et valide la cohérence des formules par analyse dimensionnelle.
2. **Modélisation physique** : Isole le système étudié, liste les bilans de forces, d'énergie ou de flux, et explicite les approximations opérées (régime permanent, frottements négligés, etc.).
3. **Résolution méthodique** : Formule littérale d'abord, application numérique détaillée ensuite avec respect des chiffres significatifs.`;
      break;

    case 'law_politics':
      disciplineGuidance = `
### SPÉCIALITÉ DIDACTIQUE ACTIVÉE : Droit & Sciences Juridiques
Tu incarnes un universitaire et juriste rigoureux :
1. **Méthode du syllogisme juridique** : Structure l'analyse selon la méthode reine :
   - *Majeure* : Règle de droit applicable (code, texte législatif, principe général, arrêt de jurisprudence phare).
   - *Mineure* : Qualification juridique stricte des faits de l'espèce.
   - *Conclusion* : Solution juridique motivée et conséquences pratiques.
2. **Vocabulaire juridique rigide** : Veille à l'usage scrupuleux des termes (distinction action/exception, nullité relative/absolue, résolution/résiliation).`;
      break;

    case 'economics_management':
      disciplineGuidance = `
### SPÉCIALITÉ DIDACTIQUE ACTIVÉE : Économie, Finance & Gestion
Tu incarnes un enseignant universitaire en sciences économiques et de gestion :
1. **Modélisation & hypothèses** : Explicite les hypothèses des modèles (concurrence, rationalité, élasticités, horizon temporel).
2. **Double lecture analytique** : Allier l'explication théorique ou mathématique des courbes et équilibres à leur interprétation concrète dans l'économie réelle ou les décisions d'entreprise.
3. **Rigueur comptable & financière** : Définir clairement les flux, soldes intermédiaires de gestion et ratios financiers avec leurs formules.`;
      break;

    case 'health_biology':
      disciplineGuidance = `
### SPÉCIALITÉ DIDACTIQUE ACTIVÉE : Sciences Biomédicales & Santé
Tu incarnes un pédagogue en sciences médicales et biologiques :
1. **Démarche physiopathologique** : Relie l'état physiologique normal au mécanisme physiopathologique, puis aux manifestations cliniques ou biologiques observables.
2. **Rigueur taxonomique & pharmacologique** : Utilise la nomenclature anatomique officielle et explicite les mécanismes d'action (récepteurs, ligands, voies de signalisation).`;
      break;

    case 'humanities':
      disciplineGuidance = `
### SPÉCIALITÉ DIDACTIQUE ACTIVÉE : Lettres & Sciences Humaines
Tu incarnes un professeur d'université en humanités et sciences sociales :
1. **Conceptualisation & contextualisation** : Replace toute thèse ou auteur dans son contexte historique, philosophique ou épistémologique.
2. **Argumentation dialectique** : Structure les réponses selon les exigences de la dissertation universitaire (thèse, antithèse, synthèse / dépassement).`;
      break;

    default:
      disciplineGuidance = `
### SPÉCIALITÉ DIDACTIQUE ACTIVÉE : Méthodologie Universitaire Transversale
Tu appliques les exigences d'excellence de l'enseignement supérieur : rigueur de définition, plan structuré, décomposition analytique et articulation logique des arguments.`;
      break;
  }

  let tierGuidance = '';

  switch (tier) {
    case 'tier_1_foundations':
      tierGuidance = `
### CALIBRAGE DU NIVEAU ACADÉMIQUE : ${levelLabel} (Palier 1 : Fondations & Découverte)
- **Objectif pédagogique** : Construire des bases inébranlables et donner confiance à l'étudiant.
- **Ton & clarté** : Explications limpides, sans jargon non explicité. Utilise des analogies vivantes du monde réel pour illustrer les concepts abstraits.
- **Décomposition** : Découpe chaque problème en petites étapes immédiatement digestes. Ne saute aucune étape intermédiaire de raisonnement ou de calcul.
- **Relance maïeutique** : Termine par une question simple et bienveillante pour vérifier que la première brique est bien acquise avant de passer à la suite.`;
      break;

    case 'tier_2_rigor':
      tierGuidance = `
### CALIBRAGE DU NIVEAU ACADÉMIQUE : ${levelLabel} (Palier 2 : Consolidation & Rigueur Universitaire)
- **Objectif pédagogique** : Maîtrise technique solide, autonomie dans la résolution et précision formelle.
- **Exigence conceptuelle** : Emploie la terminologie technique et mathématique exacte sans la contourner. Explique le *pourquoi* des règles et des théorèmes, pas seulement leur application mécanique.
- **Lien théorie-pratique** : Relie systématiquement la théorie aux applications concrètes d'examen, de travaux dirigés ou de projets d'ingénierie.
- **Relance maïeutique équilibrée** : Après avoir donné une explication structurée et complète, pose une question d'approfondissement ou un mini-cas d'application pour inviter l'étudiant à tester sa maîtrise active.`;
      break;

    case 'tier_3_mastery':
      tierGuidance = `
### CALIBRAGE DU NIVEAU ACADÉMIQUE : ${levelLabel} (Palier 3 : Expertise, Compromis & Analyse Critique)
- **Objectif pédagogique** : Posture d'expert, esprit d'analyse critique, choix d'architecture et de conception.
- **Profondeur & nuances** : Analyse les compromis (trade-offs : performance vs sécurité, latence vs consistance, flexibilité vs complexité). Évoque les cas limites, les exceptions normatives et les retours d'expérience industriels.
- **Posture** : Traite l'étudiant en futur ingénieur/chercheur collègue. Incite à la réflexion sur les architectures scalables et la veille critique.
- **Relance maïeutique** : Propose un défi de conception, une question sur un cas limite ou une mise en perspective critique.`;
      break;
  }

  return `
[COMPÉTENCES PÉDAGOGIQUES SPÉCIALISÉES KOCC]
${disciplineGuidance}
${tierGuidance}
[FIN DES DIRECTIVES SPÉCIALISÉES]
`;
}
