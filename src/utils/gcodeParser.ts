/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point3D, ToolpathSegment, BoundingBox, ParsedGCode, MachineSettings } from '../types';

// Helper to generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Parses G-code / NCP string and generates a ParsedGCode structure
 */
export function parseGCode(
  filename: string,
  content: string,
  filesize: number,
  settings: MachineSettings
): ParsedGCode {
  const lines = content.split(/\r?\n/);
  const segments: ToolpathSegment[] = [];

  // State tracker
  let currentPos: Point3D = { x: 0, y: 0, z: 0 };
  let absoluteMode = true; // G90 is default
  let inchMode = false;     // G21 is default (mm)
  let modalMotion = 'G0';   // G0 is default starter, though usually explicit
  let activeFeedrate = settings.g1Speed;

  // Track bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  function updateBoundingBox(pt: Point3D) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
    if (pt.z < minZ) minZ = pt.z;
    if (pt.z > maxZ) maxZ = pt.z;
  }

  // Include origin in the bounding box to anchor it,
  // or only include actual toolpath points?
  // Let's only include actual toolpath coordinates to avoid stretching if paths are far away,
  // but if there are no segments, we default to (0,0,0).
  
  // To avoid issues when there is G28 (go to home) or extreme coordinates,
  // we only expand bounding box for actual segments.

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Remove comments (lines starting with ; or %, or stuff in parentheses)
    let line = rawLine.replace(/;.*$/, '').replace(/%.*$/, '').trim();
    line = line.replace(/\([^)]*\)/g, '').trim();

    if (!line) continue;

    // Check G90 / G91 (Absolute / Incremental)
    if (/G90/i.test(line)) absoluteMode = true;
    if (/G91/i.test(line)) absoluteMode = false;

    // Check G20 / G21 (Inches / Millimeters)
    if (/G20/i.test(line)) inchMode = true;
    if (/G21/i.test(line)) inchMode = false;

    // Unit multiplier
    const uMult = inchMode ? 25.4 : 1.0;

    // Parse G command
    const gMatch = line.match(/G(00|01|02|03|0|1|2|3)/i);
    let motionCmd = modalMotion;
    if (gMatch) {
      const gVal = parseInt(gMatch[1], 10);
      motionCmd = `G${gVal}`;
      modalMotion = motionCmd; // update modal motion state
    }

    // Parse Feedrate
    const fMatch = line.match(/F(\d+(\.\d+)?)/i);
    if (fMatch) {
      activeFeedrate = parseFloat(fMatch[1]) * uMult;
    }

    // Parse coordinates (X, Y, Z, I, J, R)
    const xMatch = line.match(/X(-?\d+(\.\d+)?)/i);
    const yMatch = line.match(/Y(-?\d+(\.\d+)?)/i);
    const zMatch = line.match(/Z(-?\d+(\.\d+)?)/i);
    const iMatch = line.match(/I(-?\d+(\.\d+)?)/i);
    const jMatch = line.match(/J(-?\d+(\.\d+)?)/i);
    const rMatch = line.match(/R(-?\d+(\.\d+)?)/i);

    // If none of the coordinates are specified, and no new motion code is supplied, skip to next line
    if (!xMatch && !yMatch && !zMatch && !gMatch) {
      continue;
    }

    // Target position calculation
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

    // Determine type: G0 is travel, others are cuts
    const segmentType = motionCmd === 'G0' ? 'travel' : 'cut';

    // Handle G2 / G3 (Circular Interpolation)
    if ((motionCmd === 'G2' || motionCmd === 'G3') && (xMatch || yMatch)) {
      const isCW = motionCmd === 'G2';
      let centerX = startPt.x;
      let centerY = startPt.y;
      let radius = 0;

      if (iMatch || jMatch) {
        // Center relative to start point (modal standard)
        const iVal = iMatch ? parseFloat(iMatch[1]) * uMult : 0;
        const jVal = jMatch ? parseFloat(jMatch[1]) * uMult : 0;
        centerX = startPt.x + iVal;
        centerY = startPt.y + jVal;
        radius = Math.sqrt(iVal * iVal + jVal * jVal);
      } else if (rMatch) {
        const rVal = parseFloat(rMatch[1]) * uMult;
        radius = Math.abs(rVal);
        // Compute center from start, target and radius
        const dx = targetPt.x - startPt.x;
        const dy = targetPt.y - startPt.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0 && d <= 2 * radius) {
          const h = Math.sqrt(radius * radius - (d * d) / 4);
          const mx = (startPt.x + targetPt.x) / 2;
          const my = (startPt.y + targetPt.y) / 2;
          // Orthogonal direction
          const rx = -dy / d;
          const ry = dx / d;

          // For G2 (CW), we take one side, for G3 (CCW), the other.
          // R positive represents smaller arc (<= 180deg), R negative represents larger arc (> 180deg).
          const factor = (isCW ? 1 : -1) * (rVal < 0 ? -1 : 1);
          centerX = mx + factor * h * rx;
          centerY = my + factor * h * ry;
        }
      }

      if (radius > 0.001) {
        // Starting and ending angles
        const startAngle = Math.atan2(startPt.y - centerY, startPt.x - centerX);
        let endAngle = Math.atan2(targetPt.y - centerY, targetPt.x - centerX);

        // Adjust angles for direction
        let sweep = endAngle - startAngle;
        if (isCW) {
          // Clockwise: decreasing angle
          if (sweep >= 0) sweep -= 2 * Math.PI;
        } else {
          // Counter-Clockwise: increasing angle
          if (sweep <= 0) sweep += 2 * Math.PI;
        }

        // Interpolate arc into linear steps
        const arcLength = Math.abs(sweep) * radius;
        // Limit steps: minimum 4 steps, maximum 64 steps, or 1 step per 0.5mm
        const steps = Math.min(64, Math.max(8, Math.ceil(arcLength / 1.0)));
        
        let prevPt = { ...startPt };
        for (let s = 1; s <= steps; s++) {
          const fraction = s / steps;
          const angle = startAngle + sweep * fraction;
          
          // Z interpolation for helical interpolation
          const zInterp = startPt.z + (targetPt.z - startPt.z) * fraction;
          const currArcPt: Point3D = {
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

          updateBoundingBox(currArcPt);
          prevPt = currArcPt;
        }
      } else {
        // Fallback to straight line if center calculation is invalid
        segments.push({
          type: segmentType,
          start: startPt,
          end: targetPt,
          feedrate: activeFeedrate,
          lineIndex: i,
          command: motionCmd
        });
        updateBoundingBox(targetPt);
      }
    } else {
      // Standard linear move (G0/G1) or Z-axis plunge
      // Only push segment if there's actual motion
      const dist = Math.sqrt(
        Math.pow(targetPt.x - startPt.x, 2) +
        Math.pow(targetPt.y - startPt.y, 2) +
        Math.pow(targetPt.z - startPt.z, 2)
      );

      if (dist > 0.0001) {
        segments.push({
          type: segmentType,
          start: startPt,
          end: targetPt,
          feedrate: activeFeedrate,
          lineIndex: i,
          command: motionCmd
        });
        updateBoundingBox(targetPt);
      }
    }

    // Update current positions
    currentPos = targetPt;
  }

  // Ensure reasonable bounding box if empty
  if (minX === Infinity) {
    minX = minY = minZ = 0;
    maxX = maxY = maxZ = 10;
  }

  const boxSize: Point3D = {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ
  };

  const boxCenter: Point3D = {
    x: minX + boxSize.x / 2,
    y: minY + boxSize.y / 2,
    z: minZ + boxSize.z / 2
  };

  const boundingBox: BoundingBox = {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: boxCenter,
    size: boxSize
  };

  // Calculate totals
  let totalCutLength = 0;
  let totalTravelLength = 0;
  let estimatedTimeSec = 0;

  for (const seg of segments) {
    const dist = Math.sqrt(
      Math.pow(seg.end.x - seg.start.x, 2) +
      Math.pow(seg.end.y - seg.start.y, 2) +
      Math.pow(seg.end.z - seg.start.z, 2)
    );

    if (seg.type === 'cut') {
      totalCutLength += dist;
      // Time = distance / speed. Since feedrate is mm/min, convert to mm/sec: speed = feedrate / 60
      const speedMmPerSec = (seg.feedrate || settings.g1Speed) / 60;
      estimatedTimeSec += dist / (speedMmPerSec || 20);
    } else {
      totalTravelLength += dist;
      const speedMmPerSec = settings.g0Speed / 60;
      estimatedTimeSec += dist / (speedMmPerSec || 50);
    }
  }

  return {
    id: generateId(),
    filename,
    filesize,
    rawLines: lines,
    segments,
    boundingBox,
    totalCutLength,
    totalTravelLength,
    estimatedTimeSec
  };
}

/**
 * Generates mock preloaded .ncp / G-code samples so the app is instantly usable
 */
export function generateExampleFiles(settings: MachineSettings): ParsedGCode[] {
  const examples: { name: string; code: string }[] = [];

  // --- EXAMPLE 1: Letters "CNC" milling ---
  const cncLetters = `
%
(Nazwa pliku: 01_napis_cnc.ncp)
(Autor: Generator NCP Viewer)
(Opis: Grawerowanie tekstu CNC)
G21 (Jednostki metryczne mm)
G90 (Pozycjonowanie absolutne)
G0 Z10.000 (Bezpieczna wysokosc Z)
F1200 (Predkosc posuwu roboczego)

(Litera C)
G0 X10.0 Y35.0
G1 Z-1.500 F400 (Wjazd w material)
G1 X10.0 Y15.0 F1200
G1 X25.0 Y15.0
G0 Z5.0
G0 X25.0 Y35.0
G1 Z-1.500 F400
G1 X10.0 Y35.0 F1200
G0 Z10.0

(Litera N)
G0 X35.0 Y15.0
G1 Z-1.500 F400
G1 X35.0 Y35.0 F1200
G1 X50.0 Y15.0
G1 X50.0 Y35.0
G0 Z10.0

(Litera C)
G0 X60.0 Y35.0
G1 Z-1.500 F400
G1 X60.0 Y15.0 F1200
G1 X75.0 Y15.0
G0 Z5.0
G0 X75.0 Y35.0
G1 Z-1.500 F400
G1 X60.0 Y35.0 F1200
G0 Z15.0 (Koniec, wyjazd w gore)
M30 (Koniec programu)
`;
  examples.push({ name: '01_napis_cnc.ncp', code: cncLetters.trim() });

  // --- EXAMPLE 2: Clover with G2/G3 circles ---
  const cloverArcs = `
%
(Nazwa pliku: 02_koniczynka_2d.ncp)
(Opis: Koniczynka grawerowana łukami G2/G3)
G21
G90
G0 Z12.0
G0 X40.0 Y40.0 (Srodek)
G0 X40.0 Y20.0 (Poczatek luku dolnego)

G1 Z-2.0 F300 (Zanurzenie)
(Luk dolny lewy)
G3 X20.0 Y40.0 I0.0 J20.0 F1000
(Luk gorny lewy)
G3 X40.0 Y60.0 I20.0 J0.0
(Luk gorny prawy)
G3 X60.0 Y40.0 I0.0 J-20.0
(Luk dolny prawy)
G3 X40.0 Y20.0 I-20.0 J0.0

(Nóżka koniczynki - G1)
G0 Z2.0
G0 X40.0 Y20.0
G1 Z-2.0 F300
G1 X40.0 Y5.0 F900
G1 X37.0 Y5.0
G1 X37.0 Y18.0
G0 Z15.0
M30
`;
  examples.push({ name: '02_koniczynka_2d.ncp', code: cloverArcs.trim() });

  // --- EXAMPLE 3: 3D Relief (Mountain grid) ---
  // We generate programmatic scanning lines with oscillating Z heights
  let reliefLines = `
%
(Nazwa pliku: 03_plaskorzezba_3d.ncp)
(Opis: Skanowanie 3D terenu - sinusoidalny krajobraz)
G21
G90
G0 Z15.000
G0 X0.000 Y0.000 Z10.000
`;
  
  // Create a 3D grid scan
  // X from 0 to 60, Y from 0 to 60. Scanner scans along X at fixed Y
  const width = 60;
  const height = 40;
  const stepY = 2.0; // resolution
  const amplitude = 3.5;

  for (let y = 0; y <= height; y += stepY) {
    // Scan left-to-right or right-to-left
    const scanDir = (y / stepY) % 2 === 0;
    const startX = scanDir ? 0 : width;
    const endX = scanDir ? width : 0;

    // Move to start of line in G0
    reliefLines += `G0 X${startX.toFixed(3)} Y${y.toFixed(3)} Z5.000\n`;
    reliefLines += `G1 Z${(-1.5 + amplitude * Math.sin(startX/10) * Math.cos(y/8)).toFixed(3)} F300\n`;

    // Interpolate along the scan line
    const xSteps = 15;
    for (let s = 1; s <= xSteps; s++) {
      const fraction = s / xSteps;
      const x = startX + (endX - startX) * fraction;
      // Z fluctuates like a landscape
      const z = -2.0 + amplitude * Math.sin(x / 8.0) * Math.sin(y / 6.0);
      reliefLines += `G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} F1500\n`;
    }
    // Lift at the end of scan line
    reliefLines += `G0 Z5.000\n`;
  }
  
  reliefLines += `G0 Z20.000\nM30\n`;
  examples.push({ name: '03_plaskorzezba_3d.ncp', code: reliefLines });

  // --- EXAMPLE 4: Hole Drilling Grid ---
  const drillingPattern = `
%
(Nazwa pliku: 04_siatka_otworow.ncp)
(Opis: Wiercenie matrycy otworów 4x4)
G21
G90
G0 Z15.0
F600

(Otowr 1,1)
G0 X10.0 Y10.0
G1 Z-5.0 F200
G0 Z3.0
G1 Z-8.0 F150 (Glebokie wiercenie)
G0 Z15.0

(Otwor 1,2)
G0 X10.0 Y30.0
G1 Z-5.0 F200
G0 Z3.0
G1 Z-8.0 F150
G0 Z15.0

(Otwor 2,2)
G0 X30.0 Y30.0
G1 Z-5.0 F200
G0 Z3.0
G1 Z-8.0 F150
G0 Z15.0

(Otwor 2,1)
G0 X30.0 Y10.0
G1 Z-5.0 F200
G0 Z3.0
G1 Z-8.0 F150
G0 Z15.0

(Otwor 3,1)
G0 X50.0 Y10.0
G1 Z-8.0 F200
G0 Z15.0

(Otwor 3,2)
G0 X50.0 Y30.0
G1 Z-8.0 F200
G0 Z15.0

M30
`;
  examples.push({ name: '04_siatka_otworow.ncp', code: drillingPattern.trim() });

  // Parse examples using settings and attach isExample: true
  return examples.map(ex => {
    const parsed = parseGCode(ex.name, ex.code, ex.code.length, settings);
    parsed.isExample = true;
    return parsed;
  });
}
