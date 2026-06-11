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
        
        element_local_loads = {elem.id: {"px": 0.0, "py": 0.0, "pz": 0.0} for elem in self.elements}
        
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
                    p1 = np.array([en1.x, en1.y, en1.z])
                    p2 = np.array([en2.x, en2.y, en2.z])
                    T = get_rotation_matrix(p1, p2, elem.beta_angle)
                    
                    # El peso de la losa va hacia abajo en global Z (-Z).
                    # Para una viga horizontal, Local Z o Local Y puede apuntar hacia arriba/abajo.
                    # Mapeamos la carga global -Z a local.
                    q_global = np.array([0, 0, -w_eq])
                    q_local = T[0:3, 0:3] @ q_global
                    
                    # Guardamos la carga local para los diagramas
                    element_local_loads[elem.id]["px"] += q_local[0]
                    element_local_loads[elem.id]["py"] += q_local[1]
                    element_local_loads[elem.id]["pz"] += q_local[2]
                    
                    f_fixed_local = np.zeros(12)
                    # Carga distribuida local en Y
                    f_fixed_local[1] = q_local[1] * l / 2
                    f_fixed_local[5] = q_local[1] * l**2 / 12
                    f_fixed_local[7] = q_local[1] * l / 2
                    f_fixed_local[11] = -q_local[1] * l**2 / 12
                    # Carga distribuida local en Z
                    f_fixed_local[2] = q_local[2] * l / 2
                    f_fixed_local[4] = -q_local[2] * l**2 / 12
                    f_fixed_local[8] = q_local[2] * l / 2
                    f_fixed_local[10] = q_local[2] * l**2 / 12
                    
                    # Carga axial
                    f_fixed_local[0] = q_local[0] * l / 2
                    f_fixed_local[6] = q_local[0] * l / 2
                    
                    f_fixed_global = T.T @ f_fixed_local
                    
                    idx1 = self.node_map[en1.id] * 6
                    idx2 = self.node_map[en2.id] * 6
                    F[idx1:idx1+6] += f_fixed_global[0:6]
                    F[idx2:idx2+6] += f_fixed_global[6:12]
            else:
                # Si no hay vigas, enviar a los nudos directamente
                f_node = total_load_N / len(shell.nodes)
                for nid in shell.nodes:
                    F[self.node_map[nid]*6 + 2] -= f_node

        # 3. Cargas Manuales (Puntuales y Distribuidas)
        for load in self.loads:
            # Asumimos que las cargas manuales son CM para este prototipo (o leer load.load_case)
            factor = factor_cm if load.load_case.upper() == "CM" or load.load_case.upper() == "DEAD" else factor_cv
            
            if load.type == "point":
                node_idx = self.node_map[load.target_id]
                F[node_idx * 6 + 0] += load.fx * factor
                F[node_idx * 6 + 1] += load.fy * factor
                F[node_idx * 6 + 2] += load.fz * factor
                F[node_idx * 6 + 3] += load.mx * factor
                F[node_idx * 6 + 4] += load.my * factor
                F[node_idx * 6 + 5] += load.mz * factor
            
            elif load.type == "distributed":
                elem = next(e for e in self.elements if e.id == load.target_id)
                n1 = next(n for n in self.nodes if n.id == elem.nodes[0])
                n2 = next(n for n in self.nodes if n.id == elem.nodes[1])
                p1 = np.array([n1.x, n1.y, n1.z])
                p2 = np.array([n2.x, n2.y, n2.z])
                l = np.linalg.norm(p2 - p1)
                
                q_global = np.array([load.fx * factor, load.fy * factor, load.fz * factor])
                T = get_rotation_matrix(p1, p2, elem.beta_angle)
                q_local = T[0:3, 0:3] @ q_global
                
                element_local_loads[elem.id]["px"] += q_local[0]
                element_local_loads[elem.id]["py"] += q_local[1]
                element_local_loads[elem.id]["pz"] += q_local[2]
                
                f_fixed_local = np.zeros(12)
                # Carga axial
                f_fixed_local[0] = q_local[0] * l / 2
                f_fixed_local[6] = q_local[0] * l / 2
                # Carga Y local
                f_fixed_local[1] = q_local[1] * l / 2
                f_fixed_local[5] = q_local[1] * l**2 / 12
                f_fixed_local[7] = q_local[1] * l / 2
                f_fixed_local[11] = -q_local[1] * l**2 / 12
                # Carga Z local
                f_fixed_local[2] = q_local[2] * l / 2
                f_fixed_local[4] = -q_local[2] * l**2 / 12
                f_fixed_local[8] = q_local[2] * l / 2
                f_fixed_local[10] = q_local[2] * l**2 / 12
                
                f_fixed_global = T.T @ f_fixed_local
                idx1 = self.node_map[n1.id] * 6
                idx2 = self.node_map[n2.id] * 6
                F[idx1:idx1+6] += f_fixed_global[0:6]
                F[idx2:idx2+6] += f_fixed_global[6:12]

            elif load.type == "point_frame":
                elem = next(e for e in self.elements if e.id == load.target_id)
                n1 = next(n for n in self.nodes if n.id == elem.nodes[0])
                n2 = next(n for n in self.nodes if n.id == elem.nodes[1])
                p1 = np.array([n1.x, n1.y, n1.z])
                p2 = np.array([n2.x, n2.y, n2.z])
                l = np.linalg.norm(p2 - p1)
                
                a = l * load.offset
                b = l - a
                
                q_global = np.array([load.fx * factor, load.fy * factor, load.fz * factor])
                T = get_rotation_matrix(p1, p2, elem.beta_angle)
                q_local = T[0:3, 0:3] @ q_global
                
                f_fixed_local = np.zeros(12)
                # Axial
                f_fixed_local[0] = q_local[0] * b / l
                f_fixed_local[6] = q_local[0] * a / l
                # Transverse Y
                f_fixed_local[1] = q_local[1] * (b**2) * (3*a + b) / (l**3)
                f_fixed_local[5] = q_local[1] * a * (b**2) / (l**2)
                f_fixed_local[7] = q_local[1] * (a**2) * (a + 3*b) / (l**3)
                f_fixed_local[11] = -q_local[1] * (a**2) * b / (l**2)
                # Transverse Z
                f_fixed_local[2] = q_local[2] * (b**2) * (3*a + b) / (l**3)
                f_fixed_local[4] = -q_local[2] * a * (b**2) / (l**2)
                f_fixed_local[8] = q_local[2] * (a**2) * (a + 3*b) / (l**3)
                f_fixed_local[10] = q_local[2] * (a**2) * b / (l**2)
                
                f_fixed_global = T.T @ f_fixed_local
                idx1 = self.node_map[n1.id] * 6
                idx2 = self.node_map[n2.id] * 6
                F[idx1:idx1+6] += f_fixed_global[0:6]
                F[idx2:idx2+6] += f_fixed_global[6:12]

        return F, element_local_loads

    def solve(self):
        K = self.assemble_global_stiffness()
        
        # Aplicar apoyos en la matriz K (Penalty Method)
        for node in self.nodes:
            if node.restraint:
                node_idx = self.node_map[node.id]
                dofs = [node.restraint.ux, node.restraint.uy, node.restraint.uz, node.restraint.rx, node.restraint.ry, node.restraint.rz]
                for d, is_fixed in enumerate(dofs):
                    if is_fixed:
                        idx = node_idx * 6 + d
                        K[idx, idx] = 1e30
        
        K_csr = K.tocsr()
        results_by_combo = {}
        
        # Iterar sobre las combinaciones de carga
        for combo in self.combinations:
            F, local_loads = self.assemble_load_vector(combo.factors)
            
            # Aplicar Penalty Method en F
            for node in self.nodes:
                if node.restraint:
                    node_idx = self.node_map[node.id]
                    dofs = [node.restraint.ux, node.restraint.uy, node.restraint.uz, node.restraint.rx, node.restraint.ry, node.restraint.rz]
                    for d, is_fixed in enumerate(dofs):
                        if is_fixed:
                            idx = node_idx * 6 + d
                            F[idx] = 0
            
            U = spsolve(K_csr, F)
            displacements = {n.id: U[i*6:(i+1)*6].tolist() for i, n in enumerate(self.nodes)}
            
            element_forces = {}
            for elem in self.elements:
                n1 = next(n for n in self.nodes if n.id == elem.nodes[0])
                n2 = next(n for n in self.nodes if n.id == elem.nodes[1])
                mat = self.materials[elem.material_id]
                sec = self.sections[elem.section_id]
                p1 = np.array([n1.x, n1.y, n1.z])
                p2 = np.array([n2.x, n2.y, n2.z])
                l = np.linalg.norm(p2 - p1)
                
                k_loc = get_3d_frame_local_stiffness(mat.E, mat.G, sec.A, sec.J, sec.Iy, sec.Ix, l)
                T = get_rotation_matrix(p1, p2, elem.beta_angle)
                
                idx1 = self.node_map[n1.id] * 6
                idx2 = self.node_map[n2.id] * 6
                u_glob = np.zeros(12)
                u_glob[0:6] = U[idx1:idx1+6]
                u_glob[6:12] = U[idx2:idx2+6]
                
                u_loc = T @ u_glob
                
                qx = local_loads[elem.id]["px"]
                qy = local_loads[elem.id]["py"]
                qz = local_loads[elem.id]["pz"]
                
                f_fixed_local = np.zeros(12)
                f_fixed_local[1] = qy * l / 2; f_fixed_local[5] = qy * l**2 / 12
                f_fixed_local[7] = qy * l / 2; f_fixed_local[11] = -qy * l**2 / 12
                f_fixed_local[2] = qz * l / 2; f_fixed_local[4] = -qz * l**2 / 12
                f_fixed_local[8] = qz * l / 2; f_fixed_local[10] = qz * l**2 / 12
                f_fixed_local[0] = qx * l / 2; f_fixed_local[6] = qx * l / 2
                
                f_loc_end = k_loc @ u_loc + f_fixed_local
                
                # 11 Estaciones
                stations = []
                xs = np.linspace(0, l, 11)
                for x in xs:
                    P = f_loc_end[0] - qx * x
                    V2 = f_loc_end[1] - qy * x
                    V3 = f_loc_end[2] - qz * x
                    T_tors = f_loc_end[3]
                    
                    # Convención estática simplificada para momentos:
                    M2 = -f_loc_end[4] + f_loc_end[2] * x - qz * x**2 / 2
                    M3 = -f_loc_end[5] + f_loc_end[1] * x - qy * x**2 / 2
                    
                    # Deflexión local (Funciones de forma de Hermite)
                    xi = x / l if l > 0 else 0
                    N1 = 1 - 3*xi**2 + 2*xi**3
                    N2 = l * (xi - 2*xi**2 + xi**3)
                    N3 = 3*xi**2 - 2*xi**3
                    N4 = l * (-xi**2 + xi**3)
                    
                    v_y = N1 * u_loc[1] + N2 * u_loc[5] + N3 * u_loc[7] + N4 * u_loc[11]
                    v_z = N1 * u_loc[2] - N2 * u_loc[4] + N3 * u_loc[8] - N4 * u_loc[10]
                    
                    stations.append({
                        "x": float(x),
                        "P": float(P),
                        "V2": float(V2),
                        "V3": float(V3),
                        "T": float(T_tors),
                        "M2": float(M2),
                        "M3": float(M3),
                        "uy": float(v_y),
                        "uz": float(v_z)
                    })
                
                element_forces[elem.id] = stations
                
            results_by_combo[combo.id] = {
                "displacements": displacements,
                "element_forces": element_forces
            }
            
        return {"results": results_by_combo, "combinations": [c.dict() for c in self.combinations]}