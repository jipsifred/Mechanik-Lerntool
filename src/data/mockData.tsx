import type { Theme } from '../types';

export const GEMINI_MODEL_ID = 'gemini-2.5-flash';

export const AI_MODELS: { id: string; label: string }[] = [
  { id: 'gemini-3.1-pro-preview', label: '3.1 Pro'   },
  { id: 'gemini-3-flash-preview', label: '3 Flash'   },
  { id: 'gemini-2.5-flash',       label: '2.5 Flash' },
];

export const THEMES: Theme[] = [
  {
    id: '1',
    titel: 'Kinematik \u2013 Massenpunkt',
    kategorien: [
      { code: '1A', titel: 'Kartesische Koordinaten', beschreibung: 'Beschreibung der Bewegung eines Massenpunkts in x-y-(z-)Koordinaten: Weg, Geschwindigkeit, Beschleunigung.' },
      { code: '1B', titel: 'Begleitendes Dreibein', beschreibung: 'Geschwindigkeit und Beschleunigung in nat\u00fcrlichen Koordinaten (Tangential-, Normal-, Binormalrichtung), Kr\u00fcmmungsradius.' },
    ],
  },
  {
    id: '2',
    titel: 'Kinematik \u2013 Starrer K\u00f6rper',
    kategorien: [
      { code: '2A', titel: 'Ebene Bewegung', beschreibung: '\u00dcberlagerung von Translation und Rotation.' },
      { code: '2B', titel: 'Momentanpol', beschreibung: 'Bestimmung des Momentanpols und Konstruktion von Polpl\u00e4nen.' },
      { code: '2C', titel: 'Relativkinematik', beschreibung: 'Relativbewegung in rotierenden Bezugssystemen, Coriolis-Beschleunigung.' },
    ],
  },
  {
    id: '3',
    titel: 'Kinetik \u2013 Massenpunkt',
    kategorien: [
      { code: '3A', titel: 'Newtonsche Gleichung', beschreibung: 'Bewegungsgleichung F = m\u00b7a f\u00fcr freie und gef\u00fchrte Massenpunkte.' },
      { code: '3B', titel: 'Impulssatz & Sto\u00df', beschreibung: 'Impulserhaltung, gerader und schiefer Sto\u00df, Sto\u00dfzahl, Energieverlust.' },
    ],
  },
  {
    id: '4',
    titel: 'Kinetik \u2013 Starrer K\u00f6rper',
    kategorien: [
      { code: '4A', titel: 'Newton-Euler', beschreibung: 'Schwerpunktsatz und Drallsatz f\u00fcr starre K\u00f6rper in der Ebene.' },
      { code: '4B', titel: 'Energiesatz', beschreibung: 'Kinetische Energie, Arbeitssatz, rollende und gleitende K\u00f6rper.' },
      { code: '4C', titel: 'Kreisel & R\u00e4umliche Kinetik', beschreibung: 'Massentr\u00e4gheitstensor, Eulersche Gleichungen, Kreiseleffekte.' },
    ],
  },
  {
    id: '5',
    titel: 'Analytische Mechanik',
    kategorien: [
      { code: '5A', titel: 'Prinzip der virtuellen Arbeit', beschreibung: 'PvA und d\u2019Alembert-Prinzip.' },
      { code: '5B', titel: 'Lagrange-Gleichungen', beschreibung: 'Lagrange-Gleichungen 2. Art mit generalisierten Koordinaten.' },
    ],
  },
  {
    id: '6',
    titel: 'Schwingungslehre',
    kategorien: [
      { code: '6A', titel: 'Einmassenschwinger', beschreibung: 'Freie und erzwungene Schwingungen, D\u00e4mpfung, Resonanz.' },
      { code: '6B', titel: 'Mehrmassenschwinger', beschreibung: 'Mehrere Freiheitsgrade, Eigenfrequenzen, Eigenformen.' },
    ],
  },
];
