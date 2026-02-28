import { useState } from 'react';
import type { SolutionBoxProps } from '../../types';

export function SolutionBox({ solution, isSolved }: SolutionBoxProps) {
  const [val, setVal] = useState('');
  const isCorrect = val.trim().replace('.', ',') === solution.trim().replace('.', ',');

  return (
    <div className="relative inline-flex items-center mx-1 align-middle">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        readOnly={isSolved}
        className={`w-14 h-6 px-1 text-center text-[13px] border rounded focus:outline-none transition-colors ${
          isSolved
            ? isCorrect
              ? 'bg-green-100/90 text-green-700 border-green-400/60 font-medium'
              : 'bg-red-100/90 text-red-700 border-red-400/60 line-through'
            : 'border-slate-300/70 bg-white/60 focus:border-slate-400 focus:bg-white'
        }`}
      />
      {isSolved && !isCorrect && (
        <div className="ml-1 flex items-center justify-center h-6 px-2 bg-green-100/90 text-green-700 border border-green-400/60 rounded text-[13px] font-medium shadow-sm">
          {solution}
        </div>
      )}
    </div>
  );
}
