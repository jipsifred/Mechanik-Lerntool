/**
 * Normalize OCR-produced values and LaTeX strings.
 */

/** Remove spaces within numbers: "0, 8 5" → "0,85", "1 3, 4 4" → "13,44" */
export function normalizeValue(raw: string): string {
  let v = raw.trim();
  v = v.replace(/\s+/g, '');
  return v;
}

/** Remove spaced-out \mathrm text: "\mathrm {v i r t u e l l e n}" → "virtuellen" */
export function fixSpacedMathrm(latex: string): string {
  return latex.replace(/\\mathrm\s*\{([^}]+)\}/g, (_match, inner: string) => {
    const cleaned = inner.replace(/\s+/g, '');
    return `\\mathrm{${cleaned}}`;
  });
}

/** Strip $$ delimiters from display formula content */
export function stripDisplayDelimiters(content: string): string {
  let s = content.trim();
  if (s.startsWith('$$')) s = s.slice(2);
  if (s.endsWith('$$')) s = s.slice(0, -2);
  return s.trim();
}

/**
 * Strip OCR text artifacts from math prefixes/suffixes.
 */
export function stripTextArtifacts(latex: string): string {
  let s = latex;
  s = s.replace(
    /\\mathrm\{[^}]*(Arbeit|Punkte|Bestimmen|Berechnen|virtuell|Energie|Geschwindigkeit|Winkel|Moment|Kraft|Impuls|Drall|Schwer|Masse|Stoß|Stoss|Feder|Balken|System|Seite|Stelle|Prinzip|abhängig|Trägheit)[^}]*\}/gi,
    ''
  );
  return s.trim();
}

/**
 * Fix spaced numbers in LaTeX: "0, 6" → "0,6", "9, 8 1" → "9,81"
 * Handles patterns like: digit + comma + space(s) + digit(s)
 * and: digit + space(s) + digit (within number context)
 */
export function fixSpacedNumbers(latex: string): string {
  let s = latex;

  // Fix "N, N" → "N,N" (comma followed by space then digit)
  // But only when it's part of a number, not a list separator
  // Pattern: digit(s) + comma + spaces + digit(s) that form a single number
  // We detect number context: preceded by = or other math operators, or at start
  s = s.replace(/(\d)\s*,\s+(\d)/g, '$1,$2');

  // Fix spaces within digit sequences: "9 8 1" → "981", "3 4" → "34"
  // But be careful not to merge separate numbers
  // Only merge when digits are separated by single spaces within a number
  s = s.replace(/(\d)\s+(\d)/g, (match, d1, d2) => {
    return d1 + d2;
  });

  return s;
}

/** Clean up common OCR artifacts in LaTeX */
export function cleanLatex(latex: string): string {
  let s = latex;
  // Fix spaced \mathrm
  s = fixSpacedMathrm(s);
  // Strip OCR text artifacts
  s = stripTextArtifacts(s);
  // Fix spaced numbers
  s = fixSpacedNumbers(s);
  // Remove stray \right. artifacts (unmatched, anywhere in string)
  s = s.replace(/\\right\s*\./g, '');
  // Remove orphan \right| at start (no matching \left|)
  if (/^\\right\s*\|/.test(s.trim()) && !/\\left\s*\|/.test(s)) {
    s = s.replace(/^\\right\s*\|/, '');
  }
  // Convert \left[ → [ and \right] → ] to avoid unmatched pairs
  // when solution box sits between prefix and suffix
  s = s.replace(/\\left\s*\[/g, '[');
  s = s.replace(/\\right\s*\]/g, ']');
  // Convert \left( → ( and \right) → ) (same issue)
  s = s.replace(/\\left\s*\(/g, '(');
  s = s.replace(/\\right\s*\)/g, ')');
  // Strip leading stray } (leaked from \boxed{} wrapper during array parsing)
  s = s.replace(/^\s*\}/, '');
  // Strip trailing \\ \end{array} (outer array end leaked into suffix)
  s = s.replace(/\\\\\s*\\end\s*\{array\}\s*$/, '');
  // Strip trailing \\
  s = s.replace(/\\\\\s*$/, '');
  return s.trim();
}
