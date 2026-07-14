/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ToolpathSegment {
  type: 'cut' | 'travel'; // 'cut' corresponds to G1/G2/G3, 'travel' to G0
  start: Point3D;
  end: Point3D;
  feedrate: number;
  lineIndex: number; // 0-based index of the raw line of code
  command: string;   // e.g. "G0", "G1", "G2", "G3"
}

export interface BoundingBox {
  min: Point3D;
  max: Point3D;
  center: Point3D;
  size: Point3D;
}

export interface ParsedGCode {
  id: string; // unique ID for state management
  filename: string;
  filesize: number; // in bytes
  rawLines: string[];
  segments: ToolpathSegment[];
  boundingBox: BoundingBox;
  totalCutLength: number; // in mm
  totalTravelLength: number; // in mm
  estimatedTimeSec: number;
  isExample?: boolean;
}

export interface MachineSettings {
  g0Speed: number; // rapid speed in mm/min (default: 3000)
  g1Speed: number; // standard cutting speed in mm/min (default: 1200)
  zSpeed: number;  // Z axis plunge speed in mm/min (default: 400)
}

export type ViewOrientation = '3d' | 'xy' | 'xz' | 'yz';
