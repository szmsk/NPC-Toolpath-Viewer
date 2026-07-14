/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Navigation, Gauge, Activity, Settings2, ShieldAlert } from 'lucide-react';
import { ParsedGCode, MachineSettings } from '../types';

interface StatsPanelProps {
  parsedFile: ParsedGCode | null;
  settings: MachineSettings;
  setSettings: (settings: MachineSettings) => void;
}

export default function StatsPanel({ parsedFile, settings, setSettings }: StatsPanelProps) {
  
  // Format seconds to readable Polish string
  const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds <= 0) return '0s';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (h > 0) parts.push(`${h} godz.`);
    if (m > 0 || h > 0) parts.push(`${m} min.`);
    parts.push(`${s} sek.`);

    return parts.join(' ');
  };

  // Recalculate estimated time dynamically based on custom machine settings
  const getRecalculatedTime = (): number => {
    if (!parsedFile) return 0;
    
    let timeSec = 0;
    for (const seg of parsedFile.segments) {
      const dist = Math.sqrt(
        Math.pow(seg.end.x - seg.start.x, 2) +
        Math.pow(seg.end.y - seg.start.y, 2) +
        Math.pow(seg.end.z - seg.start.z, 2)
      );

      if (seg.type === 'cut') {
        // use custom G1 cut speed or the segment speed if it specifies a unique plunge speed
        const isPlunge = Math.abs(seg.end.z - seg.start.z) > 0.01 && Math.abs(seg.end.x - seg.start.x) < 0.01 && Math.abs(seg.end.y - seg.start.y) < 0.01;
        const feed = isPlunge ? settings.zSpeed : settings.g1Speed;
        const speedMmPerSec = feed / 60;
        timeSec += dist / (speedMmPerSec || 20);
      } else {
        const speedMmPerSec = settings.g0Speed / 60;
        timeSec += dist / (speedMmPerSec || 50);
      }
    }
    return timeSec;
  };

  const calculatedTimeSec = parsedFile ? getRecalculatedTime() : 0;

  const handleSpeedChange = (key: keyof MachineSettings, val: number) => {
    setSettings({
      ...settings,
      [key]: isNaN(val) || val <= 0 ? 100 : val
    });
  };

  if (!parsedFile) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-500 h-full flex flex-col items-center justify-center">
        <Activity className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
        <p className="text-sm">Brak danych - wybierz plik z listy, aby zobaczyć statystyki</p>
      </div>
    );
  }

  const bbox = parsedFile.boundingBox;
  
  // Warning check if tool goes below Z=0 (might cut into the machine bed if not zeroed correctly)
  const cutsBelowZero = bbox.min.z < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-panel">
      
      {/* 1. PHYSICAL DIMENSIONS & GRID LIMITS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-200">Wymiary i Zakresy (XYZ)</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
              <span className="text-slate-400 font-medium">Szerokość (X):</span>
              <span className="font-mono text-white font-bold">{bbox.size.x.toFixed(2)} mm</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
              <span className="text-slate-400 font-medium">Długość (Y):</span>
              <span className="font-mono text-white font-bold">{bbox.size.y.toFixed(2)} mm</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
              <span className="text-slate-400 font-medium">Głębokość (Z):</span>
              <span className="font-mono text-white font-bold">{bbox.size.z.toFixed(2)} mm</span>
            </div>
          </div>
        </div>

        {/* Extreme Coordinates Readout */}
        <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-400 grid grid-cols-3 gap-1">
          <div>
            <div className="text-slate-500">Min/Max X:</div>
            <div className="text-slate-300 font-semibold">{bbox.min.x.toFixed(1)} / {bbox.max.x.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-slate-500">Min/Max Y:</div>
            <div className="text-slate-300 font-semibold">{bbox.min.y.toFixed(1)} / {bbox.max.y.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-slate-500">Min/Max Z:</div>
            <div className="text-slate-300 font-semibold">{bbox.min.z.toFixed(1)} / {bbox.max.z.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* 2. ESTIMATED TIMES & SCALES */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-200">Długość i Czas Pracy</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-400" /> Ścieżka cięcia:
              </span>
              <span className="font-mono text-indigo-300 font-semibold">{(parsedFile.totalCutLength / 1000).toFixed(2)} m</span>
            </div>
            
            <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
              <span className="text-slate-400 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-rose-400" /> Przejazdy G0:
              </span>
              <span className="font-mono text-rose-300 font-semibold">{(parsedFile.totalTravelLength / 1000).toFixed(2)} m</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-indigo-950">
              <span className="text-slate-300 font-medium">Szacowany czas pracy:</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {formatDuration(calculatedTimeSec)}
              </span>
            </div>
          </div>
        </div>

        {/* Warning messages */}
        <div className="mt-2 text-[10px]">
          {cutsBelowZero ? (
            <div className="flex items-start gap-1.5 bg-yellow-950/40 border border-yellow-900/60 text-yellow-400 p-2 rounded">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-500" />
              <span>
                <strong>Uwaga:</strong> Frez schodzi poniżej Z=0 (Z_min = {bbox.min.z.toFixed(2)} mm). Upewnij się, że stół maszyny jest zabezpieczony podkładką!
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-1.5 bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 p-2 rounded">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
              <span>
                Bezpieczny zakres Z (brak głębokich cięć podłoża). Z_min = {bbox.min.z.toFixed(2)} mm.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. MACHINE FEEDRATE OPTIMIZER (SETTINGS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Gauge className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-200">Konfiguracja Prędkości Maszyny</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* G1 cut rate */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Posuw cięcia (G1/2/3):</span>
                <span className="font-mono text-indigo-300 font-bold">{settings.g1Speed} mm/min</span>
              </div>
              <input
                type="range"
                min={200}
                max={8000}
                step={100}
                value={settings.g1Speed}
                onChange={(e) => handleSpeedChange('g1Speed', parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* G0 rapid rate */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Posuw jałowy (G0):</span>
                <span className="font-mono text-rose-300 font-bold">{settings.g0Speed} mm/min</span>
              </div>
              <input
                type="range"
                min={500}
                max={15000}
                step={250}
                value={settings.g0Speed}
                onChange={(e) => handleSpeedChange('g0Speed', parseInt(e.target.value, 10))}
                className="w-full accent-rose-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Z plunge rate */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Wjazd pionowy Z (Plunge):</span>
                <span className="font-mono text-blue-300 font-bold">{settings.zSpeed} mm/min</span>
              </div>
              <input
                type="range"
                min={100}
                max={3000}
                step={50}
                value={settings.zSpeed}
                onChange={(e) => handleSpeedChange('zSpeed', parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 text-center mt-2 border-t border-slate-800/80 pt-2">
          Suwaki dostosowują szacowanie czasu dla urealnienia pracy maszyny.
        </div>
      </div>

    </div>
  );
}
