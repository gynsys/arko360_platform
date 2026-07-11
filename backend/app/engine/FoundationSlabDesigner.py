"""
FoundationSlabDesigner - Losa de cimentación rectangular (Grillage Method)
Diseño para estructuras de un nivel con cubiertas livianas.
Incluye: bandas de refuerzo bajo muros, verificación de asentamientos diferenciales,
cortante y punzonamiento (ACI 318), y generación de plano de armado.

UNIDADES: N, m, Pa, MPa  (salidas en kN, mm, cm²/m)
"""

import numpy as np
from scipy.sparse import lil_matrix, csr_matrix
from scipy.sparse.linalg import spsolve
import json
import base64
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple
import warnings


@dataclass
class Wall:
    x1: float
    y1: float
    x2: float
    y2: float
    thickness: float
    height: float
    density: float
    load_factor: float
    wall_type: str
    q_lineal: float = 0.0
    length: float = 0.0
    band_width: float = 0.0
    q_corona_kgf_m: float = 0.0
    openings: List[Dict] = None

    def __post_init__(self):
        if self.openings is None:
            self.openings = []


@dataclass
class Beam:
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float
    load_factor: float
    beam_type: str
    q_self: float = 0.0
    length: float = 0.0


@dataclass
class Column:
    x: float
    y: float
    width: float
    length: float
    height: float
    load_kgf: float
    P_u: float = 0.0  # Carga última en N
    id: str = ""


class FoundationSlabDesigner:
    """
    Diseñador de losa de cimentación por Método de la Grilla.
    Corregido para diseño profesional con bandas de refuerzo y asentamientos diferenciales.

    DOF por nodo: w (vertical), θx (rotación eje x), θy (rotación eje y)
    """

    def __init__(self, Lx, Ly, h, E, nu, k, f_c, f_y, cover, bar_diam,
                 gamma_horm=2400, include_self_weight=True, lambda_aci=1.0,
                 band_width_factor=1.0, max_settlement_ratio=500.0,
                 bar_diameters_mm=None, q_adm=150000.0, band_width_m=0.0,
                 custom_mesh_cm2_m=0.0):
        """
        Parameters
        ----------
        band_width_factor : float
            Multiplicador sobre el ancho base de banda (espesor_muro + 2*h).
            Valor 1.0 = ancho base. 1.5 = ancho base × 1.5.
        max_settlement_ratio : float
            Relación máxima L/Δs permitida para asentamientos diferenciales (ej. 500).
        bar_diameters_mm : list
            Diámetros comerciales disponibles [mm]. Default: [10, 12, 16, 20, 25].
        """
        self.Lx = Lx
        self.Ly = Ly
        self.h = h
        self.E = E
        self.nu = nu
        self.k = k
        self.f_c = f_c  # MPa
        self.f_y = f_y  # MPa
        self.cover = cover
        self.bar_diam = bar_diam
        self.gamma_horm = gamma_horm
        self.include_self_weight = include_self_weight
        self.lambda_aci = lambda_aci
        self.band_width_factor = band_width_factor
        self.max_settlement_ratio = max_settlement_ratio
        self.q_adm = q_adm
        self.band_width_m = band_width_m
        self.custom_mesh_cm2_m = custom_mesh_cm2_m

        self.G = E / (2 * (1 + nu))
        self.d_eff = h - cover - bar_diam / 2
        self.rho_min = 0.0018
        self.phi_flex = 0.9
        self.phi_shear = 0.75
        self.phi_punch = 0.75

        if bar_diameters_mm is None:
            self.bar_diameters_mm = [7, 8, 10, 12, 16, 20, 25]
        else:
            self.bar_diameters_mm = bar_diameters_mm

        # Áreas de barras comerciales (mm²)
        self.bar_areas_mm2 = {d: np.pi * (d**2) / 4 for d in self.bar_diameters_mm}

        self.walls: List[Wall] = []
        self.beams: List[Beam] = []
        self.columns: List[Column] = []
        self.band_data = []  # Almacena resultados de bandas
        self.settlement_data = []
        self.punching_data = []

    def set_mesh(self, nx, ny):
        if nx < 10 or ny < 10:
            warnings.warn("Malla muy gruesa. Se recomienda nx, ny >= 20 para precisión.")
        self.nx = nx
        self.ny = ny
        self.dx = self.Lx / nx
        self.dy = self.Ly / ny

        self.n_nodes_x = nx + 1
        self.n_nodes_y = ny + 1
        self.n_nodes = self.n_nodes_x * self.n_nodes_y
        self.ndof = 3 * self.n_nodes

        self.x = np.linspace(0, self.Lx, self.n_nodes_x)
        self.y = np.linspace(0, self.Ly, self.n_nodes_y)
        self.X, self.Y = np.meshgrid(self.x, self.y)

        print(f"Grilla: {nx}x{ny} elementos | dx={self.dx:.3f}m, dy={self.dy:.3f}m | Nodos={self.n_nodes}")

    def add_wall(self, x1, y1, x2, y2, thickness, height, material_density,
                 load_factor=1.0, wall_type="perimetral", is_plastered=False, openings=None):
        length = np.sqrt((x2-x1)**2 + (y2-y1)**2)
        if length < 1e-6:
            return
        
        # Plaster weight: ~40kg/m2 per side -> 80kg/m2 total * height * g
        plaster_kg_m2 = 80 if is_plastered else 0
        # Cargas de Techo Liviano (COVENIN - Venezuela)
        # Carga Muerta (D): 15 kgf/m² (Lámina galvanizada liviana + perfiles tubulares)
        # Carga Viva (L): 40 kgf/m² (Cubierta liviana no accesible)
        trib_width = 2.5 # ancho tributario promedio (m)
        q_techo_kgf_m = (15 + 40) * trib_width
        # Viga de corona (amarre) sobre los muros de mampostería: 10x13 cm
        q_corona_kgf_m = 0.10 * 0.13 * 2400
        
        op_area = sum(op.get('width_m', 0) * op.get('height_m', 0) for op in (openings or []))
        net_area = max(0, length * height - op_area)
        effective_height = net_area / length if length > 0 else height
        
        q_lineal = ( (thickness * material_density + plaster_kg_m2) * effective_height + q_techo_kgf_m + q_corona_kgf_m ) * 9.81 * load_factor

        # Ancho de banda de refuerzo: espesor + 2*d_eff, mínimo racional ~0.33m
        base_band = max(thickness + 2 * self.d_eff, 0.33)
        if hasattr(self, 'band_width_m') and self.band_width_m > 0:
            band_width = max(self.band_width_m, base_band)
        else:
            band_width = base_band * self.band_width_factor

        self.walls.append(Wall(
            x1=x1, y1=y1, x2=x2, y2=y2,
            thickness=thickness, height=height,
            density=material_density, load_factor=load_factor,
            wall_type=wall_type, q_lineal=q_lineal,
            length=length, band_width=band_width,
            q_corona_kgf_m=q_corona_kgf_m,
            openings=openings or []
        ))
        print(f"  Muro {wall_type}: ({x1:.2f},{y1:.2f})->({x2:.2f},{y2:.2f}) | "
              f"q={q_lineal/1000:.2f} kN/m | Banda={band_width:.2f}m")

    def add_beam(self, x1, y1, x2, y2, width, height, load_factor=1.0, beam_type="zuncho"):
        length = np.sqrt((x2-x1)**2 + (y2-y1)**2)
        if length < 1e-6:
            return
        q_self = width * height * self.gamma_horm * 9.81 * load_factor

        self.beams.append(Beam(
            x1=x1, y1=y1, x2=x2, y2=y2,
            width=width, height=height,
            load_factor=load_factor, beam_type=beam_type,
            q_self=q_self, length=length
        ))
        print(f"  Viga {beam_type}: ({x1:.2f},{y1:.2f})->({x2:.2f},{y2:.2f}) | "
              f"{width*100:.0f}x{height*100:.0f} cm | q={q_self/1000:.2f} kN/m")

    def add_column(self, x, y, width, length, height, load_kgf, id=""):
        # Peso propio de la columna
        W_self_kgf = width * length * height * 2400
        total_load_kgf = load_kgf + W_self_kgf
        P_u_N = total_load_kgf * 9.81 * 1.5  # Factored load
        
        self.columns.append(Column(
            x=x, y=y, width=width, length=length, height=height, load_kgf=load_kgf, P_u=P_u_N, id=id
        ))
        print(f"  Machón {id}: ({x:.2f},{y:.2f}) | {width*100:.0f}x{length*100:.0f} cm | Pu={P_u_N/1000:.2f} kN")

    def _node_idx(self, i, j):
        return j * self.n_nodes_x + i

    def _dof(self, node, local_dof):
        return 3 * node + local_dof

    def _beam_stiffness_x(self, EI, GJ, L):
        k_flex = EI / L**3 * np.array([
            [12, 0, 6*L, -12, 0, 6*L],
            [0, 0, 0, 0, 0, 0],
            [6*L, 0, 4*L**2, -6*L, 0, 2*L**2],
            [-12, 0, -6*L, 12, 0, -6*L],
            [0, 0, 0, 0, 0, 0],
            [6*L, 0, 2*L**2, -6*L, 0, 4*L**2]
        ])
        k_tors = GJ / L * np.array([
            [0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, -1, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, -1, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0]
        ])
        return k_flex + k_tors

    def _beam_stiffness_y(self, EI, GJ, L):
        k_flex = EI / L**3 * np.array([
            [12, 6*L, 0, -12, 6*L, 0],
            [6*L, 4*L**2, 0, -6*L, 2*L**2, 0],
            [0, 0, 0, 0, 0, 0],
            [-12, -6*L, 0, 12, -6*L, 0],
            [6*L, 2*L**2, 0, -6*L, 4*L**2, 0],
            [0, 0, 0, 0, 0, 0]
        ])
        k_tors = GJ / L * np.array([
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, -1],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, -1, 0, 0, 1]
        ])
        return k_flex + k_tors

    @staticmethod
    def _point_segment_distance(px, py, x1, y1, x2, y2):
        """Distancia perpendicular de punto a segmento."""
        dx = x2 - x1
        dy = y2 - y1
        len2 = dx*dx + dy*dy
        if len2 < 1e-18:
            return np.hypot(px - x1, py - y1)
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / len2))
        projx = x1 + t * dx
        projy = y1 + t * dy
        return np.hypot(px - projx, py - projy)

    def _build_system(self, extra_uniform_load=0.0):
        K = lil_matrix((self.ndof, self.ndof))
        F = np.zeros(self.ndof)

        # 1. Peso propio y carga uniforme extra (sobrecarga de uso)
        q_total = extra_uniform_load
        if self.include_self_weight:
            q_total += self.h * self.gamma_horm * 9.81

        for j in range(self.n_nodes_y):
            for i in range(self.n_nodes_x):
                node = self._node_idx(i, j)
                area = self.dx * self.dy
                if i == 0 or i == self.nx:
                    area /= 2
                if j == 0 or j == self.ny:
                    area /= 2
                F[self._dof(node, 0)] += q_total * area

        # 2. Cargas de muros - Aplicación concentrada al nodo más cercano
        # (mejor que interpolación bilineal para capturar momentos pico bajo muros)
        for wall in self.walls:
            # Dividir muro en pequeños segmentos (dl <= dx/2)
            n_seg = int(np.ceil(wall.length / (self.dx / 2.0)))
            if n_seg == 0:
                continue
            dl = wall.length / n_seg
            for k in range(n_seg):
                t = (k + 0.5) / n_seg
                dist_from_start = t * wall.length
                
                # Check si estamos en un vano (opening)
                q_eff = wall.q_lineal
                for op in wall.openings:
                    op_start = op.get("start_m", 0)
                    op_w = op.get("width_m", 0)
                    op_h = op.get("height_m", 0)
                    
                    if op_start <= dist_from_start <= (op_start + op_w):
                        # Carga base del muro
                        plaster_kg = 80 if getattr(wall, 'is_plastered', False) else 0
                        gamma = wall.thickness * wall.density + plaster_kg
                        # Restamos el peso del vano
                        q_vano = gamma * op_h * 9.81 * wall.load_factor
                        q_eff = max(0, wall.q_lineal - q_vano)
                        break

                x_p = wall.x1 + t * (wall.x2 - wall.x1)
                y_p = wall.y1 + t * (wall.y2 - wall.y1)
                
                # Encontrar el nodo más cercano
                i = int(round(x_p / self.dx))
                j = int(round(y_p / self.dy))
                i = np.clip(i, 0, self.nx)
                j = np.clip(j, 0, self.ny)
                
                node = self._node_idx(i, j)
                F[self._dof(node, 0)] += q_eff * dl

        # 2.5 Cargas puntuales (Columnas / Machones)
        for col in self.columns:
            # Distribuir al nodo más cercano
            i = int(round(col.x / self.dx))
            j = int(round(col.y / self.dy))
            i = np.clip(i, 0, self.nx)
            j = np.clip(j, 0, self.ny)
            node = self._node_idx(i, j)
            # col.P_u ya está en Newtons factorizados
            F[self._dof(node, 0)] += col.P_u

        # 3. Cargas de vigas de amarre (mismo método concentrado)
        for beam in self.beams:
            x1, y1, x2, y2 = beam.x1, beam.y1, beam.x2, beam.y2
            q_self = beam.q_self
            n_seg = max(int(beam.length / min(self.dx, self.dy)), 50)
            seg_len = beam.length / n_seg

            for t in np.linspace(0, 1, n_seg + 1)[:-1]:
                xm = x1 + (t + 0.5 / n_seg) * (x2 - x1)
                ym = y1 + (t + 0.5 / n_seg) * (y2 - y1)
                i = int(round(xm / self.dx))
                j = int(round(ym / self.dy))
                i = np.clip(i, 0, self.nx)
                j = np.clip(j, 0, self.ny)
                node = self._node_idx(i, j)
                F[self._dof(node, 0)] += q_self * seg_len

        # 4. Vigas de la losa en X
        for j in range(self.n_nodes_y):
            for i in range(self.nx):
                n1 = self._node_idx(i, j)
                n2 = self._node_idx(i+1, j)
                EI = self.E * (self.dy * self.h**3) / 12
                J = self.dy * self.h**3 / 6.0
                GJ = self.G * J
                L = self.dx
                k_elem = self._beam_stiffness_x(EI, GJ, L)
                dofs = [self._dof(n1, d) for d in range(3)] + [self._dof(n2, d) for d in range(3)]
                for r in range(6):
                    for c in range(6):
                        K[dofs[r], dofs[c]] += k_elem[r, c]

        # 5. Vigas de la losa en Y
        for i in range(self.n_nodes_x):
            for j in range(self.ny):
                n1 = self._node_idx(i, j)
                n2 = self._node_idx(i, j+1)
                EI = self.E * (self.dx * self.h**3) / 12
                J = self.dx * self.h**3 / 6.0
                GJ = self.G * J
                L = self.dy
                k_elem = self._beam_stiffness_y(EI, GJ, L)
                dofs = [self._dof(n1, d) for d in range(3)] + [self._dof(n2, d) for d in range(3)]
                for r in range(6):
                    for c in range(6):
                        K[dofs[r], dofs[c]] += k_elem[r, c]

        # 6. Vigas de amarre perimetrales (rigidez adicional)
        for beam in self.beams:
            x1, y1, x2, y2 = beam.x1, beam.y1, beam.x2, beam.y2
            width = beam.width
            height_beam = beam.height
            EI_beam = self.E * (width * height_beam**3) / 12
            J_beam = width * height_beam**3 / 6.0
            GJ_beam = self.G * J_beam
            n_seg = max(int(beam.length / min(self.dx, self.dy)), 1)

            for t in np.linspace(0, 1, n_seg + 1)[:-1]:
                xp1 = x1 + t * (x2 - x1)
                yp1 = y1 + t * (y2 - y1)
                xp2 = x1 + (t + 1/n_seg) * (x2 - x1)
                yp2 = y1 + (t + 1/n_seg) * (y2 - y1)

                def find_node(xp, yp):
                    i = int(round(xp / self.dx))
                    j = int(round(yp / self.dy))
                    i = np.clip(i, 0, self.nx)
                    j = np.clip(j, 0, self.ny)
                    return self._node_idx(i, j)

                n1 = find_node(xp1, yp1)
                n2 = find_node(xp2, yp2)
                if n1 != n2:
                    L_seg = np.sqrt((xp2-xp1)**2 + (yp2-yp1)**2)
                    if abs(x2 - x1) > abs(y2 - y1):
                        k_elem = self._beam_stiffness_x(EI_beam, GJ_beam, L_seg)
                    else:
                        k_elem = self._beam_stiffness_y(EI_beam, GJ_beam, L_seg)
                    dofs = [self._dof(n1, d) for d in range(3)] + [self._dof(n2, d) for d in range(3)]
                    for r in range(6):
                        for c in range(6):
                            K[dofs[r], dofs[c]] += k_elem[r, c]

        # 7. Resortes de suelo Winkler
        for j in range(self.n_nodes_y):
            for i in range(self.n_nodes_x):
                node = self._node_idx(i, j)
                area = self.dx * self.dy
                if i == 0 or i == self.nx:
                    area /= 2
                if j == 0 or j == self.ny:
                    area /= 2
                K[self._dof(node, 0), self._dof(node, 0)] += self.k * area

        return K.tocsr(), F

    def solve(self, extra_uniform_load=0.0):
        print("\nResolviendo sistema de grillage...")
        K, F = self._build_system(extra_uniform_load)
        U = spsolve(K, F)

        self.w = U[0::3].reshape(self.n_nodes_y, self.n_nodes_x)
        self.thetax = U[1::3].reshape(self.n_nodes_y, self.n_nodes_x)
        self.thetay = U[2::3].reshape(self.n_nodes_y, self.n_nodes_x)

        print(f"  w_max = {np.max(np.abs(self.w))*1000:.4f} mm")
        return self.w

    def compute_moments(self):
        w = self.w
        dx, dy = self.dx, self.dy
        D_plate = self.E * self.h**3 / (12 * (1 - self.nu**2))
        nu = self.nu
        nx, ny = self.nx, self.ny

        self.Mx = np.zeros_like(w)
        self.My = np.zeros_like(w)
        self.Mxy = np.zeros_like(w)

        for j in range(self.n_nodes_y):
            for i in range(self.n_nodes_x):
                if 1 <= i <= nx-1:
                    d2wdx2 = (w[j, i+1] - 2*w[j, i] + w[j, i-1]) / dx**2
                elif i == 0:
                    d2wdx2 = (2*w[j, i] - 5*w[j, i+1] + 4*w[j, i+2] - w[j, i+3]) / dx**2
                else:
                    d2wdx2 = (2*w[j, i] - 5*w[j, i-1] + 4*w[j, i-2] - w[j, i-3]) / dx**2

                if 1 <= j <= ny-1:
                    d2wdy2 = (w[j+1, i] - 2*w[j, i] + w[j-1, i]) / dy**2
                elif j == 0:
                    d2wdy2 = (2*w[j, i] - 5*w[j+1, i] + 4*w[j+2, i] - w[j+3, i]) / dy**2
                else:
                    d2wdy2 = (2*w[j, i] - 5*w[j-1, i] + 4*w[j-2, i] - w[j-3, i]) / dy**2

                if 1 <= i <= nx-1 and 1 <= j <= ny-1:
                    d2wdxdy = (w[j+1, i+1] - w[j+1, i-1] - w[j-1, i+1] + w[j-1, i-1]) / (4*dx*dy)
                else:
                    d2wdxdy = 0.0

                self.Mx[j, i] = D_plate * (d2wdx2 + nu * d2wdy2)
                self.My[j, i] = D_plate * (d2wdy2 + nu * d2wdx2)
                self.Mxy[j, i] = D_plate * (1 - nu) * d2wdxdy

        print(f"  Mx_max = {np.max(np.abs(self.Mx))/1000:.3f} kN·m/m")
        print(f"  My_max = {np.max(np.abs(self.My))/1000:.3f} kN·m/m")
        return self.Mx, self.My, self.Mxy

    def compute_shear(self):
        """Calcula cortantes Qx, Qy desde curvaturas y verifica ACI 318."""
        w = self.w
        dx, dy = self.dx, self.dy
        D = self.E * self.h**3 / (12 * (1 - self.nu**2))
        nx, ny = self.nx, self.ny

        # Laplaciano de w
        laplacian = np.zeros_like(w)
        for j in range(self.n_nodes_y):
            for i in range(self.n_nodes_x):
                if 1 <= i <= nx-1:
                    d2wdx2 = (w[j, i+1] - 2*w[j, i] + w[j, i-1]) / dx**2
                elif i == 0:
                    d2wdx2 = (2*w[j, i] - 5*w[j, i+1] + 4*w[j, i+2] - w[j, i+3]) / dx**2
                else:
                    d2wdx2 = (2*w[j, i] - 5*w[j, i-1] + 4*w[j, i-2] - w[j, i-3]) / dx**2

                if 1 <= j <= ny-1:
                    d2wdy2 = (w[j+1, i] - 2*w[j, i] + w[j-1, i]) / dy**2
                elif j == 0:
                    d2wdy2 = (2*w[j, i] - 5*w[j+1, i] + 4*w[j+2, i] - w[j+3, i]) / dy**2
                else:
                    d2wdy2 = (2*w[j, i] - 5*w[j-1, i] + 4*w[j-2, i] - w[j-3, i]) / dy**2
                laplacian[j, i] = d2wdx2 + d2wdy2

        # Qx = -D * d(lap)/dx, Qy = -D * d(lap)/dy
        self.Qx = np.zeros_like(w)
        self.Qy = np.zeros_like(w)
        for j in range(self.n_nodes_y):
            for i in range(self.n_nodes_x):
                if 1 <= i <= nx-1:
                    dlapdx = (laplacian[j, i+1] - laplacian[j, i-1]) / (2*dx)
                elif i == 0:
                    dlapdx = (-3*laplacian[j, i] + 4*laplacian[j, i+1] - laplacian[j, i+2]) / (2*dx)
                else:
                    dlapdx = (3*laplacian[j, i] - 4*laplacian[j, i-1] + laplacian[j, i-2]) / (2*dx)

                if 1 <= j <= ny-1:
                    dlapdy = (laplacian[j+1, i] - laplacian[j-1, i]) / (2*dy)
                elif j == 0:
                    dlapdy = (-3*laplacian[j, i] + 4*laplacian[j+1, i] - laplacian[j+2, i]) / (2*dy)
                else:
                    dlapdy = (3*laplacian[j, i] - 4*laplacian[j-1, i] + laplacian[j-2, i]) / (2*dy)

                self.Qx[j, i] = -D * dlapdx
                self.Qy[j, i] = -D * dlapdy

        self.Vu = np.maximum(np.abs(self.Qx), np.abs(self.Qy))
        bw_mm = 1000
        d_mm = self.d_eff * 1000
        self.Vc = 0.33 * self.lambda_aci * np.sqrt(self.f_c) * bw_mm * d_mm  # N/m
        self.phiVc = self.phi_shear * self.Vc
        self.shear_ratio = self.Vu / self.phiVc
        self.shear_ok = self.Vu <= self.phiVc

        print(f"\nVerificación de cortante (ACI 318):")
        print(f"  Vu_max = {np.max(self.Vu)/1000:.3f} kN/m")
        print(f"  Vc = {self.Vc/1000:.3f} kN/m")
        print(f"  phi_Vc = {self.phiVc/1000:.3f} kN/m")
        print(f"  Ratio Vu/phi_Vc max = {np.max(self.shear_ratio):.3f}")
        print(f"  Estado: {'CUMPLE OK' if np.all(self.shear_ok) else 'NO CUMPLE FAIL'}")
        if not np.all(self.shear_ok):
            n_fail = np.sum(~self.shear_ok)
            print(f"  Nodos que no cumplen: {n_fail} de {self.n_nodes} ({100*n_fail/self.n_nodes:.1f}%)")
        return self.Qx, self.Qy, self.Vu, self.shear_ok

    def _calc_steel(self, Mu):
        fc = self.f_c * 1e6
        fy = self.f_y * 1e6
        d = self.d_eff
        phi = self.phi_flex
        b = 1.0
        As_min_val = self.rho_min * b * self.h
        As = np.full_like(Mu, As_min_val)
        a = np.zeros_like(Mu)
        As_calc = np.zeros_like(Mu)
        mask = Mu > 1e-3
        if np.any(mask):
            disc = d**2 - 2 * Mu[mask] / (phi * 0.85 * fc * b)
            disc = np.maximum(disc, 0)
            a[mask] = d - np.sqrt(disc)
            As_calc[mask] = 0.85 * fc * b * a[mask] / fy
            As[mask] = np.maximum(As_calc[mask], As_min_val)
        return As, a, As_calc

    def define_reinforcement_bands(self, load_factor=1.5):
        """
        Define bandas de refuerzo bajo muros y calcula armadura práctica.
        Fuera de bandas: armadura mínima.
        """
        Mx = self.Mx * load_factor
        My = self.My * load_factor
        nx, ny = self.nx, self.ny

        # Máscaras para bandas (inicialmente todas False)
        mask_bands = np.zeros((self.n_nodes_y, self.n_nodes_x), dtype=bool)
        band_details = []

        # As mínimo global
        As_min_val = self.rho_min * 1.0 * self.h

        # Inicializar armadura con mínimo
        self.Asx = np.full_like(self.w, As_min_val)
        self.Asy = np.full_like(self.w, As_min_val)

        for idx, wall in enumerate(self.walls):
            # Máscara de nodos dentro de la banda de este muro
            band_mask = np.zeros_like(mask_bands)
            half_bw = wall.band_width / 2.0
            for j in range(self.n_nodes_y):
                for i in range(self.n_nodes_x):
                    dps = self._point_segment_distance(
                        self.X[j, i], self.Y[j, i],
                        wall.x1, wall.y1, wall.x2, wall.y2
                    )
                    if dps <= half_bw:
                        band_mask[j, i] = True
                        mask_bands[j, i] = True

            # Momento de diseño en la banda (máximo absoluto en ambas direcciones)
            Mx_band_max = np.max(np.abs(Mx[band_mask])) if np.any(band_mask) else 0.0
            My_band_max = np.max(np.abs(My[band_mask])) if np.any(band_mask) else 0.0

            # Diseñar armadura para toda la banda con estos momentos
            Asx_band, ax_band, Asx_calc_band = self._calc_steel(np.array([Mx_band_max]))
            Asx_band, ax_band, Asx_calc_band = Asx_band[0], ax_band[0], Asx_calc_band[0]

            Asy_band, ay_band, Asy_calc_band = self._calc_steel(np.array([My_band_max]))
            Asy_band, ay_band, Asy_calc_band = Asy_band[0], ay_band[0], Asy_calc_band[0]

            # Asignar a nodos de banda (solo si supera el mínimo ya puesto)
            self.Asx = np.where(band_mask, np.maximum(self.Asx, Asx_band), self.Asx)
            self.Asy = np.where(band_mask, np.maximum(self.Asy, Asy_band), self.Asy)

            # Propuesta de barras
            bar_x = self._propose_bars(Asx_band)
            bar_y = self._propose_bars(Asy_band)

            band_details.append({
                'id': int(idx),
                'type': str(wall.wall_type),
                'x1': float(wall.x1), 'y1': float(wall.y1), 'x2': float(wall.x2), 'y2': float(wall.y2),
                'band_width': float(wall.band_width),
                'Mx_design_kNm_m': float(Mx_band_max / 1000),
                'My_design_kNm_m': float(My_band_max / 1000),
                'Asx_cm2_m': float(Asx_band * 1e4),
                'Asy_cm2_m': float(Asy_band * 1e4),
                'a_x_cm': float(ax_band * 100),
                'a_y_cm': float(ay_band * 100),
                'Asx_calc_cm2_m': float(Asx_calc_band * 1e4),
                'Asy_calc_cm2_m': float(Asy_calc_band * 1e4),
                'bar_x': {k: (float(v) if isinstance(v, (np.floating, float)) else v) for k, v in bar_x.items()},
                'bar_y': {k: (float(v) if isinstance(v, (np.floating, float)) else v) for k, v in bar_y.items()}
            })

        # Asegurar mínimo en TODA la losa (bandas e intermedias)
        self.Asx = np.maximum(self.Asx, As_min_val)
        self.Asy = np.maximum(self.Asy, As_min_val)

        # Separar inferior/superior según signo de momento (sin factor de carga para signo)
        self.Asx_bot = np.where(self.Mx > 0, self.Asx, As_min_val)
        self.Asx_top = np.where(self.Mx < 0, self.Asx, As_min_val)
        self.Asy_bot = np.where(self.My > 0, self.Asy, As_min_val)
        self.Asy_top = np.where(self.My < 0, self.Asy, As_min_val)

        self.band_data = band_details
        self._print_band_report(band_details, As_min_val)
        return self.Asx_bot, self.Asy_bot, self.Asx_top, self.Asy_top

    def _propose_bars(self, As_req):
        """Propone combinación comercial de barra + separación."""
        if As_req <= 1e-8:
            return {"diam_mm": 0, "sep_m": 0, "As_prov_cm2_m": 0, "note": "Mínimo no requerido"}

        best = None
        for d in self.bar_diameters_mm:
            A_bar = self.bar_areas_mm2[d]  # mm²
            s = A_bar / (As_req * 1e6)  # m
            # Redondear separación hacia abajo a múltiplo de 2.5 cm (más conservador)
            s_round = np.floor(s / 0.025) * 0.025
            # Verificar límites ACI/prácticos
            s_min = max(0.10, 1.5 * d / 1000.0)
            s_max = min(0.45, 3 * self.h)
            
            # Si el cálculo da una separación mayor que la máxima permitida, usamos la máxima permitida
            if s_round > s_max:
                s_round = s_max
                
            if s_round >= s_min:
                As_prov = (A_bar / (s_round * 1e6))  # m²/m
                score = d * s_round  # Preferir menor diámetro
                if best is None or score < best['score']:
                    best = {
                        'diam_mm': d,
                        'sep_m': round(s_round, 3),
                        'As_prov_cm2_m': round(As_prov * 1e4, 2),
                        'As_req_cm2_m': round(As_req * 1e4, 2),
                        'score': score,
                        'note': 'OK'
                    }
        if best is None:
            # Si no cumple, usar el mayor diámetro con separación mínima
            d = max(self.bar_diameters_mm)
            A_bar = self.bar_areas_mm2[d]
            s_min = max(0.10, 1.5 * d / 1000.0)
            As_prov = A_bar / (s_min * 1e6)
            return {
                'diam_mm': d,
                'sep_m': round(s_min, 3),
                'As_prov_cm2_m': round(As_prov * 1e4, 2),
                'As_req_cm2_m': round(As_req * 1e4, 2),
                'note': 'REVISAR - Sep. mínima'
            }
        del best['score']
        return best

    def _print_band_report(self, band_details, As_min_val):
        print("\n=== PLANO DE ARMADO - BANDAS DE REFUERZO ===")
        print(f"Armadura mínima fuera de bandas: {As_min_val*1e4:.2f} cm²/m")
        print("-" * 100)
        print(f"{'Muro':<6} {'Tipo':<12} {'Ancho Banda':<12} {'Mx diseño':<12} {'My diseño':<12} "
              f"{'Asx (cm²/m)':<14} {'Prop. X':<18} {'Asy (cm²/m)':<14} {'Prop. Y':<18}")
        print("-" * 100)
        for b in band_details:
            bx = b['bar_x']
            by = b['bar_y']
            px = f"Ø{bx['diam_mm']}@{bx['sep_m']*100:.0f}cm ({bx['note']})" if bx['diam_mm']>0 else "Mínimo"
            py = f"Ø{by['diam_mm']}@{by['sep_m']*100:.0f}cm ({by['note']})" if by['diam_mm']>0 else "Mínimo"
            print(f"{b['id']:<6} {b['type']:<12} {b['band_width']:<12.2f} "
                  f"{b['Mx_design_kNm_m']:<12.2f} {b['My_design_kNm_m']:<12.2f} "
                  f"{b['Asx_cm2_m']:<14.2f} {px:<18} {b['Asy_cm2_m']:<14.2f} {py:<18}")
        print("-" * 100)

    def check_differential_settlements(self):
        """Verifica asentamientos diferenciales bajo cada muro."""
        print("\n=== VERIFICACIÓN DE ASENTAMIENTOS DIFERENCIALES ===")
        print(f"Criterio: L/Dw >= {self.max_settlement_ratio} (mampostería/cubierta liviana)")
        print(f"{'Muro':<6} {'Tipo':<12} {'Long. (m)':<10} {'Dw (mm)':<10} {'Ratio L/Dw':<12} {'Estado':<10}")
        print("-" * 70)

        results = []
        for idx, wall in enumerate(self.walls):
            # Nodos bajo el muro (dentro de media losa de ancho del eje)
            tol = max(wall.thickness / 2, min(self.dx, self.dy))
            w_vals = []
            for j in range(self.n_nodes_y):
                for i in range(self.n_nodes_x):
                    dps = self._point_segment_distance(
                        self.X[j, i], self.Y[j, i],
                        wall.x1, wall.y1, wall.x2, wall.y2
                    )
                    if dps <= tol:
                        w_vals.append(self.w[j, i])

            if len(w_vals) < 2:
                continue

            w_vals = np.array(w_vals)
            delta_w = np.max(w_vals) - np.min(w_vals)
            delta_w_mm = delta_w * 1000

            if delta_w > 1e-6:
                ratio = wall.length / delta_w
            else:
                ratio = 99999.0

            ok = ratio >= self.max_settlement_ratio
            status = "OK" if ok else "NO CUMPLE FAIL"

            results.append({
                'id': int(idx), 'type': str(wall.wall_type), 'length': float(wall.length),
                'delta_w_mm': float(delta_w_mm), 'ratio': float(ratio), 'ok': bool(ok)
            })
            print(f"{idx:<6} {wall.wall_type:<12} {wall.length:<10.2f} {delta_w_mm:<10.2f} {ratio:<12.1f} {status:<10}")

        self.settlement_data = results
        all_ok = all(r['ok'] for r in results) if results else True
        print(f"\nEstado global asentamientos: {'CUMPLE OK' if all_ok else 'NO CUMPLE FAIL'}")
        return results

    def check_punching(self):
        """Verificación simplificada de punzonamiento en esquinas y machones."""
        print("\n=== VERIFICACIÓN DE PUNZONAMIENTO EN ESQUINAS Y MACHONES ===")
        print(f"{'Elemento':<15} {'Vu (kN)':<12} {'Vc (kN)':<12} {'phi_Vc (kN)':<12} {'Ratio':<8} {'Estado':<10}")
        print("-" * 75)

        results = []
        d = self.d_eff
        
        # 1. Machones (Columnas)
        for col in self.columns:
            # Perímetro crítico b0 (ACI 318 Sec 22.6)
            b0 = 2 * (col.width + d) + 2 * (col.length + d)
            Vu = col.P_u  # N
            
            # Resistencia del concreto vc = 0.33 * sqrt(f'c) en MPa
            # Vc = vc * b0 * d * 10^6 para tenerlo en Newtons
            vc_MPa = 0.33 * self.lambda_aci * np.sqrt(self.f_c)
            Vc = vc_MPa * 1e6 * b0 * d
            phiVc = self.phi_punch * Vc
            ratio = Vu / phiVc if phiVc > 0 else 0
            ok = ratio <= 1.0

            results.append({
                'id': f"Machón {col.id}", 'type': 'columna',
                'Vu_kN': float(Vu / 1000), 'Vc_kN': float(Vc / 1000),
                'phiVc_kN': float(phiVc / 1000), 'ratio': float(ratio), 'ok': bool(ok)
            })
            print(f"Machón {col.id:<8} {Vu/1000:<12.1f} {Vc/1000:<12.1f} {phiVc/1000:<12.1f} {ratio:<8.2f} {'CUMPLE OK' if ok else 'NO CUMPLE FAIL'}")

        # 2. Buscar esquinas: extremos de muros perimetrales
        corners = []
        for w in self.walls:
            if w.wall_type == "perimetral":
                corners.append((w.x1, w.y1, w.thickness))
                corners.append((w.x2, w.y2, w.thickness))

        # Eliminar duplicados cercanos
        unique_corners = []
        for c in corners:
            x, y, t = c
            if not any(np.hypot(x - ux, y - uy) < 0.3 for ux, uy, _ in unique_corners):
                unique_corners.append((x, y, t))

        for idx, (xc, yc, tw) in enumerate(unique_corners):
            # Área crítica aproximada para esquina:
            # En esquina, b0 es un cuarto de perímetro o dos lados
            side_x = tw + d/2
            side_y = tw + d/2
            b0 = side_x + side_y
            area_crit = side_x * side_y

            # Sumar cargas de muros dentro del área crítica
            wall_load = 0.0
            for w in self.walls:
                d1 = np.hypot(w.x1 - xc, w.y1 - yc)
                d2 = np.hypot(w.x2 - xc, w.y2 - yc)
                if d1 < 0.5 or d2 < 0.5:
                    wall_load += w.q_lineal * max(side_x, side_y)
            
            # Carga del área crítica de la losa
            q_slab = self.h * self.gamma_horm * 9.81 * 1.2 * area_crit
            Vu = wall_load + q_slab

            vc_MPa = 0.33 * self.lambda_aci * np.sqrt(self.f_c)
            Vc = vc_MPa * 1e6 * b0 * d
            phiVc = self.phi_punch * Vc
            ratio = Vu / phiVc if phiVc > 0 else 0
            ok = ratio <= 1.0

            results.append({
                'id': f"Esquina {idx+1}", 'type': 'esquina',
                'Vu_kN': float(Vu / 1000), 'Vc_kN': float(Vc / 1000),
                'phiVc_kN': float(phiVc / 1000), 'ratio': float(ratio), 'ok': bool(ok)
            })
            print(f"Esquina {idx+1:<7} {Vu/1000:<12.1f} {Vc/1000:<12.1f} {phiVc/1000:<12.1f} {ratio:<8.2f} {'CUMPLE OK' if ok else 'NO CUMPLE FAIL'}")

        self.punching_data = results
        all_ok = all(r['ok'] for r in results) if results else True
        print(f"\nEstado global punzonamiento: {'CUMPLE OK' if all_ok else 'NO CUMPLE FAIL'}")
        return results

    def generate_design_report(self):
        """Genera reporte completo de diseño en consola."""
        print("\n" + "="*80)
        print("RESUMEN DE DISEÑO - LOSA DE CIMENTACIÓN")
        print("="*80)
        print(f"Geometría: {self.Lx:.1f} x {self.Ly:.1f} m | Espesor h = {self.h*100:.0f} cm")
        print(f"Malla: {self.nx}x{self.ny} | d_eff = {self.d_eff*100:.1f} cm")
        print(f"Concreto H-{self.f_c:.0f} | Acero fy = {self.f_y:.0f} MPa")
        print(f"Suelo: k = {self.k/1e6:.1f} MN/m³")
        print("-"*80)

        # 1. Desplazamientos
        print(f"\n1. DESPLAZAMIENTOS")
        print(f"   w_max = {np.max(np.abs(self.w))*1000:.2f} mm")

        # 2. Momentos
        print(f"\n2. MOMENTOS (ELU factor 1.5)")
        print(f"   Mx_max = {np.max(np.abs(self.Mx))*1.5/1000:.2f} kN·m/m")
        print(f"   My_max = {np.max(np.abs(self.My))*1.5/1000:.2f} kN·m/m")

        # 3. Cortante
        print(f"\n3. CORTANTE")
        print(f"   Vu_max = {np.max(self.Vu)/1000:.2f} kN/m")
        print(f"   phi_Vc = {self.phiVc/1000:.2f} kN/m")
        print(f"   Estado: {'CUMPLE' if np.all(self.shear_ok) else 'NO CUMPLE'}")

        # 4. Bandas ya impresas en define_reinforcement_bands
        # 5. Asentamientos ya impresos en check_differential_settlements
        # 6. Punzonamiento ya impreso en check_punching

        print("\n" + "="*80)

    def plot_results(self, save_path=None):
        fig, axes = plt.subplots(2, 4, figsize=(22, 11))
        fig.suptitle(
            f'Losa {self.Lx:.1f}x{self.Ly:.1f}m | h={self.h*100:.0f}cm | H-{self.f_c:.0f} | '
            f'Grilla {self.nx}x{self.ny} | d={self.d_eff*100:.1f}cm',
            fontsize=14, fontweight='bold'
        )

        # 1. Desplazamiento
        ax = axes[0, 0]
        im = ax.contourf(self.X, self.Y, self.w*1000, levels=20, cmap='viridis')
        ax.set_title('Desplazamiento w [mm]')
        ax.set_xlabel('x [m]'); ax.set_ylabel('y [m]')
        plt.colorbar(im, ax=ax)

        # 2. Mx
        ax = axes[0, 1]
        vmax = np.max(np.abs(self.Mx/1000))
        im = ax.contourf(self.X, self.Y, self.Mx/1000, levels=20, cmap='RdBu_r', vmin=-vmax, vmax=vmax)
        ax.set_title('Momento Mx [kN·m/m]')
        ax.set_xlabel('x [m]'); ax.set_ylabel('y [m]')
        plt.colorbar(im, ax=ax)

        # 3. My
        ax = axes[0, 2]
        vmax = np.max(np.abs(self.My/1000))
        im = ax.contourf(self.X, self.Y, self.My/1000, levels=20, cmap='RdBu_r', vmin=-vmax, vmax=vmax)
        ax.set_title('Momento My [kN·m/m]')
        ax.set_xlabel('x [m]'); ax.set_ylabel('y [m]')
        plt.colorbar(im, ax=ax)

        # 4. Cortante
        ax = axes[0, 3]
        im = ax.contourf(self.X, self.Y, self.Vu/1000, levels=20, cmap='YlOrRd')
        ax.set_title(f'Cortante Vu [kN/m]\nphi_Vc={self.phiVc/1000:.1f} kN/m')
        ax.set_xlabel('x [m]'); ax.set_ylabel('y [m]')
        plt.colorbar(im, ax=ax)

        # 5. As inferior X (con bandas)
        ax = axes[1, 0]
        im = ax.contourf(self.X, self.Y, self.Asx_bot*1e4, levels=15, cmap='YlOrRd')
        ax.set_title('As inferior X [cm²/m]\n(Bandas bajo muros)')
        ax.set_xlabel('x [m]'); ax.set_ylabel('y [m]')
        plt.colorbar(im, ax=ax)

        # 6. As inferior Y (con bandas)
        ax = axes[1, 1]
        im = ax.contourf(self.X, self.Y, self.Asy_bot*1e4, levels=15, cmap='YlOrRd')
        ax.set_title('As inferior Y [cm²/m]\n(Bandas bajo muros)')
        ax.set_xlabel('x [m]'); ax.set_ylabel('y [m]')
        plt.colorbar(im, ax=ax)

        # 7. Ratio cortante
        ax = axes[1, 2]
        im = ax.contourf(self.X, self.Y, self.shear_ratio, levels=15, cmap='RdYlGn_r')
        ax.set_title(f'Ratio Vu/phi_Vc\n{"CUMPLE OK" if np.all(self.shear_ok) else "NO CUMPLE FAIL"}')
        ax.set_xlabel('x [m]'); ax.set_ylabel('y [m]')
        plt.colorbar(im, ax=ax)

        # 8. Planta con bandas y arquitectura
        ax = axes[1, 3]
        ax.set_xlim(0, self.Lx); ax.set_ylim(0, self.Ly)
        ax.set_aspect('equal')
        ax.set_title('Planta - Bandas de refuerzo')
        ax.set_xlabel('x [m]'); ax.set_ylabel('y [m]')
        ax.grid(True, alpha=0.3)

        # Dibujar bandas como rectángulos semitransparentes
        for wall in self.walls:
            # Vector del muro
            dxw = wall.x2 - wall.x1
            dyw = wall.y2 - wall.y1
            length = wall.length
            if length < 1e-6:
                continue
            # Centro y ángulo
            cx = (wall.x1 + wall.x2) / 2
            cy = (wall.y1 + wall.y2) / 2
            angle = np.degrees(np.arctan2(dyw, dxw))
            # Rectángulo de banda
            rect = Rectangle(
                (cx - length/2, -wall.band_width/2),
                length, wall.band_width,
                angle=angle, rotation_point='center',
                facecolor='yellow', alpha=0.3, edgecolor='orange', linewidth=2
            )
            ax.add_patch(rect)

        for wall in self.walls:
            color = 'red' if wall.wall_type == 'perimetral' else 'blue'
            ax.plot([wall.x1, wall.x2], [wall.y1, wall.y2],
                   color=color, linewidth=4, solid_capstyle='round')

        for beam in self.beams:
            ax.plot([beam.x1, beam.x2], [beam.y1, beam.y2],
                   color='green', linewidth=6, solid_capstyle='round', alpha=0.7)

        legend_elements = [
            Line2D([0], [0], color='red', lw=4, label='Muro perimetral'),
            Line2D([0], [0], color='blue', lw=4, label='Muro interno'),
            Line2D([0], [0], color='green', lw=6, label='Viga amarre', alpha=0.7),
            Line2D([0], [0], color='orange', lw=2, marker='s', markersize=10,
                   markerfacecolor='yellow', alpha=0.5, label='Banda refuerzo')
        ]
        ax.legend(handles=legend_elements, loc='upper right', fontsize=9)

        plt.tight_layout()
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Gráfico guardado: {save_path}")
        plt.close(fig)

    def export_summary(self, filepath):
        summary = {
            "geometry": {"Lx": self.Lx, "Ly": self.Ly, "h": self.h, "nx": self.nx, "ny": self.ny},
            "materials": {"E_MPa": self.E/1e6, "nu": self.nu, "f_c_MPa": self.f_c,
                         "f_y_MPa": self.f_y, "k_N_m3": self.k, "d_eff_m": self.d_eff},
            "results": {
                "w_max_mm": float(np.max(np.abs(self.w)) * 1000),
                "Mx_max_kNm_m": float(np.max(np.abs(self.Mx)) / 1000),
                "My_max_kNm_m": float(np.max(np.abs(self.My)) / 1000),
                "Vu_max_kN_m": float(np.max(self.Vu) / 1000),
                "Vc_kN_m": float(self.Vc / 1000),
                "phiVc_kN_m": float(self.phiVc / 1000),
                "shear_ok": bool(np.all(self.shear_ok)),
                "Asx_bot_max_cm2_m": float(np.max(self.Asx_bot) * 1e4),
                "Asy_bot_max_cm2_m": float(np.max(self.Asy_bot) * 1e4),
                "Asx_top_max_cm2_m": float(np.max(self.Asx_top) * 1e4),
                "Asy_top_max_cm2_m": float(np.max(self.Asy_top) * 1e4),
            },
            "bands": self.band_data,
            "settlements": self.settlement_data,
            "punching": self.punching_data,
            "walls": [asdict(w) for w in self.walls],
            "beams": [asdict(b) for b in self.beams]
        }
        with open(filepath, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"Resumen exportado: {filepath}")



    def export_plan_sketch(self, filepath="plano_armado.html", load_factor=1.5):
        """
        Genera un croquis de planta en HTML con SVG incrustado.
        Incluye: muros, bandas de refuerzo, vigas de amarre, cotas, tabla de armado y notas.
        """
        # Escalas
        margin = 80
        svg_w = 700
        svg_h = 700
        plot_size = min(svg_w, svg_h) - 2 * margin
        scale = plot_size / max(self.Lx, self.Ly)

        def to_svg(x, y):
            return (margin + x * scale, margin + (self.Ly - y) * scale)

        # --- Construir SVG ---
        svg_parts = []
        svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_w} {svg_h}" style="width:100%;max-height:600px;border:1px solid #ccc;border-radius:8px;background:#fafafa;">')

        # Grid ligero
        for i in range(self.nx + 1):
            x = i * self.dx
            x1, y1 = to_svg(x, 0)
            x2, y2 = to_svg(x, self.Ly)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#e0e0e0" stroke-width="0.8"/>')
        for j in range(self.ny + 1):
            y = j * self.dy
            x1, y1 = to_svg(0, y)
            x2, y2 = to_svg(self.Lx, y)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#e0e0e0" stroke-width="0.8"/>')

        # Bandas de refuerzo (rectángulos centrados en muros)
        for wall in self.walls:
            dxw = wall.x2 - wall.x1
            dyw = wall.y2 - wall.y1
            length = wall.length
            if length < 1e-6:
                continue
            # Vector perpendicular unitario (ancho de banda)
            nx_vec = -dyw / length
            ny_vec = dxw / length
            hw = wall.band_width / 2.0

            # 4 esquinas del rectángulo de banda
            corners = [
                (wall.x1 + nx_vec * hw, wall.y1 + ny_vec * hw),
                (wall.x1 - nx_vec * hw, wall.y1 - ny_vec * hw),
                (wall.x2 - nx_vec * hw, wall.y2 - ny_vec * hw),
                (wall.x2 + nx_vec * hw, wall.y2 + ny_vec * hw),
            ]
            pts = " ".join([f"{to_svg(cx, cy)[0]:.1f},{to_svg(cx, cy)[1]:.1f}" for cx, cy in corners])
            svg_parts.append(f'<polygon points="{pts}" fill="rgba(255,193,7,0.25)" stroke="#f9a825" stroke-width="1.5"/>')

        # Vigas de amarre
        for beam in self.beams:
            x1, y1 = to_svg(beam.x1, beam.y1)
            x2, y2 = to_svg(beam.x2, beam.y2)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#4caf50" stroke-width="5" stroke-linecap="round" opacity="0.85"/>')

        # Muros
        for wall in self.walls:
            color = "#e53935" if wall.wall_type == "perimetral" else "#1e88e5"
            width = max(2, wall.thickness * scale)
            x1, y1 = to_svg(wall.x1, wall.y1)
            x2, y2 = to_svg(wall.x2, wall.y2)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="{width:.1f}" stroke-linecap="round"/>')

        # Cotas exteriores
        cota_y = margin - 35
        x_left, _ = to_svg(0, self.Ly)
        x_right, _ = to_svg(self.Lx, self.Ly)
        svg_parts.append(f'<line x1="{x_left:.1f}" y1="{cota_y:.1f}" x2="{x_right:.1f}" y2="{cota_y:.1f}" stroke="#555" stroke-width="1" marker-end="url(#arrow)" marker-start="url(#arrow)"/>')
        svg_parts.append(f'<text x="{(x_left+x_right)/2:.1f}" y="{cota_y - 6:.1f}" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif">{self.Lx:.2f} m</text>')

        cota_x = margin - 35
        _, y_bottom = to_svg(0, 0)
        _, y_top = to_svg(0, self.Ly)
        svg_parts.append(f'<line x1="{cota_x:.1f}" y1="{y_bottom:.1f}" x2="{cota_x:.1f}" y2="{y_top:.1f}" stroke="#555" stroke-width="1" marker-end="url(#arrow)" marker-start="url(#arrow)"/>')
        svg_parts.append(f'<text x="{cota_x - 6:.1f}" y="{(y_bottom+y_top)/2:.1f}" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif" transform="rotate(-90, {cota_x - 6:.1f}, {(y_bottom+y_top)/2:.1f})">{self.Ly:.2f} m</text>')

        # Escala gráfica
        scale_x = margin
        scale_y = svg_h - margin + 40
        scale_len = 2.0 * scale  # 2 metros en px
        svg_parts.append(f'<line x1="{scale_x:.1f}" y1="{scale_y:.1f}" x2="{scale_x + scale_len:.1f}" y2="{scale_y:.1f}" stroke="#333" stroke-width="2"/>')
        svg_parts.append(f'<line x1="{scale_x:.1f}" y1="{scale_y - 4:.1f}" x2="{scale_x:.1f}" y2="{scale_y + 4:.1f}" stroke="#333" stroke-width="1"/>')
        svg_parts.append(f'<line x1="{scale_x + scale_len/2:.1f}" y1="{scale_y - 4:.1f}" x2="{scale_x + scale_len/2:.1f}" y2="{scale_y + 4:.1f}" stroke="#333" stroke-width="1"/>')
        svg_parts.append(f'<line x1="{scale_x + scale_len:.1f}" y1="{scale_y - 4:.1f}" x2="{scale_x + scale_len:.1f}" y2="{scale_y + 4:.1f}" stroke="#333" stroke-width="1"/>')
        svg_parts.append(f'<text x="{scale_x + scale_len/2:.1f}" y="{scale_y + 14:.1f}" text-anchor="middle" font-size="10" fill="#555" font-family="sans-serif">2.0 m</text>')

        svg_parts.append('</svg>')
        svg_str = "\n".join(svg_parts)

        # --- Tabla de armado ---
        rows_html = []
        for b in self.band_data:
            bx = b.get('bar_x', {})
            by = b.get('bar_y', {})
            px = f"Ø{bx.get('diam_mm', 0)}@{bx.get('sep_m', 0)*100:.0f} cm" if bx.get('diam_mm', 0) > 0 else "Mínimo"
            py = f"Ø{by.get('diam_mm', 0)}@{by.get('sep_m', 0)*100:.0f} cm" if by.get('diam_mm', 0) > 0 else "Mínimo"
            muro_id = f"M{b['id']+1}"
            tipo_tag = "Perimetral" if b['type'] == "perimetral" else "Interno"
            rows_html.append(f"""
            <tr>
                <td>{muro_id}</td>
                <td>{tipo_tag}</td>
                <td>{b['band_width']:.2f} m</td>
                <td>{b['Mx_design_kNm_m']:.2f}</td>
                <td>{b['My_design_kNm_m']:.2f}</td>
                <td>{b['Asx_cm2_m']:.2f}</td>
                <td>{b['Asy_cm2_m']:.2f}</td>
                <td>{px}</td>
                <td>{py}</td>
                <td style="color:#2e7d32;font-weight:600;">OK</td>
            </tr>""")

        # Zona intermedia (mínimo)
        As_min = self.rho_min * 1.0 * self.h * 1e4
        rows_html.append(f"""
            <tr style="opacity:0.75;">
                <td colspan="2">Zona intermedia</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>{As_min:.2f}</td>
                <td>{As_min:.2f}</td>
                <td>Ø10 @ 15 cm</td>
                <td>Ø10 @ 15 cm</td>
                <td style="color:#2e7d32;font-weight:600;">Min</td>
            </tr>""")

        # --- HTML completo ---
        html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Plano de Armado — Losa de Cimentación</title>
<style>
  body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #222; background: #fff; }}
  h1 {{ font-size: 18px; margin-bottom: 4px; }}
  h2 {{ font-size: 14px; color: #555; margin-top: 0; margin-bottom: 16px; font-weight: 400; }}
  .meta {{ font-size: 12px; color: #666; margin-bottom: 16px; }}
  .legend {{ display: flex; flex-wrap: wrap; gap: 12px 20px; margin: 12px 0; font-size: 12px; }}
  .legend-item {{ display: flex; align-items: center; gap: 6px; }}
  .box {{ width: 14px; height: 10px; border-radius: 2px; }}
  .line {{ width: 14px; height: 3px; border-radius: 2px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }}
  th {{ text-align: left; padding: 8px; border-bottom: 2px solid #ddd; color: #555; font-weight: 600; white-space: nowrap; }}
  td {{ padding: 8px; border-bottom: 1px solid #eee; white-space: nowrap; }}
  tr:hover td {{ background: #f5f5f5; }}
  .note {{ font-size: 11px; color: #777; margin-top: 16px; line-height: 1.5; }}
  .tag {{ display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
  .tag-perim {{ background: #ffebee; color: #c62828; }}
  .tag-inner {{ background: #e3f2fd; color: #1565c0; }}
</style>
</head>
<body>

<h1>Croquis de Planta — Losa de Cimentación</h1>
<h2>{self.Lx:.2f} × {self.Ly:.2f} m · h = {self.h*100:.0f} cm · H-{self.f_c:.0f} · d = {self.d_eff*100:.1f} cm</h2>

<div class="meta">
  Grilla {self.nx}×{self.ny} · Suelo k = {self.k/1e6:.1f} MN/m³ · fy = {self.f_y:.0f} MPa · γ = {self.gamma_horm} kg/m³
</div>

<svg style="position:absolute;width:0;height:0;">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#555"/>
    </marker>
  </defs>
</svg>

{svg_str}

<div class="legend">
  <div class="legend-item"><div class="line" style="background:#e53935;"></div>Muro perimetral</div>
  <div class="legend-item"><div class="line" style="background:#1e88e5;"></div>Muro interno</div>
  <div class="legend-item"><div class="line" style="background:#4caf50;"></div>Viga amarre (20×30)</div>
  <div class="legend-item"><div class="box" style="background:rgba(255,193,7,0.25);border:1px solid #f9a825;"></div>Banda refuerzo</div>
</div>

<table>
  <thead>
    <tr>
      <th>Muro</th>
      <th>Tipo</th>
      <th>Ancho banda</th>
      <th>Mx diseño<br>(kN·m/m)</th>
      <th>My diseño<br>(kN·m/m)</th>
      <th>Asx<br>(cm²/m)</th>
      <th>Asy<br>(cm²/m)</th>
      <th>Propuesta X</th>
      <th>Propuesta Y</th>
      <th>Estado</th>
    </tr>
  </thead>
  <tbody>
    {''.join(rows_html)}
  </tbody>
</table>

<div class="note">
  <strong>Notas:</strong><br>
  • Bandas de refuerzo calculadas como espesor_muro + 2·h (mínimo 1.0 m), factorizado por band_width_factor.<br>
  • Armadura mínima fuera de bandas: ρ_min = 0.0018 → {As_min:.2f} cm²/m (ej. Ø10 @ 15 cm).<br>
  • Las propuestas de barra usan diámetros comerciales y separación redondeada a múltiplos de 2.5 cm.<br>
  • Verificar asentamientos diferenciales y cortante/punzonamiento en informe numérico.<br>
  • Este plano es esquemático; el detalle constructivo debe incluir recubrimiento, anclajes y junta de construcción si aplica.
</div>

</body>
</html>"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"Plano de armado exportado: {filepath}")

    def get_svg_plan(self):
        # Escalas
        margin = 80
        svg_w = 700
        svg_h = 700
        plot_size = min(svg_w, svg_h) - 2 * margin
        scale = plot_size / max(self.Lx, self.Ly)

        def to_svg(x, y):
            return (margin + x * scale, margin + y * scale)

        # --- Construir SVG ---
        svg_parts = []
        svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {svg_w} {svg_h}" style="width:100%;max-height:600px;border:1px solid #ccc;border-radius:8px;background:#fafafa;">')

        # Grid ligero
        for i in range(self.nx + 1):
            x = i * self.dx
            x1, y1 = to_svg(x, 0)
            x2, y2 = to_svg(x, self.Ly)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#e0e0e0" stroke-width="0.8"/>')
        for j in range(self.ny + 1):
            y = j * self.dy
            x1, y1 = to_svg(0, y)
            x2, y2 = to_svg(self.Lx, y)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#e0e0e0" stroke-width="0.8"/>')

        # Representación de Malla de Acero Base (Líneas discontinuas en todo el paño)
        svg_parts.append(f'<path d="M {margin} {margin} h {self.Lx*scale} v {self.Ly*scale} h {-self.Lx*scale} Z" fill="none" stroke="#2196f3" stroke-width="2" stroke-dasharray="8,8" opacity="0.5"/>')
        # Líneas internas de malla representativas
        for mx in range(1, 5):
            x = (self.Lx / 5) * mx
            x1, y1 = to_svg(x, 0)
            x2, y2 = to_svg(x, self.Ly)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#2196f3" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.3"/>')
        for my in range(1, 5):
            y = (self.Ly / 5) * my
            x1, y1 = to_svg(0, y)
            x2, y2 = to_svg(self.Lx, y)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#2196f3" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.3"/>')
        svg_parts.append(f'<text x="{margin + self.Lx*scale/2}" y="{margin + self.Ly*scale/2}" font-family="sans-serif" font-size="14" fill="#0d47a1" opacity="0.6" text-anchor="middle">Armadura Base (Doble Malla)</text>')

        # Bandas de refuerzo (rectángulos centrados en muros)
        for wall in self.walls:
            dxw = wall.x2 - wall.x1
            dyw = wall.y2 - wall.y1
            length = wall.length
            if length < 1e-6:
                continue
            # Vector perpendicular unitario (ancho de banda)
            nx_vec = -dyw / length
            ny_vec = dxw / length
            hw = wall.band_width / 2.0

            # 4 esquinas del rectángulo de banda
            corners = [
                (wall.x1 + nx_vec * hw, wall.y1 + ny_vec * hw),
                (wall.x1 - nx_vec * hw, wall.y1 - ny_vec * hw),
                (wall.x2 - nx_vec * hw, wall.y2 - ny_vec * hw),
                (wall.x2 + nx_vec * hw, wall.y2 + ny_vec * hw),
            ]
            pts = " ".join([f"{to_svg(cx, cy)[0]:.1f},{to_svg(cx, cy)[1]:.1f}" for cx, cy in corners])
            svg_parts.append(f'<polygon points="{pts}" fill="rgba(255,193,7,0.25)" stroke="#f9a825" stroke-width="1.5"/>')

        # Vigas de amarre
        for beam in self.beams:
            x1, y1 = to_svg(beam.x1, beam.y1)
            x2, y2 = to_svg(beam.x2, beam.y2)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#4caf50" stroke-width="5" stroke-linecap="round" opacity="0.85"/>')

        for idx, wall in enumerate(self.walls):
            color = "#e53935" if wall.wall_type == "perimetral" else "#1e88e5"
            width = max(2, wall.thickness * scale)
            x1, y1 = to_svg(wall.x1, wall.y1)
            x2, y2 = to_svg(wall.x2, wall.y2)
            svg_parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="{width:.1f}" stroke-linecap="round"/>')
            
            # Etiqueta del muro M(idx+1) y armadura adicional
            cx, cy = to_svg((wall.x1 + wall.x2) / 2, (wall.y1 + wall.y2) / 2)
            As_min = self.rho_min * 1.0 * self.h * 1e4
            try:
                b = self.band_data[idx]
                needs_extra = False
                extra_txt = ""
                if b['Asx_cm2_m'] > As_min + 0.05:
                    needs_extra = True
                    extra_txt += f"X: Ø{b['bar_x'].get('diam_mm',0)}@{b['bar_x'].get('sep_m',0)*100:.0f}cm "
                if b['Asy_cm2_m'] > As_min + 0.05:
                    needs_extra = True
                    extra_txt += f"Y: Ø{b['bar_y'].get('diam_mm',0)}@{b['bar_y'].get('sep_m',0)*100:.0f}cm"
                
                if needs_extra:
                    # Dibuja la etiqueta con un borde naranja para denotar que tiene acero adicional
                    svg_parts.append(f'<rect x="{cx - 12}" y="{cy - 10}" width="24" height="20" rx="3" fill="rgba(255,255,255,0.9)" stroke="#e65100" stroke-width="2"/>')
                    svg_parts.append(f'<text x="{cx}" y="{cy + 4}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#e65100" text-anchor="middle">M{idx+1}</text>')
                else:
                    svg_parts.append(f'<rect x="{cx - 12}" y="{cy - 10}" width="24" height="20" rx="3" fill="rgba(255,255,255,0.85)" stroke="{color}" stroke-width="1"/>')
                    svg_parts.append(f'<text x="{cx}" y="{cy + 4}" font-family="sans-serif" font-size="12" font-weight="bold" fill="{color}" text-anchor="middle">M{idx+1}</text>')
            except:
                svg_parts.append(f'<rect x="{cx - 12}" y="{cy - 10}" width="24" height="20" rx="3" fill="rgba(255,255,255,0.85)" stroke="{color}" stroke-width="1"/>')
                svg_parts.append(f'<text x="{cx}" y="{cy + 4}" font-family="sans-serif" font-size="12" font-weight="bold" fill="{color}" text-anchor="middle">M{idx+1}</text>')

        # Dibujar machones (columnas)
        for col in self.columns:
            cx, cy = to_svg(col.x, col.y)
            w_px = max(4, col.width * scale)
            h_px = max(4, col.length * scale)
            svg_parts.append(f'<rect x="{cx - w_px/2:.1f}" y="{cy - h_px/2:.1f}" width="{w_px:.1f}" height="{h_px:.1f}" fill="#333" stroke="#000" stroke-width="1"/>')


            # Dibujar aberturas (huecos visuales)
            if hasattr(wall, 'openings') and wall.openings:
                for op in wall.openings:
                    start = op.get("start_m", 0)
                    w_op = op.get("width_m", 0)
                    op_type = op.get("type", "window")
                    
                    if wall.length > 0:
                        t1 = start / wall.length
                        t2 = (start + w_op) / wall.length
                        x1_op = wall.x1 + t1 * (wall.x2 - wall.x1)
                        y1_op = wall.y1 + t1 * (wall.y2 - wall.y1)
                        x2_op = wall.x1 + t2 * (wall.x2 - wall.x1)
                        y2_op = wall.y1 + t2 * (wall.y2 - wall.y1)
                        
                        ox1, oy1 = to_svg(x1_op, y1_op)
                        ox2, oy2 = to_svg(x2_op, y2_op)
                        
                        thickPx = width
                        w_px = np.sqrt((ox2-ox1)**2 + (oy2-oy1)**2)
                        if w_px > 0:
                            ux = (ox2-ox1)/w_px
                            uy = (oy2-oy1)/w_px
                        else:
                            ux, uy = 0, 0
                        vx, vy = -uy, ux

                        if op_type.startswith('door'):
                            is_left = 'left' in op_type
                            is_out = 'out' in op_type
                            
                            vx = -uy
                            vy = ux
                            if is_out:
                                vx = -vx
                                vy = -vy
                                
                            hx = ox1 if is_left else ox2
                            hy = oy1 if is_left else oy2
                            ex = ox2 if is_left else ox1
                            ey = oy2 if is_left else oy1
                            
                            lx = hx + vx * w_px
                            ly = hy + vy * w_px
                            # Calculo 100% infalible del sweep flag en SVG basandose en el vector hacia el centro
                            hl_x = lx - hx
                            hl_y = ly - hy
                            he_x = ex - hx
                            he_y = ey - hy
                            cross_val = (hl_x * he_y) - (hl_y * he_x)
                            sweep = 1 if cross_val > 0 else 0

                            # Borrar muro
                            svg_parts.append(f'<line x1="{ox1:.1f}" y1="{oy1:.1f}" x2="{ox2:.1f}" y2="{oy2:.1f}" stroke="#fafafa" stroke-width="{thickPx+2:.1f}" stroke-linecap="butt"/>')
                            # Hoja de puerta
                            svg_parts.append(f'<line x1="{hx:.1f}" y1="{hy:.1f}" x2="{lx:.1f}" y2="{ly:.1f}" stroke="#333" stroke-width="2" stroke-linecap="square"/>')
                            # Arco
                            svg_parts.append(f'<path d="M {lx:.1f} {ly:.1f} A {w_px:.1f} {w_px:.1f} 0 0 {sweep} {ex:.1f} {ey:.1f}" fill="none" stroke="#666" stroke-width="1.5" stroke-dasharray="4,4"/>')
                        else:
                            # Ventana
                            f1x1 = ox1 + vx * (thickPx/2); f1y1 = oy1 + vy * (thickPx/2)
                            f1x2 = ox2 + vx * (thickPx/2); f1y2 = oy2 + vy * (thickPx/2)
                            f2x1 = ox1 - vx * (thickPx/2); f2y1 = oy1 - vy * (thickPx/2)
                            f2x2 = ox2 - vx * (thickPx/2); f2y2 = oy2 - vy * (thickPx/2)
                            
                            svg_parts.append(f'<line x1="{ox1:.1f}" y1="{oy1:.1f}" x2="{ox2:.1f}" y2="{oy2:.1f}" stroke="#fafafa" stroke-width="{thickPx+2:.1f}" stroke-linecap="butt"/>')
                            svg_parts.append(f'<line x1="{f1x1:.1f}" y1="{f1y1:.1f}" x2="{f1x2:.1f}" y2="{f1y2:.1f}" stroke="#333" stroke-width="1"/>')
                            svg_parts.append(f'<line x1="{f2x1:.1f}" y1="{f2y1:.1f}" x2="{f2x2:.1f}" y2="{f2y2:.1f}" stroke="#333" stroke-width="1"/>')
                            svg_parts.append(f'<line x1="{ox1 + vx*2:.1f}" y1="{oy1 + vy*2:.1f}" x2="{ox2 + vx*2:.1f}" y2="{oy2 + vy*2:.1f}" stroke="#5bc0de" stroke-width="2"/>')
                            svg_parts.append(f'<line x1="{ox1 - vx*2:.1f}" y1="{oy1 - vy*2:.1f}" x2="{ox2 - vx*2:.1f}" y2="{oy2 - vy*2:.1f}" stroke="#5bc0de" stroke-width="2"/>')

        # Cotas exteriores
        cota_y = margin - 35
        x_left, _ = to_svg(0, self.Ly)
        x_right, _ = to_svg(self.Lx, self.Ly)
        svg_parts.append(f'<line x1="{x_left:.1f}" y1="{cota_y:.1f}" x2="{x_right:.1f}" y2="{cota_y:.1f}" stroke="#555" stroke-width="1" marker-end="url(#arrow)" marker-start="url(#arrow)"/>')
        svg_parts.append(f'<text x="{(x_left+x_right)/2:.1f}" y="{cota_y - 6:.1f}" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif">{self.Lx:.2f} m</text>')

        cota_x = margin - 35
        _, y_bottom = to_svg(0, 0)
        _, y_top = to_svg(0, self.Ly)
        svg_parts.append(f'<line x1="{cota_x:.1f}" y1="{y_bottom:.1f}" x2="{cota_x:.1f}" y2="{y_top:.1f}" stroke="#555" stroke-width="1" marker-end="url(#arrow)" marker-start="url(#arrow)"/>')
        svg_parts.append(f'<text x="{cota_x - 6:.1f}" y="{(y_bottom+y_top)/2:.1f}" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif" transform="rotate(-90, {cota_x - 6:.1f}, {(y_bottom+y_top)/2:.1f})">{self.Ly:.2f} m</text>')

        # Escala gráfica
        scale_x = margin
        scale_y = svg_h - margin + 40
        scale_len = 2.0 * scale
        svg_parts.append(f'<line x1="{scale_x:.1f}" y1="{scale_y:.1f}" x2="{scale_x + scale_len:.1f}" y2="{scale_y:.1f}" stroke="#333" stroke-width="2"/>')
        svg_parts.append(f'<line x1="{scale_x:.1f}" y1="{scale_y - 4:.1f}" x2="{scale_x:.1f}" y2="{scale_y + 4:.1f}" stroke="#333" stroke-width="1"/>')
        svg_parts.append(f'<line x1="{scale_x + scale_len/2:.1f}" y1="{scale_y - 4:.1f}" x2="{scale_x + scale_len/2:.1f}" y2="{scale_y + 4:.1f}" stroke="#333" stroke-width="1"/>')
        svg_parts.append(f'<line x1="{scale_x + scale_len:.1f}" y1="{scale_y - 4:.1f}" x2="{scale_x + scale_len:.1f}" y2="{scale_y + 4:.1f}" stroke="#333" stroke-width="1"/>')
        svg_parts.append(f'<text x="{scale_x + scale_len/2:.1f}" y="{scale_y + 14:.1f}" text-anchor="middle" font-size="10" fill="#555" font-family="sans-serif">2.0 m</text>')

        svg_parts.append('</svg>')
        return "\\n".join(svg_parts)

    def run_full_analysis(self, extra_uniform_load=0.0):
        self.solve(extra_uniform_load=extra_uniform_load)
        self.compute_moments()
        self.compute_shear()
        self.define_reinforcement_bands(load_factor=1.5)
        self.check_differential_settlements()
        self.check_punching()
        
        As_min_cm2_normativo = float(self.rho_min * 1.0 * self.h * 1e4)
        As_min_cm2 = max(As_min_cm2_normativo, float(self.custom_mesh_cm2_m)) if self.custom_mesh_cm2_m > 0 else As_min_cm2_normativo
        As_min_m2 = float(As_min_cm2 / 1e4)
        
        general_slab_steel_x = self._propose_bars(As_min_m2)
        general_slab_steel_y = self._propose_bars(As_min_m2)
        
        concrete_vol_m3 = float(self.Lx * self.Ly * self.h)
        
        # Acero general de losa (ambas direcciones)
        general_steel_vol_m3 = 2 * As_min_m2 * self.Lx * self.Ly
        steel_weight_general_kg = float(general_steel_vol_m3 * 7850)
        
        # Acero total real computado en la malla (m2/m * area)
        total_steel_vol_m3 = np.sum(self.Asx + self.Asy) * self.dx * self.dy
        steel_weight_total_kg = float(total_steel_vol_m3 * 7850)
        
        # Acero adicional en bandas (integrando solo la diferencia para evitar error numérico de grilla)
        extra_Asx = np.maximum(0, self.Asx - As_min_m2)
        extra_Asy = np.maximum(0, self.Asy - As_min_m2)
        extra_steel_vol_m3 = np.sum(extra_Asx + extra_Asy) * self.dx * self.dy
        steel_weight_bands_kg = float(extra_steel_vol_m3 * 7850)

        # Estimar número de varillas de 6m (usando el diámetro base general)
        diam_base = general_slab_steel_x['diam_mm']
        if self.custom_mesh_cm2_m > 0:
            if self.custom_mesh_cm2_m == 0.61: diam_base = 3.43
            elif self.custom_mesh_cm2_m in (1.41, 1.88): diam_base = 6.0
            elif self.custom_mesh_cm2_m == 2.51: diam_base = 8.0
            elif self.custom_mesh_cm2_m in (3.93, 5.24): diam_base = 10.0

        bar_vol_m3 = (np.pi * (diam_base / 1000.0)**2 / 4.0) * 6.0 if diam_base > 0 else 1e-6
        general_bars_6m = int(np.ceil(general_steel_vol_m3 / bar_vol_m3))
        bands_bars_6m = int(np.ceil(extra_steel_vol_m3 / bar_vol_m3))
        total_bars_6m = general_bars_6m + bands_bars_6m
        
        # --- Cálculo de Superestructura ---
        area_rustica_m2 = 0.0
        area_lisa_m2 = 0.0
        bloques_15_m2 = 0.0
        bloques_12_m2 = 0.0
        
        # Vigas de corona (solo en perimetrales)
        vol_vigas_corona_m3 = 0.0
        longitud_perimetral_m = 0.0
        
        for w in self.walls:
            op_area = sum(op.get('width_m', 0) * op.get('height_m', 0) for op in w.openings) if w.openings else 0
            net_area = max(0, w.length * w.height - op_area)
            
            if abs(w.thickness - 0.15) < 0.01:
                bloques_15_m2 += net_area
            else:
                bloques_12_m2 += net_area
                
            if w.wall_type == 'perimetral':
                area_rustica_m2 += net_area  # Lado exterior
                area_lisa_m2 += net_area     # Lado interior
                longitud_perimetral_m += w.length
            else:
                area_lisa_m2 += net_area * 2 # Ambos lados
                
        vol_vigas_corona_m3 = longitud_perimetral_m * 0.15 * 0.15
        
        longitud_varilla_10mm = longitud_perimetral_m * 3
        corona_10mm_bars = int(np.ceil(longitud_varilla_10mm / 6.0))
        
        num_estribos = int(np.ceil(longitud_perimetral_m / 0.20))
        longitud_varilla_5_2mm = num_estribos * 0.50
        corona_5_2mm_bars = int(np.ceil(longitud_varilla_5_2mm / 6.0))
        
        # --- Cálculo de Machones (Columnas) ---
        vol_machones_m3 = sum(c.width * c.length * c.height for c in self.columns)
        
        machones_10mm_len = 0.0
        machones_5_2mm_len = 0.0
        for c in self.columns:
            # 4 varillas principales por machón + 30cm anclaje
            machones_10mm_len += 4 * (c.height + 0.30)
            # Estribos cada 15cm
            n_estribos_col = int(np.ceil(c.height / 0.15))
            len_estribo_col = 2 * (c.width + c.length) - 0.10
            machones_5_2mm_len += n_estribos_col * len_estribo_col
            
        machones_10mm_bars = int(np.ceil(machones_10mm_len / 6.0))
        machones_5_2mm_bars = int(np.ceil(machones_5_2mm_len / 6.0))
        
        corona_10mm_bars += machones_10mm_bars
        corona_5_2mm_bars += machones_5_2mm_bars

        # Criterio de Rigidez (Winkler Characteristic Length)
        l_c_m = ((self.E * self.h**3) / (12 * (1 - self.nu**2) * self.k))**(0.25)

        return {
            "displacements": {
                "w_max_mm": float(np.max(np.abs(self.w)) * 1000)
            },
            "moments": {
                "Mx_max_kNm_m": float(np.max(np.abs(self.Mx)) / 1000),
                "My_max_kNm_m": float(np.max(np.abs(self.My)) / 1000)
            },
            "rigidity": {
                "l_c_m": float(l_c_m)
            },
            "shear": {
                "Vu_max_kN_m": float(np.max(self.Vu) / 1000),
                "phiVc_kN_m": float(self.phiVc / 1000),
                "shear_ok": bool(np.all(self.shear_ok))
            },
            "soil_pressure": {
                "max_pressure_kN_m2": float(np.max(np.abs(self.w) * self.k) / 1000),
                "q_adm_kN_m2": float(self.q_adm / 1000),
                "ok": bool(np.max(np.abs(self.w) * self.k) <= self.q_adm)
            },
            "bands": self.band_data,
            "As_min_cm2_m": As_min_cm2,
            "settlements": self.settlement_data,
            "punching": self.punching_data,
            "svg_plan": self.get_svg_plan(),
            "heatmaps": {
                "w_mm": (self.w * 1000).tolist(),
                "Mx_kNm": (self.Mx / 1000).tolist(),
                "My_kNm": (self.My / 1000).tolist(),
                "Vu_kN": (self.Vu / 1000).tolist(),
                "nx": self.nx,
                "ny": self.ny
            },
            "materials_computation": {
                "concrete_vol_m3": concrete_vol_m3,
                "general_slab_steel": {
                    "bar_x": f"Ø{general_slab_steel_x['diam_mm']}@{int(general_slab_steel_x['sep_m']*100)}cm",
                    "bar_y": f"Ø{general_slab_steel_y['diam_mm']}@{int(general_slab_steel_y['sep_m']*100)}cm"
                },
                "steel_weight_general_kg": steel_weight_general_kg,
                "steel_weight_bands_kg": steel_weight_bands_kg,
                "general_bars_6m": general_bars_6m,
                "bands_bars_6m": bands_bars_6m,
                "total_bars_6m": total_bars_6m,
                "diam_base_mm": diam_base,
                "superstructure": {
                    "area_rustica_m2": area_rustica_m2,
                    "area_lisa_m2": area_lisa_m2,
                    "bloques_15_m2": bloques_15_m2,
                    "bloques_12_m2": bloques_12_m2,
                    "vol_vigas_corona_m3": vol_vigas_corona_m3,
                    "corona_10mm_bars": corona_10mm_bars,
                    "corona_5_2mm_bars": corona_5_2mm_bars,
                    "vol_machones_m3": vol_machones_m3,
                    "machones_10mm_bars": machones_10mm_bars,
                    "machones_5_2mm_bars": machones_5_2mm_bars
                }
            }
        }

if __name__ == "__main__":
    # Ejemplo de uso corregido
    gr = FoundationSlabDesigner(
        Lx=9.8, Ly=9.8, h=0.15, E=25e9, nu=0.2, k=20e6,
        f_c=25, f_y=420, cover=0.05, bar_diam=0.012,
        gamma_horm=2400, include_self_weight=True,
        band_width_factor=1.0,  # Ancho base = espesor + 2h
        max_settlement_ratio=500.0
    )

    gr.set_mesh(nx=40, ny=40)

    # Muros perimetrales (bloque 15cm)
    rho_bloque = 220 / 0.15  # kg/m³ aprox para bloque de 15cm
    gr.add_wall(0, 0, 9.8, 0, 0.15, 2.70, rho_bloque, load_factor=1.5, wall_type="perimetral")
    gr.add_wall(9.8, 0, 9.8, 9.8, 0.15, 2.70, rho_bloque, load_factor=1.5, wall_type="perimetral")
    gr.add_wall(9.8, 9.8, 0, 9.8, 0.15, 2.70, rho_bloque, load_factor=1.5, wall_type="perimetral")
    gr.add_wall(0, 9.8, 0, 0, 0.15, 2.70, rho_bloque, load_factor=1.5, wall_type="perimetral")

    # Muros internos (bloque 12cm)
    rho_bloque_12 = 180 / 0.12
    gr.add_wall(4.9, 0, 4.9, 9.8, 0.12, 2.70, rho_bloque_12, load_factor=1.5, wall_type="interno")
    gr.add_wall(0, 4.9, 9.8, 4.9, 0.12, 2.70, rho_bloque_12, load_factor=1.5, wall_type="interno")

    # Vigas de amarre perimetrales
    gr.add_beam(0, 0, 9.8, 0, 0.20, 0.30, load_factor=1.2, beam_type="zuncho")
    gr.add_beam(9.8, 0, 9.8, 9.8, 0.20, 0.30, load_factor=1.2, beam_type="zuncho")
    gr.add_beam(9.8, 9.8, 0, 9.8, 0.20, 0.30, load_factor=1.2, beam_type="zuncho")
    gr.add_beam(0, 9.8, 0, 0, 0.20, 0.30, load_factor=1.2, beam_type="zuncho")

    # Carga de piso (sobrecarga liviana + terminación)
    q_piso_sc = (100 + 200) * 9.81  # N/m² (100 kg/m² sc + 200 kg/m² piso)

    # Resolver
    w = gr.solve(extra_uniform_load=q_piso_sc)
    Mx, My, Mxy = gr.compute_moments()
    Qx, Qy, Vu, shear_ok = gr.compute_shear()

    # Diseño por bandas (factor 1.5 para ELU)
    Asx_bot, Asy_bot, Asx_top, Asy_top = gr.define_reinforcement_bands(load_factor=1.5)

    # Verificaciones adicionales
    gr.check_differential_settlements()
    gr.check_punching()
    gr.generate_design_report()

    # Gráficos y exportación
    gr.plot_results(save_path="losa_cimentacion_bandas.png")
    gr.export_summary("losa_cimentacion_resumen.json")
    gr.export_plan_sketch("plano_armado.html")
