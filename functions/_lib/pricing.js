// Per-sqft rate bands (low–high $ per square foot unless marked linft).
// Tune these freely — they drive the instant estimator.
export const PRICING = {
  "lawn-mowing-care": {
    label: "Lawn Mowing & Care",
    icon: "\u{1F33F}",
    unit: "sqft",
    rate: [0.06, 0.12],
    extras: [
      { id: "mulch", label: "Mulch", range: [80, 160] },
      { id: "edging", label: "Edging & Weeding", range: [60, 120] },
      { id: "fertilizer", label: "Fertilizer", range: [50, 100] },
      { id: "cleanup", label: "Seasonal Cleanup", range: [120, 250] },
    ],
  },
  "fence-installation": {
    label: "Fence Installation",
    icon: "\u{1F6A7}",
    unit: "linft",
    rate: [28, 45],
    extras: [
      { id: "cedar", label: "Cedar Upgrade", range: [500, 900] },
      { id: "gate", label: "Gate", range: [300, 600] },
      { id: "staining", label: "Staining", range: [250, 500] },
      { id: "caps", label: "Post Caps", range: [100, 200] },
    ],
  },
  "property-cleanups": {
    label: "Property Cleanups",
    icon: "\u{1F9F9}",
    unit: "sqft",
    rate: [0.05, 0.12],
    extras: [
      { id: "debris", label: "Debris Hauling", range: [100, 250] },
      { id: "fabric", label: "Landscape Fabric", range: [80, 180] },
      { id: "mulch", label: "Mulch Refresh", range: [120, 280] },
      { id: "trim", label: "Hedge Trimming", range: [90, 200] },
    ],
  },
  "hardscaping": {
    label: "Hardscaping",
    icon: "\u{1F9F1}",
    unit: "sqft",
    rate: [12, 28],
    extras: [
      { id: "repoint", label: "Paving Repairs", range: [200, 500] },
      { id: "wall", label: "Retaining Wall", range: [400, 1200] },
      { id: "path", label: "Walkway Edging", range: [150, 400] },
    ],
  },
  "exterior-care": {
    label: "Exterior Care",
    icon: "\u{1F9F9}",
    unit: "sqft",
    rate: [0.03, 0.08],
    extras: [
      { id: "windows", label: "Window Cleaning", range: [120, 300] },
      { id: "powerwash", label: "Power Washing", range: [150, 400] },
      { id: "gutters", label: "Gutter Cleaning", range: [90, 200] },
      { id: "rot", label: "Wood Rot Repair", range: [200, 700] },
    ],
  },
};

export function roundRange(v) {
  return Math.max(75, Math.round(v / 25) * 25);
}