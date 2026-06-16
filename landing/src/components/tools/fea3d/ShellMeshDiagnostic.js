/**
 * ============================================================
 * SHELL_MESH_DIAGNOSTIC.js
 * Script para detectar la causa del "rizado" en deformación de losas
 * ============================================================
 * 
 * USO:
 * 1. Importar en StructureCanvas.js o en la consola del navegador
 * 2. Llamar: diagnoseShellRizado() después de cargar resultados
 * 3. Revisar la salida en consola
 */

import * as THREE from 'three';

// ============================================================================
// DIAGNÓSTICO 1: Verificar si hay nodos duplicados en el mesh
// ============================================================================
function checkDuplicateNodes(mesh) {
  if (!mesh || !mesh.nodes) return { ok: true, duplicates: [] };

  const posMap = new Map();
  const duplicates = [];

  mesh.nodes.forEach((n, i) => {
    const key = `${n.x.toFixed(6)},${n.y.toFixed(6)},${n.z.toFixed(6)}`;
    if (posMap.has(key)) {
      const prev = posMap.get(key);
      duplicates.push({
        index1: prev.index,
        id1: prev.id,
        index2: i,
        id2: n.id,
        position: key
      });
    } else {
      posMap.set(key, { index: i, id: n.id });
    }
  });

  return {
    ok: duplicates.length === 0,
    duplicates,
    totalNodes: mesh.nodes.length,
    uniquePositions: posMap.size
  };
}

// ============================================================================
// DIAGNÓSTICO 2: Verificar consistencia de desplazamientos en nodos compartidos
// ============================================================================
function checkSharedNodeDisplacements(mesh, getDisplacement) {
  if (!mesh || !mesh.elements || !getDisplacement) return { ok: true, issues: [] };

  // Construir mapa: nodeId -> elementos que lo usan
  const nodeUsage = new Map();
  mesh.elements.forEach((el, elIdx) => {
    (el.nodeIds || []).forEach(nid => {
      if (!nodeUsage.has(nid)) nodeUsage.set(nid, []);
      nodeUsage.get(nid).push(elIdx);
    });
  });

  const issues = [];
  const sharedNodes = [];

  nodeUsage.forEach((elements, nodeId) => {
    if (elements.length > 1) {
      const disp = getDisplacement(nodeId);
      sharedNodes.push({
        nodeId,
        elementCount: elements.length,
        displacement: disp,
        displacementMagnitude: Math.sqrt(disp[0]**2 + disp[1]**2 + disp[2]**2)
      });
    }
  });

  // Verificar si nodos en la misma posición tienen desplazamientos diferentes
  const posDispMap = new Map();
  mesh.nodes.forEach(n => {
    const key = `${n.x.toFixed(6)},${n.y.toFixed(6)},${n.z.toFixed(6)}`;
    const disp = getDisplacement(n.id);
    if (posDispMap.has(key)) {
      const existing = posDispMap.get(key);
      const diff = Math.sqrt(
        (disp[0]-existing.disp[0])**2 + 
        (disp[1]-existing.disp[1])**2 + 
        (disp[2]-existing.disp[2])**2
      );
      if (diff > 1e-10) {
        issues.push({
          type: 'DISPLACEMENT_MISMATCH',
          position: key,
          nodeId1: existing.id,
          nodeId2: n.id,
          displacement1: existing.disp,
          displacement2: disp,
          difference: diff
        });
      }
    } else {
      posDispMap.set(key, { id: n.id, disp });
    }
  });

  return {
    ok: issues.length === 0,
    sharedNodes: sharedNodes.length,
    issues,
    sampleSharedNodes: sharedNodes.slice(0, 5)
  };
}

// ============================================================================
// DIAGNÓSTICO 3: Verificar si hay elementos "planos" (sin curvatura)
// ============================================================================
function checkFlatElements(mesh, getDisplacement) {
  if (!mesh || !mesh.elements || !getDisplacement) return { ok: true, flatElements: [] };

  const flatElements = [];

  mesh.elements.forEach(el => {
    if (!el.nodeIds || el.nodeIds.length < 3) return;

    const nodes = el.nodeIds.map(id => {
      const n = mesh.nodes.find(nd => nd.id === id);
      if (!n) return null;
      const d = getDisplacement(id);
      return { x: n.x + d[0], y: n.y + d[1], z: n.z + d[2] };
    }).filter(Boolean);

    if (nodes.length < 3) return;

    // Calcular normal del elemento
    const v1 = new THREE.Vector3(nodes[1].x - nodes[0].x, nodes[1].y - nodes[0].y, nodes[1].z - nodes[0].z);
    const v2 = new THREE.Vector3(nodes[2].x - nodes[0].x, nodes[2].y - nodes[0].y, nodes[2].z - nodes[0].z);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

    // Verificar si todos los nodos están en el mismo plano
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(nodes[0].x, nodes[0].y, nodes[0].z));
    let maxDeviation = 0;

    nodes.forEach(n => {
      const dist = Math.abs(plane.distanceToPoint(new THREE.Vector3(n.x, n.y, n.z)));
      if (dist > maxDeviation) maxDeviation = dist;
    });

    // Si hay desplazamientos pero el elemento sigue plano, puede indicar
    // que no se están aplicando rotaciones nodales
    if (maxDeviation < 1e-6) {
      flatElements.push({
        elementId: el.id,
        type: el.type,
        maxDeviation,
        nodeCount: nodes.length,
        avgDisplacement: nodes.reduce((sum, n) => sum + Math.abs(n.z - mesh.nodes.find(nd => nd.id === el.nodeIds[0]).z), 0) / nodes.length
      });
    }
  });

  return {
    ok: flatElements.length === 0,
    flatElements,
    totalElements: mesh.elements.length,
    flatPercentage: (flatElements.length / mesh.elements.length * 100).toFixed(2)
  };
}

// ============================================================================
// DIAGNÓSTICO 4: Verificar doble renderizado (ShapeGeometry vs ShellMeshVisualizer)
// ============================================================================
function checkDoubleRendering(shells, scene) {
  // Contar meshes en la escena que pertenecen a shells
  let shellMeshCount = 0;
  let visualizerCount = 0;
  let shapeGeometryCount = 0;

  if (!scene) return { ok: false, error: 'No scene provided' };

  scene.traverse(obj => {
    if (obj.userData && obj.userData.shellId) {
      shellMeshCount++;
      // Verificar si tiene geometría de tipo ShapeGeometry
      if (obj.geometry && obj.geometry.type === 'ShapeGeometry') {
        shapeGeometryCount++;
      }
    }
    // Contar visualizadores
    if (obj.type === 'Group' && obj.children) {
      obj.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'BufferGeometry') {
          const posAttr = child.geometry.attributes.position;
          if (posAttr && posAttr.count > 0) {
            visualizerCount++;
          }
        }
      });
    }
  });

  return {
    ok: shellMeshCount === visualizerCount || shapeGeometryCount === 0,
    shellMeshCount,
    visualizerCount,
    shapeGeometryCount,
    hasDoubleRendering: shapeGeometryCount > 0 && visualizerCount > 0,
    message: shapeGeometryCount > 0 && visualizerCount > 0 
      ? '⚠️ DETECTADO: ShapeGeometry y ShellMeshVisualizer renderizando simultáneamente'
      : '✅ OK: Solo una geometría por shell'
  };
}

// ============================================================================
// DIAGNÓSTICO 5: Verificar desplazamientos de nodos de esquina vs nodos interiores
// ============================================================================
function checkCornerVsInteriorDisplacement(mesh, getDisplacement, shellBoundaryIds) {
  if (!mesh || !mesh.nodes || !getDisplacement) return { ok: true };

  const boundarySet = new Set(shellBoundaryIds || []);
  const boundaryNodes = [];
  const interiorNodes = [];

  mesh.nodes.forEach(n => {
    const disp = getDisplacement(n.id);
    const mag = Math.sqrt(disp[0]**2 + disp[1]**2 + disp[2]**2);

    if (boundarySet.has(n.id)) {
      boundaryNodes.push({ id: n.id, displacement: disp, magnitude: mag });
    } else {
      interiorNodes.push({ id: n.id, displacement: disp, magnitude: mag });
    }
  });

  const avgBoundary = boundaryNodes.reduce((s, n) => s + n.magnitude, 0) / (boundaryNodes.length || 1);
  const avgInterior = interiorNodes.reduce((s, n) => s + n.magnitude, 0) / (interiorNodes.length || 1);

  return {
    ok: Math.abs(avgBoundary - avgInterior) < avgBoundary * 0.5, // 50% tolerance
    boundaryNodeCount: boundaryNodes.length,
    interiorNodeCount: interiorNodes.length,
    avgBoundaryDisplacement: avgBoundary,
    avgInteriorDisplacement: avgInterior,
    ratio: avgInterior / (avgBoundary || 1),
    issue: Math.abs(avgBoundary - avgInterior) > avgBoundary * 0.5 
      ? '⚠️ Los nodos interiores tienen desplazamientos muy diferentes a los de esquina'
      : '✅ Desplazamientos consistentes'
  };
}

// ============================================================================
// DIAGNÓSTICO 6: Verificar si los nodos del mesh tienen IDs consistentes con results
// ============================================================================
function checkMeshNodeIdConsistency(mesh, results, activeResultCombo) {
  if (!mesh || !mesh.nodes || !results || !activeResultCombo) return { ok: true };

  const comboResults = results.results?.[activeResultCombo];
  if (!comboResults || !comboResults.displacements) return { ok: true };

  const displacements = comboResults.displacements;
  const missingNodes = [];
  const foundNodes = [];

  mesh.nodes.forEach(n => {
    if (displacements[n.id] === undefined) {
      missingNodes.push(n.id);
    } else {
      foundNodes.push(n.id);
    }
  });

  return {
    ok: missingNodes.length === 0,
    totalMeshNodes: mesh.nodes.length,
    foundInResults: foundNodes.length,
    missingInResults: missingNodes.length,
    missingIds: missingNodes.slice(0, 10),
    issue: missingNodes.length > 0 
      ? `⚠️ ${missingNodes.length} nodos del mesh NO tienen desplazamientos en results`
      : '✅ Todos los nodos del mesh tienen desplazamientos'
  };
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE DIAGNÓSTICO
// ============================================================================
export function diagnoseShellRizado(store, shellId = null) {
  console.log('%c🔍 DIAGNÓSTICO DE RIZADO EN SHELLS', 'font-size:16px; font-weight:bold; color:#3b82f6');
  console.log('=' .repeat(60));

  const state = store.getState();
  const { shells, nodes, results, activeResultCombo, viewMode } = state;

  if (viewMode !== 'results') {
    console.warn('⚠️ No estás en modo resultados. Activa resultados primero.');
    return;
  }

  const shellsToCheck = shellId 
    ? shells.filter(s => s.id === shellId)
    : shells;

  if (shellsToCheck.length === 0) {
    console.warn('⚠️ No hay shells para diagnosticar');
    return;
  }

  const getDisplacement = (nodeId) => {
    if (!results || !activeResultCombo) return [0, 0, 0];
    const comboResults = results.results?.[activeResultCombo];
    if (!comboResults || !comboResults.displacements) return [0, 0, 0];
    const d = comboResults.displacements[nodeId];
    return d ? [d[0], d[1], d[2]] : [0, 0, 0];
  };

  let totalIssues = 0;

  shellsToCheck.forEach((shell, idx) => {
    console.log(`\n📐 Shell ${idx + 1}/${shellsToCheck.length}: ${shell.id}`);
    console.log('-'.repeat(50));

    if (!shell.mesh) {
      console.warn('  ⚠️  mesh es NULL - El shell no tiene mesh finito generado');
      totalIssues++;
      return;
    }

    // Test 1: Nodos duplicados
    const dupTest = checkDuplicateNodes(shell.mesh);
    console.log(`  1️⃣  Nodos duplicados: ${dupTest.ok ? '✅ OK' : '❌ PROBLEMA'}`);
    if (!dupTest.ok) {
      console.log(`     Total nodos: ${dupTest.totalNodes}, Posiciones únicas: ${dupTest.uniquePositions}`);
      console.log(`     Duplicados: ${dupTest.duplicates.length}`);
      console.log('     Primeros duplicados:', dupTest.duplicates.slice(0, 3));
      totalIssues++;
    }

    // Test 2: Consistencia de desplazamientos
    const dispTest = checkSharedNodeDisplacements(shell.mesh, getDisplacement);
    console.log(`  2️⃣  Desplazamientos compartidos: ${dispTest.ok ? '✅ OK' : '❌ PROBLEMA'}`);
    if (!dispTest.ok) {
      console.log(`     Nodos compartidos: ${dispTest.sharedNodes}`);
      console.log(`     Problemas encontrados: ${dispTest.issues.length}`);
      console.log('     Muestra:', dispTest.issues.slice(0, 3));
      totalIssues++;
    }

    // Test 3: Elementos planos
    const flatTest = checkFlatElements(shell.mesh, getDisplacement);
    console.log(`  3️⃣  Elementos planos: ${flatTest.ok ? '✅ OK' : '⚠️  ADVERTENCIA'}`);
    if (!flatTest.ok) {
      console.log(`     Elementos planos: ${flatTest.flatElements.length}/${flatTest.totalElements} (${flatTest.flatPercentage}%)`);
      console.log('     Esto puede indicar que no se aplican rotaciones nodales');
      totalIssues++;
    }

    // Test 4: Nodos de esquina vs interiores
    const cornerTest = checkCornerVsInteriorDisplacement(shell.mesh, getDisplacement, shell.nodes);
    console.log(`  4️⃣  Esquina vs Interior: ${cornerTest.ok ? '✅ OK' : '❌ PROBLEMA'}`);
    if (!cornerTest.ok) {
      console.log(`     Nodos esquina: ${cornerTest.boundaryNodeCount}, Interiores: ${cornerTest.interiorNodeCount}`);
      console.log(`     Desplazamiento promedio esquina: ${cornerTest.avgBoundaryDisplacement.toFixed(6)}`);
      console.log(`     Desplazamiento promedio interior: ${cornerTest.avgInteriorDisplacement.toFixed(6)}`);
      console.log(`     Ratio: ${cornerTest.ratio.toFixed(2)}`);
      totalIssues++;
    }

    // Test 5: Consistencia de IDs
    const idTest = checkMeshNodeIdConsistency(shell.mesh, results, activeResultCombo);
    console.log(`  5️⃣  IDs en results: ${idTest.ok ? '✅ OK' : '❌ PROBLEMA'}`);
    if (!idTest.ok) {
      console.log(`     Nodos mesh: ${idTest.totalMeshNodes}, Encontrados: ${idTest.foundInResults}`);
      console.log(`     Faltantes: ${idTest.missingInResults}`);
      console.log('     IDs faltantes:', idTest.missingIds);
      totalIssues++;
    }
  });

  // Test 6: Doble renderizado (requiere acceso a la escena Three.js)
  console.log(`\n📊 RESUMEN:`);
  console.log(`   Shells diagnosticados: ${shellsToCheck.length}`);
  console.log(`   Problemas encontrados: ${totalIssues}`);

  if (totalIssues === 0) {
    console.log('%c✅ No se detectaron problemas obvios. El rizado puede ser visual (z-fighting).', 'color:#22c55e');
  } else {
    console.log('%c⚠️  Se detectaron problemas que pueden causar rizado.', 'color:#ef4444');
  }

  return {
    shellsChecked: shellsToCheck.length,
    issuesFound: totalIssues,
    recommendations: totalIssues > 0 ? [
      '1. Verificar que mesh.nodes tenga IDs consistentes con results.displacements',
      '2. Asegurar que nodos compartidos entre elementos tengan el mismo desplazamiento',
      '3. Considerar aplicar rotaciones nodales (rx, ry) además de traslaciones',
      '4. Verificar que no haya ShapeGeometry duplicada con ShellMeshVisualizer'
    ] : ['No se requieren acciones']
  };
}

// ============================================================================
// FUNCIÓN RÁPIDA: Verificar si hay doble renderizado
// ============================================================================
export function quickCheckDoubleRendering() {
  console.log('%c🔍 QUICK CHECK: Doble renderizado', 'font-size:14px; font-weight:bold; color:#f59e0b');

  // Buscar en el DOM de React
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    console.warn('No se encontró canvas de Three.js');
    return;
  }

  // Contar elementos <mesh> en la escena (aproximación via renderer info)
  const renderer = canvas.__r3f?.fiber?.renderer;
  if (renderer) {
    console.log('Renderer info:', renderer.info);
  }

  console.log('💡 Para verificación exacta, usar React DevTools > Components');
  console.log('   Busca: ShellMesh -> mesh (ShapeGeometry) + ShellMeshVisualizer');
  console.log('   Si ambos existen para el mismo shell, hay doble renderizado.');
}

// ============================================================================
// FUNCIÓN: Exportar datos del mesh para análisis externo
// ============================================================================
export function exportMeshDebugData(store, shellId) {
  const state = store.getState();
  const shell = state.shells.find(s => s.id === shellId);

  if (!shell || !shell.mesh) {
    console.error('Shell no encontrado o sin mesh');
    return;
  }

  const debugData = {
    shellId,
    shellNodes: shell.nodes,
    meshNodes: shell.mesh.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, z: n.z })),
    meshElements: shell.mesh.elements.map(e => ({ id: e.id, type: e.type, nodeIds: e.nodeIds })),
    displacements: state.results?.results?.[state.activeResultCombo]?.displacements || {}
  };

  const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shell_debug_${shellId}.json`;
  a.click();

  console.log('✅ Datos de debug exportados');
  return debugData;
}

export default diagnoseShellRizado;
