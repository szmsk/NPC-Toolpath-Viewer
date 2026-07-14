/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedGCode, MachineSettings } from '../types';

/**
 * Generates a fully self-contained, standalone single HTML file
 * containing the current files, configurations, and the 3D toolpath engine.
 * It is built using pure modern Vanilla ES6 + Tailwind CDN for fast loading and 100% local compatibility.
 */
export function generateOfflineHtml(files: ParsedGCode[], settings: MachineSettings): string {
  // Serialize the current state to embed directly inside the HTML file
  const embeddedFilesJson = JSON.stringify(files);
  const embeddedSettingsJson = JSON.stringify(settings);

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NCP CNC Toolpath Viewer - Offline</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    /* Simple custom scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #0f172a;
    }
    ::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  </style>
</head>
<body class="lg:h-screen lg:max-h-screen lg:overflow-hidden min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-600 selection:text-white">

  <!-- 1. HEADER -->
  <header class="bg-slate-900 border-b border-slate-800 shrink-0 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-indigo-600 rounded-lg shadow-lg text-white">
        <!-- SVG CPU Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 20v3"/><path d="M15 20v3"/><path d="M20 9h3"/><path d="M20 15h3"/><path d="M1 9h3"/><path d="M1 15h3"/></svg>
      </div>
      <div>
        <h1 class="text-md font-bold tracking-tight text-white flex items-center gap-2">
          NCP CNC Toolpath Viewer
          <span class="text-[10px] bg-emerald-950 text-emerald-400 font-bold border border-emerald-900 px-2 py-0.5 rounded-full uppercase">
            Lokalny Offline
          </span>
        </h1>
        <p class="text-xs text-slate-400">Samodzielna aplikacja uruchomiona z Twojego dysku twardego.</p>
      </div>
    </div>
    
    <div class="text-[11px] bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400 font-mono">
      Stan: <span class="text-emerald-400 font-bold">● W pełni offline</span>
    </div>
  </header>

  <!-- 2. MAIN LAYOUT -->
  <div class="flex-1 flex flex-col lg:flex-row p-4 gap-4 min-h-0 overflow-hidden">
    
    <!-- Left column: Sidebar files catalog -->
    <aside class="w-full lg:w-80 xl:w-96 flex flex-col shrink-0 min-h-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <!-- Catalog Header -->
      <div class="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h8l6 6v12c0 .5-.2 1-.6 1.4-.4.4-.9.6-1.4.6H6c-.5 0-1-.2-1.4-.6-.4-.4-.6-.9-.6-1.4z"/><path d="M14 2v6h6"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/></svg>
            <h2 class="text-sm font-bold text-slate-200 font-sans">Katalog plików NCP</h2>
          </div>
          <span id="files-counter" class="text-xs bg-slate-800 text-slate-300 font-mono font-semibold px-2 py-0.5 rounded-full">
            0 plików
          </span>
        </div>
        
        <!-- Search bar -->
        <div class="relative">
          <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            id="search-input"
            type="text"
            placeholder="Szukaj pliku..."
            class="w-full text-xs pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- File List Container -->
      <div id="file-list" class="flex-1 overflow-y-auto max-h-[280px] lg:max-h-none p-3 space-y-2">
        <!-- List items populated dynamically -->
      </div>

      <!-- Directory and Files Selectors -->
      <div class="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
        <input id="file-uploader" type="file" multiple accept=".ncp,.nc,.gcode,.tap,.cnc,.txt" class="hidden" />
        <input id="folder-uploader" type="file" webkitdirectory directory multiple class="hidden" />
        
        <div class="grid grid-cols-2 gap-2">
          <button onclick="document.getElementById('file-uploader').click()" class="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-all cursor-pointer">
            <svg class="w-3.5 h-3.5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            Pliki
          </button>
          <button onclick="document.getElementById('folder-uploader').click()" class="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-all cursor-pointer">
            <svg class="w-3.5 h-3.5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
            Folder
          </button>
        </div>

        <button onclick="clearAllFiles()" class="w-full py-1.5 text-center text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-md transition-all border border-rose-900/20 cursor-pointer">
          Wyczyść listę plików
        </button>
      </div>
    </aside>

    <!-- Center/Right panels -->
    <main class="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
      <!-- 2D Canvas Workspace -->
      <div class="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <!-- Canvas controls header -->
        <div class="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 gap-3">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            <h2 class="text-sm font-semibold text-slate-200">Podgląd Wizualizacji 2D</h2>
            <span id="active-filename" class="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-900">
              brak pliku
            </span>
          </div>

          <!-- Fit view button -->
          <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button onclick="resetView()" class="px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded flex items-center gap-1.5 transition-all cursor-pointer" title="Centruj">
              <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
              Wyśrodkuj widok
            </button>
          </div>

          <!-- View options -->
          <div class="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
            <button onclick="toggleVisibility('cut')" id="btn-toggle-cut" class="p-1 px-2 rounded bg-indigo-950 text-indigo-400 text-[10px] flex items-center gap-1">
              <span class="dot">✔</span> Cięcie
            </button>
            <button onclick="toggleVisibility('travel')" id="btn-toggle-travel" class="p-1 px-2 rounded bg-rose-950 text-rose-400 text-[10px] flex items-center gap-1">
              <span class="dot">✔</span> Przejazdy
            </button>
            <button onclick="toggleVisibility('grid')" id="btn-toggle-grid" class="p-1 px-1.5 rounded bg-slate-800 text-slate-200 text-[10px]" title="Siatka">Siatka</button>
          </div>
        </div>

        <!-- Canvas Viewport -->
        <div class="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden" id="canvas-container">
          <canvas id="toolpath-canvas" class="w-full h-full block"></canvas>

          <!-- Current position readout HUD -->
          <div id="position-hud" class="absolute top-3 right-3 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 hidden">
            <!-- Filled in dynamically -->
          </div>
        </div>

        <!-- Simulation Timeline controls -->
        <div class="bg-slate-950 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center gap-3">
          <div class="flex items-center gap-2">
            <button id="btn-play" onclick="togglePlay()" class="p-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center cursor-pointer">
              Play
            </button>
            <button id="btn-reset" onclick="resetSimulation()" class="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer">
              Reset
            </button>
          </div>

          <!-- Slider -->
          <div class="flex-1 flex items-center gap-2 w-full text-xs text-slate-400 font-mono">
            <span id="slider-curr">0</span>
            <input id="timeline-slider" type="range" min="0" max="0" value="0" oninput="seekSimulation(this.value)" class="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
            <span id="slider-max">0</span>
          </div>

          <!-- Speed selector -->
          <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px]">
            <span class="text-slate-400 font-medium">Prędkość:</span>
            <select id="select-speed" onchange="setSimSpeed(this.value)" class="bg-transparent text-indigo-400 font-bold focus:outline-none cursor-pointer">
              <option value="1" class="bg-slate-900 text-white">1x</option>
              <option value="3" selected class="bg-slate-900 text-white">3x</option>
              <option value="10" class="bg-slate-900 text-white">10x</option>
              <option value="30" class="bg-slate-900 text-white">30x</option>
              <option value="100" class="bg-slate-900 text-white">100x</option>
            </select>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- 3. FOOTER -->
  <footer class="bg-slate-900 border-t border-slate-800 px-6 py-3 text-center shrink-0 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
    <p>NCP Viewer Offline • Plik zawiera ${files.length} wbudowane programy robocze.</p>
    <p class="font-mono text-slate-600">Standard: G-code ISO / Vectric / Megaplot / InfoTEC</p>
  </footer>

  <!-- 4. EMBEDDED ENGINE & CONTROLLER JAVASCRIPT -->
  <script>
    // Embedded Data States
    let files = ${embeddedFilesJson};
    let settings = ${embeddedSettingsJson};
    let activeFileIndex = files.length > 0 ? 0 : -1;
    let activeSegmentIndex = 0;
    let isPlaying = false;

    // Projection View state
    let yaw = 0;
    let pitch = 0;
    let zoom = 3.5;
    let panX = 0;
    let panY = 0;

    // Visibility settings
    let showCut = true;
    let showTravel = true;
    let showGrid = true;
    let showBox = false;
    let showTool = true;
    let simulationSpeed = 3; // steps per frame

    // Escape HTML strings helper to prevent formatting corruption from comments/Gcode lines
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Canvas references
    const canvas = document.getElementById('toolpath-canvas');
    let ctx = null;
    let animationFrameId = null;

    // Mouse drag states
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let dragMode = 'pan'; // Always default to pan for 2D layout

    // Initialize application on page load (resize canvas before fitting first file)
    window.onload = function() {
      ctx = canvas.getContext('2d');
      setupEventListeners();
      resizeCanvas();
      renderFileList();
      selectFile(0);
      animationLoop();
    };

    function resetView() {
      autoFitView();
    }

    function setupEventListeners() {
      // Window resize
      window.addEventListener('resize', resizeCanvas);

      // Search field
      document.getElementById('search-input').addEventListener('input', function(e) {
        renderFileList(e.target.value);
      });

      // Canvas mouse interactions
      canvas.addEventListener('mousedown', function(e) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        dragMode = 'pan';
        if(e.button === 2) e.preventDefault();
      });

      canvas.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        panX += deltaX * 0.85;
        panY += deltaY * 0.85;
      });

      window.addEventListener('mouseup', function() {
        isDragging = false;
      });

      canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
      });

      canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoom = Math.max(0.1, Math.min(150, zoom * factor));
      }, { passive: false });

      canvas.addEventListener('dblclick', function() {
        autoFitView();
      });

      // File upload listeners
      document.getElementById('file-uploader').addEventListener('change', function(e) {
        handleUpload(e.target.files);
      });

      document.getElementById('folder-uploader').addEventListener('change', function(e) {
        handleUpload(e.target.files);
      });
    }

    // G-code parser helper inside offline browser
    function parseGCodeLocal(filename, content, filesize) {
      const lines = content.split(/\\r?\\n/);
      const segments = [];
      let currentPos = { x: 0, y: 0, z: 0 };
      let absoluteMode = true;
      let inchMode = false;
      let modalMotion = 'G0';
      let activeFeedrate = settings.g1Speed;

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      function updateBBox(pt) {
        if (pt.x < minX) minX = pt.x; if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y; if (pt.y > maxY) maxY = pt.y;
        if (pt.z < minZ) minZ = pt.z; if (pt.z > maxZ) maxZ = pt.z;
      }

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        let line = rawLine.replace(/;.*$/, '').replace(/%.*$/, '').trim();
        line = line.replace(/\\([^)]*\\)/g, '').trim();

        if (!line) continue;

        if (/G90/i.test(line)) absoluteMode = true;
        if (/G91/i.test(line)) absoluteMode = false;
        if (/G20/i.test(line)) inchMode = true;
        if (/G21/i.test(line)) inchMode = false;

        const uMult = inchMode ? 25.4 : 1.0;

        const gMatch = line.match(/G(00|01|02|03|0|1|2|3)/i);
        let motionCmd = modalMotion;
        if (gMatch) {
          motionCmd = 'G' + parseInt(gMatch[1], 10);
          modalMotion = motionCmd;
        }

        const fMatch = line.match(/F(\\d+(\\.\\d+)?)/i);
        if (fMatch) {
          activeFeedrate = parseFloat(fMatch[1]) * uMult;
        }

        const xMatch = line.match(/X(-?\\d+(\\.\\d+)?)/i);
        const yMatch = line.match(/Y(-?\\d+(\\.\\d+)?)/i);
        const zMatch = line.match(/Z(-?\\d+(\\.\\d+)?)/i);
        const iMatch = line.match(/I(-?\\d+(\\.\\d+)?)/i);
        const jMatch = line.match(/J(-?\\d+(\\.\\d+)?)/i);
        const rMatch = line.match(/R(-?\\d+(\\.\\d+)?)/i);

        if (!xMatch && !yMatch && !zMatch && !gMatch) continue;

        const startPt = { ...currentPos };
        const targetPt = { ...currentPos };

        if (absoluteMode) {
          if (xMatch) targetPt.x = parseFloat(xMatch[1]) * uMult;
          if (yMatch) targetPt.y = parseFloat(yMatch[1]) * uMult;
          if (zMatch) targetPt.z = parseFloat(zMatch[1]) * uMult;
        } else {
          if (xMatch) targetPt.x += parseFloat(xMatch[1]) * uMult;
          if (yMatch) targetPt.y += parseFloat(yMatch[1]) * uMult;
          if (zMatch) targetPt.z += parseFloat(zMatch[1]) * uMult;
        }

        const segmentType = motionCmd === 'G0' ? 'travel' : 'cut';

        if ((motionCmd === 'G2' || motionCmd === 'G3') && (xMatch || yMatch)) {
          const isCW = motionCmd === 'G2';
          let centerX = startPt.x;
          let centerY = startPt.y;
          let radius = 0;

          if (iMatch || jMatch) {
            const iVal = iMatch ? parseFloat(iMatch[1]) * uMult : 0;
            const jVal = jMatch ? parseFloat(jMatch[1]) * uMult : 0;
            centerX = startPt.x + iVal;
            centerY = startPt.y + jVal;
            radius = Math.sqrt(iVal * iVal + jVal * jVal);
          } else if (rMatch) {
            const rVal = parseFloat(rMatch[1]) * uMult;
            radius = Math.abs(rVal);
            const dx = targetPt.x - startPt.x;
            const dy = targetPt.y - startPt.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0 && d <= 2 * radius) {
              const h = Math.sqrt(radius * radius - (d * d) / 4);
              const mx = (startPt.x + targetPt.x) / 2;
              const my = (startPt.y + targetPt.y) / 2;
              const rx = -dy / d;
              const ry = dx / d;
              const factor = (isCW ? 1 : -1) * (rVal < 0 ? -1 : 1);
              centerX = mx + factor * h * rx;
              centerY = my + factor * h * ry;
            }
          }

          if (radius > 0.001) {
            const startAngle = Math.atan2(startPt.y - centerY, startPt.x - centerX);
            let endAngle = Math.atan2(targetPt.y - centerY, targetPt.x - centerX);
            let sweep = endAngle - startAngle;
            if (isCW) { if (sweep >= 0) sweep -= 2 * Math.PI; }
            else { if (sweep <= 0) sweep += 2 * Math.PI; }

            const arcLength = Math.abs(sweep) * radius;
            const steps = Math.min(64, Math.max(8, Math.ceil(arcLength / 1.0)));
            let prevPt = { ...startPt };
            for (let s = 1; s <= steps; s++) {
              const frac = s / steps;
              const angle = startAngle + sweep * frac;
              const zInterp = startPt.z + (targetPt.z - startPt.z) * frac;
              const currArcPt = {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
                z: zInterp
              };
              segments.push({
                type: 'cut',
                start: prevPt,
                end: currArcPt,
                feedrate: activeFeedrate,
                lineIndex: i,
                command: motionCmd
              });
              updateBBox(currArcPt);
              prevPt = currArcPt;
            }
          } else {
            segments.push({ type: segmentType, start: startPt, end: targetPt, feedrate: activeFeedrate, lineIndex: i, command: motionCmd });
            updateBBox(targetPt);
          }
        } else {
          const dist = Math.sqrt(Math.pow(targetPt.x - startPt.x, 2) + Math.pow(targetPt.y - startPt.y, 2) + Math.pow(targetPt.z - startPt.z, 2));
          if (dist > 0.0001) {
            segments.push({ type: segmentType, start: startPt, end: targetPt, feedrate: activeFeedrate, lineIndex: i, command: motionCmd });
            updateBBox(targetPt);
          }
        }
        currentPos = targetPt;
      }

      if (minX === Infinity) { minX = minY = minZ = 0; maxX = maxY = maxZ = 10; }
      const boxSize = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
      
      let totalCutLength = 0;
      let totalTravelLength = 0;
      let estimatedTimeSec = 0;

      for (const seg of segments) {
        const dist = Math.sqrt(Math.pow(seg.end.x - seg.start.x, 2) + Math.pow(seg.end.y - seg.start.y, 2) + Math.pow(seg.end.z - seg.start.z, 2));
        if (seg.type === 'cut') {
          totalCutLength += dist;
          estimatedTimeSec += dist / ((seg.feedrate || settings.g1Speed) / 60);
        } else {
          totalTravelLength += dist;
          estimatedTimeSec += dist / (settings.g0Speed / 60);
        }
      }

      return {
        id: Math.random().toString(36).substring(2, 9),
        filename,
        filesize,
        rawLines: lines,
        segments,
        boundingBox: {
          min: { x: minX, y: minY, z: minZ },
          max: { x: maxX, y: maxY, z: maxZ },
          center: { x: minX + boxSize.x/2, y: minY + boxSize.y/2, z: minZ + boxSize.z/2 },
          size: boxSize
        },
        totalCutLength,
        totalTravelLength,
        estimatedTimeSec
      };
    }

    function handleUpload(fileList) {
      if(!fileList || fileList.length === 0) return;
      const fileReaders = [];

      for(let i=0; i<fileList.length; i++) {
        const file = fileList[i];
        const p = new Promise((resolve) => {
          const r = new FileReader();
          r.onload = function(e) {
            const parsed = parseGCodeLocal(file.name, e.target.result, file.size);
            resolve(parsed);
          };
          r.readAsText(file);
        });
        fileReaders.push(p);
      }

      Promise.all(fileReaders).then(newFiles => {
        const existingNames = new Set(files.map(f => f.filename));
        const filtered = newFiles.filter(f => !existingNames.has(f.filename));
        if (filtered.length > 0) {
          files = [...files, ...filtered];
          renderFileList();
          selectFile(files.length - filtered.length); // select first new file
        }
      });
    }

    // Render mini thumbnail of G-code on a 44x44 canvas
    function renderMiniThumbnail(canvasId, file) {
      const thumbCanvas = document.getElementById(canvasId);
      if (!thumbCanvas) return;
      const tCtx = thumbCanvas.getContext('2d');
      if (!tCtx) return;

      const w = 44;
      const h = 44;

      // Clear
      tCtx.fillStyle = '#020617'; // slate-950
      tCtx.fillRect(0, 0, w, h);

      if (!file || !file.segments || file.segments.length === 0) {
        // Draw cross if file is empty
        tCtx.strokeStyle = '#334155'; // slate-700
        tCtx.lineWidth = 1;
        tCtx.beginPath();
        tCtx.moveTo(4, 4); tCtx.lineTo(w - 4, h - 4);
        tCtx.moveTo(w - 4, 4); tCtx.lineTo(4, h - 4);
        tCtx.stroke();
        return;
      }

      const bbox = file.boundingBox;
      if (!bbox) return;

      const scaleX = bbox.size.x > 0 ? (w - 8) / bbox.size.x : 1;
      const scaleY = bbox.size.y > 0 ? (h - 8) / bbox.size.y : 1;
      const scale = Math.min(scaleX, scaleY);

      tCtx.strokeStyle = '#6366f1'; // indigo-500
      tCtx.lineWidth = 1;
      tCtx.beginPath();

      let isFirst = true;
      const cuts = file.segments.filter(s => s.type === 'cut').slice(0, 150);
      const segmentsToDraw = cuts.length > 0 ? cuts : file.segments.slice(0, 100);

      segmentsToDraw.forEach(seg => {
        const x1 = 4 + (seg.start.x - bbox.min.x) * scale;
        const y1 = h - 4 - (seg.start.y - bbox.min.y) * scale;
        const x2 = 4 + (seg.end.x - bbox.min.x) * scale;
        const y2 = h - 4 - (seg.end.y - bbox.min.y) * scale;

        if (isFirst) {
          tCtx.moveTo(x1, y1);
          isFirst = false;
        }
        tCtx.lineTo(x2, y2);
      });
      tCtx.stroke();
    }

    // Render list of loaded NCP files
    function renderFileList(searchFilter = "") {
      const listContainer = document.getElementById('file-list');
      listContainer.innerHTML = "";
      
      const filtered = files.filter(f => f.filename.toLowerCase().includes(searchFilter.toLowerCase()));
      document.getElementById('files-counter').innerText = files.length + " pliki";

      if (filtered.length === 0) {
        listContainer.innerHTML = \`<div class="text-xs text-slate-500 text-center py-8">Brak pasujących plików</div>\`;
        return;
      }

      filtered.forEach((file, index) => {
        const isSelected = files[activeFileIndex]?.id === file.id;
        const realIdx = files.findIndex(f => f.id === file.id);

        const card = document.createElement('div');
        card.className = \`group flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all \${
          isSelected ? 'bg-indigo-600/10 border-indigo-500/80 shadow-md' : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40'
        }\`;
        
        card.onclick = () => selectFile(realIdx);

        // Thumbnail generator canvas with escapeHtml protection for filenames
        const sizeBytes = (file.filesize / 1024).toFixed(1) + " KB";
        const escapedFilename = escapeHtml(file.filename);

        card.innerHTML = \`
          <div class="w-11 h-11 shrink-0 rounded border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden relative">
            <canvas id="thumb-\${file.id}" width="44" height="44" class="w-full h-full block"></canvas>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-200 truncate pr-2" title="\${escapedFilename}">\${escapedFilename}</span>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>\${sizeBytes}</span>
              <span>\${file.segments.length} komend</span>
            </div>
          </div>
          <button onclick="event.stopPropagation(); deleteFile('\${file.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer">
            <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        \`;
        listContainer.appendChild(card);
        
        // Draw the miniature preview
        renderMiniThumbnail("thumb-" + file.id, file);
      });
    }

    function selectFile(index) {
      if (index < 0 || index >= files.length) return;
      activeFileIndex = index;
      activeSegmentIndex = 0;
      isPlaying = false;
      document.getElementById('btn-play').innerText = "Play";

      const file = files[activeFileIndex];
      document.getElementById('active-filename').innerText = file.filename;

      // Update seek slider limits
      const totalSegs = file.segments.length;
      const slider = document.getElementById('timeline-slider');
      slider.max = Math.max(0, totalSegs - 1);
      slider.value = 0;
      document.getElementById('slider-curr').innerText = "0";
      document.getElementById('slider-max').innerText = totalSegs;

      renderFileList();
      autoFitView();
      renderGCodeViewer();
      renderStats();
    }

    function deleteFile(id) {
      const idx = files.findIndex(f => f.id === id);
      if(idx === -1) return;
      files.splice(idx, 1);
      
      if(activeFileIndex >= files.length) {
        activeFileIndex = files.length - 1;
      }
      if(files.length > 0) {
        selectFile(Math.max(0, activeFileIndex));
      } else {
        activeFileIndex = -1;
        const activeFnEl = document.getElementById('active-filename');
        if (activeFnEl) activeFnEl.innerText = "brak pliku";
        const fileListEl = document.getElementById('file-list');
        if (fileListEl) fileListEl.innerHTML = "";
        const gcodeLinesEl = document.getElementById('gcode-lines-container');
        if (gcodeLinesEl) gcodeLinesEl.innerHTML = "";
        const statsAreaEl = document.getElementById('stats-area');
        if (statsAreaEl) statsAreaEl.innerHTML = "";
      }
      renderFileList();
    }

    function clearAllFiles() {
      if(confirm('Wyczyścić wszystkie pliki?')) {
        files = [];
        activeFileIndex = -1;
        activeSegmentIndex = 0;
        isPlaying = false;
        const activeFnEl = document.getElementById('active-filename');
        if (activeFnEl) activeFnEl.innerText = "brak pliku";
        renderFileList();
        renderGCodeViewer();
        renderStats();
      }
    }

    function resizeCanvas() {
      if(!canvas) return;
      const rect = canvas.parentNode.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if (ctx) ctx.scale(dpr, dpr);
    }

    function autoFitView(targetYaw = 0, targetPitch = 0) {
      const file = files[activeFileIndex];
      if (!file || !canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 400;
      const height = rect.height || 300;

      const bbox = file.boundingBox;
      const center = bbox.center;

      const cy = Math.cos(targetYaw);
      const sy = Math.sin(targetYaw);
      const cp = Math.cos(targetPitch);
      const sp = Math.sin(targetPitch);

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

      for (let i = 0; i < corners.length; i++) {
        const pt = corners[i];
        const rx1 = pt.x * cy - pt.y * sy;
        const ry1 = pt.x * sy + pt.y * cy;
        const rz1 = pt.z;

        const rx2 = rx1;
        const ry2 = ry1 * cp - rz1 * sp;

        const offsetX = rx2;
        const offsetY = -ry2;

        if (offsetX < minOffsetX) minOffsetX = offsetX;
        if (offsetX > maxOffsetX) maxOffsetX = offsetX;
        if (offsetY < minOffsetY) minOffsetY = offsetY;
        if (offsetY > maxOffsetY) maxOffsetY = offsetY;
      }

      const projWidth = Math.max(maxOffsetX - minOffsetX, 1);
      const projHeight = Math.max(maxOffsetY - minOffsetY, 1);

      const allowedWidth = width * 0.75;
      const allowedHeight = height * 0.75;

      const zoomX = allowedWidth / projWidth;
      const zoomY = allowedHeight / projHeight;

      zoom = Math.max(Math.min(zoomX, zoomY), 0.1);
      yaw = targetYaw;
      pitch = targetPitch;
      panX = 0;
      panY = 0;
    }

    function setOrientation(type) {
      if (type === 'xy') { autoFitView(0, 0); }
      else if (type === 'xz') { autoFitView(0, Math.PI / 2); }
      else if (type === 'yz') { autoFitView(Math.PI / 2, Math.PI / 2); }
      else { autoFitView(-Math.PI / 6, Math.PI / 6); }
    }

    function toggleVisibility(type) {
      if(type === 'cut') {
        showCut = !showCut;
        document.getElementById('btn-toggle-cut').classList.toggle('opacity-40');
      } else if(type === 'travel') {
        showTravel = !showTravel;
        document.getElementById('btn-toggle-travel').classList.toggle('opacity-40');
      } else if(type === 'grid') {
        showGrid = !showGrid;
        document.getElementById('btn-toggle-grid').classList.toggle('opacity-40');
      } else if(type === 'box') {
        showBox = !showBox;
        document.getElementById('btn-toggle-box').classList.toggle('opacity-40');
      }
    }

    // Main animation and canvas paint loop
    function animationLoop() {
      renderCanvas();
      if(isPlaying && files[activeFileIndex]) {
        const file = files[activeFileIndex];
        activeSegmentIndex = Math.min(file.segments.length - 1, activeSegmentIndex + simulationSpeed);
        document.getElementById('timeline-slider').value = activeSegmentIndex;
        document.getElementById('slider-curr').innerText = activeSegmentIndex;
        
        // Auto scroll active G-code row
        const activeSeg = file.segments[activeSegmentIndex];
        if (activeSeg) {
          highlightGCodeLine(activeSeg.lineIndex);
        }

        if(activeSegmentIndex >= file.segments.length - 1) {
          isPlaying = false;
          document.getElementById('btn-play').innerText = "Play";
        }
      }
      requestAnimationFrame(animationLoop);
    }

    function renderCanvas() {
      if (!canvas || !ctx) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear dark bg
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);

      const file = files[activeFileIndex];
      if (!file) {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Wczytaj pliki NCP aby rozpocząć podgląd', width / 2, height / 2);
        return;
      }

      const bbox = file.boundingBox;
      const center = bbox.center;

      // Projection translation helper
      const project = (pt) => {
        const dx = pt.x - center.x;
        const dy = pt.y - center.y;
        const dz = pt.z - center.z;

        // Yaw Z-rotation
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const rx1 = dx * cosY - dy * sinY;
        const ry1 = dx * sinY + dy * cosY;

        // Pitch X-rotation
        const cosP = Math.cos(pitch);
        const sinP = Math.sin(pitch);
        const ry2 = ry1 * cosP - dz * sinP;
        const rz2 = ry1 * sinP + dz * cosP;

        return {
          x: width / 2 + rx1 * zoom + panX,
          y: height / 2 - ry2 * zoom + panY
        };
      };

      // 1. Draw grid (Z=0)
      if (showGrid) {
        ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
        ctx.lineWidth = 1;
        const spacing = 10;
        const size = Math.max(Math.ceil(bbox.size.x / 10), Math.ceil(bbox.size.y / 10), 5) * 10 + 20;
        const gridCenterX = Math.round(center.x / 10) * 10;
        const gridCenterY = Math.round(center.y / 10) * 10;

        for (let x = gridCenterX - size; x <= gridCenterX + size; x += spacing) {
          ctx.beginPath();
          let first = true;
          for (let y = gridCenterY - size; y <= gridCenterY + size; y += spacing / 2) {
            const sPt = project({ x, y, z: 0 });
            if (first) { ctx.moveTo(sPt.x, sPt.y); first = false; }
            else { ctx.lineTo(sPt.x, sPt.y); }
          }
          ctx.stroke();
        }

        for (let y = gridCenterY - size; y <= gridCenterY + size; y += spacing) {
          ctx.beginPath();
          let first = true;
          for (let x = gridCenterX - size; x <= gridCenterX + size; x += spacing / 2) {
            const sPt = project({ x, y, z: 0 });
            if (first) { ctx.moveTo(sPt.x, sPt.y); first = false; }
            else { ctx.lineTo(sPt.x, sPt.y); }
          }
          ctx.stroke();
        }
      }

      // 2. Draw BBox limits
      if (showBox) {
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        const min = bbox.min;
        const max = bbox.max;
        const corners = [
          { x: min.x, y: min.y, z: min.z }, { x: max.x, y: min.y, z: min.z },
          { x: max.x, y: max.y, z: min.z }, { x: min.x, y: max.y, z: min.z },
          { x: min.x, y: min.y, z: max.z }, { x: max.x, y: min.y, z: max.z },
          { x: max.x, y: max.y, z: max.z }, { x: min.x, y: max.y, z: max.z }
        ];

        const proj = corners.map(c => project(c));
        
        ctx.beginPath();
        ctx.moveTo(proj[0].x, proj[0].y);
        ctx.lineTo(proj[1].x, proj[1].y);
        ctx.lineTo(proj[2].x, proj[2].y);
        ctx.lineTo(proj[3].x, proj[3].y);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(proj[4].x, proj[4].y);
        ctx.lineTo(proj[5].x, proj[5].y);
        ctx.lineTo(proj[6].x, proj[6].y);
        ctx.lineTo(proj[7].x, proj[7].y);
        ctx.closePath();
        ctx.stroke();

        for(let k=0; k<4; k++) {
          ctx.beginPath();
          ctx.moveTo(proj[k].x, proj[k].y);
          ctx.lineTo(proj[k+4].x, proj[k+4].y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // 3. Draw toolpaths
      const segments = file.segments;
      const idx = Math.min(activeSegmentIndex, segments.length - 1);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const isPast = i <= idx;
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
          if (isPast) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.2;
          } else {
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
            ctx.lineWidth = 1.2;
          }
        } else {
          ctx.lineWidth = 1;
          ctx.strokeStyle = isPast ? 'rgba(239, 68, 68, 0.4)' : 'rgba(244, 63, 94, 0.25)';
          ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw active milling tool
      if (showTool && segments.length > 0) {
        const activeSeg = segments[idx] || segments[0];
        const toolPos = activeSeg.end;
        const pTool = project(toolPos);

        // cone tool tip
        ctx.beginPath();
        ctx.fillStyle = '#f59e0b';
        ctx.moveTo(pTool.x, pTool.y);
        ctx.lineTo(pTool.x - 4, pTool.y - 15);
        ctx.lineTo(pTool.x + 4, pTool.y - 15);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        ctx.arc(pTool.x, pTool.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Update Position Readout HUD
        const hud = document.getElementById('position-hud');
        hud.classList.remove('hidden');
        hud.innerHTML = \`
          <div class="text-xs text-indigo-400 font-bold border-b border-slate-800 pb-1 mb-1 font-sans">Pozycja osi</div>
          <div>X: <span class="text-white font-bold">\${toolPos.x.toFixed(3)}</span> mm</div>
          <div>Y: <span class="text-white font-bold">\${toolPos.y.toFixed(3)}</span> mm</div>
          <div>Z: <span class="text-white font-bold">\${toolPos.z.toFixed(3)}</span> mm</div>
          <div class="text-slate-400 text-[10px] border-t border-slate-800 pt-1 mt-1 font-sans">Posuw: \${activeSeg.feedrate} mm/min (\${activeSeg.command})</div>
        \`;
      }
    }

    function togglePlay() {
      isPlaying = !isPlaying;
      document.getElementById('btn-play').innerText = isPlaying ? "Pause" : "Play";
    }

    function resetSimulation() {
      isPlaying = false;
      activeSegmentIndex = 0;
      document.getElementById('btn-play').innerText = "Play";
      document.getElementById('timeline-slider').value = 0;
      document.getElementById('slider-curr').innerText = 0;
      highlightGCodeLine(0);
    }

    function seekSimulation(val) {
      isPlaying = false;
      document.getElementById('btn-play').innerText = "Play";
      activeSegmentIndex = parseInt(val, 10);
      document.getElementById('slider-curr').innerText = activeSegmentIndex;

      const file = files[activeFileIndex];
      if(file) {
        const seg = file.segments[activeSegmentIndex];
        if(seg) highlightGCodeLine(seg.lineIndex);
      }
    }

    function setSimSpeed(speed) {
      simulationSpeed = parseInt(speed, 10);
    }

    // Populate G-code box
    function renderGCodeViewer() {
      const container = document.getElementById('gcode-lines-container');
      if (!container) return;
      container.innerHTML = "";
      
      const file = files[activeFileIndex];
      const countEl = document.getElementById('gcode-lines-count');
      if(!file) {
        if (countEl) countEl.innerText = "0 linii";
        container.innerHTML = \`<div class="text-center text-xs text-slate-600 py-12">Brak pliku</div>\`;
        return;
      }

      if (countEl) countEl.innerText = file.rawLines.length + " linii";

      file.rawLines.forEach((line, idx) => {
        const div = document.createElement('div');
        div.id = "gcode-line-" + idx;
        div.className = "flex items-start rounded px-1.5 hover:bg-slate-900/50 hover:text-slate-200 transition-colors cursor-pointer";
        div.innerHTML = \`
          <span class="w-10 text-right select-none pr-3 text-slate-600 text-[10px]">\${idx+1}</span>
          <span class="flex-1 break-all whitespace-pre-wrap">\${line.trim() === "" ? " " : escapeHtml(line)}</span>
        \`;
        container.appendChild(div);
      });
    }

    function highlightGCodeLine(lineIndex) {
      const activeClass = ["bg-indigo-600/30", "text-white", "font-bold", "border-l-2", "border-indigo-500", "gcode-active-line"];
      
      // Clean previously highlighted
      const highlighted = document.querySelector(".gcode-active-line");
      if(highlighted) {
        highlighted.classList.remove(...activeClass);
      }

      const row = document.getElementById("gcode-line-" + lineIndex);
      if(row) {
        row.classList.add(...activeClass);
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Calculate details and render cards
    function renderStats() {
      const area = document.getElementById('stats-area');
      if (!area) return;
      area.innerHTML = "";

      const file = files[activeFileIndex];
      if(!file) return;

      const bbox = file.boundingBox;
      const isPlungeBelowZero = bbox.min.z < 0;

      // Estimated time calculations
      let timeSec = 0;
      for(const seg of file.segments) {
        const dist = Math.sqrt(Math.pow(seg.end.x - seg.start.x, 2) + Math.pow(seg.end.y - seg.start.y, 2) + Math.pow(seg.end.z - seg.start.z, 2));
        if(seg.type === 'cut') {
          const feed = seg.end.z < seg.start.z ? settings.zSpeed : settings.g1Speed;
          timeSec += dist / (feed / 60);
        } else {
          timeSec += dist / (settings.g0Speed / 60);
        }
      }

      const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return (h > 0 ? h + " godz. " : "") + (m > 0 || h > 0 ? m + " min. " : "") + s + " sek.";
      };

      area.innerHTML = \`
        <!-- 1. Dimensions -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
              <svg class="w-4 h-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <h3 class="text-xs font-semibold text-slate-200">Wymiary i Zakresy (XYZ)</h3>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between items-center bg-slate-950 p-2 rounded">
                <span class="text-slate-400">Szerokość (X):</span>
                <span class="font-mono text-white font-bold">\${bbox.size.x.toFixed(2)} mm</span>
              </div>
              <div class="flex justify-between items-center bg-slate-950 p-2 rounded">
                <span class="text-slate-400">Długość (Y):</span>
                <span class="font-mono text-white font-bold">\${bbox.size.y.toFixed(2)} mm</span>
              </div>
              <div class="flex justify-between items-center bg-slate-950 p-2 rounded">
                <span class="text-slate-400">Głębokość (Z):</span>
                <span class="font-mono text-white font-bold">\${bbox.size.z.toFixed(2)} mm</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Times -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
              <svg class="w-4 h-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <h3 class="text-xs font-semibold text-slate-200">Długość i Czas Pracy</h3>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between items-center bg-slate-950 p-2 rounded">
                <span class="text-slate-400">Długość cięcia G1:</span>
                <span class="font-mono text-indigo-300 font-semibold">\${(file.totalCutLength/1000).toFixed(2)} m</span>
              </div>
              <div class="flex justify-between items-center bg-slate-950 p-2 rounded">
                <span class="text-slate-400">Przejazdy G0:</span>
                <span class="font-mono text-rose-300 font-semibold">\${(file.totalTravelLength/1000).toFixed(2)} m</span>
              </div>
              <div class="flex justify-between items-center bg-slate-950 p-2 rounded">
                <span class="text-slate-300">Szacowany czas:</span>
                <span class="font-mono text-emerald-400 font-bold">\${formatDuration(timeSec)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Speed sliders -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
              <svg class="w-4 h-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
              <h3 class="text-xs font-semibold text-slate-200">Prędkości Maszyny (mm/min)</h3>
            </div>
            
            <div class="space-y-2.5 text-[11px]">
              <div>
                <div class="flex justify-between text-slate-400">
                  <span>Cięcie (G1): \${settings.g1Speed}</span>
                </div>
                <input type="range" min="200" max="8000" step="100" value="\${settings.g1Speed}" oninput="updateSpeedSetting('g1Speed', this.value)" class="w-full h-1 accent-indigo-500 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div>
                <div class="flex justify-between text-slate-400">
                  <span>Szybki (G0): \${settings.g0Speed}</span>
                </div>
                <input type="range" min="500" max="15000" step="250" value="\${settings.g0Speed}" oninput="updateSpeedSetting('g0Speed', this.value)" class="w-full h-1 accent-rose-500 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      \`;
    }

    function updateSpeedSetting(key, value) {
      settings[key] = parseInt(value, 10);
      renderStats();
    }
  </script>
</body>
</html>`;
}
