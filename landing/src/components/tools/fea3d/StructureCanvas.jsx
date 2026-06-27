import React, { useMemo, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Text, OrthographicCamera, PerspectiveCamera, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useStructureStore } from './useStructureStore';
import { SlabOpeningGenerator } from './SlabOpeningGenerator';
import { ShellMeshVisualizer } from './ShellMeshVisualizer';
import { diagnoseShellRizado, quickCheckDoubleRendering, exportMeshDebugData } from './ShellMeshDiagnostic';
import { SectionExtrusionGenerator } from './SectionExtrusionGenerator';
import toast from 'react-hot-toast';

function CoordinateTracker() {
  const { camera, pointer, raycaster } = useThree();
  const { cameraView, activeLevel } = useStructureStore();

  const plane = useMemo(() => {
    if (cameraView === 'XY' || cameraView === '3D') return new THREE.Plane(new THREE.Vector3(0, 0, 1), -activeLevel);
    if (cameraView === 'XZ') return new THREE.Plane(new THREE.Vector3(0, 1, 0), -activeLevel);
    if (cameraView === 'YZ') return new THREE.Plane(new THREE.Vector3(1, 0, 0), -activeLevel);
    return new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  }, [cameraView, activeLevel]);

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    if (intersectPoint) {
      const el = document.getElementById('coord-indicator');
      if (el) {
        el.innerText = `X: ${intersectPoint.x.toFixed(3)}, Y: ${intersectPoint.y.toFixed(3)}, Z: ${intersectPoint.z.toFixed(3)}`;
      }
    }
  });

  return null;
}

function ShellMesh({ id, nodeIds, getDisplacement, isFaded, mesh, results, activeResultType, globalRange, displacementScale = 1 }) {
  const { nodes, selectedIds, toggleSelection, viewMode, openings, activeResultCombo, metadata, showMesh } = useStructureStore();
  const units = metadata?.units || { force: 'kgf', length: 'm', moment: 'kgf-m' };
  const isSelected = selectedIds.includes(id);
  const isResultsMode = viewMode === 'results';

  // Obtener las aberturas de esta losa
  const slabOpenings = useMemo(() => openings.filter(o => o.hostSlabId === id), [openings, id]);

  const coordKey = useMemo(() => {
    let key = nodeIds.map(nid => { const n = nodes.find(nd => nd.id === nid); return n ? `${n.x},${n.y},${n.z}` : 'x'; }).join('|');
    if (getDisplacement) {
      const disp = nodeIds.map(nid => getDisplacement(nid).join(',')).join('|');
      key += `|${disp}`;
    }
    if (slabOpenings.length > 0) {
      key += `|ops=${slabOpenings.length}-${JSON.stringify(slabOpenings)}`;
    }
    return key;
  }, [nodeIds, nodes, getDisplacement, slabOpenings]);

  const geometry = useMemo(() => {
    const coords = nodeIds.map(nid => {
      const n = nodes.find(nd => nd.id === nid);
      if (!n) return null;
      const d = getDisplacement ? getDisplacement(n.id) : [0, 0, 0];
      const dx = isFinite(d[0]) ? d[0] : 0;
      const dy = isFinite(d[1]) ? d[1] : 0;
      const dz = isFinite(d[2]) ? d[2] : 0;
      return { x: n.x + dx, y: n.y + dy, z: n.z + dz };
    }).filter(Boolean);
    
    if (coords.length < 3) return null;

    // Verificar si es una losa plana en Z
    const isFlatZ = coords.every(c => Math.abs(c.z - coords[0].z) < 1e-4);

    if (isFlatZ) {
      // Dibujar con ShapeGeometry para soportar huecos (Booleanos Visuales)
      const shape = new THREE.Shape();
      shape.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i < coords.length; i++) {
        shape.lineTo(coords[i].x, coords[i].y);
      }
      // Cerrar el polígono
      shape.lineTo(coords[0].x, coords[0].y);

      // Añadir huecos
      slabOpenings.forEach(o => {
        // Coordenada base del hueco: bounding box mínimo de la losa
        const minX = Math.min(...coords.map(c => c.x));
        const minY = Math.min(...coords.map(c => c.y));
        const baseX = minX + o.offsetX;
        const baseY = minY + o.offsetY;

        // Generamos el polígono 2D local
        const localVertices = SlabOpeningGenerator.generatePolygon(o.type, o.params);
        
        // Encontrar el centroide del hueco local
        let cx = 0, cy = 0;
        localVertices.forEach(v => { cx += v.x; cy += v.y; });
        cx /= localVertices.length;
        cy /= localVertices.length;

        // Reducir microscópicamente el hueco (0.9999) hacia el centroide.
        // Esto previene que los bordes del hueco colisionen matemáticamente con los bordes
        // de la losa (provocando que la triangulación de Three.js / Earcut falle y la malla desaparezca).
        const scale = 0.9999;
        const shrunkenVertices = localVertices.map(v => ({
          x: cx + (v.x - cx) * scale,
          y: cy + (v.y - cy) * scale
        }));
        
        // Creamos la trayectoria negativa (hueco)
        const holePath = new THREE.Path();
        const startPoint = shrunkenVertices[0];
        holePath.moveTo(baseX + startPoint.x, baseY + startPoint.y);
        
        for (let i = 1; i < shrunkenVertices.length; i++) {
          holePath.lineTo(baseX + shrunkenVertices[i].x, baseY + shrunkenVertices[i].y);
        }
        holePath.lineTo(baseX + startPoint.x, baseY + startPoint.y); // Cerrar polígono

        shape.holes.push(holePath);
      });

      const shapeGeo = new THREE.ShapeGeometry(shape);
      shapeGeo.translate(0, 0, coords[0].z); // Mover al Z de la losa
      return shapeGeo;
    }

    // Fallback: Losa no plana (BufferGeometry simple, sin huecos)
    const n0 = coords[0];
    const n1 = coords[1];
    const n2 = coords[2];
    const n3 = coords[3] ?? coords[0];

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      n0.x, n0.y, n0.z,
      n1.x, n1.y, n1.z,
      n2.x, n2.y, n2.z,
      n0.x, n0.y, n0.z,
      n2.x, n2.y, n2.z,
      n3.x, n3.y, n3.z,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [coordKey]); // Solo recalcula cuando las coordenadas reales cambian

  return (
    <group>
      {(!mesh || !showMesh) && geometry && (
        <mesh
          geometry={geometry}
          userData={{ shellId: id }}
          onClick={isResultsMode || isFaded ? undefined : (e) => { 
            if (e.delta > 5) return; // Ignorar si fue un drag
            e.stopPropagation(); toggleSelection(id, e.shiftKey || e.ctrlKey); 
          }}
        >
          <meshStandardMaterial
            color={isSelected ? '#facc15' : isResultsMode ? '#4f46e5' : '#6366f1'}
            transparent={true}
            depthWrite={false}
            opacity={isFaded ? 0.05 : isSelected ? 0.5 : isResultsMode ? 0.4 : 0.25}
            side={THREE.DoubleSide}
            wireframe={isFaded}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}
      <ShellMeshVisualizer 
        mesh={showMesh ? mesh : null} 
        shellId={id} 
        shellNodeIds={nodeIds}
        nodes={nodes}
        results={results?.results?.[activeResultCombo]} 
        activeResultMap={activeResultType?.startsWith('Shell_') ? activeResultType.replace('Shell_', '') : 'None'} 
        globalRange={globalRange}
        unit={units.moment}
        getDisplacement={getDisplacement}
        displacementScale={displacementScale}
        isSelected={isSelected}
        isResultsMode={isResultsMode}
        isFaded={isFaded}
        toggleSelection={toggleSelection}
      />
    </group>
  );
}

function FrameElement({ start, end, id, isShadow, isFaded }) {
  const { 
    selectedIds, toggleSelection, setRightClickedElementId, viewMode,
    nodes, elements, shells, results, activeResultCombo, displacementScale, activeResultType,
    showExtruded, sections
  } = useStructureStore();
  
  const isSelected = selectedIds.includes(id);
  const isResultsMode = viewMode === 'results';

  const lastClickTime = useRef(0);

  const handleUnifiedClick = (e) => {
    if (e.delta > 5 || isResultsMode || isShadow || isFaded) return;
    e.stopPropagation();

    const now = Date.now();
    if (now - lastClickTime.current < 400) {
      // Double click
      lastClickTime.current = 0; // Reset
      const elem = elements.find(el => el.id === id);
      if (!elem || !elem.elementRole) return;
      
      const role = elem.elementRole;
      const candidates = elements.filter(el => el.elementRole === role);
      const toSelect = new Set();
      
      const traverse = (currentElem, directionNodeIdx) => {
        toSelect.add(currentElem.id);
        const searchNodeId = currentElem.nodes[directionNodeIdx];
        const neighbor = candidates.find(el => el.id !== currentElem.id && !toSelect.has(el.id) && el.nodes.includes(searchNodeId));
        if (neighbor) {
          traverse(neighbor, neighbor.nodes[0] === searchNodeId ? 1 : 0);
        }
      };
      
      traverse(elem, 0);
      traverse(elem, 1);
      
      const state = useStructureStore.getState();
      const newSelected = new Set(e.shiftKey || e.ctrlKey ? state.selectedIds : []);
      toSelect.forEach(i => newSelected.add(i));
      useStructureStore.setState({ selectedIds: Array.from(newSelected) });
    } else {
      // Single click
      lastClickTime.current = now;
      toggleSelection(id, e.shiftKey || e.ctrlKey);
    }
  };

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const sx = isFinite(start[0]) ? start[0] : 0;
    const sy = isFinite(start[1]) ? start[1] : 0;
    const sz = isFinite(start[2]) ? start[2] : 0;
    const ex = isFinite(end[0]) ? end[0] : 0;
    const ey = isFinite(end[1]) ? end[1] : 0;
    const ez = isFinite(end[2]) ? end[2] : 0;
    
    // In results mode (for non-shadow deformed elements), retrieve deformed shape
    if (viewMode === 'results' && activeResultType === 'deformed' && !isShadow && results && activeResultCombo && elements && nodes) {
      const elem = elements.find(el => el.id === id);
      if (elem) {
        const comboResults = results.results[activeResultCombo];
        const stations = comboResults?.element_forces?.[id];
        
        // 1. Draw using station-based deflection curves (Euler-Bernoulli/Mindlin output from Python)
        if (stations && stations.length > 0) {
          const n1Id = elem.nodes[0];
          const n2Id = elem.nodes[1];
          const n1 = nodes.find(n => n.id === n1Id);
          const n2 = nodes.find(n => n.id === n2Id);
          
          if (n1 && n2) {
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dz = n2.z - n1.z;
            const L = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (L > 1e-6) {
              const dx_n = dx / L;
              const dy_n = dy / L;
              const dz_n = dz / L;
              
              const dirX_sub = new THREE.Vector3();
              const dirY_sub = new THREE.Vector3();
              const dirZ_sub = new THREE.Vector3();
              
              if (Math.abs(dx_n) < 1e-6 && Math.abs(dy_n) < 1e-6) {
                const m = dz_n > 0 ? 1 : -1;
                dirX_sub.set(0, 0, m);
                dirY_sub.set(0, 1, 0);
                dirZ_sub.set(-m, 0, 0);
              } else {
                const D = Math.sqrt(dx_n*dx_n + dy_n*dy_n);
                dirX_sub.set(dx_n, dy_n, dz_n);
                dirY_sub.set(-dy_n / D, dx_n / D, 0);
                dirZ_sub.set(-dx_n * dz_n / D, -dy_n * dz_n / D, D);
              }
              
              const betaRad = ((elem.beta_angle || 0) * Math.PI) / 180;
              const cosBeta = Math.cos(betaRad);
              const sinBeta = Math.sin(betaRad);
              
              const dirX_final = dirX_sub;
              const dirY_final = new THREE.Vector3().copy(dirY_sub).multiplyScalar(cosBeta).addScaledVector(dirZ_sub, sinBeta);
              const dirZ_final = new THREE.Vector3().copy(dirY_sub).multiplyScalar(-sinBeta).addScaledVector(dirZ_sub, cosBeta);
              
              const positions = [];
              stations.forEach(st => {
                const x = st.x;
                const ux = st.ux || 0;
                const uy = st.uy || 0;
                const uz = st.uz || 0;
                
                const pos = new THREE.Vector3(n1.x, n1.y, n1.z)
                  .addScaledVector(dirX_final, x + ux * displacementScale)
                  .addScaledVector(dirY_final, uy * displacementScale)
                  .addScaledVector(dirZ_final, uz * displacementScale);
                positions.push(pos.x, pos.y, pos.z);
              });
              
              geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
              return geo;
            }
          }
        }
        
        // 2. Fallback: retrieve shell mesh nodes lying along this frame (linear segmentation)
        const n1Id = elem?.nodes?.[0];
        const n2Id = elem?.nodes?.[1];
        const n1 = nodes.find(n => n.id === n1Id);
        const n2 = nodes.find(n => n.id === n2Id);

        if (n1 && n2 && shells) {
          const p1 = { x: n1.x, y: n1.y, z: n1.z };
          const p2 = { x: n2.x, y: n2.y, z: n2.z };
          
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dz = p2.z - p1.z;
          const lenSq = dx*dx + dy*dy + dz*dz;

          if (lenSq > 1e-6) {
            const intermediateNodes = [];
            shells.forEach(shell => {
              if (shell.mesh && Array.isArray(shell.mesh.nodes)) {
                shell.mesh.nodes.forEach(mn => {
                  if (mn.id === n1.id || mn.id === n2.id) return;
                  
                  const wx = mn.x - p1.x;
                  const wy = mn.y - p1.y;
                  const wz = mn.z - p1.z;
                  
                  const t = (wx*dx + wy*dy + wz*dz) / lenSq;
                  if (t > 1e-4 && t < 1 - 1e-4) {
                    const px = p1.x + t * dx;
                    const py = p1.y + t * dy;
                    const pz = p1.z + t * dz;
                    
                    const distSq = (mn.x - px)**2 + (mn.y - py)**2 + (mn.z - pz)**2;
                    if (distSq < 1e-4) {
                      intermediateNodes.push({ t, id: mn.id, x: mn.x, y: mn.y, z: mn.z });
                    }
                  }
                });
              }
            });

            const uniqueIntermediates = [];
            const seenIds = new Set();
            intermediateNodes.forEach(node => {
              if (!seenIds.has(node.id)) {
                seenIds.add(node.id);
                uniqueIntermediates.push(node);
              }
            });

            uniqueIntermediates.sort((a, b) => a.t - b.t);

            const segmentNodes = [
              { id: n1.id, x: p1.x, y: p1.y, z: p1.z },
              ...uniqueIntermediates,
              { id: n2.id, x: p2.x, y: p2.y, z: p2.z }
            ];

            const positions = [];
            segmentNodes.forEach(node => {
              let ndx = 0, ndy = 0, ndz = 0;
              const comboResults = results.results[activeResultCombo];
              if (comboResults && comboResults.displacements) {
                const d = comboResults.displacements[node.id];
                if (d) {
                  ndx = d[0] * displacementScale;
                  ndy = d[1] * displacementScale;
                  ndz = d[2] * displacementScale;
                }
              }
              positions.push(node.x + ndx, node.y + ndy, node.z + ndz);
            });

            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
            return geo;
          }
        }
      }
    }

    // Fallback straight line
    const positions = new Float32Array([sx, sy, sz, ex, ey, ez]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [start[0], start[1], start[2], end[0], end[1], end[2], viewMode, isShadow, id, elements, nodes, shells, results, activeResultCombo, displacementScale]);

  const renderExtruded = showExtruded && !isResultsMode && !isShadow && !isFaded;

  const extrudedGeometry = useMemo(() => {
    if (!renderExtruded) return null;
    const elem = elements.find(el => el.id === id);
    if (!elem) return null;
    const section = sections.find(s => s.id === elem.section_id);
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const L = p1.distanceTo(p2);
    return SectionExtrusionGenerator.createGeometry(section, L, sections, elem);
  }, [renderExtruded, elements, id, sections, start, end]);

  const extrudedMatrix = useMemo(() => {
    if (!renderExtruded) return null;
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const elem = elements.find(el => el.id === id);
    const dirX = new THREE.Vector3().subVectors(p2, p1).normalize();
    const dirY = new THREE.Vector3();
    const dirZ = new THREE.Vector3();

    if (Math.abs(dirX.x) < 1e-6 && Math.abs(dirX.y) < 1e-6) {
      const m = dirX.z > 0 ? 1 : -1;
      dirY.set(0, 1, 0);
      dirZ.set(-m, 0, 0);
    } else {
      const D = Math.sqrt(dirX.x * dirX.x + dirX.y * dirX.y);
      dirY.set(-dirX.y / D, dirX.x / D, 0);
      dirZ.set(-dirX.x * dirX.z / D, -dirX.y * dirX.z / D, D);
    }

    const betaRad = ((elem?.beta_angle || 0) * Math.PI) / 180;
    const cosBeta = Math.cos(betaRad);
    const sinBeta = Math.sin(betaRad);

    const dirY_final = new THREE.Vector3().copy(dirY).multiplyScalar(cosBeta).addScaledVector(dirZ, sinBeta);
    const dirZ_final = new THREE.Vector3().copy(dirY).multiplyScalar(-sinBeta).addScaledVector(dirZ, cosBeta);

    const mat = new THREE.Matrix4();
    mat.makeBasis(dirX, dirY_final, dirZ_final);
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    
    let final_offset_y = elem?.visual_offset_y || 0;
    
    // Dynamic intelligent offset for purlins based on the rafter they sit on
    if (elem?.elementRole === 'purlin') {
      const rafter = elements.find(el => el.elementRole === 'rafter' && (el.nodes.includes(elem.nodes[0]) || el.nodes.includes(elem.nodes[1])));
      if (rafter) {
        const rafterSec = sections.find(s => s.id === rafter.section_id);
        const purlinSec = sections.find(s => s.id === elem.section_id);
        
        // Extract heights — support all profile param conventions: d (IPE/HEB), h (Rectangular), ht_start (Tapered), bf/w2
        const h_rafter = rafterSec?.params?.d || rafterSec?.params?.ht || rafterSec?.params?.h || rafterSec?.params?.ht_start || 0.4;
        const h_purlin = purlinSec?.params?.d || purlinSec?.params?.ht || purlinSec?.params?.h || 0.15;
        
        // alignment is stored on the ELEMENT, not the section params
        const rAlign = rafter.alignment || rafterSec?.params?.alignment || 'Center';
        const pAlign = elem.alignment || purlinSec?.params?.alignment || 'Center';
        
        // How far is the top surface of rafter from its centroid node?
        let rTop = 0;
        if (rAlign === 'Top Center') rTop = 0;       // node IS the top surface
        else if (rAlign === 'Bottom Center') rTop = h_rafter; // node is bottom
        else rTop = h_rafter / 2;                    // Center: node is centroid
        
        // How far is the bottom surface of purlin from its centroid node?
        let pBot = 0;
        if (pAlign === 'Bottom Center') pBot = 0;    // node IS the bottom surface
        else if (pAlign === 'Top Center') pBot = h_purlin; // node is top
        else pBot = h_purlin / 2;                   // Center: node is centroid
        
        final_offset_y = rTop + pBot;
      }
    }
    
    if (final_offset_y) {
       midPoint.addScaledVector(dirY_final, final_offset_y);
    }
    if (elem?.visual_offset_z) {
       midPoint.addScaledVector(dirZ_final, elem.visual_offset_z);
    }
    
    mat.setPosition(midPoint);
    return mat;
  }, [renderExtruded, elements, id, start, end, sections]);

  if (renderExtruded && extrudedGeometry && extrudedMatrix) {
    const elem = elements.find(el => el.id === id);
    let roleColor = '#94a3b8';
    if (elem?.elementRole === 'column') roleColor = '#0284c7'; // Azul celeste
    else if (elem?.elementRole === 'rafter') roleColor = '#0284c7'; // Azul celeste
    else if (elem?.elementRole === 'purlin') roleColor = '#06b6d4'; // Cyan
    else if (elem?.elementRole === 'bracing') roleColor = '#f8fafc'; // Blanco perlado

    const edgesGeo = new THREE.EdgesGeometry(extrudedGeometry, 15);

    return (
      <group matrix={extrudedMatrix} matrixAutoUpdate={false} onClick={handleUnifiedClick}>
        <mesh geometry={extrudedGeometry}>
          <meshStandardMaterial 
            color={isSelected ? '#facc15' : roleColor} 
            metalness={0.6} 
            roughness={0.2} 
            transparent={true}
            opacity={0.85}
            side={THREE.DoubleSide} 
          />
        </mesh>
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial
            color={isSelected ? '#ca8a04' : '#1e293b'}
            transparent={true}
            opacity={0.9}
            depthTest={true}
          />
        </lineSegments>
      </group>
    );
  }

  return (
    <line 
      geometry={geometry} 
      onClick={isResultsMode || isShadow || isFaded ? undefined : handleUnifiedClick}
      onContextMenu={isResultsMode && !isShadow && !isFaded ? (e) => {
        e.stopPropagation();
        setRightClickedElementId(id);
      } : undefined}
    >
      <lineBasicMaterial 
        color={isShadow ? '#334155' : isFaded ? '#475569' : isSelected ? '#facc15' : isResultsMode ? '#38bdf8' : '#94a3b8'} 
        linewidth={isShadow ? 1 : 2} 
        transparent={isShadow || isFaded}
        depthWrite={!(isShadow || isFaded)}
        opacity={isShadow ? 0.3 : isFaded ? 0.15 : 1}
      />
    </line>
  );
}

function ForceDiagram({ id, start, end, stations, resultType, scale }) {
  if (!stations || stations.length === 0) return null;

  const geometry = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const dirX = new THREE.Vector3().subVectors(p2, p1).normalize();

    // Ejes locales
    let dirY = new THREE.Vector3();
    let dirZ = new THREE.Vector3();
    
    if (Math.abs(dirX.x) < 1e-6 && Math.abs(dirX.y) < 1e-6) {
      const m = dirX.z > 0 ? 1 : -1;
      dirY.set(0, 1, 0);
      dirZ.set(-m, 0, 0);
    } else {
      const D = Math.sqrt(dirX.x * dirX.x + dirX.y * dirX.y);
      dirY.set(-dirX.y / D, dirX.x / D, 0);
      dirZ.set(-dirX.x * dirX.z / D, -dirX.y * dirX.z / D, D);
    }

    // Eje de dibujo según convención SAP2000: Momentos y cortantes
    let plotDir = dirY;
    if (resultType === 'V3' || resultType === 'M2') {
      plotDir = dirZ;
    } else if (resultType === 'M3') {
      // M3 se dibuja perpendicular a V2, o sea en el plano local Y
      plotDir = dirY.clone().negate(); // Invertido visualmente para tracción abajo
    }

    const geo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    
    const points = stations.map(st => {
      // Si el tipo de resultado no existe en la estación (ej. fue forzado accidentalmente), devolver 0
      const rawVal = st[resultType];
      const val = (rawVal !== undefined && isFinite(rawVal)) ? rawVal * scale : 0;
      const basePos = new THREE.Vector3().copy(p1).add(dirX.clone().multiplyScalar(st.x));
      const offsetPos = new THREE.Vector3().copy(basePos).add(plotDir.clone().multiplyScalar(val));
      return { base: basePos, offset: offsetPos, val: (rawVal || 0) };
    });

    for (let i = 0; i < points.length - 1; i++) {
      const pA = points[i];
      const pB = points[i+1];

      const addQuad = (A, B) => {
        const v0 = A.base, v1 = A.offset, v2 = B.offset, v3 = B.base;
        // ETABS Colors: Red for positive array values (usually supports), Yellow for negative (usually center span)
        const cA = A.val >= 0 ? [1, 0.1, 0.1] : [1, 0.9, 0]; // Bright Red : Bright Yellow
        const cB = B.val >= 0 ? [1, 0.1, 0.1] : [1, 0.9, 0]; // Bright Red : Bright Yellow

        positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
        colors.push(...cA, ...cA, ...cB);
        positions.push(v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
        colors.push(...cA, ...cB, ...cB);
      };

      if ((pA.val >= 0 && pB.val >= 0) || (pA.val <= 0 && pB.val <= 0)) {
        addQuad(pA, pB);
      } else {
        // Sign change: calculate zero-crossing point
        const t = Math.abs(pA.val) / (Math.abs(pA.val) + Math.abs(pB.val));
        const zBase = new THREE.Vector3().lerpVectors(pA.base, pB.base, t);
        const pZ = { base: zBase, offset: zBase, val: 0 };
        addQuad(pA, pZ);
        addQuad(pZ, pB);
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geo.computeVertexNormals();

    // Encontrar picos para el texto
    let maxAbsVal = 0;
    let maxPoint = null;
    let minPoint = null;
    let maxBase = null;
    let minBase = null;
    let minVal = Infinity;
    let maxVal = -Infinity;

    points.forEach(p => {
      if (p.val > maxVal) { maxVal = p.val; maxPoint = p.offset; maxBase = p.base; }
      if (p.val < minVal) { minVal = p.val; minPoint = p.offset; minBase = p.base; }
    });

    return { geo, maxPoint, minPoint, maxBase, minBase, maxVal, minVal };
  }, [stations, scale, resultType, start, end]);

  return (
    <group>
      <mesh geometry={geometry.geo}>
        <meshBasicMaterial 
          vertexColors 
          side={THREE.DoubleSide} 
          transparent={true}
          opacity={0.85}
          depthWrite={false}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      
      {/* Texto de Pico: solo muestra el valor de mayor magnitud absoluta para evitar solapamiento */}
      {(() => {
        const absMax = Math.abs(geometry.maxVal);
        const absMin = Math.abs(geometry.minVal);
        const showMax = Math.abs(geometry.maxVal) > 1e-4;
        const showMin = Math.abs(geometry.minVal) > 1e-4 && geometry.maxVal !== geometry.minVal;

        const labels = [];

        if (showMax) {
          const dir = new THREE.Vector3().subVectors(geometry.maxPoint, geometry.maxBase);
          if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); else dir.normalize();
          const pos = geometry.maxPoint.clone().add(dir.multiplyScalar(0.25));
          labels.push(
            <Text
              key="max"
              position={[pos.x, pos.y, pos.z]}
              fontSize={0.12}
              color="#ffffff"
              rotation={[Math.PI / 2, 0, 0]}
              anchorX="center"
              outlineWidth={0.012}
              outlineColor="#000000"
            >
              {geometry.maxVal.toFixed(2)}
            </Text>
          );
        }

        // Solo mostrar mínimo si tiene diferencia significativa con el máximo y no se solapan
        if (showMin && absMin > absMax * 0.15) {
          const dir = new THREE.Vector3().subVectors(geometry.minPoint, geometry.minBase);
          if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); else dir.normalize();
          const pos = geometry.minPoint.clone().add(dir.multiplyScalar(0.25));
          // Distancia mínima con el label anterior para evitar solapamiento
          const tooClose = showMax && geometry.maxPoint && pos.distanceTo(geometry.maxPoint) < 1.5;
          if (!tooClose) {
            labels.push(
              <Text
                key="min"
                position={[pos.x, pos.y, pos.z]}
                fontSize={0.12}
                color="#ffe082"
                rotation={[Math.PI / 2, 0, 0]}
                anchorX="center"
                outlineWidth={0.012}
                outlineColor="#000000"
              >
                {geometry.minVal.toFixed(2)}
              </Text>
            );
          }
        }
        return labels;
      })()}
    </group>
  );
}

function NodePoint({ x, y, z, dx = 0, dy = 0, dz = 0, id, restraint, isFaded }) {
  const { selectedIds, toggleSelection, isDrawingShell, drawingNodes, addNodeToDrawing, viewMode } = useStructureStore();
  
  const isSelected = selectedIds.includes(id);
  const isPartofDrawing = drawingNodes.includes(id);
  const isResultsMode = viewMode === 'results';
  const hasRestraint = !!restraint;

  const handleClick = (e) => {
    if (e.delta > 5) return; // Ignorar si fue un drag
    e.stopPropagation();
    if (isDrawingShell) {
      addNodeToDrawing(id);
    } else {
      toggleSelection(id, e.shiftKey || e.ctrlKey);
    }
  };

  // Determinar tipo de apoyo
  let supportMesh = null;
  if (hasRestraint) {
    const isFixed = restraint.ux && restraint.uy && restraint.uz && restraint.rx && restraint.ry && restraint.rz;
    const isPinned = restraint.ux && restraint.uy && restraint.uz && !restraint.rx && !restraint.ry && !restraint.rz;
    const isRoller = !restraint.ux && !restraint.uy && restraint.uz && !restraint.rx && !restraint.ry && !restraint.rz;

    if (isFixed) {
      supportMesh = (
        <group position={[0, 0, -0.05]}>
          <mesh>
            <boxGeometry args={[0.4, 0.1, 0.1]} />
            <meshStandardMaterial color="#3b82f6" opacity={0.8} transparent />
          </mesh>
          <mesh>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
            <meshStandardMaterial color="#3b82f6" opacity={0.8} transparent />
          </mesh>
        </group>
      );
    } else if (isPinned) {
      supportMesh = (
        <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 0.3, 4]} />
          <meshStandardMaterial color="#10b981" opacity={0.8} transparent />
        </mesh>
      );
    } else if (isRoller) {
      supportMesh = (
        <mesh position={[0, 0, -0.1]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
          <meshStandardMaterial color="#f97316" opacity={0.8} transparent />
        </mesh>
      );
    } else {
      supportMesh = (
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[0.2, 0.2, 0.1]} />
          <meshStandardMaterial color="#64748b" opacity={0.8} transparent />
        </mesh>
      );
    }
  }

  return (
    <group position={[x + dx, y + dy, z + dz]} onClick={isResultsMode || isFaded ? undefined : handleClick}>
      {/* Hitbox invisible para atrapar clics más fácilmente que la viga */}
      <mesh visible={false}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      
      {/* Geometría visual del nodo */}
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={isFaded ? '#475569' : isPartofDrawing ? '#fb923c' : isSelected ? '#facc15' : hasRestraint ? '#ef4444' : isResultsMode ? '#38bdf8' : '#60a5fa'}
          emissive={isPartofDrawing ? '#fb923c' : '#000'}
          emissiveIntensity={0.5}
          transparent={isFaded}
          depthWrite={!isFaded}
          opacity={isFaded ? 0.15 : 1}
        />
      </mesh>
      {supportMesh && !isResultsMode && !isFaded && supportMesh}
    </group>
  );
}

function PointLoadArrow({ node, load }) {
  const { viewMode, metadata } = useStructureStore();
  if (viewMode === 'results') return null;

  const length = 1.5;
  const units = metadata?.units?.split(',')[1]?.trim() || 'kN';

  // Construir flechas para cada componente de fuerza no nulo
  const forces = [
    { val: load.fx || 0, dir: new THREE.Vector3(1, 0, 0), label: 'Fx' },
    { val: load.fy || 0, dir: new THREE.Vector3(0, 1, 0), label: 'Fy' },
    { val: load.fz || 0, dir: new THREE.Vector3(0, 0, 1), label: 'Fz' },
  ].filter(f => f.val !== 0);

  if (forces.length === 0) return null;

  return (
    <group>
      {forces.map((f, i) => {
        const dir = f.val > 0 ? f.dir.clone() : f.dir.clone().negate();
        const origin = new THREE.Vector3(node.x, node.y, node.z).sub(dir.clone().multiplyScalar(length));
        return (
          <group key={i}>
            <arrowHelper args={[dir, origin, length, 0xf97316, 0.4, 0.2]} />
              <Text
                position={[origin.x + dir.x * (length / 2) + 0.15, origin.y + dir.y * (length / 2) + 0.15, origin.z + dir.z * (length / 2) + 0.15]}
                fontSize={0.28}
                color="#fdba74"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
                anchorX="center"
                rotation={[Math.PI / 2, 0, 0]}
              >
                {`${f.label}: ${Number(Math.abs(f.val).toFixed(2))} ${units}`}
              </Text>
          </group>
        );
      })}
    </group>
  );
}

function FrameLoadGraphic({ element, load, nodes }) {
  const { viewMode, metadata } = useStructureStore();
  if (viewMode === 'results') return null;

  const n1 = nodes.find(n => n.id === element.nodes[0]);
  const n2 = nodes.find(n => n.id === element.nodes[1]);
  if (!n1 || !n2) return null;

  const p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
  const p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();
  dir.normalize();

  const arrowLength = 1.0;
  const units = metadata?.units?.split(',')[1]?.trim() || 'kN';
  const lenUnit = metadata?.units?.split(',')[0]?.trim() || 'm';

  const isSlabLoad = load.isSlabLoad;
  const isWindLoad = !!(load.loadCase && (load.loadCase.startsWith('WX') || load.loadCase.startsWith('WY')));
  const loadColor = isSlabLoad ? 0x06b6d4 : isWindLoad ? 0x38bdf8 : 0x3b82f6;
  const textColor = isSlabLoad ? '#22d3ee' : isWindLoad ? '#7dd3fc' : '#93c5fd';
  const arrowColor = isSlabLoad ? 0x06b6d4 : isWindLoad ? 0x38bdf8 : 0x3b82f6;

  // Las cargas de viento usan dir + q1 en vez de fx/fy/fz
  let forces = [];
  if (load.dir && load.q1 !== undefined) {
    const dirMap = {
      'X': new THREE.Vector3(1, 0, 0),
      'Y': new THREE.Vector3(0, 1, 0),
      'Z': new THREE.Vector3(0, 0, 1),
    };
    const d = load.dir === 'Custom' && load.vector ? new THREE.Vector3(...load.vector) : dirMap[load.dir];
    if (d) forces = [{ val: load.q1, dir: d, label: isWindLoad ? `Viento (${load.loadCase})` : load.dir }];
  } else {
    forces = [
      { val: load.fx || 0, dir: new THREE.Vector3(1, 0, 0), label: isSlabLoad ? 'Fx (Losa)' : 'Fx' },
      { val: load.fy || 0, dir: new THREE.Vector3(0, 1, 0), label: isSlabLoad ? 'Fy (Losa)' : 'Fy' },
      { val: load.fz || 0, dir: new THREE.Vector3(0, 0, 1), label: isSlabLoad ? 'Fz (Losa)' : 'Fz' },
    ];
  }
  forces = forces.filter(f => f.val !== 0);

  if (forces.length === 0) return null;

  if (load.type === 'point_frame') {
    const offset = load.offset ?? 0.5;
    const pos = p1.clone().add(dir.clone().multiplyScalar(length * offset));
    
    return (
      <group>
        {forces.map((f, i) => {
          const fdir = f.val > 0 ? f.dir.clone() : f.dir.clone().negate();
          const origin = pos.clone().sub(fdir.clone().multiplyScalar(arrowLength));
          return (
            <group key={i}>
              <arrowHelper args={[fdir, origin, arrowLength, 0xef4444, 0.3, 0.15]} />
              <Billboard
                position={[origin.x + fdir.x * (arrowLength / 2) + 0.15, origin.y + fdir.y * (arrowLength / 2) + 0.15, origin.z + fdir.z * (arrowLength / 2) + 0.15]}
              >
                <Text
                  fontSize={0.20}
                  color="#fca5a5"
                  font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
                  anchorX="center"
                  anchorY="middle"
                >
                  {isWindLoad ? `${Number(Math.abs(f.val).toFixed(2))} ${units}` : `${f.label}: ${Number(Math.abs(f.val).toFixed(2))} ${units}`}
                </Text>
              </Billboard>
            </group>
          );
        })}
      </group>
    );
  }

  if (load.type === 'distributed') {
    const numArrows = 5;
    return (
      <group>
        {forces.map((f, i) => {
          const fdir = f.val > 0 ? f.dir.clone() : f.dir.clone().negate();
          const topPoints = [];
          
          const arrows = [];
          for (let j = 0; j <= numArrows; j++) {
            const fraction = j / numArrows;
            const pos = p1.clone().add(dir.clone().multiplyScalar(length * fraction));
            const origin = pos.clone().sub(fdir.clone().multiplyScalar(arrowLength));
            topPoints.push(origin);
            arrows.push(<arrowHelper key={j} args={[fdir, origin, arrowLength, arrowColor, 0.2, 0.1]} />);
          }

          const lineGeom = new THREE.BufferGeometry().setFromPoints(topPoints);
          
          return (
            <group key={i}>
              {arrows}
              <line geometry={lineGeom}>
                <lineBasicMaterial color={loadColor} linewidth={2} />
              </line>
              <Billboard
                position={[topPoints[Math.floor(numArrows/2)].x + fdir.x * 0.15, topPoints[Math.floor(numArrows/2)].y + fdir.y * 0.15, topPoints[Math.floor(numArrows/2)].z + fdir.z * 0.15]}
              >
                <Text
                  fontSize={0.18}
                  color={textColor}
                  font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
                  anchorX="center"
                  anchorY="middle"
                >
                  {isWindLoad ? `${Number(Math.abs(f.val).toFixed(2))} ${units}/${lenUnit}` : `${f.label}: ${Number(Math.abs(f.val).toFixed(2))} ${units}/${lenUnit}`}
                </Text>
              </Billboard>
            </group>
          );
        })}
      </group>
    );
  }

  return null;
}

function SlabLoadGraphic({ shell, nodes, q, loadColor = 0x06b6d4, textColor = '#22d3ee', units = 'kgf', lenUnit = 'm' }) {
  const { viewMode } = useStructureStore();
  if (viewMode === 'results' || Math.abs(q) < 1e-4) return null;

  const n_coords = shell.nodes.map(nid => nodes.find(n => n.id === nid)).filter(Boolean);
  if (n_coords.length !== 4) return null; // Solo losas rectangulares/cuadrangulares

  const p0 = new THREE.Vector3(n_coords[0].x, n_coords[0].y, n_coords[0].z);
  const p1 = new THREE.Vector3(n_coords[1].x, n_coords[1].y, n_coords[1].z);
  const p2 = new THREE.Vector3(n_coords[2].x, n_coords[2].y, n_coords[2].z);
  const p3 = new THREE.Vector3(n_coords[3].x, n_coords[3].y, n_coords[3].z);

  const edges = [
    { pA: p0, pB: p1 },
    { pA: p1, pB: p2 },
    { pA: p2, pB: p3 },
    { pA: p3, pB: p0 }
  ];

  edges.forEach(e => {
    e.dir = new THREE.Vector3().subVectors(e.pB, e.pA);
    e.length = e.dir.length();
    e.dir.normalize();
  });

  // Identificar lados cortos y largos
  let Ls = Infinity;
  let Ll = 0;
  edges.forEach(e => {
    if (e.length < Ls) Ls = e.length;
    if (e.length > Ll) Ll = e.length;
  });

  const arrowColor = loadColor;
  // Si q > 0 (gravedad, peso propio), la fuerza va en -Z (hacia abajo).
  // Si q < 0, la fuerza va en +Z (hacia arriba).
  const fdir = q > 0 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 0, 1);
  const zSign = q > 0 ? 1 : -1; // Para que la línea superior flote sobre la viga.

  // Altura máxima del tributario es Ls / 2
  const tributaryHeight = Ls / 2;
  const maxLoadVal = q * tributaryHeight; // Valor máximo de carga lineal
  const scale = 1.0; // Max visual arrow length
  
  return (
    <group>
      {edges.map((e, idx) => {
        const isShort = Math.abs(e.length - Ls) < 0.1;
        const arrows = [];
        
        // Función para calcular la magnitud en cualquier fracción (0 a 1)
        const getMagAt = (fraction) => {
          if (isShort) {
            if (fraction <= 0.5) return fraction * 2 * maxLoadVal;
            else return (1 - fraction) * 2 * maxLoadVal;
          } else {
            const slopeLen = Ls / 2;
            const dist = fraction * e.length;
            if (dist <= slopeLen) return (dist / slopeLen) * maxLoadVal;
            else if (dist >= e.length - slopeLen) return ((e.length - dist) / slopeLen) * maxLoadVal;
            else return maxLoadVal;
          }
        };

        // Generar flechas a intervalos regulares
        const numArrows = isShort ? 6 : 10;
        for (let j = 0; j <= numArrows; j++) {
          const fraction = j / numArrows;
          const mag = getMagAt(fraction);
          const currentArrowLength = (mag / maxLoadVal) * scale;
          
          if (currentArrowLength > 0.05) {
            const pos = e.pA.clone().add(e.dir.clone().multiplyScalar(e.length * fraction));
            const origin = pos.clone().add(new THREE.Vector3(0, 0, zSign * currentArrowLength));
            arrows.push(<arrowHelper key={`a-${j}`} args={[fdir, origin, currentArrowLength, arrowColor, 0.2, 0.1]} />);
          }
        }

        // Generar la línea perimetral perfecta (Triangle o Trapezoid outline)
        const topPoints = [];
        const keyFractions = isShort ? [0, 0.5, 1.0] : [0, (Ls/2)/e.length, 1 - (Ls/2)/e.length, 1.0];
        
        keyFractions.forEach(fraction => {
          const mag = getMagAt(fraction);
          const currentArrowLength = (mag / maxLoadVal) * scale;
          const pos = e.pA.clone().add(e.dir.clone().multiplyScalar(e.length * fraction));
          const origin = pos.clone().add(new THREE.Vector3(0, 0, zSign * currentArrowLength));
          topPoints.push(origin);
        });

        const lineGeom = new THREE.BufferGeometry().setFromPoints(topPoints);
        
        // Determinar posición del texto
        const midFraction = 0.5;
        const midMag = getMagAt(midFraction);
        const midArrowLen = (midMag / maxLoadVal) * scale;
        const midPos = e.pA.clone().add(e.dir.clone().multiplyScalar(e.length * midFraction));
        midPos.add(new THREE.Vector3(0, 0, zSign * midArrowLen));
        
        // Calcular carga uniforme equivalente (w_eq) para mostrar en el texto
        let w_eq = 0;
        if (isShort) {
          w_eq = q * (Ls / 3.0);
        } else {
          if (Ll > 1e-4) {
            w_eq = q * (Ls / 2.0) * (1.0 - (1.0/3.0) * Math.pow(Ls / Ll, 2));
          }
        }
        
        return (
          <group key={idx}>
            {arrows}
            <line geometry={lineGeom}>
              <lineBasicMaterial color={loadColor} linewidth={2} />
            </line>
            <Text
              position={[midPos.x, midPos.y - 0.2, midPos.z]}
              fontSize={0.22}
              color={textColor}
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
              anchorX="center"
              rotation={[Math.PI / 2, 0, 0]}
            >
              {`${Number(Math.abs(w_eq).toFixed(2))} ${units}/${lenUnit}`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

/**
 * WindMembrane: Visualiza planos semitransparentes de viento sobre la cubierta del galpón.
 * Se muestra solo cuando existen cargas de viento (loadCase 'WX' o 'WY') en el estado.
 */
function WindMembrane() {
  const { loads, nodes, elements, wizardConfig, showLoads } = useStructureStore();
  
  const hasWindX = loads.some(l => l.loadCase === 'WX');
  const hasWindY = loads.some(l => l.loadCase === 'WY');
  
  if (!showLoads || (!hasWindX && !hasWindY)) return null;
  if (!wizardConfig || wizardConfig.type !== 'galpon') return null;
  
  const { bayWidthX: L, floorHeight: E, apexHeight: H, bayWidthY, numBaysY } = wizardConfig;
  const totalY = (numBaysY || 1) * (bayWidthY || 6);
  
  // Generar paneles triangulares del techo (dos vertientes)
  // Vertiente izquierda: (0, 0, E) → (L/2, 0, H) → (L/2, totalY, H) → (0, totalY, E)
  // Vertiente derecha: (L/2, 0, H) → (L, 0, E) → (L, totalY, E) → (L/2, totalY, H)
  
  const slopeLeft = [
    [0,    0,       E],
    [L/2,  0,       H],
    [L/2,  totalY,  H],
    [0,    totalY,  E],
  ];
  const slopeRight = [
    [L/2,  0,       H],
    [L,    0,       E],
    [L,    totalY,  E],
    [L/2,  totalY,  H],
  ];
  
  const makeGeom = (corners) => {
    // Quad → 2 triangles
    const verts = new Float32Array([
      ...corners[0], ...corners[1], ...corners[2],
      ...corners[0], ...corners[2], ...corners[3],
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  };
  
  return (
    <group>
      {/* Membrana Barlovento (WX - izquierda) */}
      {hasWindX && (
        <mesh geometry={makeGeom(slopeLeft)}>
          <meshBasicMaterial
            color="#38bdf8"
            transparent opacity={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {/* Membrana Sotavento (WX - derecha) */}
      {hasWindX && (
        <mesh geometry={makeGeom(slopeRight)}>
          <meshBasicMaterial
            color="#818cf8"
            transparent opacity={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const { cameraView, activeLevel, nodes, projectLoadedTrigger } = useStructureStore();
  const controls = useThree(state => state.controls);

  useEffect(() => {
    if (!controls) return;

    // Calcular el centro geométrico de la estructura
    let cx = 0, cy = 0, cz = 0;
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    if (nodes.length > 0) {
      minX = Infinity; maxX = -Infinity;
      minY = Infinity; maxY = -Infinity;
      minZ = Infinity; maxZ = -Infinity;
      nodes.forEach(n => {
        if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
        if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
      });
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
      cz = (minZ + maxZ) / 2;
    }

    // Effect for centering camera when a new project loads
    if (projectLoadedTrigger > 0) {
      const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 10);
      
      console.log('--- CAMERA ADJUSTMENT ---', { minX, maxX, minY, maxY, minZ, maxZ, cx, cy, cz, span, nodesCount: nodes.length });
      
      if (cameraView === '3D') {
        camera.position.set(cx - span * 1.5, cy - span * 1.5, cz + span * 1.2);
        controls.target.set(cx, cy, cz);
      } else {
        // Orthographic camera needs zoom adjustment to fit the structure
        if (camera.isOrthographicCamera) {
          const aspect = window.innerWidth / window.innerHeight;
          // Calculate zoom such that the span fits in the smaller dimension
          const targetZoom = Math.min(window.innerWidth, window.innerHeight) / (span * 1.5);
          camera.zoom = targetZoom;
          camera.updateProjectionMatrix();
        }
        
        if (cameraView === 'XY') {
          controls.enableRotate = false;
          camera.position.set(cx, cy, activeLevel + 100);
          camera.up.set(0, 1, 0);
          controls.target.set(cx, cy, activeLevel);
        } else if (cameraView === 'XZ') {
          controls.enableRotate = false;
          camera.position.set(cx, activeLevel - 100, cz);
          camera.up.set(0, 0, 1);
          controls.target.set(cx, activeLevel, cz);
        } else if (cameraView === 'YZ') {
          controls.enableRotate = false;
          camera.position.set(activeLevel + 100, cy, cz);
          camera.up.set(0, 0, 1);
          controls.target.set(activeLevel, cy, cz);
        }
      }
      controls.update();
      return;
    }

    if (cameraView === '3D') {
      controls.enableRotate = true;
      // Posición isométrica predeterminada si venimos de 2D
      if (camera.isOrthographicCamera) {
        controls.target.set(cx, cy, cz);
      }
    } else if (cameraView === 'XY') {
      controls.enableRotate = false;
      camera.position.set(cx, cy, activeLevel + 100);
      camera.up.set(0, 1, 0); // Para que Y sea arriba
      controls.target.set(cx, cy, activeLevel);
    } else if (cameraView === 'XZ') {
      controls.enableRotate = false;
      camera.position.set(cx, activeLevel - 100, cz);
      camera.up.set(0, 0, 1); // Z es arriba
      controls.target.set(cx, activeLevel, cz);
    } else if (cameraView === 'YZ') {
      controls.enableRotate = false;
      camera.position.set(activeLevel + 100, cy, cz);
      camera.up.set(0, 0, 1); // Z es arriba
      controls.target.set(activeLevel, cy, cz);
    }
    controls.update();
  }, [cameraView, activeLevel, controls, camera, nodes, projectLoadedTrigger]);

  return null;
}

// Controlador de Selección por Ventana
function SelectionHandler() {
  const { gl, camera } = useThree();
  const { 
    setSelectionBox, setSelectedIds
  } = useStructureStore();
  
  // Tolerancia para vistas 2D (reutilizada)
  const TOLERANCE = 0.15; // tolerancia amplia para comparaciones de float
  const isNodeActive = (n, cameraView, activeLevel) => {
    if (cameraView === '3D') return true;
    if (cameraView === 'XY') return Math.abs(n.z - activeLevel) <= TOLERANCE;
    if (cameraView === 'XZ') return Math.abs(n.y - activeLevel) <= TOLERANCE;
    if (cameraView === 'YZ') return Math.abs(n.x - activeLevel) <= TOLERANCE;
    return true;
  };

  useEffect(() => {
    const canvas = gl.domElement;
    let isDragging = false;
    let startPos = { x: 0, y: 0 };

    const onPointerDown = (e) => {
      // Ignorar si el clic no es directamente en el canvas (ej. paneles superpuestos)
      if (e.target !== canvas) return;
      if (e.button !== 0) return;
      isDragging = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      startPos = { x, y };
      setSelectionBox({ isSelecting: true, startX: x, startY: y, endX: x, endY: y, mode: 'window' });
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const mode = x >= startPos.x ? 'window' : 'crossing';
      setSelectionBox({ endX: x, endY: y, mode });
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      
      const dist = Math.hypot(endX - startPos.x, endY - startPos.y);
      if (dist < 5) {
        setSelectionBox({ isSelecting: false });
        return;
      }
      
      const state = useStructureStore.getState();
      const { 
        nodes: freshNodes, 
        elements: freshElements, 
        shells: freshShells, 
        cameraView: freshView, 
        activeLevel: freshLevel,
        selectedIds: freshSelected,
        viewMode: freshViewMode
      } = state;

      if (freshViewMode === 'results') {
        setSelectionBox({ isSelecting: false });
        return;
      }
      
      const minX = Math.min(startPos.x, endX);
      const maxX = Math.max(startPos.x, endX);
      const minY = Math.min(startPos.y, endY);
      const maxY = Math.max(startPos.y, endY);
      const mode = endX >= startPos.x ? 'window' : 'crossing';
      
      const TOL = 0.15;
      const isActive = (n) => {
        if (freshView === '3D') return true;
        if (freshView === 'XY') return Math.abs(n.z - freshLevel) <= TOL;
        if (freshView === 'XZ') return Math.abs(n.y - freshLevel) <= TOL;
        if (freshView === 'YZ') return Math.abs(n.x - freshLevel) <= TOL;
        return true;
      };

      const isPointInside = (nx, ny, nz, margin = 0) => {
        const p = new THREE.Vector3(nx, ny, nz);
        p.project(camera);
        const px = (p.x * 0.5 + 0.5) * rect.width;
        const py = (p.y * -0.5 + 0.5) * rect.height;
        return px >= minX - margin && px <= maxX + margin && py >= minY - margin && py <= maxY + margin;
      };

      const newSelected = new Set(e.shiftKey || e.ctrlKey ? freshSelected : []);

      freshNodes.forEach(n => {
        if (!isActive(n)) return;
        // Usar margen de 4px para nodos para facilitar su selección
        if (isPointInside(n.x, n.y, n.z, 4)) {
          newSelected.add(n.id);
        }
      });

      freshElements.forEach(el => {
        const n1 = freshNodes.find(n => n.id === el.nodes[0]);
        const n2 = freshNodes.find(n => n.id === el.nodes[1]);
        if (!n1 || !n2) return;
        if (!isActive(n1) || !isActive(n2)) return;

        const in1 = isPointInside(n1.x, n1.y, n1.z);
        const in2 = isPointInside(n2.x, n2.y, n2.z);

        if (mode === 'window') {
          if (in1 && in2) newSelected.add(el.id);
        } else {
          if (in1 || in2) {
            newSelected.add(el.id);
          } else {
            const mx = (n1.x + n2.x) / 2;
            const my = (n1.y + n2.y) / 2;
            const mz = (n1.z + n2.z) / 2;
            if (isPointInside(mx, my, mz)) newSelected.add(el.id);
          }
        }
      });
      
      console.log("[SELECTION DEBUG] Mode:", mode, "Selected count:", newSelected.size, "Selected IDs:", Array.from(newSelected));

      freshShells.forEach(s => {
        const shellNodes = s.nodes.map(nid => freshNodes.find(n => n.id === nid)).filter(Boolean);
        if (shellNodes.length === 0) return;
        if (freshView !== '3D' && !shellNodes.every(n => isActive(n))) return;

        const insides = shellNodes.map(n => isPointInside(n.x, n.y, n.z));
        const allInside = insides.every(val => val === true);
        const someInside = insides.some(val => val === true);

        if (mode === 'window' && allInside) {
          newSelected.add(s.id);
        } else if (mode === 'crossing' && someInside) {
          newSelected.add(s.id);
        } else if (mode === 'crossing' && !someInside) {
          let cx = 0, cy = 0, cz = 0;
          shellNodes.forEach(n => { cx += n.x; cy += n.y; cz += n.z; });
          cx /= shellNodes.length; cy /= shellNodes.length; cz /= shellNodes.length;
          if (isPointInside(cx, cy, cz)) newSelected.add(s.id);
        }
      });

      setSelectedIds(Array.from(newSelected));
      setSelectionBox({ isSelecting: false });
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, camera, setSelectionBox, setSelectedIds]);

  return null;
}

function GlobalAxes() {
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const dirX = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const dirY = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const dirZ = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  
  return (
    <group position={[0, 0, 0]}>
      <arrowHelper args={[dirX, origin, 1.5, 0xef4444, 0.3, 0.2]} />
      <arrowHelper args={[dirY, origin, 1.5, 0x22c55e, 0.3, 0.2]} />
      <arrowHelper args={[dirZ, origin, 1.5, 0x3b82f6, 0.3, 0.2]} />
      <Text position={[1.8, 0, 0]} fontSize={0.25} color="#ef4444">X</Text>
      <Text position={[0, 1.8, 0]} fontSize={0.25} color="#22c55e">Y</Text>
      <Text position={[0, 0, 1.8]} fontSize={0.25} color="#3b82f6">Z</Text>
    </group>
  );
}

function GridAxes() {
  const { nodes, viewMode } = useStructureStore();
  
  const uniqueX = useMemo(() => {
    const xs = [...new Set(nodes.filter(n => !n.cantilever).map(n => Math.round(n.x * 10) / 10))];
    return xs.sort((a, b) => a - b);
  }, [nodes]);

  const uniqueY = useMemo(() => {
    const ys = [...new Set(nodes.filter(n => !n.cantilever).map(n => Math.round(n.y * 10) / 10))];
    return ys.sort((a, b) => a - b); // Ascendente para que A parta de Y menor (hacia arriba)
  }, [nodes]);

  if (uniqueX.length === 0 || uniqueY.length === 0 || viewMode === 'results') return null;

  const minX = uniqueX[0] - 2;
  const maxX = uniqueX[uniqueX.length - 1] + 2;
  const minY = uniqueY[0] - 2;
  const maxY = uniqueY[uniqueY.length - 1] + 2;

  // Dibujar al nivel de la base
  const minZ = nodes.reduce((min, n) => Math.min(min, n.z), 0);

  return (
    <group position={[0, 0, minZ - 0.05]}>
      {uniqueX.map((x, i) => {
        const pts = [new THREE.Vector3(x, minY, 0), new THREE.Vector3(x, maxY, 0)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <group key={`gx-${i}`}>
            <line geometry={geo}>
              <lineBasicMaterial color="#0891b2" transparent opacity={0.6} />
            </line>
            {/* Burbuja inferior */}
            <mesh position={[x, minY - 0.6, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshBasicMaterial color="#1e293b" />
              <mesh position={[0, 0, -0.01]}>
                 <circleGeometry args={[0.45, 32]} />
                 <meshBasicMaterial color="#475569" />
              </mesh>
              <Text position={[0, 0, 0.01]} fontSize={0.4} color="#94a3b8">{i + 1}</Text>
            </mesh>
          </group>
        );
      })}

      {uniqueY.map((y, i) => {
        const pts = [new THREE.Vector3(minX, y, 0), new THREE.Vector3(maxX, y, 0)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <group key={`gy-${i}`}>
            <line geometry={geo}>
              <lineBasicMaterial color="#0891b2" transparent opacity={0.6} />
            </line>
            {/* Burbuja izquierda */}
            <mesh position={[minX - 0.6, y, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshBasicMaterial color="#1e293b" />
              <mesh position={[0, 0, -0.01]}>
                 <circleGeometry args={[0.45, 32]} />
                 <meshBasicMaterial color="#475569" />
              </mesh>
              <Text position={[0, 0, 0.01]} fontSize={0.4} color="#94a3b8">{String.fromCharCode(65 + i)}</Text>
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ConnectionDetails() {
  const { config, elements, nodes, renderExtruded, viewMode } = useStructureStore();
  
  if (config?.type !== 'galpon' || config?.galponType !== 'Tapered' || !renderExtruded || viewMode === 'results') return null;

  const connections = [];
  const P = config.roofPanels || 4;
  
  const plateMat = new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.7, roughness: 0.3 });
  const boltMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.9, roughness: 0.2 });
  
  const baseBox = new THREE.BoxGeometry(0.5, 0.5, 0.03);
  const boltCyl = new THREE.CylinderGeometry(0.015, 0.015, 0.15);
  const leftPlateGeo = new THREE.BoxGeometry(0.02, 0.22, 0.9);
  const rightPlateGeo = new THREE.BoxGeometry(0.02, 0.22, 0.9);
  const apexPlate = new THREE.BoxGeometry(0.03, 0.22, 0.5);
  const diagStiffener = new THREE.BoxGeometry(0.2, 0.01, 0.5);

  for (let y = 0; y <= config.numBaysY; y++) {
    const frame = config._galponNodes?.[y];
    if (!frame) continue;

    // Base Plates
    [frame.base[0], frame.base[1]].forEach(bn => {
      if (!bn) return;
      connections.push(
        <mesh key={`bp_${bn.id}_${y}`} position={[bn.x, bn.y, bn.z + 0.015]} geometry={baseBox} material={plateMat} />
      );
      [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]].forEach((off, i) => {
        connections.push(
          <mesh key={`blt_${bn.id}_${y}_${i}`} position={[bn.x + off[0], bn.y + off[1], bn.z + 0.075]} rotation={[Math.PI/2, 0, 0]} geometry={boltCyl} material={boltMat} />
        );
      });
    });

    // Knee End Plates
    const kneeL = frame.uc[0];
    if (kneeL) {
       connections.push(
         <mesh key={`ep_l_${kneeL.id}_${y}`} position={[kneeL.x, kneeL.y, kneeL.z - 0.4]} geometry={leftPlateGeo} material={plateMat} />
       );
       // Diagonal Knee Stiffener
       const diagMesh = <mesh key={`stf_l_${kneeL.id}_${y}`} position={[kneeL.x + 0.1, kneeL.y, kneeL.z - 0.4]} rotation={[0, -Math.PI/4, 0]} geometry={diagStiffener} material={plateMat} />;
       connections.push(diagMesh);
    }
    
    const kneeR = frame.uc[2*P];
    if (kneeR) {
       connections.push(
         <mesh key={`ep_r_${kneeR.id}_${y}`} position={[kneeR.x, kneeR.y, kneeR.z - 0.4]} geometry={rightPlateGeo} material={plateMat} />
       );
       const diagMesh = <mesh key={`stf_r_${kneeR.id}_${y}`} position={[kneeR.x - 0.1, kneeR.y, kneeR.z - 0.4]} rotation={[0, Math.PI/4, 0]} geometry={diagStiffener} material={plateMat} />;
       connections.push(diagMesh);
    }
    
    // Apex Connections
    const apex = frame.uc[P];
    if (apex) {
       connections.push(
         <mesh key={`apx_${apex.id}_${y}`} position={[apex.x, apex.y, apex.z - 0.22]} geometry={apexPlate} material={plateMat} />
       );
       // Horizontal Stiffeners at Apex
       const horizStiff = new THREE.BoxGeometry(0.3, 0.2, 0.01);
       connections.push(
         <mesh key={`stf_a1_${apex.id}_${y}`} position={[apex.x, apex.y, apex.z - 0.15]} geometry={horizStiff} material={plateMat} />
       );
       connections.push(
         <mesh key={`stf_a2_${apex.id}_${y}`} position={[apex.x, apex.y, apex.z - 0.35]} geometry={horizStiff} material={plateMat} />
       );
    }
  }

  return <group>{connections}</group>;
}

export function StructureCanvas() {
  const { 
    nodes, elements, shells, openings, viewMode, showLoads, loads, 
    activeResultCombo, activeResultType, diagramScale, results,
    cameraView, activeLevel, isDrawingShell, isQuickDrawingShell, clearSelection,
    displacementScale, materials, metadata
  } = useStructureStore();

  useEffect(() => {
    window.diagnoseShellRizado = (shellId = null) => diagnoseShellRizado(useStructureStore, shellId);
    window.quickCheckDoubleRendering = quickCheckDoubleRendering;
    window.exportMeshDebugData = (shellId) => exportMeshDebugData(useStructureStore, shellId);
    window.useStructureStore = useStructureStore;
    
    return () => {
      delete window.diagnoseShellRizado;
      delete window.quickCheckDoubleRendering;
      delete window.exportMeshDebugData;
      delete window.useStructureStore;
    };
  }, []);

  // Auto-escala para Deformada: limita el desplazamiento visual máximo al 12% de la estructura
  const autoDeformedScale = useMemo(() => {
    if (viewMode !== 'results' || !results || !activeResultCombo || activeResultType !== 'deformed') return 1;
    const comboResults = results.results[activeResultCombo];
    if (!comboResults?.displacements) return 1;

    let maxDisp = 0;
    Object.values(comboResults.displacements).forEach(d => {
      const mag = Math.sqrt(d[0]*d[0] + d[1]*d[1] + d[2]*d[2]);
      if (mag > maxDisp) maxDisp = mag;
    });

    if (maxDisp < 1e-10) return 1;

    // Calcular dimensión máxima de la estructura
    let minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
      if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
    });
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 10;

    // Desplazamiento visual máximo = 12% de la dimensión máxima
    const targetDisp = maxDim * 0.12;
    const baseScale = targetDisp / maxDisp;

    return baseScale;
  }, [results, activeResultCombo, activeResultType, viewMode, nodes]);


  const getDisplacement = React.useCallback((nodeId) => {
    if (viewMode === 'results' && results && activeResultCombo && activeResultType === 'deformed') {
      const comboResults = results.results[activeResultCombo];
      if (comboResults && comboResults.displacements && comboResults.displacements[nodeId]) {
        const d = comboResults.displacements[nodeId];
        // autoDeformedScale normaliza la deformada al 12% de la estructura.
        // El slider del usuario (1..500) se usa como multiplicador relativo: valor base = 100 → ×1.0
        const finalScale = autoDeformedScale * (displacementScale / 100);
        return [d[0] * finalScale, d[1] * finalScale, d[2] * finalScale];
      }
    }
    return [0, 0, 0];
  }, [viewMode, results, activeResultCombo, activeResultType, displacementScale, autoDeformedScale]);



  // Tolerancia para considerar si un elemento está en el nivel activo
  const TOLERANCE = 0.15;

  const isNodeActive = (n) => {
    if (cameraView === '3D') return true;
    if (cameraView === 'XY') return Math.abs(n.z - activeLevel) <= TOLERANCE;
    if (cameraView === 'XZ') return Math.abs(n.y - activeLevel) <= TOLERANCE;
    if (cameraView === 'YZ') return Math.abs(n.x - activeLevel) <= TOLERANCE;
    return true;
  };

  // Auto-scale para diagramas (asegura que siempre sean visibles sin importar las unidades)
  const autoDiagramScale = useMemo(() => {
    if (viewMode !== 'results' || !results || !activeResultCombo || activeResultType === 'deformed') return 0.0001;
    
    const comboResults = results.results[activeResultCombo];
    if (!comboResults || !comboResults.element_forces) return 0.0001;

    let maxAbsVal = 0;
    Object.values(comboResults.element_forces).forEach(stations => {
      stations.forEach(st => {
        const val = Math.abs(st[activeResultType] || 0);
        if (val > maxAbsVal) maxAbsVal = val;
      });
    });

    if (maxAbsVal < 1e-8) return 0.0001;

    let minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
      if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
    });
    
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 10;
    const targetHeight = maxDim * 0.15; // 15% de la dimensión máxima de la estructura
    return targetHeight / maxAbsVal;
  }, [results, activeResultCombo, activeResultType, viewMode, nodes]);

  const isElementActive = (n1, n2) => {
    if (cameraView === '3D') return true;
    return isNodeActive(n1) && isNodeActive(n2);
  };

  // Posición de la grilla
  const gridPosition = [
    cameraView === 'YZ' ? activeLevel : 0,
    cameraView === 'XZ' ? activeLevel : 0,
    cameraView === 'XY' ? activeLevel : 0
  ];
  
  const gridRotation = [
    cameraView === 'XY' || cameraView === '3D' ? Math.PI / 2 : 0, // XY es plano horizontal
    cameraView === 'YZ' ? Math.PI / 2 : 0, // YZ rota en Y
    0
  ];
  if (cameraView === 'XZ') {
    gridRotation[0] = 0; // XZ plano frontal
  }

  const handleQuickDrawClick = (point) => {
    if (!isQuickDrawingShell) return;
    
    // We only support drawing on the active XY plane for now
    if (cameraView !== '3D' && cameraView !== 'XY') return;
    
    const px = point.x;
    const py = point.y;
    const pz = activeLevel;

    // Find bounding uniqueX and uniqueY, including cantilevers so we can draw on them
    const uniqueX = [...new Set(nodes.filter(n => Math.abs(n.z - pz) < 0.1).map(n => Math.round(n.x * 10) / 10))].sort((a,b) => a - b);
    const uniqueY = [...new Set(nodes.filter(n => Math.abs(n.z - pz) < 0.1).map(n => Math.round(n.y * 10) / 10))].sort((a,b) => a - b);

    let xLeft = null, xRight = null;
    for(let i=0; i<uniqueX.length - 1; i++) {
      if (px >= uniqueX[i] && px <= uniqueX[i+1]) {
        xLeft = uniqueX[i]; xRight = uniqueX[i+1]; break;
      }
    }

    let yBottom = null, yTop = null;
    for(let i=0; i<uniqueY.length - 1; i++) {
      if (py >= uniqueY[i] && py <= uniqueY[i+1]) {
        yBottom = uniqueY[i]; yTop = uniqueY[i+1]; break;
      }
    }

    if (xLeft === null || xRight === null || yBottom === null || yTop === null) {
      return; // Clic fuera de la cuadrícula válida
    }

    const corners = [
      {x: xLeft, y: yBottom, z: pz},
      {x: xRight, y: yBottom, z: pz},
      {x: xRight, y: yTop, z: pz},
      {x: xLeft, y: yTop, z: pz}
    ];

    const currentState = useStructureStore.getState();
    const newNodes = [...currentState.nodes];
    const shellNodeIds = [];

    // Verify all 4 corners exist. If not, the user clicked in an empty space (e.g. adjacent to a cantilever)
    const existingNodes = corners.map(c => newNodes.find(n => Math.abs(n.x - c.x) < 0.1 && Math.abs(n.y - c.y) < 0.1 && Math.abs(n.z - c.z) < 0.1));
    
    if (existingNodes.some(n => !n)) {
      toast.error('No hay nudos definidos en esta ubicación para crear una losa.');
      return;
    }

    existingNodes.forEach(existing => {
      shellNodeIds.push(existing.id);
    });

    // Prevenir losas duplicadas (overlapping exacto)
    const sortedNewNodes = [...shellNodeIds].sort();
    const isDuplicate = currentState.shells.some(s => {
      if (s.nodes.length !== sortedNewNodes.length) return false;
      const sortedExisting = [...s.nodes].sort();
      return sortedNewNodes.every((val, index) => val === sortedExisting[index]);
    });

    if (isDuplicate) {
      toast.error('No es posible dibujar una losa sobre otra existente en el mismo espacio exacto.', { duration: 4000 });
      return;
    }

    const shellId = `S${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const newShell = {
      id: shellId,
      type: 'shell',
      nodes: shellNodeIds,
      thickness: 0.15,
      material_id: currentState.materials[0]?.id || 'conc',
      loads: { CM: 0, CV: 0 }
    };

    useStructureStore.setState({
      nodes: newNodes,
      shells: [...currentState.shells, newShell],
      isSaved: false
    });
  };

  const shellHeatmapRange = useMemo(() => {
    if (viewMode !== 'results' || !activeResultCombo || !activeResultType?.startsWith('Shell_')) return null;
    const comboResults = results?.results?.[activeResultCombo];
    if (!comboResults || !comboResults.shell_forces) return null;

    const prop = activeResultType.replace('Shell_', '');
    let vMin = Infinity;
    let vMax = -Infinity;
    
    shells.forEach(shell => {
      const meshElems = shell.mesh?.elements || [];
      meshElems.forEach(el => {
        const forces = comboResults.shell_forces[el.id];
        if (forces && forces[prop] !== undefined) {
          const v = forces[prop];
          if (isFinite(v)) {
            if (v < vMin) vMin = v;
            if (v > vMax) vMax = v;
          }
        }
      });
    });

    if (!isFinite(vMin) || !isFinite(vMax)) return null;
    return { min: vMin, max: vMax, prop };
  }, [viewMode, activeResultCombo, activeResultType, results, shells]);

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas 
        onPointerMissed={() => {
          if (!isDrawingShell && viewMode !== 'results') clearSelection();
        }}
      >
        {cameraView === '3D' ? (
          <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={35} up={[0, 0, 1]} />
        ) : (
          <OrthographicCamera makeDefault zoom={20} up={cameraView === 'XY' ? [0, 1, 0] : [0, 0, 1]} />
        )}
        <CameraController />
        <CoordinateTracker />
        
        <color attach="background" args={['#000000']} />
        <Grid infiniteGrid fadeDistance={cameraView === '3D' ? 40 : 100} cellColor="#1e293b" sectionColor="#334155" rotation={gridRotation} position={gridPosition} />
        
        {/* Plano invisible para capturar clics en Quick Draw Area */}
        {isQuickDrawingShell && (
          <mesh 
            rotation={[0, 0, 0]} 
            position={[0, 0, activeLevel]} 
            onPointerDown={(e) => {
              e.stopPropagation();
              handleQuickDrawClick(e.point);
            }}
          >
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )}

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        
        <GlobalAxes />
        <GridAxes />
        <ConnectionDetails />

        {/* Sombra (Wireframe original) - Solo en modo resultados */}
        {viewMode === 'results' && (
          <group>
            {elements.map(el => {
              const n1 = nodes.find(n => n.id === el.nodes[0]);
              const n2 = nodes.find(n => n.id === el.nodes[1]);
              return n1 && n2 && (
                <FrameElement key={`shadow-${el.id}`} id={el.id} start={[n1.x, n1.y, n1.z]} end={[n2.x, n2.y, n2.z]} isShadow />
              );
            })}
          </group>
        )}

        {/* Nodos */}
        {nodes.map(n => {
          // Solo aplicar desplazamiento al nudo si estamos en vista Deformada
          const d = activeResultType === 'deformed' ? getDisplacement(n.id) : [0, 0, 0];
          const active = isNodeActive(n);
          // En vista 2D: omitir completamente los nodos de otros niveles
          if (!active && cameraView !== '3D') return null;
          return <NodePoint key={n.id} {...n} dx={d[0]} dy={d[1]} dz={d[2]} restraint={n.restraint} isFaded={false} />;
        })}

        {/* Cargas */}
        {showLoads && (() => {
          const visualLoads = [];
          const frameLoadsMap = new Map();

          loads.forEach(load => {
            if ((load.type !== 'distributed' && load.type !== 'frame') || !load.loadCase || !load.loadCase.startsWith('W')) {
              visualLoads.push(load);
              return;
            }
            const key = `${load.target_id}_${load.loadCase}`;
            if (!frameLoadsMap.has(key)) frameLoadsMap.set(key, []);
            frameLoadsMap.get(key).push(load);
          });

          frameLoadsMap.forEach((grp, key) => {
            if (grp.length === 1) {
              visualLoads.push(grp[0]);
            } else {
              let qx = 0, qy = 0, qz = 0;
              grp.forEach(l => {
                if (l.dir === 'X') qx += l.q1;
                if (l.dir === 'Y') qy += l.q1;
                if (l.dir === 'Z') qz += l.q1;
              });
              const vec = new THREE.Vector3(qx, qy, qz);
              const val = vec.length();
              if (val > 1e-4) {
                vec.normalize();
                visualLoads.push({
                  ...grp[0],
                  id: `grouped_${key}`,
                  dir: 'Custom',
                  vector: [vec.x, vec.y, vec.z],
                  q1: val,
                  q2: val
                });
              }
            }
          });

          return visualLoads.map(load => {
            if (load.type === 'point') {
            const targetNode = nodes.find(n => n.id === load.target_id);
            if (!targetNode || !isNodeActive(targetNode)) return null;
            return <PointLoadArrow key={load.id} node={targetNode} load={load} />;
          } else if (load.type === 'distributed' || load.type === 'point_frame' || load.type === 'frame') {
            const targetElem = elements.find(e => e.id === load.target_id);
            if (!targetElem) return null;
            const n1 = nodes.find(n => n.id === targetElem.nodes[0]);
            const n2 = nodes.find(n => n.id === targetElem.nodes[1]);
            if (!n1 || !n2 || (!isNodeActive(n1) && !isNodeActive(n2))) return null;
            return <FrameLoadGraphic key={load.id} element={targetElem} load={load} nodes={nodes} />;
          } else if (load.type === 'point_shell') {
            const shell = shells.find(s => s.id === load.target_id);
            if (!shell) return null;
            
            const shellNodes = shell.nodes.map(nid => nodes.find(n => n.id === nid)).filter(Boolean);
            if (shellNodes.length === 0) return null;
            const z = shellNodes[0].z;
            
            const pos = {
              x: load.offset_x || 0,
              y: load.offset_y || 0,
              z: z,
              id: `virtual_${load.id}`
            };
            
            return <PointLoadArrow key={load.id} node={pos} load={load} />;
          } else if (load.type === 'area_shell') {
            const shell = shells.find(s => s.id === load.target_id);
            if (!shell) return null;
            
            const shellNodes = shell.nodes.map(nid => nodes.find(n => n.id === nid)).filter(Boolean);
            if (shellNodes.length === 0) return null;
            const z = shellNodes[0].z;
            
            const minX = Math.min(load.offset_x, load.end_x);
            const maxX = Math.max(load.offset_x, load.end_x);
            const minY = Math.min(load.offset_y, load.end_y);
            const maxY = Math.max(load.offset_y, load.end_y);
            
            const w = maxX - minX;
            const h = maxY - minY;
            const cx = minX + w / 2;
            const cy = minY + h / 2;
            
            return (
              <group key={load.id} position={[cx, cy, z + 0.05]}>
                <mesh>
                  <planeGeometry args={[w, h]} />
                  <meshBasicMaterial color="#f97316" transparent opacity={0.4} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 0, 0.01]}>
                  <planeGeometry args={[w, h]} />
                  <meshBasicMaterial color="#ea580c" wireframe />
                </mesh>
                <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
                  <div className="bg-orange-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none whitespace-nowrap">
                    Qz: {load.fz}
                  </div>
                </Html>
              </group>
            );
          }
          return null;
        });
      })()}

        {/* Cargas Virtuales de Losas (Líneas de Rotura) */}
        {showLoads && shells.map(shell => {
          const mat = materials.find(m => m.id === shell.material_id) || materials[0];
          const density = mat?.weightVol || mat?.density || 2400;
          const pp = shell.thickness * density;
          const cm = shell.loads?.CM || 0;
          const cv = shell.loads?.CV || 0;
          const q = pp + cm + cv;
          
          if (q === 0) return null;
          
          const units = metadata?.units?.split(',')[1]?.trim() || 'kgf';
          const lenUnit = metadata?.units?.split(',')[0]?.trim() || 'm';

          return (
            <SlabLoadGraphic 
              key={`slab-load-${shell.id}`} 
              shell={shell} 
              nodes={nodes} 
              q={q} 
              units={units} 
              lenUnit={lenUnit} 
            />
          );
        })}
        
        {/* Elementos y Diagramas */}
        {elements.map(el => {
          const n1 = nodes.find(n => n.id === el.nodes[0]);
          const n2 = nodes.find(n => n.id === el.nodes[1]);
          if (!n1 || !n2) return null;
          
          const d1 = getDisplacement(n1.id);
          const d2 = getDisplacement(n2.id);
          const active = isElementActive(n1, n2);
          // En vista 2D: omitir completamente los elementos de otros niveles
          if (!active && cameraView !== '3D') return null;
          
          let elementForces = null;
          // Sólo renderizar diagramas de barras si el resultado NO es de losas y NO es deformada
          if (viewMode === 'results' && activeResultCombo && activeResultType !== 'deformed' && !activeResultType.startsWith('Shell_')) {
            const comboResults = results?.results[activeResultCombo];
            if (comboResults?.element_forces) {
              elementForces = comboResults.element_forces[el.id];
            }
          }

          return (
            <group key={el.id}>
              {/* Línea del elemento - con deformada solo en modo deformed */}
              <FrameElement 
                id={el.id} 
                start={activeResultType === 'deformed' ? [n1.x+d1[0], n1.y+d1[1], n1.z+d1[2]] : [n1.x, n1.y, n1.z]} 
                end={activeResultType === 'deformed' ? [n2.x+d2[0], n2.y+d2[1], n2.z+d2[2]] : [n2.x, n2.y, n2.z]} 
                isFaded={false}
              />
              
              {/* Diagrama de esfuerzos */}
              {elementForces && active && (
                <ForceDiagram 
                  id={el.id}
                  start={[n1.x, n1.y, n1.z]} // Los diagramas se dibujan sobre la estructura no deformada
                  end={[n2.x, n2.y, n2.z]}
                  stations={elementForces}
                  resultType={activeResultType}
                  scale={diagramScale * autoDiagramScale} // Escala calculada dinámicamente + factor del usuario
                />
              )}
            </group>
          );
        })}

        {/* Shells */}
        {shells.map(s => {
          const shellNodes = s.nodes.map(nid => nodes.find(n => n.id === nid)).filter(Boolean);
          const active = cameraView === '3D' || shellNodes.every(n => isNodeActive(n));
          // En vista 2D: omitir shells de otros niveles
          if (!active && cameraView !== '3D') return null;
          return <ShellMesh key={s.id} id={s.id} nodeIds={s.nodes} getDisplacement={getDisplacement} isFaded={false} mesh={s.mesh} results={results} activeResultType={activeResultType} globalRange={shellHeatmapRange} displacementScale={displacementScale} />;
        })}

        {/* Membrana de viento: planos semitransparentes sobre cubierta cuando hay cargas de viento */}
        <WindMembrane />


        {/* OrbitControls Mapeado al Clic Derecho (Estilo ETABS) */}
        <OrbitControls 
          makeDefault 
          mouseButtons={{ 
            LEFT: THREE.MOUSE.NONE,    // Izquierdo para selección
            MIDDLE: THREE.MOUSE.PAN,   // Medio para paneo
            RIGHT: THREE.MOUSE.ROTATE  // Derecho para rotar
          }}
        />
        
        <SelectionHandler />
        
      </Canvas>

      {/* Heatmap Legend */}
      {shellHeatmapRange && (
        <div className="absolute top-1/2 -translate-y-1/2 left-6 bg-slate-900/80 border border-slate-700 backdrop-blur-md rounded-md p-4 shadow-xl z-10 flex flex-col items-center pointer-events-none">
          <div className="text-slate-300 text-xs font-bold mb-3 tracking-wider border-b border-slate-600 pb-1 w-full text-center">
            {activeResultCombo} / {shellHeatmapRange.prop}
          </div>
          <div className="flex flex-col-reverse items-start shadow-inner border border-slate-700 bg-slate-800">
            {Array.from({ length: 11 }).map((_, i) => {
              const numBands = 11;
              const discreteRatio = i / (numBands - 1);
              const hue = (1 - discreteRatio) * 240;
              const bgColor = `hsl(${hue}, 100%, 50%)`;
              const value = shellHeatmapRange.min + discreteRatio * (shellHeatmapRange.max - shellHeatmapRange.min);
              return (
                <div key={i} className="flex items-center w-full">
                  <div className="w-6 h-5" style={{ background: bgColor }} />
                  <div className="ml-2 text-slate-200 text-[10px] font-mono font-bold whitespace-nowrap pr-2">
                    {value.toExponential(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}