/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Box, Grid3X3, Eye, Compass, Maximize, Check } from 'lucide-react';
import { ParsedGCode, Point3D, ToolpathSegment, ViewOrientation } from '../types';

interface ToolpathCanvasProps {
  parsedFile: ParsedGCode | null;
  activeSegmentIndex: number;
  setActiveSegmentIndex: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ToolpathCanvas({
  parsedFile,
  activeSegmentIndex,
  setActiveSegmentIndex,
  isPlaying,
  setIsPlaying,
}: ToolpathCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Projection state
  const [yaw, setYaw] = useState<number>(0); // Flat 2D rotation (0)
  const [pitch, setPitch] = useState<number>(0); // Flat 2D rotation (0)
  const [zoom, setZoom] = useState<number>(3.5);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Settings / Toggles
  const [showTravel, setShowTravel] = useState<boolean>(true);
  const [showCut, setShowCut] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showBox, setShowBox] = useState<boolean>(false);
  const [showTool, setShowTool] = useState<boolean>(true);
  const [canvasBg, setCanvasBg] = useState<'dark' | 'light'>('dark');

  // Animation / simulation state
  const [simulationSpeed, setSimulationSpeed] = useState<number>(3); // steps per frame
  const animationRef = useRef<number | null>(null);

  // Mouse interaction state
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragModeRef = useRef<'orbit' | 'pan'>('pan');

  // Active file ref for animation loops
  const fileRef = useRef<ParsedGCode | null>(null);
  useEffect(() => {
    fileRef.current = parsedFile;
  }, [parsedFile]);

  // Handle auto-fitting the view when the file changes
  useEffect(() => {
    if (parsedFile) {
      resetView(parsedFile);
      setActiveSegmentIndex(0);
      setIsPlaying(false);
    }
  }, [parsedFile]);

  // Run simulation playback
  useEffect(() => {
    if (isPlaying && parsedFile && parsedFile.segments.length > 0) {
      const runSim = () => {
        setActiveSegmentIndex((prev) => {
          const next = prev + simulationSpeed;
          if (next >= parsedFile.segments.length) {
            setIsPlaying(false);
            return parsedFile.segments.length - 1;
          }
          return next;
        });
        if (isPlaying) {
          animationRef.current = requestAnimationFrame(runSim);
        }
      };
      animationRef.current = requestAnimationFrame(runSim);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, parsedFile, simulationSpeed]);

  // Reset view to fit the toolpath bounding box
  const resetView = (fileToFit = parsedFile, targetYaw = 0, targetPitch = 0) => {
    const file = fileToFit || parsedFile;
    if (!file || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 300;

    const bbox = file.boundingBox;
    const center = bbox.center;

    // Yaw and pitch cosine / sines
    const cy = Math.cos(targetYaw);
    const sy = Math.sin(targetYaw);
    const cp = Math.cos(targetPitch);
    const sp = Math.sin(targetPitch);

    // 8 corners of the bounding box relative to its center
    const corners = [
      { x: bbox.min.x - center.x, y: bbox.min.y - center.y, z: bbox.min.z - center.z },
      { x: bbox.max.x - center.x, y: bbox.min.y - center.y, z: bbox.min.z - center.z },
      { x: bbox.max.x - center.x, y: bbox.max.y - center.y, z: bbox.min.z - center.z },
      { x: bbox.min.x - center.x, y: bbox.max.y - center.y, z: bbox.min.z - center.z },
      { x: bbox.min.x - center.x, y: bbox.min.y - center.y, z: bbox.max.z - center.z },
      { x: bbox.max.x - center.x, y: bbox.min.y - center.y, z: bbox.max.z - center.z },
      { x: bbox.max.x - center.x, y: bbox.max.y - center.y, z: bbox.max.z - center.z },
      { x: bbox.min.x - center.x, y: bbox.max.y - center.y, z: bbox.max.z - center.z },
    ];

    let minOffsetX = Infinity;
    let maxOffsetX = -Infinity;
    let minOffsetY = Infinity;
    let maxOffsetY = -Infinity;

    for (const pt of corners) {
      // Z-rotation (yaw)
      const rx1 = pt.x * cy - pt.y * sy;
      const ry1 = pt.x * sy + pt.y * cy;
      const rz1 = pt.z;

      // X-rotation (pitch)
      const rx2 = rx1;
      const ry2 = ry1 * cp - rz1 * sp;

      // Screen projection offsets (at zoom = 1.0, panX/panY = 0)
      const offsetX = rx2;
      const offsetY = -ry2;

      if (offsetX < minOffsetX) minOffsetX = offsetX;
      if (offsetX > maxOffsetX) maxOffsetX = offsetX;
      if (offsetY < minOffsetY) minOffsetY = offsetY;
      if (offsetY > maxOffsetY) maxOffsetY = offsetY;
    }

    const projectedWidth = Math.max(maxOffsetX - minOffsetX, 1);
    const projectedHeight = Math.max(maxOffsetY - minOffsetY, 1);

    // Comfortably fit the shape using up to 75% of the viewport width/height (25% safety margin padding)
    const allowedWidth = width * 0.75;
    const allowedHeight = height * 0.75;

    const zoomX = allowedWidth / projectedWidth;
    const zoomY = allowedHeight / projectedHeight;

    const calculatedZoom = Math.min(zoomX, zoomY);
    setZoom(Math.max(calculatedZoom, 0.1));

    // Reset rotation to targeted values
    setYaw(targetYaw);
    setPitch(targetPitch);
    
    // Reset panning
    setPanX(0);
    setPanY(0);
  };

  // Preset Orientations
  const setOrientation = (type: ViewOrientation) => {
    if (!parsedFile) return;
    setIsPlaying(false);

    if (type === 'xy') {
      resetView(parsedFile, 0, 0);
    } else if (type === 'xz') {
      resetView(parsedFile, 0, Math.PI / 2);
    } else if (type === 'yz') {
      resetView(parsedFile, Math.PI / 2, Math.PI / 2);
    } else {
      // 3D
      resetView(parsedFile, -Math.PI / 6, Math.PI / 6);
    }
  };

  // Main Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = canvasBg === 'dark' ? '#0f172a' : '#f8fafc'; // slate-900 or slate-50
    ctx.fillRect(0, 0, width, height);

    if (!parsedFile) {
      // Draw placeholder
      ctx.fillStyle = canvasBg === 'dark' ? '#94a3b8' : '#64748b';
      ctx.font = '15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Wybierz lub przeciągnij plik .NCP aby wyświetlić wizualizację 2D', width / 2, height / 2);
      return;
    }

    const bbox = parsedFile.boundingBox;
    const center = bbox.center;

    // Project 3D Point to 2D Screen
    const project = (pt: Point3D): { x: number; y: number; z: number } => {
      // Translate to origin (relative to toolpath bounding center)
      const dx = pt.x - center.x;
      const dy = pt.y - center.y;
      const dz = pt.z - center.z;

      // Rotate around Z axis (yaw)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const rx1 = dx * cosY - dy * sinY;
      const ry1 = dx * sinY + dy * cosY;
      const rz1 = dz;

      // Rotate around X axis (pitch)
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const rx2 = rx1;
      const ry2 = ry1 * cosP - rz1 * sinP;
      const rz2 = ry1 * sinP + rz1 * cosP;

      // Screen projection (Orthogonal + Panning + Scaling)
      // We flip Y because screen coordinates increase downwards
      const screenX = width / 2 + rx2 * zoom + panX;
      const screenY = height / 2 - ry2 * zoom + panY;

      return { x: screenX, y: screenY, z: rz2 };
    };

    // 1. DRAW GRID (Z = 0)
    if (showGrid) {
      ctx.strokeStyle = canvasBg === 'dark' ? 'rgba(51, 65, 85, 0.4)' : 'rgba(203, 213, 225, 0.6)';
      ctx.lineWidth = 1;
      
      const gridSpacing = 10; // every 10mm
      const gridSize = Math.max(Math.ceil(bbox.size.x / 10), Math.ceil(bbox.size.y / 10), 5) * 10 + 20;
      
      // We center grid around the toolpath center but clamped on Z=0
      const gridCenterX = Math.round(center.x / 10) * 10;
      const gridCenterY = Math.round(center.y / 10) * 10;

      // Draw horizontal & vertical grid lines
      for (let x = gridCenterX - gridSize; x <= gridCenterX + gridSize; x += gridSpacing) {
        ctx.beginPath();
        let first = true;
        for (let y = gridCenterY - gridSize; y <= gridCenterY + gridSize; y += gridSpacing / 2) {
          const sPt = project({ x, y, z: 0 });
          if (first) {
            ctx.moveTo(sPt.x, sPt.y);
            first = false;
          } else {
            ctx.lineTo(sPt.x, sPt.y);
          }
        }
        ctx.stroke();
      }

      for (let y = gridCenterY - gridSize; y <= gridCenterY + gridSize; y += gridSpacing) {
        ctx.beginPath();
        let first = true;
        for (let x = gridCenterX - gridSize; x <= gridCenterX + gridSize; x += gridSpacing / 2) {
          const sPt = project({ x, y, z: 0 });
          if (first) {
            ctx.moveTo(sPt.x, sPt.y);
            first = false;
          } else {
            ctx.lineTo(sPt.x, sPt.y);
          }
        }
        ctx.stroke();
      }
    }

    // 2. DRAW ORIGIN AXES (at real 0,0,0 coordinate if near)
    const origin2d = project({ x: 0, y: 0, z: 0 });
    const isOriginOnScreen = 
      origin2d.x > 0 && origin2d.x < width && origin2d.y > 0 && origin2d.y < height;

    if (isOriginOnScreen) {
      const len = 15; // axis length
      const axisX = project({ x: len, y: 0, z: 0 });
      const axisY = project({ x: 0, y: len, z: 0 });
      const axisZ = project({ x: 0, y: 0, z: len });

      // X Axis (Red)
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.moveTo(origin2d.x, origin2d.y);
      ctx.lineTo(axisX.x, axisX.y);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = '10px monospace';
      ctx.fillText('X', axisX.x + 4, axisX.y + 3);

      // Y Axis (Green)
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.moveTo(origin2d.x, origin2d.y);
      ctx.lineTo(axisY.x, axisY.y);
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.fillText('Y', axisY.x + 4, axisY.y + 3);

      // Z Axis (Blue)
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.moveTo(origin2d.x, origin2d.y);
      ctx.lineTo(axisZ.x, axisZ.y);
      ctx.stroke();
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('Z', axisZ.x + 4, axisZ.y - 2);

      // Draw a small origin dot
      ctx.beginPath();
      ctx.fillStyle = canvasBg === 'dark' ? '#f1f5f9' : '#0f172a';
      ctx.arc(origin2d.x, origin2d.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 3. DRAW WORK ENVELOPE BOUNDING BOX (Removed as requested for clean 2D view without dimensions)

    // 4. DRAW TOOLPATH SEGMENTS
    const segments = parsedFile.segments;
    const activeIndex = Math.min(activeSegmentIndex, segments.length - 1);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isPast = i <= activeIndex;

      // Draw active simulation trace or entire file
      // If we are simulating, we can highlight past segments differently
      let draw = false;
      if (seg.type === 'cut' && showCut) draw = true;
      if (seg.type === 'travel' && showTravel) draw = true;

      if (!draw) continue;

      const pStart = project(seg.start);
      const pEnd = project(seg.end);

      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);

      if (seg.type === 'cut') {
        // Cutting path style
        if (isPlaying || activeIndex > 0) {
          if (isPast) {
            ctx.strokeStyle = '#06b6d4'; // Bright cyan for cut-out paths
            ctx.lineWidth = 2.2;
          } else {
            ctx.strokeStyle = canvasBg === 'dark' ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.25)'; // Indigo translucent for upcoming paths
            ctx.lineWidth = 1.2;
          }
        } else {
          // Standard view (not active playing/simulating)
          ctx.strokeStyle = '#6366f1'; // Beautiful indigo
          ctx.lineWidth = 1.8;
        }
      } else {
        // Travel path style (dashed)
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = isPast && (isPlaying || activeIndex > 0)
          ? 'rgba(239, 68, 68, 0.4)' // Red translucent for past travel
          : canvasBg === 'dark' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(225, 29, 72, 0.2)'; // Faint rose
        ctx.setLineDash([3, 3]);
      }

      ctx.stroke();
      ctx.setLineDash([]); // always reset
    }

    // 5. DRAW ACTIVE TOOL HEAD
    if (showTool && segments.length > 0) {
      const activeSeg = segments[activeIndex] || segments[0];
      const toolPos = activeSeg.end; // Tool is currently at the end of the active segment
      const projTool = project(toolPos);

      // Draw intersection guidelines to the bottom grid (Z=0)
      const projBase = project({ x: toolPos.x, y: toolPos.y, z: 0 });
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // faint red vertical line
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(projTool.x, projTool.y);
      ctx.lineTo(projBase.x, projBase.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw red highlight dot on Z=0 projection
      ctx.beginPath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.arc(projBase.x, projBase.y, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Draw CNC cutter representation (small gold/orange cone)
      ctx.beginPath();
      ctx.fillStyle = '#f59e0b'; // Amber tool color
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      
      // Draw cylinder/cone representing milling bit
      ctx.moveTo(projTool.x, projTool.y);
      ctx.lineTo(projTool.x - 4, projTool.y - 15);
      ctx.lineTo(projTool.x + 4, projTool.y - 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tool tip dot
      ctx.beginPath();
      ctx.fillStyle = '#ef4444'; // Red glowing tip
      ctx.arc(projTool.x, projTool.y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Text tooltip with current coordinates
      ctx.fillStyle = canvasBg === 'dark' ? '#f8fafc' : '#0f172a';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `X:${toolPos.x.toFixed(2)} Y:${toolPos.y.toFixed(2)} Z:${toolPos.z.toFixed(2)}`,
        projTool.x + 8,
        projTool.y - 5
      );
    }

    // 6. FLOATING HUD INFO (Removed for a clean 2D layout)

  }, [yaw, pitch, zoom, panX, panY, parsedFile, activeSegmentIndex, showTravel, showCut, showGrid, showBox, showTool, canvasBg, isPlaying]);

  // Handle Mouse Events for Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    dragModeRef.current = 'pan';
    if (e.button === 2) {
      e.preventDefault(); // prevent context menu on right click
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    // Pure 2D Panning
    setPanX((prev) => prev + deltaX * 0.85);
    setPanY((prev) => prev + deltaY * 0.85);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    setZoom((prev) => {
      const next = e.deltaY < 0 ? prev * zoomFactor : prev / zoomFactor;
      return Math.max(0.1, Math.min(150, next));
    });
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!parsedFile) return;
    setIsPlaying(false);
    const value = parseInt(e.target.value, 10);
    setActiveSegmentIndex(value);
  };

  const totalLines = parsedFile ? parsedFile.segments.length : 0;
  const currentSeg = parsedFile?.segments[activeSegmentIndex] || null;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl" id="canvas-workspace">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-200">Podgląd Wizualizacji 2D</h2>
          {parsedFile && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-900">
              {parsedFile.filename}
            </span>
          )}
        </div>

        {/* View presets */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => resetView()}
            disabled={!parsedFile}
            className="px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            title="Dopasuj do ekranu"
          >
            <Maximize className="w-3.5 h-3.5" />
            Wyśrodkuj widok (Dopasuj)
          </button>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center gap-2">
          {/* Background color toggle */}
          <button
            onClick={() => setCanvasBg(prev => prev === 'dark' ? 'light' : 'dark')}
            className="text-xs px-2.5 py-1 rounded-md border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-all"
          >
            Tło: {canvasBg === 'dark' ? 'Ciemne' : 'Jasne'}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setShowCut(!showCut)}
              className={`p-1.5 rounded transition-all ${
                showCut ? 'bg-indigo-950 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pokaż ścieżki cięcia (G1/G2/G3)"
            >
              <Check className={`w-3.5 h-3.5 ${showCut ? 'opacity-100' : 'opacity-30'}`} />
              <span className="text-[10px] ml-1">Cięcie</span>
            </button>
            <button
              onClick={() => setShowTravel(!showTravel)}
              className={`p-1.5 rounded transition-all ${
                showTravel ? 'bg-rose-950 text-rose-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pokaż przejazdy jałowe (G0)"
            >
              <Check className={`w-3.5 h-3.5 ${showTravel ? 'opacity-100' : 'opacity-30'}`} />
              <span className="text-[10px] ml-1">Przejazdy</span>
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded transition-all ${
                showGrid ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Pokaż siatkę podłoża"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowTool(!showTool)}
              className={`p-1.5 rounded transition-all ${
                showTool ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Pokaż końcówkę frezu"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas viewport wrapper */}
      <div
        ref={containerRef}
        className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={() => resetView()}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Current coordinate readout HUD */}
        {currentSeg && (
          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 pointer-events-none space-y-1 select-none">
            <div className="text-xs text-indigo-400 font-bold border-b border-slate-800 pb-1 mb-1 font-sans">
              Pozycja narzędzia
            </div>
            <div>X: <span className="text-white font-bold">{currentSeg.end.x.toFixed(3)}</span> mm</div>
            <div>Y: <span className="text-white font-bold">{currentSeg.end.y.toFixed(3)}</span> mm</div>
            <div>Z: <span className="text-white font-bold">{currentSeg.end.z.toFixed(3)}</span> mm</div>
            <div className="text-slate-400 text-[10px] border-t border-slate-800 pt-1 mt-1 font-sans">
              Posuw: <span className="text-indigo-300 font-mono font-bold">{currentSeg.feedrate.toFixed(0)}</span> mm/min ({currentSeg.command})
            </div>
          </div>
        )}
      </div>

      {/* Interactive Simulation Controls (at the bottom of canvas) */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center gap-3">
        {/* Play/Pause/Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeSegmentIndex >= totalLines - 1) {
                setActiveSegmentIndex(0);
              }
              setIsPlaying(!isPlaying);
            }}
            disabled={!parsedFile || totalLines === 0}
            className={`p-2.5 rounded-lg font-medium text-xs transition-all flex items-center justify-center ${
              isPlaying
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            } disabled:opacity-30 disabled:hover:bg-indigo-600 cursor-pointer`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setActiveSegmentIndex(0);
            }}
            disabled={!parsedFile || totalLines === 0}
            className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-all"
            title="Resetuj symulację"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 flex items-center gap-2 w-full">
          <span className="text-xs text-slate-400 font-mono w-12 text-right">
            {activeSegmentIndex}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalLines - 1)}
            value={activeSegmentIndex}
            onChange={handleSeekChange}
            disabled={!parsedFile || totalLines === 0}
            className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
          />
          <span className="text-xs text-slate-400 font-mono w-12 text-left">
            {totalLines}
          </span>
        </div>

        {/* Speed Adjustment */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
            Prędkość symulacji:
          </span>
          <select
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(parseInt(e.target.value, 10))}
            disabled={!parsedFile}
            className="bg-transparent text-xs text-indigo-400 font-bold focus:outline-none cursor-pointer"
          >
            <option value="1" className="bg-slate-900 text-white">1x (Wolno)</option>
            <option value="3" className="bg-slate-900 text-white">3x (Normalnie)</option>
            <option value="10" className="bg-slate-900 text-white">10x (Szybko)</option>
            <option value="30" className="bg-slate-900 text-white">30x (Błyskawicznie)</option>
            <option value="100" className="bg-slate-900 text-white">100x (Maksymalna)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
