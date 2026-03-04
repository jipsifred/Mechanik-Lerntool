/**
 * Parse FF (Freifeld) blocks from OCR display formulas.
 *
 * Patterns handled:
 * 1. \left| \begin{array}{...} FF N (P P) \\ value \end{array} \right|
 * 2. \boxed { \begin{array}{c} FF N (P P) \\ value \end{array} }
 * 3. Outer array with \boxed{FF N (P P)} in first row, values in second row by column
 */

import { normalizeValue, stripDisplayDelimiters, cleanLatex } from './normalize.js';

export interface FFBlock {
  ffIndex: number;
  points: number;
  solution: string;
  rawFormula: string;
  mathPrefix: string;
  mathSuffix: string;
}

const FF_LABEL_RE = /F\s*F\s*(\d+)\s*\((\d+)\s*P\s*\)/;
const FF_LABEL_RE_G = /F\s*F\s*(\d+)\s*\((\d+)\s*P\s*\)/g;

/**
 * Extract all FF blocks from a single display formula string.
 */
export function parseFormulaBlocks(rawContent: string): FFBlock[] {
  const content = stripDisplayDelimiters(rawContent);

  // First, check if there are \boxed{...FF...} patterns (Pattern 3)
  const hasBoxedFF = /\\boxed\s*\{[^}]*F\s*F\s*\d+/.test(content);

  if (hasBoxedFF) {
    return parseBoxedFFInArray(content);
  }

  // Patterns 1 & 2: FF label inside \begin{array}...\end{array}
  return parseArrayFFBlocks(content);
}

/**
 * Pattern 3: \boxed{FF N (P P)} labels in a formula.
 *
 * Sub-patterns:
 * 3a: Column-based — \begin{array}{ccccc} \boxed{FF1} & stuff & \boxed{FF2} \\ val1 & val2 & val3
 * 3b: Row-based — \begin{array}{l} prefix \\ \boxed{FF1} \\ val1 \\ stuff \\ \boxed{FF2} \\ val2
 */
function parseBoxedFFInArray(content: string): FFBlock[] {
  // Find all \boxed{...FF...} occurrences with their positions
  const boxedFFRe = /\\boxed\s*\{\s*([^}]*?F\s*F\s*\d+[^}]*?)\s*\}/g;
  let bMatch: RegExpExecArray | null;
  const ffPositions: Array<{
    start: number;
    end: number;
    ffIndex: number;
    points: number;
  }> = [];

  while ((bMatch = boxedFFRe.exec(content)) !== null) {
    const inner = bMatch[1];
    const ffMatch = FF_LABEL_RE.exec(inner);
    if (!ffMatch) continue;
    ffPositions.push({
      start: bMatch.index,
      end: bMatch.index + bMatch[0].length,
      ffIndex: parseInt(ffMatch[1], 10),
      points: parseInt(ffMatch[2], 10),
    });
  }

  if (ffPositions.length === 0) return [];

  // Find the enclosing array (if any)
  const arrayMatch = content.match(
    /\\begin\s*\{array\}\s*\{[^}]*\}\s*([\s\S]*?)\\end\s*\{array\}/
  );

  if (!arrayMatch) return parseInlineBoxedFF(content);

  const arrayInner = arrayMatch[1];
  const rows = arrayInner.split(/\\\\/);

  // Check if column-based (first row has multiple & with FF labels)
  const firstRow = rows[0];
  const firstCols = firstRow.split('&');
  const ffInFirstRowCols = firstCols.filter((c) => FF_LABEL_RE.test(c)).length;

  if (ffInFirstRowCols >= 2 && rows.length >= 2) {
    // Column-based pattern (3a)
    return parseColumnBasedBoxedFF(content, arrayMatch, rows);
  }

  // Row-based pattern (3b): FF labels in separate rows, values in next row
  return parseRowBasedBoxedFF(content, arrayMatch, rows);
}

function parseColumnBasedBoxedFF(
  content: string,
  arrayMatch: RegExpMatchArray,
  rows: string[]
): FFBlock[] {
  const blocks: FFBlock[] = [];
  const firstCols = rows[0].split('&');
  const secondCols = rows.length >= 2 ? rows[1].split('&') : [];

  const arrayStart = content.indexOf(arrayMatch[0]);
  const overallPrefix = content.substring(0, arrayStart).trim();
  const overallSuffix = content.substring(arrayStart + arrayMatch[0].length).trim();

  // Order-based solution extraction: the nth FF box gets the nth numeric value
  // from the solution row. This handles cases where solution values in row 2
  // are compacted and not column-aligned with the FF boxes in row 1.
  const orderedSolutions: string[] = [];
  for (const cell of secondCols) {
    const valCell = cell.trim();
    const numMatch = valCell.match(/(-?\s*[\d\s,.]+)/);
    if (numMatch) orderedSolutions.push(normalizeValue(numMatch[1]));
  }
  let ffBoxCount = 0;

  for (let col = 0; col < firstCols.length; col++) {
    const colContent = firstCols[col];
    const ffMatch = FF_LABEL_RE.exec(colContent);
    if (!ffMatch) continue;

    const solution = ffBoxCount < orderedSolutions.length ? orderedSolutions[ffBoxCount] : '';
    ffBoxCount++;

    let mathPrefix = blocks.length === 0 ? cleanLatex(overallPrefix) : '';

    // Collect suffix between this FF column and next FF column
    const suffixParts: string[] = [];
    for (let c = col + 1; c < firstCols.length; c++) {
      if (FF_LABEL_RE.test(firstCols[c])) break;
      const label = firstCols[c].replace(/\\boxed\s*\{[^}]*\}/g, '').trim();
      if (label) suffixParts.push(label);
    }

    blocks.push({
      ffIndex: parseInt(ffMatch[1], 10),
      points: parseInt(ffMatch[2], 10),
      solution,
      rawFormula: content,
      mathPrefix,
      mathSuffix: cleanLatex(suffixParts.join(' ')),
    });
  }

  if (blocks.length > 0) {
    const last = blocks[blocks.length - 1];
    last.mathSuffix = cleanLatex(
      (last.mathSuffix ? last.mathSuffix + ' ' : '') + overallSuffix
    );
  }

  for (let i = 1; i < blocks.length; i++) {
    blocks[i].mathPrefix = blocks[i - 1].mathSuffix;
    blocks[i - 1].mathSuffix = '';
  }

  return blocks;
}

function parseRowBasedBoxedFF(
  content: string,
  arrayMatch: RegExpMatchArray,
  rows: string[]
): FFBlock[] {
  const blocks: FFBlock[] = [];

  const arrayStart = content.indexOf(arrayMatch[0]);
  const overallPrefix = content.substring(0, arrayStart).trim();
  const overallSuffix = content.substring(arrayStart + arrayMatch[0].length).trim();

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    // Find ALL \boxed{...FF_n...} occurrences in this row
    const rowBoxRe = /\\boxed\s*\{\s*([^}]*?F\s*F\s*\d+[^}]*?)\s*\}/g;
    let rbm: RegExpExecArray | null;
    const rowFFs: Array<{ start: number; end: number; ffIndex: number; points: number }> = [];
    while ((rbm = rowBoxRe.exec(row)) !== null) {
      const inner = rbm[1];
      const ffM = FF_LABEL_RE.exec(inner);
      if (!ffM) continue;
      rowFFs.push({ start: rbm.index, end: rbm.index + rbm[0].length, ffIndex: parseInt(ffM[1], 10), points: parseInt(ffM[2], 10) });
    }
    if (rowFFs.length === 0) continue;

    const contentBeforeFirst = row.substring(0, rowFFs[0].start).trim();
    const isInlineMode = contentBeforeFirst !== '' || rowFFs.length > 1;

    if (!isInlineMode) {
      // Single row-alone FF: value comes from the next row
      const ff = rowFFs[0];
      let solution = '';
      if (r + 1 < rows.length) {
        const valRow = rows[r + 1].trim().replace(/&/g, ' ').trim();
        const numMatch = valRow.match(/(-?\s*[\d\s,.]+)/);
        if (numMatch) solution = normalizeValue(numMatch[1]);
      }
      const boxedStart = row.indexOf('\\boxed');
      let mathPrefix = boxedStart > 0 ? row.substring(0, boxedStart).trim() : '';
      if (blocks.length === 0) {
        const precedingRows: string[] = [];
        for (let p = 0; p < r; p++) {
          const trimmed = rows[p].trim();
          if (trimmed) precedingRows.push(trimmed);
        }
        const precedingContent = precedingRows.join(' ');
        if (precedingContent) mathPrefix = precedingContent + (mathPrefix ? ' ' + mathPrefix : '');
        if (!mathPrefix) mathPrefix = overallPrefix;
      }
      mathPrefix = cleanLatex(mathPrefix);
      let mathSuffix = '';
      if (r + 2 < rows.length) {
        const suffParts: string[] = [];
        for (let s = r + 2; s < rows.length; s++) {
          if (FF_LABEL_RE.test(rows[s])) break;
          suffParts.push(rows[s].trim());
        }
        mathSuffix = cleanLatex(suffParts.join(' '));
      }
      blocks.push({ ffIndex: ff.ffIndex, points: ff.points, solution, rawFormula: content, mathPrefix, mathSuffix });
    } else {
      // Inline mode: multiple FFs in same row, or FF preceded by content.
      // Solution comes from text AFTER each box in the same row.
      const inlineStart = blocks.length;
      for (let b = 0; b < rowFFs.length; b++) {
        const ff = rowFFs[b];
        const prevBoxEnd = b === 0 ? 0 : rowFFs[b - 1].end;

        // Text between the previous box and this one (in same row)
        let interText = row.substring(prevBoxEnd, ff.start).trim();
        // Strip dangling } from the previous \boxed{} environment, then strip the leading
        // number (which is the OCR-shown solution value of the previous FF box).
        interText = interText.replace(/^\s*\}/, '').trim();
        const leadNumMatch = interText.match(/^\s*-?\s*\d[\d\s,.]*/);
        if (leadNumMatch) interText = interText.slice(leadNumMatch[0].length).trim();

        let mathPrefix = cleanLatex(interText);
        if (blocks.length === inlineStart && b === 0) {
          const precedingRows: string[] = [];
          for (let p = 0; p < r; p++) {
            const t = rows[p].trim();
            if (t) precedingRows.push(t);
          }
          const preceding = precedingRows.join(' ');
          mathPrefix = preceding
            ? cleanLatex(preceding + (interText ? ' ' + interText : ''))
            : mathPrefix || cleanLatex(overallPrefix);
        }

        // Text after this box (until next box or end of row)
        const nextBoxStart = b + 1 < rowFFs.length ? rowFFs[b + 1].start : row.length;
        const afterText = row.substring(ff.end, nextBoxStart).trim();
        // Strip subscript/superscript expressions to avoid matching _{1} _{2} etc. as solutions
        const afterTextClean = afterText
          .replace(/[\^_]\s*\{[^}]*\}/g, '')
          .replace(/[\^_]\s*\d+/g, '');
        const numMatch = afterTextClean.match(/(-?\s*\d[\d\s,.]*)/);
        const solution = numMatch ? normalizeValue(numMatch[1]) : '';

        // Suffix: only for the last inline FF in this row
        let mathSuffix = '';
        if (b === rowFFs.length - 1) {
          const valLen = numMatch ? numMatch[0].length : 0;
          const restAfterSolution = afterText.slice(valLen).trim();
          const suffParts: string[] = [];
          if (restAfterSolution) suffParts.push(restAfterSolution);
          for (let s = r + 1; s < rows.length; s++) {
            if (/\\boxed\s*\{[^}]*F\s*F/.test(rows[s])) break;
            const t = rows[s].trim();
            if (t) suffParts.push(t);
          }
          mathSuffix = cleanLatex(suffParts.join(' '));
        }
        blocks.push({ ffIndex: ff.ffIndex, points: ff.points, solution, rawFormula: content, mathPrefix, mathSuffix });
      }

      // Fallback: if all inline solutions are still empty, the FF boxes are at the end
      // of their row and OCR solution values appear at the start of the following row.
      // Extract solutions in order from the next row.
      const inlineCount = blocks.length - inlineStart;
      if (inlineCount > 0 && blocks.slice(inlineStart).every(b => !b.solution) && r + 1 < rows.length) {
        const nextRowClean = rows[r + 1]
          .replace(/[\^_]\s*\{[^}]*\}/g, '')
          .replace(/[\^_]\s*\d+/g, '');
        const nums: string[] = [];
        const numRe = /(-?\s*\d[\d\s,.]*)/g;
        let nm: RegExpExecArray | null;
        while ((nm = numRe.exec(nextRowClean)) !== null) {
          const val = normalizeValue(nm[1]);
          if (val) nums.push(val);
        }
        for (let bi = 0; bi < inlineCount && bi < nums.length; bi++) {
          blocks[inlineStart + bi].solution = nums[bi];
        }
      }
    }
  }

  if (blocks.length > 0) {
    const last = blocks[blocks.length - 1];
    last.mathSuffix = cleanLatex(
      (last.mathSuffix ? last.mathSuffix + ' ' : '') + overallSuffix
    );
  }

  return blocks;
}

/**
 * Handle inline \boxed{FF N (P P)} without array wrapper.
 */
function parseInlineBoxedFF(content: string): FFBlock[] {
  const blocks: FFBlock[] = [];
  const boxedRe = /\\boxed\s*\{\s*([^}]*F\s*F\s*\d+[^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = boxedRe.exec(content)) !== null) {
    const inner = match[1];
    const ffMatch = FF_LABEL_RE.exec(inner);
    if (!ffMatch) continue;

    blocks.push({
      ffIndex: parseInt(ffMatch[1], 10),
      points: parseInt(ffMatch[2], 10),
      solution: '',
      rawFormula: content,
      mathPrefix: '',
      mathSuffix: '',
    });
  }

  return blocks;
}

/**
 * Patterns 1 & 2: FF label inside individual \begin{array}...\end{array} blocks.
 */
function parseArrayFFBlocks(content: string): FFBlock[] {
  const arrayBlockRe = /\\begin\s*\{array\}\s*\{[^}]*\}\s*([\s\S]*?)\\end\s*\{array\}/g;

  let match: RegExpExecArray | null;
  const foundBlocks: Array<{
    fullMatchStart: number;
    fullMatchEnd: number;
    ffIndex: number;
    points: number;
    solution: string;
  }> = [];

  while ((match = arrayBlockRe.exec(content)) !== null) {
    const innerContent = match[1];
    const ffMatch = FF_LABEL_RE.exec(innerContent);
    if (!ffMatch) continue;

    const ffIndex = parseInt(ffMatch[1], 10);
    const points = parseInt(ffMatch[2], 10);

    // Extract solution from next row after FF label
    const rows = innerContent.split(/\\\\/);
    let solution = '';
    for (let i = 0; i < rows.length; i++) {
      if (FF_LABEL_RE.test(rows[i])) {
        if (i + 1 < rows.length) {
          let valRow = rows[i + 1].trim().replace(/&/g, ' ').trim();
          const numMatch = valRow.match(/(-?\s*[\d\s,.\s]+)/);
          if (numMatch) {
            solution = normalizeValue(numMatch[1]);
          }
        }
        break;
      }
    }

    // Determine wrapper bounds
    const arrayStart = match.index!;
    const arrayEnd = arrayStart + match[0].length;
    let blockStart = arrayStart;
    let blockEnd = arrayEnd;

    const beforeArray = content.substring(0, arrayStart);
    const afterArrayStr = content.substring(arrayEnd);

    // Check for \boxed{} wrapper
    const boxedMatch = beforeArray.match(/\\boxed\s*\{\s*$/);
    if (boxedMatch) {
      blockStart = arrayStart - boxedMatch[0].length;
      const closingBrace = afterArrayStr.match(/^\s*\}/);
      if (closingBrace) blockEnd = arrayEnd + closingBrace[0].length;
    } else {
      // Check for \left| wrapper (with optional ^ superscript)
      const leftBarMatch = beforeArray.match(/\\left\s*\|\s*((?:\^\s*\{[^}]*\}\s*)?)$/);
      if (leftBarMatch) {
        blockStart = arrayStart - leftBarMatch[0].length;
        const rightBarMatch = afterArrayStr.match(/^\s*\\right\s*\|/);
        if (rightBarMatch) blockEnd = arrayEnd + rightBarMatch[0].length;
      }
    }

    foundBlocks.push({ fullMatchStart: blockStart, fullMatchEnd: blockEnd, ffIndex, points, solution });
  }

  if (foundBlocks.length === 0) return [];

  foundBlocks.sort((a, b) => a.fullMatchStart - b.fullMatchStart);

  const blocks: FFBlock[] = [];
  for (let i = 0; i < foundBlocks.length; i++) {
    const block = foundBlocks[i];
    const prevEnd = i === 0 ? 0 : foundBlocks[i - 1].fullMatchEnd;
    const nextStart =
      i === foundBlocks.length - 1 ? content.length : foundBlocks[i + 1].fullMatchStart;

    // Fix prefix: strip content before the last \\ separator.
    // OCR artifact: the unit/label of the previous box leaks before \\ into the next prefix.
    let prefixRaw = content.substring(prevEnd, block.fullMatchStart).trim();
    const lastSlashInPrefix = prefixRaw.lastIndexOf('\\\\');
    if (lastSlashInPrefix !== -1) {
      const afterSlash = prefixRaw.slice(lastSlashInPrefix + 2).trim();
      if (afterSlash) prefixRaw = afterSlash;
    }
    const prefix = cleanLatex(prefixRaw);
    // Only keep suffix for the last block — for earlier blocks, the inter-block
    // text is already captured as the next block's prefix, so omit it here to
    // avoid rendering it twice (the ++ / doubled-text bug).
    const suffix =
      i === foundBlocks.length - 1
        ? cleanLatex(content.substring(block.fullMatchEnd, nextStart).trim())
        : '';

    blocks.push({
      ffIndex: block.ffIndex,
      points: block.points,
      solution: block.solution,
      rawFormula: content.substring(block.fullMatchStart, block.fullMatchEnd),
      mathPrefix: prefix,
      mathSuffix: suffix,
    });
  }

  return blocks;
}

export function isFFFormula(content: string): boolean {
  return FF_LABEL_RE.test(content);
}

/**
 * Parse bare \boxed{value} patterns (no FF markers).
 * Used for tasks that use \boxed{numericValue} without FFN labels.
 * Auto-assigns FF indices starting from startIndex.
 */
export function parseBareBoxedBlocks(rawContent: string, startIndex: number): FFBlock[] {
  const content = stripDisplayDelimiters(rawContent);

  // Match \boxed{simple-content} — only flat content (no nested braces)
  // This correctly skips \boxed{\begin{array}...} (FF-marker boxes)
  const boxedRe = /\\boxed\s*\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;
  const positions: Array<{ start: number; end: number; value: string }> = [];

  while ((match = boxedRe.exec(content)) !== null) {
    const inner = match[1];
    if (FF_LABEL_RE.test(inner)) continue; // skip FF-marker boxes
    positions.push({ start: match.index, end: match.index + match[0].length, value: inner.trim() });
  }

  if (positions.length === 0) return [];

  const blocks: FFBlock[] = [];
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const prevEnd = i === 0 ? 0 : positions[i - 1].end;

    // Fix prefix: strip content before the last \\ separator.
    // OCR artifact: the unit/label of the previous box leaks before \\ into the next box's prefix.
    let prefixRaw = content.substring(prevEnd, pos.start).trim();
    const lastSlash = prefixRaw.lastIndexOf('\\\\');
    if (lastSlash !== -1) {
      const afterSlash = prefixRaw.slice(lastSlash + 2).trim();
      if (afterSlash) prefixRaw = afterSlash;
    }
    const prefix = cleanLatex(prefixRaw);

    // Fix suffix: replace internal \\ (OCR line breaks inside formula continuation) with space.
    let suffixRaw = i === positions.length - 1 ? content.substring(pos.end).trim() : '';
    suffixRaw = suffixRaw.replace(/\s*\\\\\s*/g, ' ').trim();
    const suffix = cleanLatex(suffixRaw);

    blocks.push({
      ffIndex: startIndex + i,
      points: 0,
      solution: normalizeValue(pos.value),
      rawFormula: rawContent,
      mathPrefix: prefix,
      mathSuffix: suffix,
    });
  }

  return blocks;
}
