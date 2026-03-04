/**
 * Classify OCR layout elements into semantic roles for task parsing.
 */

export interface LayoutElement {
  bbox_2d: number[];
  content: string;
  height: number;
  width: number;
  index: number;
  label: string;
  native_label: string;
}

export type ElementRole =
  | 'title'
  | 'description'
  | 'gegeben_label'
  | 'gegeben_formula'
  | 'image'
  | 'instruction'      // "Tragen Sie die richtigen Lösungen..."
  | 'not_to_scale'     // "Die Zeichnung ist nicht maßstabsgetreu."
  | 'subtask_text'
  | 'solution_formula'
  | 'unknown';

export interface ClassifiedElement {
  element: LayoutElement;
  role: ElementRole;
}

/** Regex patterns for classification */
const TITLE_RE = /^(?:##?\s*)?Aufgabe\s*\(\d+\s*Punkte?\)/i;
const GEGEBEN_RE = /^Gegeben\s*:?\s*$/i;
const INSTRUCTION_RE = /Tragen Sie die richtigen Lösungen/i;
const NOT_TO_SCALE_RE = /Zeichnung ist nicht maßstabsgetreu/i;
const SUBTASK_LABEL_RE = /^[a-z]\)\s/;
const FF_RE = /F\s*F\s*\d+\s*\(\d+\s*P\s*\)/;

/**
 * Classify a single page of layout elements.
 *
 * @param elements - Array of layout elements from one page
 * @param isFirstPage - Whether this is the first page of a task (has title)
 * @returns Array of classified elements
 */
export function classifyPageElements(
  elements: LayoutElement[],
  isFirstPage: boolean
): ClassifiedElement[] {
  const results: ClassifiedElement[] = [];
  let seenGegeben = false;
  let seenGegebenFormula = false;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    let role: ElementRole = 'unknown';

    if (i === 0 && isFirstPage && TITLE_RE.test(el.content)) {
      role = 'title';
    } else if (el.label === 'image') {
      role = 'image';
    } else if (GEGEBEN_RE.test(el.content.trim())) {
      role = 'gegeben_label';
      seenGegeben = true;
    } else if (seenGegeben && !seenGegebenFormula && el.label === 'formula') {
      role = 'gegeben_formula';
      seenGegebenFormula = true;
    } else if (INSTRUCTION_RE.test(el.content)) {
      role = 'instruction';
    } else if (NOT_TO_SCALE_RE.test(el.content)) {
      role = 'not_to_scale';
    } else if (el.label === 'formula' && FF_RE.test(el.content)) {
      role = 'solution_formula';
    } else if (el.label === 'text' && SUBTASK_LABEL_RE.test(el.content.trim())) {
      role = 'subtask_text';
    } else if (el.label === 'text' && !seenGegeben && role === 'unknown' && i > 0) {
      // Text before "Gegeben:" is part of the description
      role = 'description';
    } else if (el.label === 'formula' && !seenGegeben && !FF_RE.test(el.content)) {
      // Formula before Gegeben that's not FF → part of description
      role = 'description';
    }

    // Special case: text element that starts a subtask but isn't labeled a)-z)
    // e.g., "d) Bestimmen Sie..." split across text + formula
    if (role === 'unknown' && el.label === 'text') {
      // Check if it looks like a continuation of subtask description
      // that doesn't start with a label but continues from previous element
      const prev = i > 0 ? results[i - 1] : null;
      if (prev && prev.role === 'subtask_text') {
        role = 'subtask_text';
      }
    }

    // Handle the special OCR case where subtask text merges into formula
    // e.g., "\mathrm{virtuellen Arbeit. (4 Punkte)}" in a formula element
    if (el.label === 'formula' && FF_RE.test(el.content)) {
      role = 'solution_formula';
    }

    results.push({ element: el, role });
  }

  return results;
}

/**
 * Check if a page starts a new task (first element matches Aufgabe pattern).
 */
export function isTaskStartPage(elements: LayoutElement[]): boolean {
  if (elements.length === 0) return false;
  return TITLE_RE.test(elements[0].content);
}

/**
 * Extract points from task title: "Aufgabe (10 Punkte)" → 10
 */
export function extractPointsFromTitle(title: string): number {
  const match = title.match(/\((\d+)\s*Punkte?\)/i);
  return match ? parseInt(match[1], 10) : 0;
}
