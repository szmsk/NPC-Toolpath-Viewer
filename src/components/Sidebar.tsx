/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Upload, FileCode, Search, Trash2, FolderPlus, HelpCircle, HardDriveDownload } from 'lucide-react';
import { ParsedGCode, MachineSettings } from '../types';
import { parseGCode, generateExampleFiles } from '../utils/gcodeParser';

interface SidebarProps {
  files: ParsedGCode[];
  setFiles: React.Dispatch<React.SetStateAction<ParsedGCode[]>>;
  activeFile: ParsedGCode | null;
  setActiveFile: (file: ParsedGCode | null) => void;
  settings: MachineSettings;
  loadSampleFiles: () => void;
}

/**
 * Micro-component that renders a tiny, highly efficient preview
 * of the toolpath directly in the file list items.
 */
function MiniThumbnail({ file }: { file: ParsedGCode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 44 * dpr;
    canvas.height = 44 * dpr;
    ctx.scale(dpr, dpr);

    // Dark background for contrast
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, 44, 44);

    const bbox = file.boundingBox;
    const size = bbox.size;
    const maxDim = Math.max(size.x, size.y, 1);
    
    // Pad to fit 44x44
    const padding = 4;
    const scale = (44 - padding * 2) / maxDim;

    // Offsets to center
    const offsetX = padding - bbox.min.x * scale + (maxDim - size.x) * scale / 2;
    const offsetY = padding - bbox.min.y * scale + (maxDim - size.y) * scale / 2;

    // Draw first 150 cut segments to keep it lightweight and blazing fast
    const cuts = file.segments.filter(s => s.type === 'cut').slice(0, 150);

    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (cuts.length > 0) {
      ctx.strokeStyle = '#6366f1'; // Indigo for cut
      ctx.beginPath();
      ctx.moveTo(
        cuts[0].start.x * scale + offsetX,
        44 - (cuts[0].start.y * scale + offsetY) // Flip Y
      );
      for (let i = 0; i < cuts.length; i++) {
        ctx.lineTo(
          cuts[i].end.x * scale + offsetX,
          44 - (cuts[i].end.y * scale + offsetY)
        );
      }
      ctx.stroke();
    } else if (file.segments.length > 0) {
      // Draw G0 if no cuts exist
      const travels = file.segments.slice(0, 100);
      ctx.strokeStyle = '#f43f5e'; // Rose for travel
      ctx.beginPath();
      ctx.moveTo(
        travels[0].start.x * scale + offsetX,
        44 - (travels[0].start.y * scale + offsetY)
      );
      for (let i = 0; i < travels.length; i++) {
        ctx.lineTo(
          travels[i].end.x * scale + offsetX,
          44 - (travels[i].end.y * scale + offsetY)
        );
      }
      ctx.stroke();
    } else {
      // Empty file cross symbol
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, 12); ctx.lineTo(32, 32);
      ctx.moveTo(32, 12); ctx.lineTo(12, 32);
      ctx.stroke();
    }
  }, [file]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-11 h-11 shrink-0 rounded border border-slate-800 bg-slate-900 pointer-events-none" 
      style={{ width: '44px', height: '44px' }}
    />
  );
}

export default function Sidebar({
  files,
  setFiles,
  activeFile,
  setActiveFile,
  settings,
  loadSampleFiles,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  // File parsing engine
  const handleLoadFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFilesPromises: Promise<ParsedGCode>[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // We accept .ncp, .gcode, .nc, .tap, .cnc, .txt and generic extensions
      const p = new Promise<ParsedGCode>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const parsed = parseGCode(file.name, text, file.size, settings);
          resolve(parsed);
        };
        reader.readAsText(file);
      });
      newFilesPromises.push(p);
    }

    Promise.all(newFilesPromises).then((parsedFiles) => {
      setFiles((prev) => {
        // Exclude duplicate filenames if they exist to keep list clean
        const existingNames = new Set(prev.map(f => f.filename));
        const filteredNew = parsedFiles.filter(f => !existingNames.has(f.filename));
        const updated = [...prev, ...filteredNew];
        
        // Auto select the first newly added file
        if (filteredNew.length > 0) {
          setActiveFile(filteredNew[0]);
        }
        return updated;
      });
    });
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleLoadFiles(e.dataTransfer.files);
    }
  };

  // Delete a single file
  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles((prev) => {
      const filtered = prev.filter(f => f.id !== id);
      if (activeFile?.id === id) {
        setActiveFile(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
  };

  // Clear list entirely
  const handleClearAll = () => {
    if (confirm('Czy na pewno chcesz usunąć wszystkie wczytane pliki z listy?')) {
      setFiles([]);
      setActiveFile(null);
    }
  };

  // Format bytes to readable size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl" id="sidebar-files">
      
      {/* Search and Header Section */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200">Katalog plików NCP</h2>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 font-mono font-semibold px-2 py-0.5 rounded-full">
            {files.length} pliki
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Szukaj pliku po nazwie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Files List View */}
      <div className="flex-1 overflow-y-auto max-h-[280px] lg:max-h-none p-3 space-y-2">
        {filteredFiles.length > 0 ? (
          filteredFiles.map((file) => {
            const isActive = activeFile?.id === file.id;
            const bbox = file.boundingBox;
            
            return (
              <div
                key={file.id}
                onClick={() => setActiveFile(file)}
                className={`group flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 border-indigo-500/80 shadow-md'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                {/* Visual Thumbnail */}
                <MiniThumbnail file={file} />

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isActive ? 'text-indigo-300' : 'text-slate-200 group-hover:text-white'
                      }`}
                      title={file.filename}
                    >
                      {file.filename}
                    </span>
                    {file.isExample && (
                      <span className="text-[8px] bg-indigo-950 text-indigo-400 font-bold border border-indigo-900/40 px-1 py-0.5 rounded uppercase shrink-0">
                        Wzór
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>{formatBytes(file.filesize)}</span>
                    <span className="text-slate-500">
                      {file.segments.length} komend
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={(e) => handleDeleteFile(file.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 transition-all shrink-0 cursor-pointer"
                  title="Usuń plik"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-500 space-y-2.5">
            <FileCode className="w-8 h-8 text-slate-700 animate-pulse" />
            <div className="text-xs">
              {searchTerm ? 'Brak plików spełniających kryteria wyszukiwania' : 'Brak wczytanych plików NCP'}
            </div>
            {!searchTerm && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 mt-2 transition-all cursor-pointer bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-900/50 hover:bg-indigo-950"
              >
                <Upload className="w-3.5 h-3.5" /> Wczytaj pliki NCP
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drag & Drop Upload Hub */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".ncp,.nc,.gcode,.tap,.cnc,.txt"
          onChange={(e) => handleLoadFiles(e.target.files)}
          className="hidden"
        />

        <input
          ref={directoryInputRef}
          type="file"
          {...{
            webkitdirectory: "",
            directory: "",
            multiple: true
          }}
          onChange={(e) => handleLoadFiles(e.target.files)}
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-2.5 text-center cursor-pointer select-none transition-all duration-200 ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 scale-[0.98]'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-300'
          }`}
        >
          <Upload className={`w-5 h-5 mx-auto mb-1 text-indigo-400/80 ${isDragOver ? 'animate-bounce' : ''}`} />
          <p className="text-[11px] font-semibold text-slate-200">Przeciągnij i upuść pliki lub folder</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Obsługiwane formaty: .NCP, .NC, .GCODE</p>
          <p className="text-[8px] text-slate-500">Przetwarzanie działa w 100% lokalnie</p>
        </div>

        {/* Manual selection buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-all cursor-pointer"
            title="Wybierz pojedyncze pliki lub zaznacz wiele"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            Wybierz pliki
          </button>
          <button
            onClick={() => directoryInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-all cursor-pointer"
            title="Wybierz cały folder zawierający pliki NCP"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            Wybierz folder
          </button>
        </div>

        {/* Clear all lists */}
        {files.length > 0 && (
          <button
            onClick={handleClearAll}
            className="w-full py-1.5 text-center text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-md transition-all border border-rose-900/20 cursor-pointer"
          >
            Wyczyść listę plików
          </button>
        )}
      </div>
    </div>
  );
}
