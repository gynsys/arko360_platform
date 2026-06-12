import React, { useState } from 'react';
import { X, BookOpen, FileText } from 'lucide-react';

export function HelpDocsModal({ isOpen, onClose, initialTab = 'manual' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Documentación de ARKO3D</h2>
              <p className="text-sm text-slate-400">Manual de Usuario y Soporte Teórico</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-slate-700">
          <button
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'manual' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
            onClick={() => setActiveTab('manual')}
          >
            <BookOpen size={16} />
            Manual de Usuario
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'theory' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
            onClick={() => setActiveTab('theory')}
          >
            <FileText size={16} />
            Soporte Teórico
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-slate-300 text-sm leading-relaxed custom-scrollbar">
          
          {activeTab === 'manual' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-bold text-white mb-2">1. Interfaz y Controles 3D</h3>
                <p className="mb-2">ARKO3D ofrece un visor 3D interactivo para el modelado de estructuras. Utilice los siguientes atajos para navegar en el Canvas:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                  <li><strong>Órbita 3D:</strong> Mantenga presionado el <em>clic derecho</em> y mueva el ratón.</li>
                  <li><strong>Paneo:</strong> Mantenga presionado el <em>clic central</em> (rueda del ratón) y mueva.</li>
                  <li><strong>Zoom:</strong> Gire la rueda del ratón hacia adelante o atrás.</li>
                  <li><strong>Selección Individual:</strong> Clic izquierdo sobre cualquier elemento (nodo, viga o losa).</li>
                  <li><strong>Selección por Ventana (Window/Crossing):</strong> Mantenga el <em>clic izquierdo</em> en el vacío y arrastre:
                    <ul className="list-disc list-inside ml-6 mt-1 text-slate-500">
                      <li><em>Izquierda a Derecha (Caja Azul):</em> Selecciona solo elementos 100% dentro de la caja.</li>
                      <li><em>Derecha a Izquierda (Caja Verde):</em> Selecciona cualquier elemento que la caja toque (Crossing).</li>
                    </ul>
                  </li>
                  <li><strong>Multi-selección:</strong> Mantenga la tecla <code>Shift</code> o <code>Ctrl</code> al hacer clic para agregar elementos a la selección.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">2. Flujo de Trabajo Principal</h3>
                <p className="mb-2">La barra superior sigue un flujo lógico de ingeniería de izquierda a derecha:</p>
                <div className="space-y-3">
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-700">
                    <strong className="text-blue-400">1. Define:</strong> Crear y configurar Materiales (concreto, acero), Secciones Transversales y Combinaciones de Carga.
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-700">
                    <strong className="text-blue-400">2. Draw:</strong> Herramientas para trazar nuevos elementos en pantalla (Losas, Vigas).
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-700">
                    <strong className="text-blue-400">3. Assign:</strong> Aplicar propiedades a los elementos seleccionados en pantalla (Secciones, Apoyos/Restricciones, Cargas).
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-700">
                    <strong className="text-blue-400">4. Analyze:</strong> Envía el modelo matemático al motor de cálculo en la nube para obtener desplazamientos y fuerzas internas.
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-700">
                    <strong className="text-blue-400">5. Display:</strong> Visualizar los diagramas tridimensionales de Cortante, Momento y Tablas de Resultados.
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'theory' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-bold text-white mb-2">1. Método de Análisis</h3>
                <p className="mb-2">
                  ARKO3D emplea el <strong>Método de la Rigidez Directa (Direct Stiffness Method)</strong> para resolver sistemas estructurales lineales en 3D. 
                  El modelo matemático general establece la ecuación fundamental:
                </p>
                <div className="bg-slate-900 p-4 rounded-lg font-mono text-center text-blue-400 text-lg my-3 border border-slate-700">
                  [K] · {'{U}'} = {'{F}'}
                </div>
                <p className="text-slate-400">Donde <strong>[K]</strong> es la matriz de rigidez global, <strong>{'{U}'}</strong> es el vector de desplazamientos nodales y <strong>{'{F}'}</strong> es el vector de fuerzas aplicadas.</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">2. Formulación del Elemento Viga/Columna</h3>
                <p className="mb-2">
                  Para cada elemento (Frame), se formula una matriz de rigidez local de 12x12 basada en la teoría de vigas de <strong>Euler-Bernoulli</strong> espaciales (6 Grados de Libertad por nodo).
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                  <li><strong>Rigidez Axial:</strong> EA / L</li>
                  <li><strong>Rigidez a Torsión:</strong> GJ / L</li>
                  <li><strong>Rigidez a Flexión:</strong> Términos dependientes de 12EI/L³, 6EI/L² y 4EI/L.</li>
                </ul>
                <p className="mt-3 mb-2">
                  La matriz local se transforma al sistema coordenado global usando una matriz de transformación geométrica direccional <strong>[T]</strong>:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-center text-blue-400 border border-slate-700">
                  [K_global] = [T]^T · [k_local] · [T]
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">3. Solución del Sistema y Boundary Conditions</h3>
                <p className="text-slate-400">
                  Para imponer las condiciones de apoyo (restricciones nodales), el algoritmo implementa el <strong>Penalty Method</strong>, multiplicando por un valor masivo (10^30) los elementos diagonales de la matriz [K] correspondientes a los grados de libertad restringidos (Empotramientos, Articulaciones, Rodillos). 
                  Una vez aplicada la penalización, el sistema de ecuaciones se resuelve utilizando librerías optimizadas para matrices dispersas (Sparse Matrices).
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-white mb-2">4. Transferencia de Cargas (Áreas Tributarias)</h3>
                <p className="text-slate-400">
                  Al emplear elementos de Losa (Shells) como membranas transmisoras de carga, el motor identifica los bordes apoyados perimetralmente y descompone las presiones superficiales en cargas lineales equivalentes sobre las vigas de soporte adyacentes mediante el método geométrico de áreas tributarias.
                </p>
              </section>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
          >
            Cerrar Documentación
          </button>
        </div>

      </div>
    </div>
  );
}
