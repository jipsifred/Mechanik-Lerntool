export const CUSTOM_THEME_ID = 'custom';
export const CUSTOM_THEME_TITLE = 'Eigene Aufgaben';
export const CUSTOM_CATEGORY_PREFIX = 'custom:';
export const CUSTOM_TASK_ID_OFFSET = 1_000_000;
export const CUSTOM_SUBTASK_ID_OFFSET = 10_000_000;

interface InputTaskField {
  kasten_id?: number;
  bezugsvariable?: string;
  kasten_wert?: string;
  variablen_ausserhalb_kasten?: string;
  einheit?: string;
}

interface InputTeilaufgabe {
  id?: string;
  punkte?: number;
  aufgabenstellung_md?: string;
  loesung_md?: string;
  eingabefelder?: InputTaskField[];
}

interface InputAufgabe {
  titel?: string;
  gesamtpunkte?: number;
  haupttext?: {
    text_md?: string;
  };
  gegeben?: {
    text_md?: string;
    variablen_werte?: Record<string, string>;
  };
  teilaufgaben?: InputTeilaufgabe[];
}

interface ParsedField {
  prefix: string;
  suffix: string;
  solution: string;
}

export interface ParsedCustomSubtask {
  ff_index: number;
  label: string;
  description: string;
  math_prefix: string;
  math_suffix: string;
  solution: string;
  points: number;
  raw_formula: string;
  formula_group: number;
}

export interface ParsedCustomTaskPayload {
  title: string;
  totalPoints: number;
  description: string;
  givenLatex: string;
  givenVariables: string;
  rawJson: string;
  subtasks: ParsedCustomSubtask[];
}

export interface EditableCustomTask {
  id: number;
  category_id: number;
  category_code: string;
  task_json: string;
  image_data_url: string | null;
}

export function toCustomCategoryCode(categoryId: number): string {
  return `${CUSTOM_CATEGORY_PREFIX}${categoryId}`;
}

export function isCustomCategoryCode(code: string): boolean {
  return code.startsWith(CUSTOM_CATEGORY_PREFIX);
}

export function parseCustomCategoryId(code: string): number | null {
  if (!isCustomCategoryCode(code)) return null;
  const id = parseInt(code.slice(CUSTOM_CATEGORY_PREFIX.length), 10);
  return Number.isFinite(id) ? id : null;
}

export function toSyntheticTaskId(customTaskId: number): number {
  return CUSTOM_TASK_ID_OFFSET + customTaskId;
}

export function isSyntheticCustomTaskId(taskId: number): boolean {
  return taskId >= CUSTOM_TASK_ID_OFFSET;
}

export function toRawCustomTaskId(taskId: number): number {
  return taskId - CUSTOM_TASK_ID_OFFSET;
}

export function toSyntheticSubtaskId(customSubtaskId: number): number {
  return CUSTOM_SUBTASK_ID_OFFSET + customSubtaskId;
}

export function normalizeCustomTaskTitle(title: string, totalPoints: number): string {
  const base = title.trim() || 'Eigene Aufgabe';
  return /\(\s*\d+\s*Punkte?\s*\)\s*$/i.test(base)
    ? base
    : `${base} (${totalPoints} Punkte)`;
}

function ensureObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} muss ein Objekt sein.`);
  }
  return value as Record<string, unknown>;
}

function ensureString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} fehlt oder ist leer.`);
  }
  return value;
}

function ensureNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} muss eine Zahl sein.`);
  }
  return value;
}

function parseInnerJson(raw: string): unknown {
  let fixed = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  fixed = fixed
    .replace(/\\\\/g, '\x00DBL\x00')
    .replace(/\\u([0-9a-fA-F]{4})/g, '\x00U$1\x00')
    .replace(/\\/g, '\\\\')
    .replace(/\x00DBL\x00/g, '\\\\')
    .replace(/\x00U([0-9a-fA-F]{4})\x00/g, '\\u$1');

  try {
    return JSON.parse(fixed);
  } catch {
    throw new Error('JSON konnte nicht gelesen werden. Bitte das Format prüfen.');
  }
}

function normalizeTex(s: string): string {
  let result = s;

  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, content) => `$${content}$`);
  result = result.replace(/\\{3,}(?![a-zA-Z])/g, '\\\\');
  result = result.replace(/\\{2,}(?=[a-zA-Z])/g, '\\');

  result = result.replace(
    /\\begin\{((?:b|p|v|V|B)?matrix)\}([\s\S]*?)\\end\{\1\}/g,
    (_, env, content) => {
      const fixed = content.replace(/(?<!\\)\\ /g, '\\\\ ');
      return `\\begin{${env}}${fixed}\\end{${env}}`;
    }
  );

  result = result
    .replace(/\\n(?![a-z])/g, ' ')
    .replace(/\\r(?![a-z])/g, ' ')
    .replace(/\\phi(?![a-zA-Z])/g, '\\varphi')
    .replace(/\\epsilon(?![a-zA-Z])/g, '\\varepsilon')
    .replace(/(?<![a-zA-Z])ight([)\]\}|])/g, '\\right$1')
    .replace(/\\textcircled\{([^}]*)\}/g, '\\text{($1)}')
    .replace(/\\circled\{([^}]*)\}/g, '\\text{($1)}');

  return result;
}

function convertParenDelimiters(s: string): string {
  return s.replace(/\\\((.+?)\\\)/gs, (_, content) => `$${content}$`);
}

function wrapBareLatex(s: string): string {
  return s.replace(
    /(\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*(?:[_^](?:\{[^{}]*\}|[a-zA-Z0-9*]))*(?:\([^)]*\))?)|([a-zA-Z]+(?:[_^](?:\{[^}]*\}|[a-zA-Z0-9*]))+)/g,
    (match) => `$${match}$`
  );
}

function ensureDescDelimiters(s: string): string {
  let result = convertParenDelimiters(s);
  const textOutsideDollars = result.replace(/\$[^$]*\$/g, '');
  if (!/\\[a-zA-Z]|[a-zA-Z][_^]\{|[a-zA-Z][_^][a-zA-Z]/.test(textOutsideDollars)) return result;

  const parts = result.split(/(\$[^$]*\$)/g);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('$') && parts[i].endsWith('$')) continue;
    parts[i] = wrapBareLatex(parts[i]);
  }
  return parts.join('');
}

function ensureGivenDelimiters(s: string): string {
  let result = convertParenDelimiters(s);
  const noDollars = result.replace(/\$/g, '');
  if (!/\\[a-zA-Z]|[_^]\{/.test(noDollars)) return result;

  const match = noDollars.match(/^(Gegeben:\s*)/i);
  const prefix = match ? match[1] : '';
  const rest = noDollars.substring(prefix.length).replace(/\.\s*$/, '');
  const parts = rest.split(/,\s+/);
  return prefix + parts.map((part) => `$${part.trim()}$`).join(', ');
}

function stripDollar(s: string): string {
  return s.trim().replace(/^\$\s*/, '').replace(/\s*\$$/, '');
}

function parseLoesung(loesungMd: string): ParsedField[] {
  const formula = stripDollar(loesungMd);
  const boxedRe = /\\boxed\{([^}]*)\}/g;
  const textParts: string[] = [];
  const solutions: string[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = boxedRe.exec(formula)) !== null) {
    textParts.push(formula.substring(lastIdx, match.index));
    solutions.push(match[1]);
    lastIdx = match.index + match[0].length;
  }
  textParts.push(formula.substring(lastIdx));

  if (solutions.length === 0) return [];

  if (solutions.length === 1) {
    return [{
      prefix: textParts[0].trim(),
      suffix: textParts[1].trim(),
      solution: solutions[0],
    }];
  }

  const fields: ParsedField[] = [];

  for (let i = 0; i < solutions.length; i++) {
    let prefix = '';
    let suffix = '';

    if (i === 0) {
      prefix = textParts[0].trim();
    } else {
      const inter = textParts[i];
      const opMatch = inter.match(/^(.*)\s*(\+|-)\s*$/s);
      if (opMatch) {
        if (fields.length > 0) {
          fields[fields.length - 1].suffix = opMatch[1].trim();
        }
        prefix = opMatch[2];
      } else {
        prefix = inter.trim();
      }
    }

    if (i === solutions.length - 1) {
      suffix = textParts[textParts.length - 1].trim();
    }

    fields.push({ prefix, suffix, solution: solutions[i] });
  }

  return fields;
}

function buildFallbackFields(teil: InputTeilaufgabe): ParsedField[] {
  if (!Array.isArray(teil.eingabefelder) || teil.eingabefelder.length === 0) return [];

  return teil.eingabefelder.map((field) => {
    const variable = typeof field.bezugsvariable === 'string' ? field.bezugsvariable.trim() : '';
    const outside = typeof field.variablen_ausserhalb_kasten === 'string' ? field.variablen_ausserhalb_kasten.trim() : '';
    const unit = typeof field.einheit === 'string' ? field.einheit.trim() : '';
    const solution = typeof field.kasten_wert === 'string' ? field.kasten_wert.trim() : '';

    return {
      prefix: outside || (variable ? `${variable} =` : ''),
      suffix: unit ? `[${unit}]` : '',
      solution,
    };
  });
}

export function parseCustomTaskJson(rawJson: string): ParsedCustomTaskPayload {
  const parsedRoot = ensureObject(parseInnerJson(rawJson), 'JSON');
  const aufgabe = ensureObject(parsedRoot.Aufgabe, 'Aufgabe') as unknown as InputAufgabe;
  const haupttext = ensureObject(aufgabe.haupttext, 'haupttext');
  const gegeben = ensureObject(aufgabe.gegeben ?? {}, 'gegeben');
  const teilaufgaben = Array.isArray(aufgabe.teilaufgaben) ? aufgabe.teilaufgaben : [];

  if (teilaufgaben.length === 0) {
    throw new Error('Mindestens eine Teilaufgabe ist erforderlich.');
  }

  const totalPoints = ensureNumber(aufgabe.gesamtpunkte, 'gesamtpunkte');
  const rawTitle = typeof aufgabe.titel === 'string' ? aufgabe.titel : 'Eigene Aufgabe';
  const title = normalizeCustomTaskTitle(rawTitle, totalPoints);
  const description = ensureDescDelimiters(normalizeTex(ensureString(haupttext.text_md, 'haupttext.text_md')));
  const givenText = typeof gegeben.text_md === 'string' ? normalizeTex(gegeben.text_md) : '';
  const givenLatex = givenText ? ensureGivenDelimiters(givenText) : '';
  const givenVariables = JSON.stringify(
    (gegeben.variablen_werte && typeof gegeben.variablen_werte === 'object' && !Array.isArray(gegeben.variablen_werte))
      ? gegeben.variablen_werte
      : {}
  );

  const subtasks: ParsedCustomSubtask[] = [];
  let ffIndex = 1;
  let formulaGroup = 0;

  for (const teil of teilaufgaben) {
    const labelBase = typeof teil.id === 'string' ? teil.id.trim() : '';
    const label = labelBase ? `${labelBase})` : '';
    const partDescription = ensureDescDelimiters(normalizeTex(ensureString(teil.aufgabenstellung_md, 'teilaufgaben[].aufgabenstellung_md')));
    const rawFormula = typeof teil.loesung_md === 'string' ? normalizeTex(teil.loesung_md) : '';
    const fields = rawFormula ? parseLoesung(rawFormula) : buildFallbackFields(teil);

    if (fields.length === 0) {
      throw new Error(`Teilaufgabe ${labelBase || formulaGroup + 1} braucht mindestens ein \\boxed{...} oder ein gültiges Eingabefeld.`);
    }

    const partPoints = typeof teil.punkte === 'number' && Number.isFinite(teil.punkte) ? teil.punkte : 0;
    const group = formulaGroup++;

    fields.forEach((field, index) => {
      subtasks.push({
        ff_index: ffIndex++,
        label,
        description: partDescription,
        math_prefix: field.prefix,
        math_suffix: field.suffix,
        solution: field.solution,
        points: index === 0 ? partPoints : 0,
        raw_formula: rawFormula,
        formula_group: group,
      });
    });
  }

  return {
    title,
    totalPoints,
    description,
    givenLatex,
    givenVariables,
    rawJson,
    subtasks,
  };
}
