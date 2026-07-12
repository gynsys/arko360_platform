"""
foundation/checks.py
Structural verification mixin: differential settlements, punching shear, design report.

Provides:
  - StructuralChecks mixin class

Units: N, m, Pa  →  outputs reported in kN, mm
"""

from typing import List

import numpy as np


class StructuralChecks:
    """
    Mixin: ACI 318 / COVENIN structural checks for the foundation slab.

    Requires attributes set by GrillageSolver and PostProcessor
    (w, Mx, My, Vu, Vc, phiVc, shear_ok, Asx_bot, Asy_bot,
     Asx_top, Asy_top, walls, columns, X, Y, nx, ny,
     n_nodes_x, n_nodes_y, dx, dy, d_eff, h, f_c, f_y,
     lambda_aci, phi_punch, gamma_horm, k,
     max_settlement_ratio, band_data, settlement_data, punching_data).
    """

    def check_differential_settlements(self) -> List[dict]:
        """
        Verify differential settlements under each wall.

        Returns
        -------
        list of dicts with keys: id, type, length, delta_w_mm, ratio, ok
        """
        print("\n=== VERIFICACIÓN DE ASENTAMIENTOS DIFERENCIALES ===")
        print(
            f"Criterio: L/Dw >= {self.max_settlement_ratio} "
            "(mampostería/cubierta liviana)"
        )
        print(
            f"{'Muro':<6} {'Tipo':<12} {'Long. (m)':<10} "
            f"{'Dw (mm)':<10} {'Ratio L/Dw':<12} {'Estado':<10}"
        )
        print("-" * 70)

        results: List[dict] = []
        for idx, wall in enumerate(self.walls):
            tol = max(wall.thickness / 2, min(self.dx, self.dy))
            w_vals = []
            for j in range(self.n_nodes_y):
                for i in range(self.n_nodes_x):
                    dps = self._point_segment_distance(
                        self.X[j, i], self.Y[j, i],
                        wall.x1, wall.y1, wall.x2, wall.y2,
                    )
                    if dps <= tol:
                        w_vals.append(self.w[j, i])

            if len(w_vals) < 2:
                continue

            w_arr = np.array(w_vals)
            delta_w = float(np.max(w_arr) - np.min(w_arr))
            delta_w_mm = delta_w * 1000

            ratio = wall.length / delta_w if delta_w > 1e-6 else 99999.0
            ok = ratio >= self.max_settlement_ratio
            status = "OK" if ok else "NO CUMPLE FAIL"

            results.append(
                {
                    "id": int(idx),
                    "type": str(wall.wall_type),
                    "length": float(wall.length),
                    "delta_w_mm": float(delta_w_mm),
                    "ratio": float(ratio),
                    "ok": bool(ok),
                }
            )
            print(
                f"{idx:<6} {wall.wall_type:<12} {wall.length:<10.2f} "
                f"{delta_w_mm:<10.2f} {ratio:<12.1f} {status:<10}"
            )

        self.settlement_data = results
        all_ok = all(r["ok"] for r in results) if results else True
        print(
            f"\nEstado global asentamientos: "
            f"{'CUMPLE OK' if all_ok else 'NO CUMPLE FAIL'}"
        )
        return results

    def check_punching(self) -> List[dict]:
        """
        Simplified two-way punching shear check at corners and machones (ACI 318).

        Returns
        -------
        list of dicts with keys: id, type, Vu_kN, Vc_kN, phiVc_kN, ratio, ok
        """
        print("\n=== VERIFICACIÓN DE PUNZONAMIENTO EN ESQUINAS Y MACHONES ===")
        print(
            f"{'Elemento':<15} {'Vu (kN)':<12} {'Vc (kN)':<12} "
            f"{'phi_Vc (kN)':<12} {'Ratio':<8} {'Estado':<10}"
        )
        print("-" * 75)

        results: List[dict] = []
        d = self.d_eff

        # 1. Machones (Columns / Pilares)
        for col in self.columns:
            # Critical perimeter b0 (ACI 318 Sec 22.6)
            b0 = 2 * (col.width + d) + 2 * (col.length + d)
            area_crit = (col.width + d) * (col.length + d)

            # Net Vu = Pu − q_soil × area_crit  (ACI 318-19 Sec 13.2.7)
            q_soil_avg = float(np.mean(np.abs(self.w) * self.k))  # Pa
            Vu = max(col.P_u - q_soil_avg * area_crit, 0.0)

            # Concrete resistance: vc = 0.33·λ·√f'c  (MPa)
            vc_MPa = 0.33 * self.lambda_aci * np.sqrt(self.f_c)
            Vc = vc_MPa * 1e6 * b0 * d
            phiVc = self.phi_punch * Vc
            ratio = Vu / phiVc if phiVc > 0 else 0.0
            ok = ratio <= 1.0

            results.append(
                {
                    "id": f"Machón {col.id}",
                    "type": "columna",
                    "Vu_kN": float(Vu / 1000),
                    "Vc_kN": float(Vc / 1000),
                    "phiVc_kN": float(phiVc / 1000),
                    "ratio": float(ratio),
                    "ok": bool(ok),
                }
            )
            print(
                f"Machón {col.id:<8} {Vu/1000:<12.1f} {Vc/1000:<12.1f} "
                f"{phiVc/1000:<12.1f} {ratio:<8.2f} "
                f"{'CUMPLE OK' if ok else 'NO CUMPLE FAIL'}"
            )

        # 2. Perimeter wall corners
        corners = []
        for w in self.walls:
            if w.wall_type == "perimetral":
                corners.append((w.x1, w.y1, w.thickness))
                corners.append((w.x2, w.y2, w.thickness))

        # Deduplicate nearby corners (< 0.3 m apart)
        unique_corners = []
        for c in corners:
            xc, yc, t = c
            if not any(
                np.hypot(xc - ux, yc - uy) < 0.3 for ux, uy, _ in unique_corners
            ):
                unique_corners.append((xc, yc, t))

        for idx, (xc, yc, tw) in enumerate(unique_corners):
            side_x = tw + d / 2
            side_y = tw + d / 2
            b0 = side_x + side_y
            area_crit = side_x * side_y

            wall_load = 0.0
            for w in self.walls:
                d1 = np.hypot(w.x1 - xc, w.y1 - yc)
                d2 = np.hypot(w.x2 - xc, w.y2 - yc)
                if d1 < 0.5 or d2 < 0.5:
                    wall_load += w.q_lineal * max(side_x, side_y)

            q_slab = self.h * self.gamma_horm * 9.81 * 1.2 * area_crit
            Vu = wall_load + q_slab

            vc_MPa = 0.33 * self.lambda_aci * np.sqrt(self.f_c)
            Vc = vc_MPa * 1e6 * b0 * d
            phiVc = self.phi_punch * Vc
            ratio = Vu / phiVc if phiVc > 0 else 0.0
            ok = ratio <= 1.0

            results.append(
                {
                    "id": f"Esquina {idx + 1}",
                    "type": "esquina",
                    "Vu_kN": float(Vu / 1000),
                    "Vc_kN": float(Vc / 1000),
                    "phiVc_kN": float(phiVc / 1000),
                    "ratio": float(ratio),
                    "ok": bool(ok),
                }
            )
            print(
                f"Esquina {idx + 1:<7} {Vu/1000:<12.1f} {Vc/1000:<12.1f} "
                f"{phiVc/1000:<12.1f} {ratio:<8.2f} "
                f"{'CUMPLE OK' if ok else 'NO CUMPLE FAIL'}"
            )

        self.punching_data = results
        all_ok = all(r["ok"] for r in results) if results else True
        print(
            f"\nEstado global punzonamiento: "
            f"{'CUMPLE OK' if all_ok else 'NO CUMPLE FAIL'}"
        )
        return results

    def generate_design_report(self) -> None:
        """Print a concise design summary to the console."""
        print("\n" + "=" * 80)
        print("RESUMEN DE DISEÑO - LOSA DE CIMENTACIÓN")
        print("=" * 80)
        print(
            f"Geometría: {self.Lx:.1f} x {self.Ly:.1f} m | "
            f"Espesor h = {self.h * 100:.0f} cm"
        )
        print(
            f"Malla: {self.nx}x{self.ny} | d_eff = {self.d_eff * 100:.1f} cm"
        )
        print(
            f"Concreto H-{self.f_c:.0f} | Acero fy = {self.f_y:.0f} MPa"
        )
        print(f"Suelo: k = {self.k / 1e6:.1f} MN/m³")
        print("-" * 80)

        print("\n1. DESPLAZAMIENTOS")
        print(f"   w_max = {np.max(np.abs(self.w)) * 1000:.2f} mm")

        print("\n2. MOMENTOS (cargas ya factorizadas en add_wall/add_column)")
        print(f"   Mx_max = {np.max(np.abs(self.Mx)) / 1000:.2f} kN·m/m")
        print(f"   My_max = {np.max(np.abs(self.My)) / 1000:.2f} kN·m/m")

        print("\n3. CORTANTE")
        print(f"   Vu_max = {np.max(self.Vu) / 1000:.2f} kN/m")
        print(f"   phi_Vc = {self.phiVc / 1000:.2f} kN/m")
        print(
            f"   Estado: {'CUMPLE' if np.all(self.shear_ok) else 'NO CUMPLE'}"
        )

        # Bands, settlements and punching are already printed by their own methods.
        print("\n" + "=" * 80)
