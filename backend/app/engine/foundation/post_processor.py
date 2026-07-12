"""
foundation/post_processor.py
Post-processing mixin: moment and shear computation from displacement field.

Provides:
  - PostProcessor mixin class

Units: N, m, Pa  →  outputs stored as N·m/m and N/m
"""

import numpy as np


class PostProcessor:
    """
    Mixin: compute bending moments and shear forces from the FEM displacement field.

    Requires attributes set by GrillageSolver (w, nx, ny, dx, dy, E, h, nu, G, d_eff,
    f_c, lambda_aci, phi_shear, n_nodes).
    """

    def compute_moments(self) -> tuple:
        """
        Calculate plate bending moments Mx, My, Mxy using finite-difference curvatures.

        Returns
        -------
        Mx  : np.ndarray  (N·m/m)
        My  : np.ndarray  (N·m/m)
        Mxy : np.ndarray  (N·m/m)
        """
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
                # Second derivative in x
                if 1 <= i <= nx - 1:
                    d2wdx2 = (w[j, i + 1] - 2 * w[j, i] + w[j, i - 1]) / dx**2
                elif i == 0:
                    d2wdx2 = (
                        2 * w[j, i] - 5 * w[j, i + 1]
                        + 4 * w[j, i + 2] - w[j, i + 3]
                    ) / dx**2
                else:
                    d2wdx2 = (
                        2 * w[j, i] - 5 * w[j, i - 1]
                        + 4 * w[j, i - 2] - w[j, i - 3]
                    ) / dx**2

                # Second derivative in y
                if 1 <= j <= ny - 1:
                    d2wdy2 = (w[j + 1, i] - 2 * w[j, i] + w[j - 1, i]) / dy**2
                elif j == 0:
                    d2wdy2 = (
                        2 * w[j, i] - 5 * w[j + 1, i]
                        + 4 * w[j + 2, i] - w[j + 3, i]
                    ) / dy**2
                else:
                    d2wdy2 = (
                        2 * w[j, i] - 5 * w[j - 1, i]
                        + 4 * w[j - 2, i] - w[j - 3, i]
                    ) / dy**2

                # Mixed derivative (interior nodes only)
                if 1 <= i <= nx - 1 and 1 <= j <= ny - 1:
                    d2wdxdy = (
                        w[j + 1, i + 1] - w[j + 1, i - 1]
                        - w[j - 1, i + 1] + w[j - 1, i - 1]
                    ) / (4 * dx * dy)
                else:
                    d2wdxdy = 0.0

                self.Mx[j, i] = D_plate * (d2wdx2 + nu * d2wdy2)
                self.My[j, i] = D_plate * (d2wdy2 + nu * d2wdx2)
                self.Mxy[j, i] = D_plate * (1 - nu) * d2wdxdy

        print(f"  Mx_max = {np.max(np.abs(self.Mx)) / 1000:.3f} kN·m/m")
        print(f"  My_max = {np.max(np.abs(self.My)) / 1000:.3f} kN·m/m")
        return self.Mx, self.My, self.Mxy

    def compute_shear(self) -> tuple:
        """
        Calculate plate shear forces Qx, Qy and verify against ACI 318 one-way shear.

        Returns
        -------
        Qx       : np.ndarray  (N/m)
        Qy       : np.ndarray  (N/m)
        Vu       : np.ndarray  max(|Qx|, |Qy|) per node (N/m)
        shear_ok : np.ndarray  bool, True where Vu ≤ φVc
        """
        w = self.w
        dx, dy = self.dx, self.dy
        D = self.E * self.h**3 / (12 * (1 - self.nu**2))
        nx, ny = self.nx, self.ny

        # Laplacian of w at every node
        laplacian = np.zeros_like(w)
        for j in range(self.n_nodes_y):
            for i in range(self.n_nodes_x):
                if 1 <= i <= nx - 1:
                    d2wdx2 = (w[j, i + 1] - 2 * w[j, i] + w[j, i - 1]) / dx**2
                elif i == 0:
                    d2wdx2 = (
                        2 * w[j, i] - 5 * w[j, i + 1]
                        + 4 * w[j, i + 2] - w[j, i + 3]
                    ) / dx**2
                else:
                    d2wdx2 = (
                        2 * w[j, i] - 5 * w[j, i - 1]
                        + 4 * w[j, i - 2] - w[j, i - 3]
                    ) / dx**2

                if 1 <= j <= ny - 1:
                    d2wdy2 = (w[j + 1, i] - 2 * w[j, i] + w[j - 1, i]) / dy**2
                elif j == 0:
                    d2wdy2 = (
                        2 * w[j, i] - 5 * w[j + 1, i]
                        + 4 * w[j + 2, i] - w[j + 3, i]
                    ) / dy**2
                else:
                    d2wdy2 = (
                        2 * w[j, i] - 5 * w[j - 1, i]
                        + 4 * w[j - 2, i] - w[j - 3, i]
                    ) / dy**2

                laplacian[j, i] = d2wdx2 + d2wdy2

        # Qx = -D * d(∇²w)/dx,  Qy = -D * d(∇²w)/dy
        self.Qx = np.zeros_like(w)
        self.Qy = np.zeros_like(w)
        for j in range(self.n_nodes_y):
            for i in range(self.n_nodes_x):
                if 1 <= i <= nx - 1:
                    dlapdx = (laplacian[j, i + 1] - laplacian[j, i - 1]) / (2 * dx)
                elif i == 0:
                    dlapdx = (
                        -3 * laplacian[j, i]
                        + 4 * laplacian[j, i + 1]
                        - laplacian[j, i + 2]
                    ) / (2 * dx)
                else:
                    dlapdx = (
                        3 * laplacian[j, i]
                        - 4 * laplacian[j, i - 1]
                        + laplacian[j, i - 2]
                    ) / (2 * dx)

                if 1 <= j <= ny - 1:
                    dlapdy = (laplacian[j + 1, i] - laplacian[j - 1, i]) / (2 * dy)
                elif j == 0:
                    dlapdy = (
                        -3 * laplacian[j, i]
                        + 4 * laplacian[j + 1, i]
                        - laplacian[j + 2, i]
                    ) / (2 * dy)
                else:
                    dlapdy = (
                        3 * laplacian[j, i]
                        - 4 * laplacian[j - 1, i]
                        + laplacian[j - 2, i]
                    ) / (2 * dy)

                self.Qx[j, i] = -D * dlapdx
                self.Qy[j, i] = -D * dlapdy

        self.Vu = np.maximum(np.abs(self.Qx), np.abs(self.Qy))
        bw_mm = 1000
        d_mm = self.d_eff * 1000
        # ACI 318-19 Eq. 22.5.5.1: Vc = 0.17·λ·√f'c · bw · d  (one-way shear in slabs)
        self.Vc = 0.17 * self.lambda_aci * np.sqrt(self.f_c) * bw_mm * d_mm  # N/m
        self.phiVc = self.phi_shear * self.Vc
        self.shear_ratio = self.Vu / self.phiVc
        self.shear_ok = self.Vu <= self.phiVc

        print("\nVerificación de cortante (ACI 318):")
        print(f"  Vu_max = {np.max(self.Vu) / 1000:.3f} kN/m")
        print(f"  Vc = {self.Vc / 1000:.3f} kN/m")
        print(f"  phi_Vc = {self.phiVc / 1000:.3f} kN/m")
        print(f"  Ratio Vu/phi_Vc max = {np.max(self.shear_ratio):.3f}")
        print(
            f"  Estado: {'CUMPLE OK' if np.all(self.shear_ok) else 'NO CUMPLE FAIL'}"
        )
        if not np.all(self.shear_ok):
            n_fail = int(np.sum(~self.shear_ok))
            print(
                f"  Nodos que no cumplen: {n_fail} de {self.n_nodes} "
                f"({100 * n_fail / self.n_nodes:.1f}%)"
            )
        return self.Qx, self.Qy, self.Vu, self.shear_ok
