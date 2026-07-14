/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Code, Search } from 'lucide-react';
import { ParsedGCode } from '../types';

interface GCodeViewerProps {
  parsedFile: ParsedGCode | null;
  activeSegmentIndex: number;
}

export default function GCodeViewer({ parsedFile, activeSegmentIndex }: GCodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Find the actual line number of the raw file being executed
  const currentSegment = parsedFile?.segments[activeSegmentIndex] || null;
  const activeRawLineIndex = currentSegment ? currentSegment.lineIndex : -1;

  // Auto-scroll the code list to keep the executing instruction centered
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeRawLineIndex]);

  if (!parsedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-slate-500 bg-slate-950/30 border border-slate-800 rounded-xl">
        <Code className="w-8 h-8 mb-2 text-slate-600" />
        <span className="text-xs">Brak załadowanego kodu NCP</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Title */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-semibold text-slate-200">Podgląd instrukcji G-kod</h3>
        </div>
        <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-950 px-1.5 py-0.5 rounded">
          {parsedFile.rawLines.length} linii
        </span>
      </div>

      {/* Code Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-5 text-slate-400 p-2 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {parsedFile.rawLines.map((line, idx) => {
          const isActive = idx === activeRawLineIndex;
          
          return (
            <div
              key={idx}
              ref={isActive ? activeLineRef : null}
              className={`flex items-start rounded px-1.5 transition-colors ${
                isActive
                  ? 'bg-indigo-600/30 text-white font-bold border-l-2 border-indigo-500'
                  : 'hover:bg-slate-900/50 hover:text-slate-200'
              }`}
            >
              {/* Line numbers */}
              <span className="w-10 text-right select-none pr-3 text-slate-600 text-[10px]">
                {idx + 1}
              </span>
              {/* Line text */}
              <span className="flex-1 break-all whitespace-pre-wrap">
                {line.trim() === '' ? ' ' : line}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
