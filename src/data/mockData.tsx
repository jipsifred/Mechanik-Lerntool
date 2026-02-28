import type { Message } from '../types';

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
