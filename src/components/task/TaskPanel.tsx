import { InlineMath, BlockMath } from 'react-katex';

export function TaskPanel() {
  return (
    <div className="flex-1 glass-panel-soft rounded-2xl p-6 flex flex-col min-h-0">
      <h2 className="text-lg font-semibold mb-3 text-slate-800 shrink-0">Aufgabe (10 Punkte)</h2>
      <div className="flex-1 flex flex-col overflow-hidden text-slate-700 space-y-2 text-sm">
        <p className="leading-snug shrink-0">
          Ein dünner Balken der Masse M liegt auf zwei homogenen Rädern, die jeweils die Masse m und den Radius R haben. Die Speichen der Räder sind masselos. Infolge des Eigengewichts setzt sich das System in Bewegung und rollt auf der schiefen Ebene ab. Zwischen den Rädern und der schiefen Ebene bzw. dem Balken findet reines Abrollen ohne Rutschen statt. Die Koordinate <InlineMath math="x(t)" /> beschreibt die Bewegung des Balkens.
        </p>
        <p className="font-medium shrink-0">Gegeben:</p>
        <div className="shrink-0 text-[13px]">
          <BlockMath math="\begin{array}{l} R = 0, 6 \mathrm {m}, \quad g = 9, 8 1 \mathrm {m} / \mathrm {s} ^ {- 2}, \quad m = 1, 7 \mathrm {k g}, \quad M = 4, 8 \mathrm {k g}, \\ \alpha = 3 4 ^ {\circ}. \end{array}" />
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center pt-2">
          <img src="/skizze_bild.jpeg" alt="Skizze zur Aufgabe" className="max-h-full max-w-full object-contain rounded-lg" referrerPolicy="no-referrer" />
        </div>
      </div>
    </div>
  );
}
