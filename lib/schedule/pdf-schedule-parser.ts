import { ParsedScheduleItem } from '@/types/api';

interface PdfTextItem {
  x: number;
  y: number;
  str: string;
}

const DAY_ALIASES: Record<string, ParsedScheduleItem['day_of_week']> = {
  lundi: 'monday',
  lun: 'monday',
  monday: 'monday',
  mardi: 'tuesday',
  mar: 'tuesday',
  tuesday: 'tuesday',
  mercredi: 'wednesday',
  mer: 'wednesday',
  wednesday: 'wednesday',
  jeudi: 'thursday',
  jeu: 'thursday',
  thursday: 'thursday',
  vendredi: 'friday',
  ven: 'friday',
  friday: 'friday',
  samedi: 'saturday',
  sam: 'saturday',
  saturday: 'saturday',
  dimanche: 'sunday',
  dim: 'sunday',
  sunday: 'sunday',
};

const SUBJECT_COLOR_PALETTE = [
  '#4F46E5', // Indigo
  '#0EA5E9', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#0D9488', // Teal
];

const TIME_RANGE_REGEX =
  /^(\d{1,2})\s*(?:h|:)\s*(\d{0,2})\s*(?:-|–|—|à|to)\s*(\d{1,2})\s*(?:h|:)\s*(\d{0,2})$/i;

const INLINE_TIME_RANGE_REGEX =
  /(\d{1,2})\s*(?:h|:)\s*(\d{0,2})\s*(?:-|–|—|à|to)\s*(\d{1,2})\s*(?:h|:)\s*(\d{0,2})/i;

const PROFESSOR_REGEX =
  /^(?:M\.|M\s+|Mme\.?|Mr\.?|Mlle\.?|Dr\.?|Pr\.?|Prof\.?|Enseignant\s*:?)\s*.+/i;

const ROOM_REGEX =
  /^(?:Salle|Amphi|Amphithéâtre|Labo|Laboratoire|Bât|Batiment|Bâtiment|Local|Room)\b.+/i;

function normalizeTime(hourStr: string, minStr: string): string | null {
  const h = parseInt(hourStr, 10);
  const m = minStr ? parseInt(minStr, 10) : 0;
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function parseTimeRangeString(
  text: string
): { start_time: string; end_time: string } | null {
  // Recomposer les chiffres ou lettres H séparés par le moteur PDF (ex: "1 0 H - 13 H" -> "10H-13H")
  const compact = text
    .trim()
    .replace(/(\d)\s+(?=\d)/g, '$1')
    .replace(/(\d)\s+(?=[hH:])/g, '$1');

  const match = compact.match(TIME_RANGE_REGEX);
  if (!match) return null;

  const start = normalizeTime(match[1], match[2]);
  const end = normalizeTime(match[3], match[4]);
  if (!start || !end) return null;

  return { start_time: start, end_time: end };
}

function getSubjectColor(
  subjectName: string,
  colorMap: Map<string, string>
): string {
  const key = subjectName.trim().toLowerCase();
  const existing = colorMap.get(key);
  if (existing) return existing;

  const nextColor =
    SUBJECT_COLOR_PALETTE[colorMap.size % SUBJECT_COLOR_PALETTE.length];
  colorMap.set(key, nextColor);
  return nextColor;
}

/**
 * Extrait les éléments textuels positionnés (x, y, str) d'un Buffer PDF via pdf-parse
 */
async function extractPositionedTextFromPdf(
  buffer: Buffer
): Promise<PdfTextItem[][]> {
  // Import direct du coeur de pdf-parse pour éviter le bug debug du wrapper index.js
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const pagesItems: PdfTextItem[][] = [];

  const bufferCopy = Buffer.from(buffer);

  await pdfParse(bufferCopy, {
    pagerender: async (pageData: any) => {
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: true,
        disableCombineTextItems: false,
      });

      const pageItems: PdfTextItem[] = [];
      for (const item of textContent.items || []) {
        const str = (item.str || '').trim();
        if (!str) continue;
        const x = Math.round(item.transform?.[4] ?? 0);
        const y = Math.round(item.transform?.[5] ?? 0);
        pageItems.push({ x, y, str });
      }
      pagesItems.push(pageItems);
      return pageItems.map((i) => i.str).join('\n');
    },
  });

  return pagesItems;
}

/**
 * Nettoie une ligne reconstituée à partir de fragments PDF (ex: "( Back - end)" -> "(Back-end)", "M. N . BAME" -> "M. N. BAME")
 */
function normalizeMergedLineText(raw: string): string {
  return raw
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+-\s+/g, '-')
    .replace(/\s+\./g, '.')
    .replace(/(\d)\s+(?=\d)/g, '$1')
    .replace(/(\d)\s+(?=[hH]\b)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Regroupe les fragments de texte situés sur la même ligne verticale (|dy| <= 3) au sein d'une colonne
 */
function mergeSameLineItems(items: PdfTextItem[]): PdfTextItem[] {
  if (items.length === 0) return [];

  // Tri de haut en bas (y décroissant en coordonnées PDF), puis de gauche à droite (x croissant)
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) <= 3) {
      return a.x - b.x;
    }
    return b.y - a.y;
  });

  const merged: PdfTextItem[] = [];
  for (const item of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(prev.y - item.y) <= 3) {
      prev.str = normalizeMergedLineText(`${prev.str} ${item.str}`);
    } else {
      merged.push({ ...item, str: normalizeMergedLineText(item.str) });
    }
  }

  return merged;
}

/**
 * Classifie un ensemble de lignes appartenant à un créneau horaire en (subject_name, professor, room)
 */
function classifySlotLines(lines: string[]): {
  subject_name: string;
  professor: string | null;
  room: string | null;
} | null {
  const subjectParts: string[] = [];
  let professor: string | null = null;
  let room: string | null = null;

  for (const rawLine of lines) {
    const line = normalizeMergedLineText(rawLine);
    if (!line) continue;

    // Ignorer les titres globaux d'emploi du temps s'ils tombent dans une colonne
    if (/^(emploi du temps|à partir du|a partir du|semestre|année)/i.test(line)) {
      continue;
    }

    if (PROFESSOR_REGEX.test(line)) {
      professor = professor ? `${professor}, ${line}` : line;
    } else if (ROOM_REGEX.test(line)) {
      room = room ? `${room}, ${line}` : line;
    } else {
      subjectParts.push(line);
    }
  }

  const subject_name = normalizeMergedLineText(subjectParts.join(' '));

  if (!subject_name || subject_name.length < 2) {
    return null;
  }

  return { subject_name, professor, room };
}

/**
 * Extrait automatiquement tous les cours d'un fichier PDF d'emploi du temps
 * en analysant la géométrie 2D des colonnes de jours et des plages horaires.
 */
export async function parseScheduleFromPdfBuffer(
  buffer: Buffer
): Promise<ParsedScheduleItem[]> {
  let pages: PdfTextItem[][] = [];
  try {
    pages = await extractPositionedTextFromPdf(buffer);
  } catch (err) {
    console.warn('[PDF Parser] Erreur extraction texte géométrique :', err);
    return [];
  }
  const extracted: ParsedScheduleItem[] = [];
  const colorMap = new Map<string, string>();

  for (const pageItems of pages) {
    if (pageItems.length === 0) continue;

    // 1. Détecter les entêtes des jours de la semaine (et une éventuelle colonne "Heure" à gauche)
    const dayHeaders: Array<{
      day: ParsedScheduleItem['day_of_week'];
      x: number;
      y: number;
    }> = [];
    let timeAxisHeaderX: number | null = null;

    for (const item of pageItems) {
      const normalized = item.str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');

      if (['heure', 'heures', 'horaire', 'horaires'].includes(normalized)) {
        timeAxisHeaderX = item.x;
        continue;
      }

      const matchedDay = DAY_ALIASES[normalized];
      if (matchedDay) {
        // Éviter les doublons pour le même jour sur la même page
        if (!dayHeaders.some((d) => d.day === matchedDay)) {
          dayHeaders.push({ day: matchedDay, x: item.x, y: item.y });
        }
      }
    }

    if (dayHeaders.length >= 2) {
      // Trier les colonnes de gauche à droite
      dayHeaders.sort((a, b) => a.x - b.x);
      const headerY =
        dayHeaders.reduce((acc, d) => acc + d.y, 0) / dayHeaders.length;

      // Calculer les bornes horizontales [minX, maxX] de chaque colonne jour
      // en excluant la colonne "Heure" de gauche si elle est présente
      const firstGap = dayHeaders[1].x - dayHeaders[0].x;
      const firstColMinX =
        timeAxisHeaderX !== null && timeAxisHeaderX < dayHeaders[0].x
          ? (timeAxisHeaderX + dayHeaders[0].x) / 2
          : Math.max(0, dayHeaders[0].x - firstGap * 0.6);

      const columns = dayHeaders.map((header, idx) => {
        const prev = dayHeaders[idx - 1];
        const next = dayHeaders[idx + 1];
        const minX = prev ? (prev.x + header.x) / 2 : firstColMinX;
        const maxX = next ? (header.x + next.x) / 2 : Infinity;
        return {
          day: header.day,
          headerX: header.x,
          headerY: header.y,
          minX,
          maxX,
        };
      });

      // Vérifier si chaque colonne contient ses propres plages horaires (ex: EDT_19octobre2026.pdf)
      let foundColumnarSlots = false;

      for (const col of columns) {
        const colRawItems = pageItems.filter(
          (item) =>
            item.x >= col.minX &&
            item.x < col.maxX &&
            item.y < col.headerY - 4 &&
            item.y < headerY + 10
        );

        const colLines = mergeSameLineItems(colRawItems);

        // Identifier les indices des lignes qui sont des plages horaires (ex: "10h-13h00")
        const timeHeaderIndices: Array<{
          index: number;
          y: number;
          start_time: string;
          end_time: string;
        }> = [];

        for (let i = 0; i < colLines.length; i++) {
          const parsedTime = parseTimeRangeString(colLines[i].str);
          if (parsedTime) {
            timeHeaderIndices.push({
              index: i,
              y: colLines[i].y,
              start_time: parsedTime.start_time,
              end_time: parsedTime.end_time,
            });
          }
        }

        if (timeHeaderIndices.length > 0) {
          foundColumnarSlots = true;

          for (let t = 0; t < timeHeaderIndices.length; t++) {
            const currentHeader = timeHeaderIndices[t];
            const nextHeader = timeHeaderIndices[t + 1];
            const endIndex = nextHeader ? nextHeader.index : colLines.length;

            const candidateLines: string[] = [];
            let lastY = currentHeader.y;

            for (let k = currentHeader.index + 1; k < endIndex; k++) {
              const lineItem = colLines[k];
              // Si un texte est beaucoup plus bas (> 95 unités PDF sous la ligne précédente), il n'appartient plus à ce bloc
              if (lastY - lineItem.y > 95) {
                break;
              }
              candidateLines.push(lineItem.str);
              lastY = lineItem.y;
            }

            if (candidateLines.length === 0) {
              // Créneau vide (ex: Lundi 08h-10h00 sans cours en dessous)
              continue;
            }

            const classified = classifySlotLines(candidateLines);
            if (!classified) continue;

            extracted.push({
              subject_name: classified.subject_name,
              day_of_week: col.day,
              start_time: currentHeader.start_time,
              end_time: currentHeader.end_time,
              room: classified.room,
              professor: classified.professor,
              color: getSubjectColor(classified.subject_name, colorMap),
            });
          }
        }
      }

      // Cas B : Colonne d'heures partagée à gauche de la première colonne de jour
      if (!foundColumnarSlots) {
        const sharedTimeRows = mergeSameLineItems(
          pageItems.filter((item) => item.x < columns[0].minX && item.y < headerY)
        )
          .map((item) => {
            const tr = parseTimeRangeString(item.str);
            return tr ? { y: item.y, ...tr } : null;
          })
          .filter(
            (x): x is { y: number; start_time: string; end_time: string } =>
              x !== null
          );

        if (sharedTimeRows.length > 0) {
          for (const col of columns) {
            const colLines = mergeSameLineItems(
              pageItems.filter(
                (item) =>
                  item.x >= col.minX &&
                  item.x < col.maxX &&
                  item.y < col.headerY - 4
              )
            );

            for (let r = 0; r < sharedTimeRows.length; r++) {
              const row = sharedTimeRows[r];
              const nextRow = sharedTimeRows[r + 1];
              const minY = nextRow ? (row.y + nextRow.y) / 2 : 0;
              const maxY =
                r === 0 ? col.headerY - 4 : (sharedTimeRows[r - 1].y + row.y) / 2;

              const cellLines = colLines
                .filter((l) => l.y <= maxY && l.y > minY)
                .map((l) => l.str);

              const classified = classifySlotLines(cellLines);
              if (!classified) continue;

              extracted.push({
                subject_name: classified.subject_name,
                day_of_week: col.day,
                start_time: row.start_time,
                end_time: row.end_time,
                room: classified.room,
                professor: classified.professor,
                color: getSubjectColor(classified.subject_name, colorMap),
              });
            }
          }
        }
      }
    } else {
      // Cas C : PDF linéaire (liste de cours par jour)
      const lines = mergeSameLineItems(pageItems);
      let currentDay: ParsedScheduleItem['day_of_week'] | null = null;

      for (const line of lines) {
        const cleanWord = line.str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z]/g, '');

        if (DAY_ALIASES[cleanWord]) {
          currentDay = DAY_ALIASES[cleanWord];
          continue;
        }

        const timeMatch = line.str.match(INLINE_TIME_RANGE_REGEX);
        if (timeMatch && currentDay) {
          const start = normalizeTime(timeMatch[1], timeMatch[2]);
          const end = normalizeTime(timeMatch[3], timeMatch[4]);
          const remainder = line.str.replace(timeMatch[0], '').replace(/^[\s:–-]+/, '').trim();
          if (start && end && remainder.length >= 2) {
            extracted.push({
              subject_name: remainder,
              day_of_week: currentDay,
              start_time: start,
              end_time: end,
              room: null,
              professor: null,
              color: getSubjectColor(remainder, colorMap),
            });
          }
        }
      }
    }
  }

  return extracted;
}
