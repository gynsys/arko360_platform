import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBox, FiUsers, FiSettings, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';
import cost360Service from '../services/cost360Service';
import APUTable from '../components/APUTable';
import APUSummary from '../components/APUSummary';
import { motion, AnimatePresence } from 'framer-motion';

const APUViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [apuData, setApuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materiales');

  useEffect(() => {
    const fetchApu = async () => {
      try {
        const data = await cost360Service.fetchApuDetails(id);
        setApuData(data);
      } catch (error) {
        toast.error('No se pudo cargar el Análisis de Precio Unitario');
        navigate('/cost360');
      } finally {
        setLoading(false);
      }
    };
    fetchApu();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!apuData) return null;

  const { partida, materiales, equipos, mano_obra } = apuData;
  const rendimiento = partida.RenPar || 1;
  const fcasFactor = 4.17; // 417%

  const totalMaterials = materiales.reduce((acc, item) => acc + item.subtotal, 0);
  
  const totalEquipmentDiario = equipos.reduce((acc, item) => acc + item.subtotal, 0);
  const totalEquipment = totalEquipmentDiario / rendimiento;

  const totalJornal = mano_obra.reduce((acc, item) => acc + (item.tot_jornal || 0), 0);
  const totalBono = mano_obra.reduce((acc, item) => acc + (item.tot_bono || 0), 0);
  const totalFCAS = totalJornal * fcasFactor;
  const totalLaborDiario = totalJornal + totalBono + totalFCAS;
  const totalLabor = totalLaborDiario / rendimiento;

  const tabs = [
    { id: 'materiales', label: 'Materiales', icon: FiBox, data: materiales, total: totalMaterials },
    { id: 'equipos', label: 'Equipos', icon: FiSettings, data: equipos, total: totalEquipment },
    { id: 'mano_obra', label: 'Mano de Obra', icon: FiUsers, data: mano_obra, total: totalLabor },
    { id: 'resumen', label: 'APU', icon: FiActivity }
  ];

  const renderTable = (tabId) => {
    const formatCurrency = (val) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(val);
    
    let currentColumns = [
      { header: 'Código', accessor: 'codigo' },
      { header: 'Descripción', accessor: 'descripcion' },
      { header: 'Und', accessor: 'unidad' },
      { header: 'Cantidad', accessor: 'cantidad', align: 'right' },
      { header: 'Precio Unit.', accessor: 'precio_unitario', align: 'right', render: formatCurrency },
      { header: 'Subtotal', accessor: 'subtotal', align: 'right', render: formatCurrency },
    ];

    if (tabId === 'mano_obra') {
      currentColumns = [
        { header: 'Código', accessor: 'codigo' },
        { header: 'Descripción', accessor: 'descripcion' },
        { header: 'Cant.', accessor: 'cantidad', align: 'right' },
        { header: 'Jornal', accessor: 'jornal', align: 'right', render: formatCurrency },
        { header: 'Bono', accessor: 'bono', align: 'right', render: formatCurrency },
        { header: 'Tot. Jornal', accessor: 'tot_jornal', align: 'right', render: formatCurrency },
        { header: 'Tot. Bono', accessor: 'tot_bono', align: 'right', render: formatCurrency },
      ];
    }

    let currentData = [];
    let currentIcon = null;
    let title = '';

    if (tabId === 'materiales') { currentData = materiales; currentIcon = FiBox; title = 'Materiales Requeridos'; }
    if (tabId === 'equipos') { currentData = equipos; currentIcon = FiSettings; title = 'Equipos y Maquinaria'; }
    if (tabId === 'mano_obra') { currentData = mano_obra; currentIcon = FiUsers; title = 'Mano de Obra'; }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="mb-8"
      >
        <APUTable 
          title={title}
          icon={currentIcon}
          columns={currentColumns}
          data={currentData}
          emptyMessage={`No hay ${title.toLowerCase()} asociados a esta partida.`}
        />
        
        {/* Mano de Obra Breakdown (Only show in APU tab or when viewing Mano de Obra) */}
        {tabId === 'mano_obra' && currentData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-4">
            <h4 className="font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-2">Desglose de Mano de Obra</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal Jornal:</span>
                <span className="font-mono">{formatCurrency(totalJornal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal Bono:</span>
                <span className="font-mono">{formatCurrency(totalBono)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span>F.C.A.S. ({(fcasFactor * 100).toFixed(2)}% sobre Jornal):</span>
                <span className="font-mono">{formatCurrency(totalFCAS)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-2">
                <span>Total General Mano de Obra (Diario):</span>
                <span className="font-mono">{formatCurrency(totalLaborDiario)}</span>
              </div>
              <div className="flex justify-between font-bold text-blue-700 pt-1">
                <span>Costo Unitario (Total Diario / Rendimiento {rendimiento}):</span>
                <span className="font-mono">{formatCurrency(totalLabor)}</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-blue-800">ARKO360</span>
          </div>
          <button
            onClick={() => navigate('/cost360')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FiArrowLeft /> Volver a Partidas
          </button>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Partida {partida.CodPar}
            </span>
            {partida.CovPar && (
              <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-gray-200">
                COVENIN: {partida.CovPar}
              </span>
            )}
            <span className="text-sm font-medium text-gray-500">Unidad: {partida.UniPar}</span>
            <span className="text-sm font-medium text-gray-500">Rendimiento: {partida.RenPar}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{partida.Descri}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <tab.icon className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab !== 'resumen' ? (
              <div key={activeTab}>
                {renderTable(activeTab)}
              </div>
            ) : (
              <motion.div 
                key="resumen-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {renderTable('materiales')}
                {renderTable('equipos')}
                {renderTable('mano_obra')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <APUSummary 
              totalMaterials={totalMaterials}
              totalEquipment={totalEquipment}
              totalLabor={totalLabor}
            />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default APUViewer;
