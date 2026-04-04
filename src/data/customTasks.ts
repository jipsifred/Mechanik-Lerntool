import type { Theme } from '../types';

export const CUSTOM_THEME_ID = 'custom';
export const CUSTOM_THEME_TITLE = 'Eigene Aufgaben';
export const CUSTOM_CATEGORY_PREFIX = 'custom:';

export function isCustomCategoryCode(code: string): boolean {
  return code.startsWith(CUSTOM_CATEGORY_PREFIX);
}

export function createCustomTheme(kategorien: Theme['kategorien']): Theme {
  return {
    id: CUSTOM_THEME_ID,
    titel: CUSTOM_THEME_TITLE,
    kategorien,
  };
}

export const CUSTOM_TASK_TEMPLATE = `{
  "Aufgabe": {
    "titel": "Schiefe Ebene mit Reibung",
    "gesamtpunkte": 10,
    "haupttext": {
      "text_md": "Ein Klotz der Masse $m$ bewegt sich auf einer schiefen Ebene mit dem Winkel $\\\\alpha$.",
      "erwaehnte_variablen": ["m", "\\\\alpha", "\\\\mu"]
    },
    "gegeben": {
      "text_md": "Gegeben: $m = 5~kg$, $\\\\alpha = 30^\\\\circ$, $\\\\mu = 0,2$",
      "variablen_werte": {
        "m": "5",
        "alpha": "30",
        "mu": "0,2"
      }
    },
    "teilaufgaben": [
      {
        "id": "a",
        "punkte": 4,
        "aufgabenstellung_md": "Bestimmen Sie die Hangabtriebskraft $F_H$.",
        "gesuchte_variablen": ["F_H"],
        "loesung_md": "F_H = \\\\boxed{24,5} [N]",
        "eingabefelder": [
          {
            "kasten_id": 1,
            "bezugsvariable": "F_H",
            "kasten_wert": "24,5",
            "variablen_ausserhalb_kasten": "",
            "einheit": "N"
          }
        ]
      },
      {
        "id": "b",
        "punkte": 6,
        "aufgabenstellung_md": "Bestimmen Sie die Normalkraft $F_N$.",
        "gesuchte_variablen": ["F_N"],
        "loesung_md": "F_N = \\\\boxed{42,4} [N]",
        "eingabefelder": [
          {
            "kasten_id": 1,
            "bezugsvariable": "F_N",
            "kasten_wert": "42,4",
            "variablen_ausserhalb_kasten": "",
            "einheit": "N"
          }
        ]
      }
    ]
  }
}`;
