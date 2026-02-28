import { InlineMath } from 'react-katex';
import type { Message, Subtask } from '../types';

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    sender: 'system',
    text: 'Hallo! Ich bin dein Tutor. Hast du Fragen zur Berechnung der **d\'Alembertschen Hilfskräfte**?\n\nDie Formel lautet: $$F_H = -m \\cdot a$$',
  },
  {
    id: 2,
    sender: 'user',
    text: 'Wie komme ich auf die 0,85 bei Teilaufgabe a?',
  },
];

export const MOCK_RESPONSE =
  'Das ist eine simulierte Antwort nach 7 Sekunden. Um auf die Werte zu kommen, musst du die Masse mit der Beschleunigung multiplizieren. Denke daran, dass $F_H = -m \\cdot \\ddot{x}$ gilt.';

export const SUBTASKS: Subtask[] = [
  {
    id: 'a',
    description: (
      <>
        a) Bestimmen Sie die Beträge der d'Alembertischen Hilfskräfte <InlineMath math="|F_{H1}|" /> und <InlineMath math="|F_{H2}|" /> der Räder in Abhängigkeit von <InlineMath math="\ddot{x}" />. (2 Punkte)
      </>
    ),
    mathPrefix: '\\left| F_{H1} \\right| = \\left| F_{H2} \\right| =',
    mathSuffix: '\\ddot{x} \\quad \\left[ \\mathrm{kg} \\, \\mathrm{m} \\, \\mathrm{s}^{-2} \\right]',
    solution: '0,85',
  },
  {
    id: 'b',
    description: (
      <>
        b) Bestimmen Sie die Beträge der d'Alembertschen Hilfsmomente <InlineMath math="|M_{H1}|" /> und <InlineMath math="|M_{H2}|" /> der Räder um deren Schwerpunkte in Abhängigkeit von <InlineMath math="\ddot{x}" />. (2 Punkte)
      </>
    ),
    mathPrefix: '\\left| M_{H1} \\right| = \\left| M_{H2} \\right| =',
    mathSuffix: '\\ddot{x} \\quad \\left[ \\mathrm{kg} \\, \\mathrm{m}^2 \\, \\mathrm{s}^{-2} \\right]',
    solution: '0,51',
  },
  {
    id: 'c',
    description: (
      <>
        c) Bestimmen Sie den Betrag der d'Alembertschen Hilfskraft <InlineMath math="|F_{HB}|" /> des Balkens in Abhängigkeit von <InlineMath math="\ddot{x}" />. (2 Punkte)
      </>
    ),
    mathPrefix: '\\left| F_{HB} \\right| =',
    mathSuffix: '\\ddot{x} \\quad \\left[ \\mathrm{kg} \\, \\mathrm{m} \\, \\mathrm{s}^{-2} \\right]',
    solution: '4,8',
  },
  {
    id: 'd',
    description: (
      <>
        d) Bestimmen Sie die Beschleunigung des Balkens <InlineMath math="\ddot{x}" /> mit dem Prinzip der virtuellen Arbeit. (4 Punkte)
      </>
    ),
    mathPrefix: '\\ddot{x} =',
    mathSuffix: '\\left[ \\mathrm{m} \\, \\mathrm{s}^{-2} \\right]',
    solution: '5,486',
  },
];
