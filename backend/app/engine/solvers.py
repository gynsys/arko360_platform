import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import spsolve
from app.engine.fem_frame import get_3d_frame_local_stiffness, get_rotation_matrix
from app.schemas.fea3d import LoadType, Topology

class StructuralSolver:
    def __init__(self, topology: "Topology"):
        self.nodes = topology.nodes
        self.elements = topology.elements
        self.materials = {m.id: m for m in topology.materials}
        self.sections = {s.id: s for s in topology.sections}
        self.loads = topology.loads
        
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

    def assemble_load_vector(self):
        F = np.zeros(self.ndof)
        g = 9.81
        
        # 1. Peso Propio Automático
        for elem in self.elements:
            mat = self.materials[elem.material_id]
            sec = self.sections[elem.section_id]
            n1 = next(n for n in self.nodes if n.id == elem.nodes[0])
            n2 = next(n for n in self.nodes if n.id == elem.nodes[1])
            L = np.linalg.norm(np.array([n2.x-n1.x, n2.y-n1.y, n2.z-n1.z]))
            weight = sec.A * mat.density * g * L
            F[self.node_map[n1.id]*6 + 2] -= weight / 2
            F[self.node_map[n2.id]*6 + 2] -= weight / 2

        # 2. Cargas Manuales (Puntuales y Distribuidas)
        for load in self.loads:
            if load.type == LoadType.POINT:
                node_idx = self.node_map[load.target_id]
                dof_offset = {"X": 0, "Y": 1, "Z": 2}[load.direction]
                F[node_idx * 6 + dof_offset] += load.magnitude
            
            elif load.type == LoadType.DISTRIBUTED:
                elem = next(e for e in self.elements if e.id == load.target_id)
                n1 = next(n for n in self.nodes if n.id == elem.nodes[0])
                n2 = next(n for n in self.nodes if n.id == elem.nodes[1])
                L = np.linalg.norm(np.array([n2.x-n1.x, n2.y-n1.y, n2.z-n1.z]))
                w = load.magnitude
                # Carga equivalente en nudos (Simplificado Z)
                idx1_z, idx2_z = self.node_map[n1.id]*6+2, self.node_map[n2.id]*6+2
                idx1_my, idx2_my = self.node_map[n1.id]*6+4, self.node_map[n2.id]*6+4
                F[idx1_z] += (w*L)/2; F[idx2_z] += (w*L)/2
                F[idx1_my] += (w*L**2)/12; F[idx2_my] -= (w*L**2)/12

        return F

    def solve(self):
        K = self.assemble_global_stiffness()
        F = self.assemble_load_vector()
        
        # Aplicar apoyos (Penalty Method)
        for node in self.nodes:
            if node.restraint:
                node_idx = self.node_map[node.id]
                for d, is_fixed in enumerate(node.restraint.dofs):
                    if is_fixed:
                        idx = node_idx * 6 + d
                        K[idx, idx] = 1e30
                        F[idx] = 0
        
        U = spsolve(K.tocsr(), F)
        
        displacements = {n.id: U[i*6:(i+1)*6].tolist() for i, n in enumerate(self.nodes)}
        return {"displacements": displacements}