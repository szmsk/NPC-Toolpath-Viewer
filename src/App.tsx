/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Settings2, 
  FileCode, 
  HelpCircle, 
  Cpu, 
  SlidersHorizontal,
  PlusCircle, 
  Layers, 
  Terminal,
  Activity,
  ChevronRight,
  ChevronLeft,
  HardDriveDownload
} from 'lucide-react';
import { ParsedGCode, MachineSettings } from './types';
import Sidebar from './components/Sidebar';
import ToolpathCanvas from './components/ToolpathCanvas';
import { generateExampleFiles } from './utils/gcodeParser';
import { generateOfflineHtml } from './utils/offlineExporter';

const DEFAULT_SETTINGS: MachineSettings = {
  g0Speed: 3000,
  g1Speed: 1200,
  zSpeed: 400
};

export default function App() {
  const [settings, setSettings] = useState<MachineSettings>(DEFAULT_SETTINGS);
  const [files, setFiles] = useState<ParsedGCode[]>([]);
  const [activeFile, setActiveFile] = useState<ParsedGCode | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Do not load sample files automatically on mount - start fresh and empty!
  useEffect(() => {
    // Start empty so user can load their own files immediately
  }, []);

  const loadSampleFiles = () => {
    const examples = generateExampleFiles(settings);
    setFiles(examples);
    if (examples.length > 0) {
      setActiveFile(examples[0]);
    }
  };

  const handleDownloadOfflineApp = () => {
    const htmlString = generateOfflineHtml(files, settings);
    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ncp_viewer_offline.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="lg:h-screen lg:max-h-screen lg:overflow-hidden min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white" id="main-application">
      {/* 1. APP HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 shrink-0 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg text-white">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white flex items-center gap-2">
              NCP CNC Toolpath Viewer
              <span class="text-[10px] bg-indigo-950 text-indigo-400 font-bold border border-indigo-900 px-2 py-0.5 rounded-full uppercase">
                v1.2.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">Interaktywny podgląd 2D i symulator ścieżki narzędzia dla plików CNC (.ncp / .gcode)</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadOfflineApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/30 text-emerald-400 hover:text-emerald-300 border border-emerald-900/60 transition-all text-xs cursor-pointer"
            title="Pobierz całą aplikację jako jeden samodzielny plik HTML wraz ze wszystkimi obecnie wczytanymi plikami NCP"
          >
            <HardDriveDownload className="w-4 h-4 text-emerald-400" />
            Pobierz wersję offline (.html)
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all text-xs cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Jak to działa?
          </button>
        </div>
      </header>

      {/* 2. MAIN LAYOUT WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row p-3 gap-3 min-h-0 overflow-hidden">
        
        {/* Left Side: Sidebar with upload/files list */}
        <aside className="w-full lg:w-80 xl:w-96 flex flex-col shrink-0 min-h-0">
          <Sidebar
            files={files}
            setFiles={setFiles}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            settings={settings}
            loadSampleFiles={loadSampleFiles}
          />
        </aside>

        {/* Center/Right Workspace - Pure 2D Visualization Canvas */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-900/40 rounded-xl border border-slate-800/80">
          <div className="flex-1 min-h-0">
            <ToolpathCanvas
              parsedFile={activeFile}
              activeSegmentIndex={activeSegmentIndex}
              setActiveSegmentIndex={setActiveSegmentIndex}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
            />
          </div>
        </main>
      </div>

      {/* 3. APP FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 px-5 py-1.5 text-center shrink-0 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <p>Wizualizator NCP • Autor: Szymon Kloskowski</p>
        <p className="font-mono text-slate-600">Kompatybilność: G-code Standard ISO / Vectric / Megaplot / InfoTEC NCP</p>
      </footer>

      {/* 4. HELP / INFORMATION MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Podgląd plików NCP i G-code — Instrukcja
            </h3>
            
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed overflow-y-auto max-h-[70vh] pr-2">
              <p>
                Aplikacja służy do błyskawicznego podglądu i weryfikacji geometrii ścieżek narzędziowych CNC z rozszerzeniem <strong>.ncp</strong>, <strong>.nc</strong> oraz <strong>.gcode</strong> przed puszczeniem ich na maszynę.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-white text-xs text-indigo-300">📁 Wczytywanie seryjne (np. 50 plików):</h4>
                  <p className="text-xs text-slate-400">
                    Kliknij szare pole pod listą plików lub przeciągnij na nie wybrane pliki NCP ze swojego komputera. Możesz zaznaczyć i przeciągnąć <strong>dowolną liczbę plików jednocześnie</strong> (np. całe zlecenie, 50 lub 100 sztuk). Wszystkie zostaną natychmiast sparsowane!
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                  <h4 className="font-semibold text-white text-xs text-emerald-300">👁️ Szybki podgląd z listy:</h4>
                  <p className="text-xs text-slate-400">
                    Każdy wczytany plik w katalogu po lewej stronie posiada <strong>własną mini-ikonkę podglądu ścieżki geometrycznej</strong> generowaną na żywo! Dzięki temu nie musisz klikać każdego pliku z osobna, aby rozpoznać co się w nim znajduje.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <h4 className="font-semibold text-slate-200 text-xs">🎮 Sterowanie wizualizacją 2D:</h4>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
                  <li><strong>Przesuwanie (Panowanie):</strong> Kliknij lewym przyciskiem myszy na polu podglądu i po prostu przeciągaj, aby przemieścić rysunek.</li>
                  <li><strong>Skalowanie (Zoom):</strong> Użyj rolki (scrolla) myszy, aby przybliżyć lub oddalić model.</li>
                  <li><strong>Dopasowanie widoku:</strong> Kliknij dwukrotnie lewym przyciskiem myszy na płótnie podglądu lub kliknij przycisk <strong>Wyśrodkuj widok</strong>, aby automatycznie dopasować widok do okna.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200 text-xs">⏱️ Symulacja pracy i optymalizator posuwów:</h4>
                <p className="text-xs text-slate-400">
                  Użyj przycisku <strong>Odtwórz (Play)</strong> na dole panelu podglądu, aby prześledzić ruch końcówki frezu linia po linii. Możesz przyspieszyć animację lub przewijać suwakiem. Na dole w panelu konfiguracji możesz zmieniać parametry posuwów roboczych swojej maszyny, aby automatycznie urealnić kalkulację pozostałego czasu pracy.
                </p>
              </div>

              <div className="bg-yellow-950/20 border border-yellow-900/40 p-2.5 rounded text-xs text-yellow-400">
                <strong>Bezpieczeństwo frezowania:</strong> System automatycznie analizuje ścieżki i ostrzeże Cię, jeśli program CNC zakłada głębokie schodzenie osi Z poniżej poziomu zero (Z=0).
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Rozumiem, do dzieła
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
