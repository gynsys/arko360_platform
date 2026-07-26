// Helper for live SVG detail text replacement
export function getLiveSvgDetails(rawSvg, beamRebar, wallRebars) {
  if (!rawSvg) return '';
  let updated = rawSvg;

  // 1. Support Beam text replacement
  if (beamRebar) {
    let displayLabel = beamRebar;
    if (beamRebar.includes('Inf')) {
      const infStr = beamRebar.split('Inf')[0].trim();
      if (infStr.startsWith('3Ø')) displayLabel = `3 - Ø${infStr.substring(2)}`;
      else if (infStr.startsWith('2Ø') && !infStr.includes('+')) displayLabel = `2 - Ø${infStr.substring(2)}`;
      else if (infStr.startsWith('4Ø')) displayLabel = `4 - Ø${infStr.substring(2)}`;
      else displayLabel = infStr.replace(' (2 capas)', '');
    }
    
    // Replace Support Beam bottom label in SVG text element
    updated = updated.replace(/ font-family="monospace" fill="#000000">(\d+ - Ø\d+|[^<]+ Inf[^<]*|\d+ - Ø\d+[^<]*)<\/text>/g, (match) => {
      if (match.includes('Est.')) return match;
      return ` font-family="monospace" fill="#000000">${displayLabel}</text>`;
    });
  }

  // 2. Retaining Wall callouts text replacements
  if (wallRebars) {
    if (wallRebars.tracVert) {
      updated = updated.replace(/(Vert\. Tracción:\s*)?Ø\d+@\d+cm(\s*\(Int\.\))?/g, wallRebars.tracVert);
    }
    if (wallRebars.tracHoriz) {
      updated = updated.replace(/(Horiz\. Tracción:\s*)?Ø\d+@\d+cm(\s*\(Int\.\))?/g, wallRebars.tracHoriz);
    }
    if (wallRebars.compVert) {
      updated = updated.replace(/(Vert\. Compresión:\s*)?Ø\d+@\d+cm(\s*\(Ext\.\))?/g, wallRebars.compVert);
    }
    if (wallRebars.compHoriz) {
      updated = updated.replace(/(Horiz\. Compresión:\s*)?Ø\d+@\d+cm(\s*\(Ext\.\))?/g, wallRebars.compHoriz);
    }
  }

  return updated;
}

// Helper for dynamic interactive rebar verification
export function verifyRebarSpacing(selectedStr, asReqCm2M) {
  if (!selectedStr) return { ok: true, asProv: 0 };
  const m = selectedStr.match(/Ø(\d+)@(\d+)cm/);
  if (!m) return { ok: true, asProv: 0 };
  const d_mm = parseInt(m[1]);
  const s_cm = parseInt(m[2]);
  const areas = { 6: 0.283, 7: 0.385, 8: 0.503, 10: 0.785, 12: 1.13, 16: 1.99, 19: 2.84, 20: 3.14 };
  const a_bar = areas[d_mm] || (Math.PI * (d_mm/10)**2 / 4);
  const asProv = (a_bar / (s_cm / 100));
  const ok = asProv >= (asReqCm2M - 0.05);
  return { ok, asProv };
}

export function verifyBeamRebar(selectedStr, asReqCm2) {
  if (!selectedStr) return { ok: true, asProv: 0 };
  let asProv = 0.0;
  const infPart = selectedStr.split('Inf')[0] || selectedStr;
  const areaMap = { 10: 0.71, 12: 1.13, 16: 2.01, 20: 3.14 };
  const matches = [...infPart.matchAll(/(\d+)Ø(\d+)/g)];
  for (const m of matches) {
    const count = parseInt(m[1]);
    const diam = parseInt(m[2]);
    asProv += count * (areaMap[diam] || (Math.PI * (diam/10)**2 / 4));
  }
  if (asProv === 0) {
    const m = selectedStr.match(/(\d+)Ø(\d+)/);
    if (m) asProv = parseInt(m[1]) * (areaMap[parseInt(m[2])] || 1.13);
  }
  const ok = asProv >= (asReqCm2 - 0.05);
  return { ok, asProv };
}
