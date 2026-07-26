import React from 'react';
import toast from 'react-hot-toast';
import './CalculadoraLosaFundacion.css';

import { SHAPES, MATERIALS } from './calculadoraLosaFundacion/constants/slabConstants';
import { SlabHeader } from './calculadoraLosaFundacion/components/SlabHeader';
import { SlabSidebar } from './calculadoraLosaFundacion/components/SlabSidebar';
import { SlabCanvas } from './calculadoraLosaFundacion/components/SlabCanvas';
import { ResultsModal } from './calculadoraLosaFundacion/components/ResultsModal';

import { GeometryModal } from './calculadoraLosaFundacion/components/toolModals/GeometryModal';
import { MaterialsModal } from './calculadoraLosaFundacion/components/toolModals/MaterialsModal';
import { FemModal } from './calculadoraLosaFundacion/components/toolModals/FemModal';
import { OpeningsModal } from './calculadoraLosaFundacion/components/toolModals/OpeningsModal';
import { WallsModal } from './calculadoraLosaFundacion/components/toolModals/WallsModal';
import { LayersModal } from './calculadoraLosaFundacion/components/toolModals/LayersModal';
import { ColumnsModal } from './calculadoraLosaFundacion/components/toolModals/ColumnsModal';

import { useSlabState } from './calculadoraLosaFundacion/hooks/useSlabState';
import { useSlabHistory } from './calculadoraLosaFundacion/hooks/useSlabHistory';
import { useCanvasInteraction } from './calculadoraLosaFundacion/hooks/useCanvasInteraction';
import { useSlabApi } from './calculadoraLosaFundacion/hooks/useSlabApi';
import { AuthModal } from './fea3d/AuthModal';

import { descargarExcel as doDescargarExcel } from './calculadoraLosaFundacion/utils/exports/exportExcel';
import { descargarPDFPresupuesto as doDescargarPDFPresupuesto } from './calculadoraLosaFundacion/utils/exports/exportPdf';
import { descargarComputosHtml as doDescargarComputosHtml } from './calculadoraLosaFundacion/utils/exports/exportComputosHtml';
import { descargarMemoriaCalculoHtml as doDescargarMemoriaCalculoHtml } from './calculadoraLosaFundacion/utils/exports/exportMemoriaHtml';
import { downloadAuditJSON as doDownloadAuditJSON } from './calculadoraLosaFundacion/utils/exports/exportAuditJson';
import { generarPresupuesto } from './calculadoraLosaFundacion/utils/budgetCalculator';

export default function CalculadoraLosaFundacion({ onBack }) {
  const state = useSlabState();

  const { saveHistory, undo, redo, historyPast, historyFuture } = useSlabHistory({
    shape: state.shape, setShape: state.setShape,
    internalWalls: state.internalWalls, setInternalWalls: state.setInternalWalls,
    openings: state.openings, setOpenings: state.setOpenings,
    columns: state.columns, setColumns: state.setColumns
  });

  const canvas = useCanvasInteraction({
    svgRef: state.svgRef, isPanningRef: state.isPanningRef, panStartRef: state.panStartRef, isDraggingRef: state.isDraggingRef, stateRef: state.stateRef, hudInputRef: state.hudInputRef,
    zoom: state.zoom, setZoom: state.setZoom, panOffset: state.panOffset, setPanOffset: state.setPanOffset,
    gridStep: state.gridStep, params: state.params, setParams: state.setParams, offset: state.offset, setOffset: state.setOffset, slabOffset: state.slabOffset, setSlabOffset: state.setSlabOffset, shape: state.shape, setShape: state.setShape,
    internalWalls: state.internalWalls, setInternalWalls: state.setInternalWalls, columns: state.columns, setColumns: state.setColumns, openings: state.openings, setOpenings: state.setOpenings,
    colConfig: state.colConfig, material: state.material, wallHeight: state.wallHeight, designParams: state.designParams, setDesignParams: state.setDesignParams, activeLayer: state.activeLayer,
    saveHistory
  });

  const api = useSlabApi({
    projectName: state.projectName, setProjectName: state.setProjectName,
    params: state.params, setParams: state.setParams,
    designParams: state.designParams, setDesignParams: state.setDesignParams,
    wallHeight: state.wallHeight, setWallHeight: state.setWallHeight,
    internalWalls: state.internalWalls, setInternalWalls: state.setInternalWalls,
    columns: state.columns, setColumns: state.setColumns,
    openings: state.openings, setOpenings: state.setOpenings,
    material: state.material, setMaterial: state.setMaterial,
    offset: state.offset, setOffset: state.setOffset,
    slabOffset: state.slabOffset, setSlabOffset: state.setSlabOffset,
    shape: state.shape, setShape: state.setShape,
    allWalls: canvas.allWalls,
    results: state.results, setResults: state.setResults,
    lastPayload: state.lastPayload, setLastPayload: state.setLastPayload,
    loading: state.loading, setLoading: state.setLoading,
    saving: state.saving, setSaving: state.setSaving,
    error: state.error, setError: state.setError,
    savedRuns: state.savedRuns, setSavedRuns: state.setSavedRuns,
    loadingRuns: state.loadingRuns, setLoadingRuns: state.setLoadingRuns,
    deletingRunId: state.deletingRunId, setDeletingRunId: state.setDeletingRunId,
    currentRunId: state.currentRunId, setCurrentRunId: state.setCurrentRunId,
    showOpenModal: state.showOpenModal, setShowOpenModal: state.setShowOpenModal,
    showSaveAsModal: state.showSaveAsModal, setShowSaveAsModal: state.setShowSaveAsModal,
    setAuthModalOpen: state.setAuthModalOpen
  });

  const presupuesto = React.useMemo(() => generarPresupuesto(state.results, state.globalPrices, state.designParams), [state.results, state.globalPrices, state.designParams]);
  const presupuestoTotal = React.useMemo(() => presupuesto.reduce((acc, it) => acc + it.total, 0), [presupuesto]);

  const descargarExcel = async () => doDescargarExcel({ results: state.results, presupuesto, presupuestoTotal, projectName: state.projectName });
  const descargarPDFPresupuesto = () => doDescargarPDFPresupuesto({ presupuesto, presupuestoTotal });
  const descargarComputosHtml = () => doDescargarComputosHtml({ results: state.results, wallHeight: state.wallHeight, allWalls: canvas.allWalls, openings: state.openings, payload: state.lastPayload || api.buildCurrentPayload(), designParams: state.designParams, projectName: state.projectName, toast });
  const descargarMemoriaCalculoHtml = () => doDescargarMemoriaCalculoHtml({ results: state.results, payload: state.lastPayload || api.buildCurrentPayload(), columns: state.columns, projectName: state.projectName, toast });
  const downloadAuditJSON = () => doDownloadAuditJSON({ lastPayload: state.lastPayload, results: state.results, projectName: state.projectName });

  return (
    <div className="losa-fundacion-editor" style={{ position: 'relative', width: '100%', height: 'calc(100vh - 70px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Overlay de carga mientras corre el motor FEM */}
      {state.loading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #1A6BB5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ marginTop: '16px', color: '#1A6BB5', fontWeight: 600 }}>Calculando Losa con Elementos Finitos (Winkler)...</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>Resolviendo matriz de rigidez global y armados ACI 318</p>
        </div>
      )}

      {/* Modal Guardar Como */}
      {state.showSaveAsModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1A6BB5' }}>Guardar como...</h3>
            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '8px' }}>Nombre del Nuevo Proyecto:</label>
            <input 
              type="text" 
              value={state.saveAsName} 
              onChange={e => state.setSaveAsName(e.target.value)} 
              placeholder="Ej: Proyecto Casa Modelo B"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '20px', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => state.setShowSaveAsModal(false)}>Cancelar</button>
              <button 
                className="btn-primary" 
                disabled={!state.saveAsName.trim() || state.saving}
                onClick={() => {
                  state.setShowSaveAsModal(false);
                  api.saveAsToDatabase(state.saveAsName.trim());
                }}
                style={{ background: '#1A6BB5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                {state.saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Abrir Proyecto */}
      {state.showOpenModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '550px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1A6BB5' }}>📂 Abrir Proyecto Guardado</h3>
            {state.loadingRuns ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Cargando tus proyectos...</p>
            ) : state.savedRuns.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No tienes proyectos guardados en esta cuenta.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '300px', overflowY: 'auto' }}>
                {state.savedRuns.map(run => (
                  <li 
                    key={run.id} 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => api.loadRun(run)}
                  >
                    <div>
                      <strong style={{ color: '#333', display: 'block' }}>{run.nombre_proyecto}</strong>
                      <small style={{ color: '#888' }}>{new Date(run.created_at).toLocaleString()}</small>
                    </div>
                    <button
                      className="del-btn"
                      title="Eliminar cálculo"
                      disabled={state.deletingRunId === run.id}
                      onClick={(e) => api.deleteRun(e, run.id)}
                      style={{ flexShrink: 0 }}
                    >
                      {state.deletingRunId === run.id ? '...' : '🗑️'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={() => state.setShowOpenModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN Y ACCIONES DEL EDITOR */}
      <SlabHeader
        onBack={onBack}
        runAnalysis={api.runAnalysis}
        loading={state.loading}
        results={state.results}
        error={state.error}
        setShowResultsModal={state.setShowResultsModal}
        projectName={state.projectName}
        setProjectName={state.setProjectName}
        handleNewProject={api.handleNewProject}
        setAuthModalOpen={state.setAuthModalOpen}
        setShowOpenModal={state.setShowOpenModal}
        fetchRuns={api.fetchRuns}
        handleCloseProject={api.handleCloseProject}
        saveToDatabase={api.saveToDatabase}
        setSaveAsName={state.setSaveAsName}
        setShowSaveAsModal={state.setShowSaveAsModal}
        currentUser={state.currentUser}
        setCurrentUser={state.setCurrentUser}
      />

      <div className="calc-body" style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
        {/* PANEL IZQUIERDO: TOOLBAR VERTICAL */}
        <SlabSidebar
          activeModal={state.activeModal}
          setActiveModal={state.setActiveModal}
          imgInputRef={state.imgInputRef}
          layerImportTarget={state.layerImportTarget}
          setLayers={state.setLayers}
          handleDragStart={canvas.handleDragStart}
        />

        {/* MODALES DE HERRAMIENTAS (FLOATING CONFIG MODALS) */}
        {state.activeModal === 'geometry' && (
          <GeometryModal
            shape={state.shape}
            SHAPES={SHAPES}
            handleShapeChange={canvas.handleShapeChange}
            convertToManual={canvas.convertToManual}
            params={state.params}
            handleParamChange={canvas.handleParamChange}
            offset={state.offset}
            setOffset={state.setOffset}
            slabOffset={state.slabOffset}
            setSlabOffset={state.setSlabOffset}
            gridStep={state.gridStep}
            setGridStep={state.setGridStep}
            setActiveModal={state.setActiveModal}
          />
        )}

        {state.activeModal === 'materials' && (
          <MaterialsModal
            wallHeight={state.wallHeight}
            setWallHeight={state.setWallHeight}
            material={state.material}
            setMaterial={state.setMaterial}
            MATERIALS={MATERIALS}
            designParams={state.designParams}
            handleDesignParamChange={canvas.handleDesignParamChange}
            setActiveModal={state.setActiveModal}
          />
        )}
        
        {state.activeModal === 'fem' && (
          <FemModal
            designParams={state.designParams}
            handleDesignParamChange={canvas.handleDesignParamChange}
            setActiveModal={state.setActiveModal}
          />
        )}

        {state.activeModal === 'walls' && (
          <WallsModal
            internalWalls={state.internalWalls}
            hoveredWallId={canvas.hoveredWallId}
            setHoveredWallId={canvas.setHoveredWallId}
            updateInternalWall={canvas.updateInternalWall}
            removeInternalWall={canvas.removeInternalWall}
            addInternalWall={canvas.addInternalWall}
            setActiveModal={state.setActiveModal}
          />
        )}

        {state.activeModal === 'columns' && (
          <ColumnsModal
            colConfig={state.colConfig}
            setColConfig={state.setColConfig}
            columns={state.columns}
            setColumns={state.setColumns}
            params={state.params}
            setActiveModal={state.setActiveModal}
          />
        )}

        {state.activeModal === 'openings' && (
          <OpeningsModal
            openings={state.openings}
            hoveredOpeningId={canvas.hoveredOpeningId}
            setHoveredOpeningId={canvas.setHoveredOpeningId}
            removeOpening={canvas.removeOpening}
            setActiveModal={state.setActiveModal}
          />
        )}

        {state.activeModal === 'layers' && (
          <LayersModal
            layers={state.layers}
            activeLayer={state.activeLayer}
            LAYER_DEFS={state.LAYER_DEFS}
            setActiveLayer={state.setActiveLayer}
            setLayers={state.setLayers}
            setLayerImportTarget={state.setLayerImportTarget}
            imgInputRef={state.imgInputRef}
            setActiveModal={state.setActiveModal}
          />
        )}

        {/* PANEL DERECHO: VISTA PREVIA Y CANVAS SVG */}
        <div className="calc-content" style={{ flex: '1', minWidth: 0, marginLeft: '48px' }}>
          <SlabCanvas
            drawType={canvas.drawType} setDrawType={canvas.setDrawType}
            undo={undo} historyPast={historyPast}
            redo={redo} historyFuture={historyFuture}
            mouseCoord={canvas.mouseCoord}
            zoom={state.zoom} setZoom={state.setZoom} resetZoom={canvas.resetZoom}
            colConfig={state.colConfig} setColConfig={state.setColConfig}
            offsetDist={canvas.offsetDist} setOffsetDist={canvas.setOffsetDist} offsetSourceWall={canvas.offsetSourceWall} setOffsetSourceWall={canvas.setOffsetSourceWall} offsetPreview={canvas.offsetPreview} setOffsetPreview={canvas.setOffsetPreview}
            rotateAngle={canvas.rotateAngle} setRotateAngle={canvas.setRotateAngle} rotatePivotMode={canvas.rotatePivotMode} setRotatePivotMode={canvas.setRotatePivotMode} rotateSelectedIds={canvas.rotateSelectedIds} setRotateSelectedIds={canvas.setRotateSelectedIds}
            getRotatedWalls={canvas.getRotatedWalls} saveHistory={saveHistory} setInternalWalls={state.setInternalWalls}
            selectedElement={canvas.selectedElement} setSelectedElement={canvas.setSelectedElement}
            columns={state.columns} setColumns={state.setColumns}
            svgRef={state.svgRef} panOffset={state.panOffset} CANVAS_WIDTH={canvas.CANVAS_WIDTH} CANVAS_HEIGHT={canvas.CANVAS_HEIGHT} isDrawing={canvas.isDrawing} handleMouseMove={canvas.handleMouseMove} handlePanStart={canvas.handlePanStart} getSvgPx={canvas.getSvgPx} toMetersX={canvas.toMetersX} toMetersY={canvas.toMetersY} setSelectionBox={canvas.setSelectionBox} isDraggingRef={state.isDraggingRef} isPanningRef={state.isPanningRef} handlePanEnd={canvas.handlePanEnd} selectionBox={canvas.selectionBox} handleSvgDoubleClick={canvas.handleSvgDoubleClick} handleSvgClick={canvas.handleSvgClick} handleDrop={canvas.handleDrop} layers={state.layers} params={state.params} scale={canvas.scale} toSvg={canvas.toSvg} MARGIN={canvas.MARGIN} gridStep={state.gridStep} getPerimeterVertices={canvas.getPerimeterVertices} offset={state.offset} allWalls={canvas.allWalls} hoveredWallId={canvas.hoveredWallId} setHoveredWallId={canvas.setHoveredWallId} openings={state.openings} setHoveredOpeningId={canvas.setHoveredOpeningId} hoveredOpeningId={canvas.hoveredOpeningId} drawStart={canvas.drawStart} drawEnd={canvas.drawEnd} hudInputRef={state.hudInputRef} hudInput={canvas.hudInput} setHudInput={canvas.setHudInput} orthoLock={canvas.orthoLock} setDrawEnd={canvas.setDrawEnd} commitWall={canvas.commitWall} setIsDrawing={canvas.setIsDrawing} setDrawStart={canvas.setDrawStart} setOrthoLock={canvas.setOrthoLock} hudPos={canvas.hudPos}
          />
        </div>
      </div>

      {/* MODAL DE RESULTADOS */}
      <ResultsModal
        results={state.results} showResultsModal={state.showResultsModal} setShowResultsModal={state.setShowResultsModal}
        lastPayload={state.lastPayload} buildCurrentPayload={api.buildCurrentPayload} columns={state.columns} wallHeight={state.wallHeight} allWalls={canvas.allWalls} openings={state.openings} designParams={state.designParams}
        customBeamRebar={state.customBeamRebar} setCustomBeamRebar={state.setCustomBeamRebar} customWallRebars={state.customWallRebars} setCustomWallRebars={state.setCustomWallRebars}
        projectName={state.projectName} downloadAuditJSON={downloadAuditJSON} downloadHTML={api.downloadHTML}
        descargarMemoriaCalculoHtml={descargarMemoriaCalculoHtml} descargarComputosHtml={descargarComputosHtml} descargarExcel={descargarExcel} descargarPDFPresupuesto={descargarPDFPresupuesto}
        presupuesto={presupuesto} presupuestoTotal={presupuestoTotal} params={state.params}
      />

      {state.authModalOpen && (
        <AuthModal 
          source="calculadora"
          onClose={() => state.setAuthModalOpen(false)} 
          onLoginSuccess={(u) => { 
            state.setAuthModalOpen(false); 
            state.setCurrentUser(u);
          }} 
        />
      )}
    </div>
  );
}
