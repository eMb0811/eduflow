"use client";

import * as React from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

/**
 * Rendu sécurisé d'une expression mathématique via KaTeX.
 * Si l'expression est un simple nombre ou une notation courante (ex: 0, 1, 32, /24),
 * elle est retournée comme texte pur pour éviter tout artefact visuel.
 */
export function renderMathSafe(
  expr: string,
  displayMode = false
): { isHtml: boolean; output: string } {
  const trimmed = expr.trim();
  if (!trimmed) return { isHtml: false, output: "" };

  // Détection des chiffres/nombres purs et notations réseau (/24, 192.168.1.1)
  if (
    /^[-+]?\d+(\.\d+)?$/.test(trimmed) ||
    /^\/\d+$/.test(trimmed) ||
    /^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(trimmed)
  ) {
    return { isHtml: false, output: trimmed };
  }

  try {
    const html = katex.renderToString(trimmed, {
      throwOnError: false,
      displayMode,
      output: "htmlAndMathml",
    });
    return { isHtml: true, output: html };
  } catch {
    return { isHtml: false, output: formatMathExpression(trimmed) };
  }
}

/**
 * Convertit les commandes LaTeX courantes en symboles mathématiques typographiques propres
 * sans jamais laisser de commandes brutes (\log, \to, \le, etc.) ni de symboles $.
 */
export function formatMathExpression(raw: string): string {
  return raw
    .replace(/^\$\$|\$\$$/g, "")
    .replace(/^\$|\$$/g, "")
    .replace(/\\log\b/g, "log")
    .replace(/\\ln\b/g, "ln")
    .replace(/\\exp\b/g, "exp")
    .replace(/\\sin\b/g, "sin")
    .replace(/\\cos\b/g, "cos")
    .replace(/\\tan\b/g, "tan")
    .replace(/\\lim\b/g, "lim")
    .replace(/\\max\b/g, "max")
    .replace(/\\min\b/g, "min")
    .replace(/\\det\b/g, "det")
    .replace(/\\times\b/g, "×")
    .replace(/\\cdot\b/g, "·")
    .replace(/\\div\b/g, "÷")
    .replace(/\\pm\b/g, "±")
    .replace(/\\le\b|\\leq\b/g, "≤")
    .replace(/\\ge\b|\\geq\b/g, "≥")
    .replace(/\\ne\b|\\neq\b/g, "≠")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\equiv\b/g, "≡")
    .replace(/\\to\b|\\rightarrow\b/g, "→")
    .replace(/\\leftarrow\b/g, "←")
    .replace(/\\Rightarrow\b/g, "⇒")
    .replace(/\\Leftrightarrow\b|\\iff\b/g, "⇔")
    .replace(/\\in\b/g, "∈")
    .replace(/\\notin\b/g, "∉")
    .replace(/\\subset\b/g, "⊂")
    .replace(/\\subseteq\b/g, "⊆")
    .replace(/\\cup\b/g, "∪")
    .replace(/\\cap\b/g, "∩")
    .replace(/\\forall\b/g, "∀")
    .replace(/\\exists\b/g, "∃")
    .replace(/\\emptyset\b/g, "∅")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\sum\b/g, "∑")
    .replace(/\\prod\b/g, "∏")
    .replace(/\\int\b/g, "∫")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\alpha\b/g, "α")
    .replace(/\\beta\b/g, "β")
    .replace(/\\gamma\b/g, "γ")
    .replace(/\\delta\b/g, "δ")
    .replace(/\\epsilon\b/g, "ε")
    .replace(/\\theta\b/g, "θ")
    .replace(/\\lambda\b/g, "λ")
    .replace(/\\mu\b/g, "μ")
    .replace(/\\pi\b/g, "π")
    .replace(/\\sigma\b/g, "σ")
    .replace(/\\tau\b/g, "τ")
    .replace(/\\phi\b/g, "φ")
    .replace(/\\omega\b/g, "ω")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\^n\b/g, "ⁿ")
    .replace(/_0\b/g, "₀")
    .replace(/_1\b/g, "₁")
    .replace(/_2\b/g, "₂")
    .replace(/_i\b/g, "ᵢ")
    .replace(/_n\b/g, "ₙ")
    .replace(/[{}]/g, "")
    .trim();
}

/**
 * Supprime tous les symboles Markdown et LaTeX bruts (###, **, *, `, $, etc.)
 * pour obtenir un texte 100 % propre dans les aperçus courts, titres ou cartes.
 */
export function stripRawMarkdown(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, "$1")
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => formatMathExpression(expr))
    .replace(/\$([^$\n]+)\$/g, (_, expr) => formatMathExpression(expr))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/^\|(\s*:?-+:?\s*\|)+$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*\*|__|###|##|`/g, "")
    .trim();
}

/**
 * Transforme une ligne contenant du formatage inline (**gras**, *italique*, `code`, $math$)
 * en nœuds React typographiques propres sans aucun symbole Markdown brut.
 */
export function renderInlineFormatted(text: string, keyPrefix = "inl"): React.ReactNode[] {
  if (!text) return [];

  // Nettoyage des marqueurs résiduels non fermés (ex: pendant le streaming SSE)
  const tokenRegex =
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`\n]+`|\$\$[^$]+\$\$|\$[^$\n]+\$|\*[^*\n]+\*)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainChunk = text
        .slice(lastIndex, match.index)
        .replace(/\*\*|__|`/g, "");
      if (plainChunk) {
        nodes.push(plainChunk);
      }
    }

    const token = match[0];
    const tokenKey = `${keyPrefix}-${match.index}`;

    if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      const inner = token.slice(2, -2);
      nodes.push(
        <strong
          key={tokenKey}
          className="font-semibold text-slate-900 dark:text-white"
        >
          {renderInlineFormatted(inner, `${tokenKey}-b`)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      nodes.push(
        <code
          key={tokenKey}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[0.88em] font-medium text-amber-800 dark:text-amber-300 border border-slate-200/80 dark:border-slate-700"
        >
          {inner}
        </code>
      );
    } else if (token.startsWith("$$") && token.endsWith("$$")) {
      const inner = token.slice(2, -2);
      const { isHtml, output } = renderMathSafe(inner, false);
      if (isHtml) {
        nodes.push(
          <span
            key={tokenKey}
            dangerouslySetInnerHTML={{ __html: output }}
            className="inline-block px-1 align-baseline text-slate-900 dark:text-slate-100"
          />
        );
      } else {
        nodes.push(
          <span key={tokenKey} className="font-mono text-slate-900 dark:text-slate-100">
            {output}
          </span>
        );
      }
    } else if (token.startsWith("$") && token.endsWith("$")) {
      const inner = token.slice(1, -1);
      const { isHtml, output } = renderMathSafe(inner, false);
      if (isHtml) {
        nodes.push(
          <span
            key={tokenKey}
            dangerouslySetInnerHTML={{ __html: output }}
            className="inline-block px-0.5 align-baseline text-slate-900 dark:text-slate-100"
          />
        );
      } else {
        nodes.push(output);
      }
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const inner = token.slice(1, -1);
      nodes.push(
        <em
          key={tokenKey}
          className="italic text-slate-800 dark:text-slate-200"
        >
          {inner}
        </em>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    const trailing = text.slice(lastIndex).replace(/\*\*|__|`/g, "");
    if (trailing) {
      nodes.push(trailing);
    }
  }

  return nodes;
}

export interface FormattedTextProps {
  text?: string | null;
  className?: string;
  compact?: boolean;
}

/**
 * Composant de rendu typographique académique riche (sans aucun Markdown brut).
 * Transforme les titres, listes à puces, listes numérotées, blocs de code,
 * formules mathématiques et mises en gras en éléments visuels structurés.
 */
export function FormattedText({
  text,
  className,
  compact = false,
}: FormattedTextProps) {
  if (!text) return null;

  // 1. Découper d'abord les blocs de code ```lang ... ```
  const segments = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className={cn("space-y-2", compact ? "text-xs sm:text-sm" : "text-sm", className)}>
      {segments.map((segment, segIdx) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const rawCode = segment.slice(3, -3).trim();
          const firstNewLine = rawCode.indexOf("\n");
          let lang = "";
          let codeBody = rawCode;

          if (firstNewLine !== -1) {
            const firstLine = rawCode.slice(0, firstNewLine).trim();
            if (/^[a-zA-Z0-9_-]+$/.test(firstLine)) {
              lang = firstLine;
              codeBody = rawCode.slice(firstNewLine + 1);
            }
          }

          return (
            <div
              key={`code-${segIdx}`}
              className="my-2.5 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 shadow-xs"
            >
              {lang && (
                <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-amber-400">
                  {lang}
                </div>
              )}
              <pre className="p-3 overflow-x-auto font-mono text-xs leading-relaxed">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        // 2. Traiter les lignes standards du segment
        const lines = segment.split(/\r?\n/);
        const elements: React.ReactNode[] = [];

        for (let i = 0; i < lines.length; i++) {
          const rawLine = lines[i];
          const trimmed = rawLine.trim();

          if (!trimmed) {
            continue;
          }

          // Séparateur horizontal --- ou ***
          if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
            elements.push(
              <hr
                key={`hr-${segIdx}-${i}`}
                className="my-2 border-slate-200 dark:border-slate-800"
              />
            );
            continue;
          }

          // Formule mathématique bloc $$ ... $$
          if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
            const raw = trimmed.slice(2, -2);
            const { isHtml, output } = renderMathSafe(raw, true);
            elements.push(
              <div
                key={`math-${segIdx}-${i}`}
                className="my-3 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center overflow-x-auto text-slate-900 dark:text-slate-100 shadow-xs"
              >
                {isHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: output }} className="inline-block text-base" />
                ) : (
                  <span className="font-serif italic text-base">{output}</span>
                )}
              </div>
            );
            continue;
          }

          // Tableaux Markdown (| En-tête 1 | En-tête 2 | ... |)
          if (
            trimmed.startsWith("|") &&
            trimmed.endsWith("|") &&
            i + 1 < lines.length &&
            /^\|(\s*:?-{2,}:?\s*\|)+$/.test(lines[i + 1].trim())
          ) {
            const rawHeaderCells = trimmed.split("|").slice(1, -1);
            const headers = rawHeaderCells.map((c) => c.trim());

            const sepLine = lines[i + 1].trim();
            const rawAlignCells = sepLine.split("|").slice(1, -1);
            const alignments = rawAlignCells.map((alignStr) => {
              const s = alignStr.trim();
              if (s.startsWith(":") && s.endsWith(":")) return "text-center";
              if (s.endsWith(":")) return "text-right";
              return "text-left";
            });

            const rows: string[][] = [];
            let j = i + 2;
            while (j < lines.length) {
              const rowLine = lines[j].trim();
              if (!rowLine.startsWith("|") || !rowLine.endsWith("|")) {
                break;
              }
              if (/^\|(\s*:?-{2,}:?\s*\|)+$/.test(rowLine)) {
                j++;
                continue;
              }
              const rowCells = rowLine.split("|").slice(1, -1).map((c) => c.trim());
              rows.push(rowCells);
              j++;
            }

            elements.push(
              <div
                key={`tbl-${segIdx}-${i}`}
                className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs"
              >
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200">
                    <tr>
                      {headers.map((h, hIdx) => (
                        <th
                          key={`th-${segIdx}-${i}-${hIdx}`}
                          className={cn(
                            "px-3.5 py-2.5 font-semibold text-xs tracking-wider uppercase",
                            alignments[hIdx] || "text-left"
                          )}
                        >
                          {renderInlineFormatted(h, `th-${segIdx}-${i}-${hIdx}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((row, rIdx) => (
                      <tr
                        key={`tr-${segIdx}-${i}-${rIdx}`}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={`td-${segIdx}-${i}-${rIdx}-${cIdx}`}
                            className={cn(
                              "px-3.5 py-2.5 text-slate-800 dark:text-slate-300 align-top",
                              alignments[cIdx] || "text-left"
                            )}
                          >
                            {renderInlineFormatted(cell, `td-${segIdx}-${i}-${rIdx}-${cIdx}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

            i = j - 1;
            continue;
          }

          // Titres Markdown (#, ##, ###, ####)
          const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const headingContent = headingMatch[2].replace(/^#+\s*/, "");
            const sizeClass =
              level === 1
                ? "text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white pt-1"
                : level === 2
                  ? "text-sm sm:text-base font-serif font-bold text-slate-900 dark:text-white pt-1"
                  : "text-xs sm:text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-400 pt-1";

            elements.push(
              <div key={`h-${segIdx}-${i}`} className={sizeClass}>
                {renderInlineFormatted(headingContent, `h-${segIdx}-${i}`)}
              </div>
            );
            continue;
          }

          // Citations (> ...)
          if (trimmed.startsWith("> ")) {
            const quoteText = trimmed.slice(2).trim();
            elements.push(
              <blockquote
                key={`q-${segIdx}-${i}`}
                className="pl-3 py-1 border-l-2 border-amber-500 bg-amber-500/5 rounded-r-lg italic text-slate-700 dark:text-slate-300"
              >
                {renderInlineFormatted(quoteText, `q-${segIdx}-${i}`)}
              </blockquote>
            );
            continue;
          }

          // Liste à puces (- , * , • )
          const bulletMatch = trimmed.match(/^([-*•])\s+(.*)$/);
          if (bulletMatch) {
            const itemText = bulletMatch[2];
            elements.push(
              <div
                key={`ul-${segIdx}-${i}`}
                className="flex items-start gap-2 pl-1 leading-relaxed"
              >
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  {renderInlineFormatted(itemText, `ul-${segIdx}-${i}`)}
                </div>
              </div>
            );
            continue;
          }

          // Liste numérotée (1. , 2. , etc.)
          const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
          if (numberedMatch) {
            const num = numberedMatch[1];
            const itemText = numberedMatch[2];
            elements.push(
              <div
                key={`ol-${segIdx}-${i}`}
                className="flex items-start gap-2 pl-1 leading-relaxed"
              >
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                  {num}.
                </span>
                <div className="flex-1 min-w-0">
                  {renderInlineFormatted(itemText, `ol-${segIdx}-${i}`)}
                </div>
              </div>
            );
            continue;
          }

          // Paragraphe standard
          elements.push(
            <p key={`p-${segIdx}-${i}`} className="leading-relaxed">
              {renderInlineFormatted(trimmed, `p-${segIdx}-${i}`)}
            </p>
          );
        }

        return <React.Fragment key={`seg-${segIdx}`}>{elements}</React.Fragment>;
      })}
    </div>
  );
}
