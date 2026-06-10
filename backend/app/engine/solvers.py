import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import spsolve
from app.engine.fem_frame import get_3d_frame_local_stiffness, get_rotation_matrix
from app.schemas.fea3d import LoadType, Topology

class StructuralSolver:
    def __init__(self, topology: "Topology"):
        self.nodes = topology.nodes
        self.elements = topology.elements
        self.shells = getattr(topology, 'shells', [])
        self.materials = {m.id: m for m in topology.materials}
        self.sections = {s.id: s for s in topology.sections}
        self.loads = topology.loads
        
        # Cargar combinaciones enviadas por frontend, o crear 2 por defecto
        self.combinations = getattr(topology, 'combinations', [])
        if not self.combinations:
            from app.schemas.fea3d import LoadCombination
            self.combinations = [
                LoadCombination(id="combo-1", name="1.4 CM", factors={"CM": 1.4, "CV": 0.0}),
                LoadCombination(id="combo-2", name="1.2 CM + 1.6 CV", factors={"CM": 1.2, "CV": 1.6})
            ]
        
        self.num_nodes = len(self.nodes)
        self.ndof = self.num_nodes * 6
        self.node_map = {node.id: i for i, node in enumerate(self.nodes)}

    def assemble_global_stiffness(self):
        row, col, data = [], [], []
        for elem in self.elements:
            mat = self.materials[elem.material_id]
            sec = self.sections[elem.section_id]
            n1 = next(n for n in self.nodes if n.id == elem.nodes[0])
            n2 = next(n for n in self.nodes if n.id == elem.nodes[1])
            
            p1 = np.array([n1.x, n1.y, n1.z])
            p2 = np.array([n2.x, n2.y, n2.z])
            L = np.linalg.norm(p2 - p1)
            
            k_loc = get_3d_frame_local_stiffness(mat.E, mat.G, sec.A, sec.J, sec.Iy, sec.Ix, L)
            T = get_rotation_matrix(p1, p2, elem.beta_angle)
            k_glob_elem = T.T @ k_loc @ T
            
            idx = []
            for node_id in [n1.id, n2.id]:
                node_idx = self.node_map[node_id]
                for d in range(6): idx.append(node_idx * 6 + d)
            
            for i in range(12):
                for j in range(12):
                    row.append(idx[i]); col.append(idx[j]); data.append(k_glob_elem[i, j])
                    
        return csr_matrix((data, (row, col)), shape=(self.ndof, self.ndof))

    def assemble_load_vector(self, factors: dict):
        F = np.zeros(self.ndof)
        g = 9.81
        factor_cm = factors.get("CM", 1.0)
        factor_cv = factors.get("CV", 1.0)
        
        # 1. Peso Propio de Vigas/Columnas (CM)
        for elem in self.elements:
            mat = self.materials[elem.material_id]
            sec = self.sections[elem.section_id]
            n1 = next(n for n in self.nodes if n.id == elem.nodes[0])
            n2 = next(n for n in self.nodes if n.id == elem.nodes[1])
            L = np.linalg.norm(np.array([n2.x-n1.x, n2.y-n1.y, n2.z-n1.z]))
            weight = sec.A * mat.density * g * L * factor_cm
            F[self.node_map[n1.id]*6 + 2] -= weight / 2
            F[self.node_map[n2.id]*6 + 2] -= weight / 2

        # 2. Transferencia de Cargas de Losas (Áreas Tributarias -> Carga Equivalente Uniforme)
        for shell in self.shells:
            mat = self.materials[shell.material_id]
            n_coords = [next(n for n in self.nodes if n.id == nid) for nid in shell.nodes]
            if len(n_coords) < 3: continue
            
            # Área de la losa (Shoelace en XY)
            n0, n1, n2, n3 = n_coords[0], n_coords[1], n_coords[2], n_coords[3] if len(n_coords)>3 else n_coords[0]
            area = 0.5 * abs(n0.x*(n1.y-n3.y) + n1.x*(n2.y-n0.y) + n2.x*(n3.y-n1.y) + n3.x*(n0.y-n2.y))
            
            # Cargas en kgf/m2 (1 kgf = 9.81 N)
            pp_losa_kgf = shell.thickness * mat.density  # kg/m2 = kgf/m2
            cm_total_N = (pp_losa_kgf + shell.loads.CM) * g
            cv_total_N = shell.loads.CV * g
            
            # Carga factorizada total en N/m2
            q_factored = (cm_total_N * factor_cm) + (cv_total_N * factor_cv)
            total_load_N = q_factored * area
            
            # Repartir a vigas perimetrales (o nudos)
            edges = [(shell.nodes[0], shell.nodes[1]), (shell.nodes[1], shell.nodes[2]), 
                     (shell.nodes[2], shell.nodes[3]), (shell.nodes[3], shell.nodes[0])]
            
            # Encontrar elementos que coincidan con estos bordes
            perimeter_elements = []
            for edge in edges:
                for elem in self.elements:
                    if (elem.nodes[0] == edge[0] and elem.nodes[1] == edge[1]) or \
                       (elem.nodes[0] == edge[1] and elem.nodes[1] == edge[0]):
                        perimeter_elements.append(elem)
            
            if perimeter_elements:
                # Carga uniforme equivalente = Carga Total / Longitud Total del Perímetro
                total_length = 0
                lengths = []
                for elem in perimeter_elements:
                    en1 = next(n for n in self.nodes if n.id == elem.nodes[0])
                    en2 = next(n for n in self.nodes if n.id == elem.nodes[1])
                    l = np.linalg.norm(np.array([en2.x-en1.x, en2.y-en1.y, en2.z-en1.z]))
                    total_length += l
                    lengths.append((elem, l, en1, en2))
                
                w_eq = total_load_N / total_length
                for elem, l, en1, en2 in lengths:
                    idx1_z, idx2_z = self.node_map[en1.id]*6+2, self.node_map[en2.id]*6+2
                    idx1_my, idx2_my = self.node_map[en1.id]*6+4, self.node_map[en2.id]*6+4
                    F[idx1_z] -= (w_eq * l) / 2
                    F[idx2_z] -= (w_eq * l) / 2
                    # Fixed end moments (wL^2/12)
                    F[idx1_my] -= (w_eq * l**2) / 12
                    F[idx2_my] += (w_eq * l**2) / 12
            else:
                # Si no hay vigas, enviar a los nudos directamente
                f_node = total_load_N / len(shell.nodes)
                for nid in shell.nodes:
                    F[self.node_map[nid]*6 + 2] -= f_node

        # 3. Cargas Manuales (Puntuales y Distribuidas)
        for load in self.loads:
            # Asumimos que las cargas manuales son CM para este prototipo (o leer load.load_case)
            factor = factor_cm if load.load_case.upper() == "CM" or load.load_case.upper() == "DEAD" else factor_cv
            
            if load.type == LoadType.POINT:
                node_idx = self.node_map[load.target_id]
                dof_offset = {"X": 0, "Y": 1, "Z": 2}[load.direction]
                F[node_idx * 6 + dof_offset] += load.magnitude * factor
            
            elif load.type == LoadType.DISTRIBUTED:
                elem = next(e for e in self.elements if e.id == load.target_id)
                n1 = next(n for n in self.nodes if n.id == elem.nodes[0])
                n2 = next(n for n in self.nodes if n.id == elem.nodes[1])
                L = np.linalg.norm(np.array([n2.x-n1.x, n2.y-n1.y, n2.z-n1.z]))
                w = load.magnitude * factor
                idx1_z, idx2_z = self.node_map[n1.id]*6+2, self.node_map[n2.id]*6+2
                idx1_my, idx2_my = self.node_map[n1.id]*6+4, self.node_map[n2.id]*6+4
                F[idx1_z] += (w*L)/2; F[idx2_z] += (w*L)/2
                F[idx1_my] += (w*L**2)/12; F[idx2_my] -= (w*L**2)/12

        return F

    def solve(self):
        K = self.assemble_global_stiffness()
        
        # Aplicar apoyos en la matriz K (Penalty Method)
        for node in self.nodes:
            if node.restraint:
                node_idx = self.node_map[node.id]
                for d, is_fixed in enumerate(node.restraint.dofs):
                    if is_fixed:
                        idx = node_idx * 6 + d
                        K[idx, idx] = 1e30
        
        K_csr = K.tocsr()
        
        results_by_combo = {}
        
        # Iterar sobre las combinaciones de carga
        for combo in self.combinations:
            F = self.assemble_load_vector(combo.factors)
            
            # Aplicar Penalty Method en F
            for node in self.nodes:
                if node.restraint:
                    node_idx = self.node_map[node.id]
                    for d, is_fixed in enumerate(node.restraint.dofs):
                        if is_fixed:
                            idx = node_idx * 6 + d
                            F[idx] = 0
            
            U = spsolve(K_csr, F)
            displacements = {n.id: U[i*6:(i+1)*6].tolist() for i, n in enumerate(self.nodes)}
            results_by_combo[combo.id] = {"displacements": displacements}
            
        return {"results": results_by_combo, "combinations": [c.dict() for c in self.combinations]}