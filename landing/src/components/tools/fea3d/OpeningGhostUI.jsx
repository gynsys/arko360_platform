import React, { useState, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStructureStore } from './useStructureStore';
import { SlabOpeningGenerator, OpeningType } from './SlabOpeningGenerator';

export function OpeningGhostUI() {
  const { isDrawingOpening, setDrawingOpening, shells, nodes, addOpening } = useStructureStore();
  const { camera, raycaster, pointer, scene } = useThree();
  
  const [ghostPos, setGhostPos] = useState(new THREE.Vector3(0, 0, 0));
  const [frozen, setFrozen] = useState(false);
  const [valW, setValW] = useState("2");
  const [valL, setValL] = useState("3");
  const [params, setParams] = useState({ w: 2, l: 3 });
  const [openingType, setOpeningType] = useState(OpeningType.LINEAR);
  const [closestSlab, setClosestSlab] = useState(null);

  // Generar polígono local
  const localPolygon = SlabOpeningGenerator.generatePolygon(openingType, { width: params.w, length: params.l });
  
  // Convertir a puntos 3D para la línea (cerrar el loop añadiendo el primer punto al final)
  const linePoints = [...localPolygon, localPolygon[0]].map(p => new THREE.Vector3(p.x, p.y, 0));

  useEffect(() => {
    if (!isDrawingOpening) {
      setFrozen(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawingOpening(false);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setFrozen(prev => !prev);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (closestSlab) {
          commitOpening();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingOpening, closestSlab, ghostPos, params, openingType]);

  const commitOpening = () => {
    // Validar y registrar
    addOpening({
      type: openingType,
      polygon: { vertices: localPolygon },
      hostSlabId: closestSlab.id,
      globalPosition: { x: ghostPos.x, y: ghostPos.y, z: ghostPos.z }
    });
    setDrawingOpening(false);
  };

  useFrame(() => {
    if (!isDrawingOpening || frozen) return;

    // Raycast a los planos (shells)
    raycaster.setFromCamera(pointer, camera);
    // Para simplificar, interceptamos el plano Z = nivel activo o Z=0 si no hay
    // Mejor: interceptar los meshes de los shells
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Filtrar objetos que sean losas (requiere que las losas tengan userData.isShell)
    // Por ahora, usamos el plano Z más cercano o un rayo matematico
    const shellIntersects = intersects.filter(i => i.object.userData && i.object.userData.shellId);
    
    if (shellIntersects.length > 0) {
      const hit = shellIntersects[0];
      setGhostPos(hit.point.clone().setZ(hit.point.z + 0.01)); // Leve offset para evitar Z-fighting
      
      const slabId = hit.object.userData.shellId;
      const slab = shells.find(s => s.id === slabId);
      setClosestSlab(slab || null);
    } else {
      // Si no toca losa, proyectar en Z=0 temporalmente
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      if (target) {
        setGhostPos(target);
        setClosestSlab(null);
      }
    }
  });

  if (!isDrawingOpening) return null;

  return (
    <group position={ghostPos}>
      {/* Polígono fantasma */}
      <Line
        points={linePoints}
        color={closestSlab ? "red" : "gray"}
        lineWidth={2}
        dashed={true}
        dashScale={50}
        dashSize={1}
        dashOffset={0}
      />
      <mesh>
        <shapeGeometry args={[new THREE.Shape(localPolygon.map(p => new THREE.Vector2(p.x, p.y)))]} />
        <meshBasicMaterial color={closestSlab ? "red" : "gray"} opacity={0.3} transparent depthTest={false} side={THREE.DoubleSide} />
      </mesh>

      {/* UI Flotante si está congelado */}
      {frozen && (
        <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
          <div 
            className="bg-slate-800 p-3 rounded-lg border border-slate-600 shadow-xl flex flex-col gap-2 w-48 pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-slate-300 font-bold mb-1">Configurar Abertura</div>
            
            <select 
              className="bg-slate-900 border border-slate-700 text-white text-xs p-1 rounded"
              value={openingType}
              onChange={(e) => setOpeningType(e.target.value)}
            >
              <option value={OpeningType.LINEAR}>Rectangular / Ducto</option>
              <option value={OpeningType.L_SHAPE}>Escalera L</option>
              <option value={OpeningType.U_SHAPE}>Escalera U</option>
            </select>

            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-400">Ancho (X)</label>
              <input 
                type="text" 
                className="w-16 bg-slate-900 border border-slate-700 text-white text-xs p-1 rounded text-right focus:outline-none focus:border-blue-500"
                value={valW}
                onChange={(e) => {
                  setValW(e.target.value);
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num)) setParams(p => ({...p, w: num}));
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-400">Largo (Y)</label>
              <input 
                type="text" 
                className="w-16 bg-slate-900 border border-slate-700 text-white text-xs p-1 rounded text-right focus:outline-none focus:border-blue-500"
                value={valL}
                onChange={(e) => {
                  setValL(e.target.value);
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num)) setParams(p => ({...p, l: num}));
                }}
              />
            </div>
            
            <button 
              onClick={commitOpening}
              disabled={!closestSlab}
              className={`mt-2 py-1 rounded text-xs font-bold ${closestSlab ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              {closestSlab ? 'CORTAR LOSA' : 'FUERA DE LOSA'}
            </button>
            <div className="text-[10px] text-slate-500 text-center mt-1">
              Tab para descongelar
            </div>
          </div>
        </Html>
      )}
      
      {/* Etiquetas de distancia (Placeholder para cotas a bordes) */}
      {!frozen && closestSlab && (
        <Html position={[0, params.l/2 + 0.2, 0]} center>
          <div className="bg-red-500/80 text-white text-[10px] px-1 rounded whitespace-nowrap">
            L: {params.l.toFixed(2)}
          </div>
        </Html>
      )}
      {!frozen && closestSlab && (
        <Html position={[params.w/2 + 0.2, 0, 0]} center>
          <div className="bg-red-500/80 text-white text-[10px] px-1 rounded whitespace-nowrap">
            W: {params.w.toFixed(2)}
          </div>
        </Html>
      )}
    </group>
  );
}
