"""Unit tests for app.engine.fem_shell (quad shell/plate elements)."""
import numpy as np
import pytest

from app.engine.fem_shell import (
    get_quad_plate_internal_forces,
    get_quad_plate_local_stiffness,
    get_quad_shell_local_stiffness,
    recover_shell_stresses,
)

E = 25e9
NU = 0.2
T = 0.20
UNIT_SQUARE = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]


@pytest.fixture
def k_shell():
    return get_quad_shell_local_stiffness(UNIT_SQUARE, E, NU, T)


@pytest.fixture
def k_plate():
    return get_quad_plate_local_stiffness(UNIT_SQUARE, E, NU, T)


# ---------------------------------------------------------------------------
# Shell element
# ---------------------------------------------------------------------------
def test_shell_stiffness_shape_and_symmetry(k_shell):
    assert k_shell.shape == (24, 24)
    assert np.allclose(k_shell, k_shell.T)


def test_shell_stiffness_is_positive_semidefinite(k_shell):
    assert np.min(np.linalg.eigvalsh(k_shell)) > -1e-6 * np.max(np.abs(k_shell))


def test_shell_drilling_dofs_receive_artificial_stiffness(k_shell):
    for node in range(4):
        assert k_shell[node * 6 + 5, node * 6 + 5] > 0


def test_shell_rigid_body_translation_produces_no_forces(k_shell):
    for dof in (0, 1, 2):  # ux, uy, uz
        u = np.zeros(24)
        u[dof::6] = 1.0
        assert np.allclose(k_shell @ u, 0.0, atol=1e-6 * np.max(np.abs(k_shell)))


def test_shell_stiffness_scales_with_thickness():
    thin = get_quad_shell_local_stiffness(UNIT_SQUARE, E, NU, 0.1)
    thick = get_quad_shell_local_stiffness(UNIT_SQUARE, E, NU, 0.2)

    # Membrane stiffness is linear in t.
    assert thick[0, 0] == pytest.approx(2 * thin[0, 0], rel=1e-9)
    # Bending stiffness grows faster than linearly (t^3 term dominates).
    assert thick[4, 4] > 2 * thin[4, 4]


def test_shell_stiffness_scales_with_element_size():
    big = [[0.0, 0.0], [2.0, 0.0], [2.0, 2.0], [0.0, 2.0]]
    k_big = get_quad_shell_local_stiffness(big, E, NU, T)
    k_small = get_quad_shell_local_stiffness(UNIT_SQUARE, E, NU, T)

    # Membrane stiffness of a square panel is size-independent per unit length,
    # while the rotational (bending) terms grow with the element area.
    assert k_big[0, 0] == pytest.approx(k_small[0, 0])
    assert k_big[4, 4] > k_small[4, 4]


# ---------------------------------------------------------------------------
# recover_shell_stresses
# ---------------------------------------------------------------------------
def test_recover_shell_stresses_returns_zero_for_rigid_body_motion():
    u = np.zeros(24)
    u[2::6] = 0.01  # uniform vertical translation

    stresses = recover_shell_stresses(UNIT_SQUARE, u, E, NU, T)

    assert all(value == pytest.approx(0.0) for value in stresses.values())


def test_recover_shell_stresses_matches_constant_curvature():
    """Impose theta_y = kappa * x, which is a constant curvature about y."""
    kappa = 1e-3
    u = np.zeros(24)
    for i, (x, _y) in enumerate(UNIT_SQUARE):
        u[i * 6 + 4] = kappa * x  # theta_y

    result = recover_shell_stresses(UNIT_SQUARE, u, E, NU, T)

    D = E * T**3 / (12 * (1 - NU**2))
    assert result["M11"] == pytest.approx(-D * kappa)
    assert result["M22"] == pytest.approx(-D * NU * kappa)
    assert result["M12"] == pytest.approx(0.0)


def test_recover_shell_stresses_principal_moments_bracket_components():
    u = np.zeros(24)
    u[4::6] = [0.0, 1e-3, 1e-3, 0.0]
    u[3::6] = [0.0, 0.0, 5e-4, 5e-4]

    result = recover_shell_stresses(UNIT_SQUARE, u, E, NU, T)

    assert result["M_min"] <= min(result["M11"], result["M22"])
    assert result["M_max"] >= max(result["M11"], result["M22"])
    assert result["M_max"] + result["M_min"] == pytest.approx(result["M11"] + result["M22"])


# ---------------------------------------------------------------------------
# Plate element
# ---------------------------------------------------------------------------
def test_plate_stiffness_shape_and_symmetry(k_plate):
    assert k_plate.shape == (12, 12)
    assert np.allclose(k_plate, k_plate.T)


def test_plate_rigid_body_modes_are_stress_free(k_plate):
    scale = np.max(np.abs(k_plate))
    translation = np.zeros(12)
    translation[0::3] = 1.0

    rotation_x = np.zeros(12)
    rotation_y = np.zeros(12)
    for i, (x, y) in enumerate(UNIT_SQUARE):
        # Shear strains are (dw/dx + theta_y) and (dw/dy - theta_x).
        rotation_x[i * 3] = y
        rotation_x[i * 3 + 1] = 1.0
        rotation_y[i * 3] = x
        rotation_y[i * 3 + 2] = -1.0

    for mode in (translation, rotation_x, rotation_y):
        assert np.allclose(k_plate @ mode, 0.0, atol=1e-6 * scale)


def test_shell_bending_block_tracks_the_standalone_plate(k_plate, k_shell):
    """The shell's (w, rx, ry) DOFs behave like the plate element.

    They are not identical: the shell blends 5% of the full 2x2 shear
    integration into the reduced rule, which slightly stiffens the block.
    """
    bending_dofs = [node * 6 + offset for node in range(4) for offset in (2, 3, 4)]
    block = k_shell[np.ix_(bending_dofs, bending_dofs)]

    assert np.allclose(block, k_plate, rtol=0.1, atol=0.02 * np.max(np.abs(k_plate)))
    assert block[0, 0] > k_plate[0, 0]


def test_plate_internal_forces_zero_for_rigid_body_motion():
    u = np.zeros(12)
    u[0::3] = 0.02

    forces = get_quad_plate_internal_forces(UNIT_SQUARE, u, E, NU, T)

    assert all(value == pytest.approx(0.0) for value in forces.values())


def test_plate_internal_forces_match_constant_curvature():
    kappa = 2e-3
    u = np.zeros(12)
    for i, (x, _y) in enumerate(UNIT_SQUARE):
        u[i * 3 + 2] = kappa * x  # theta_y

    forces = get_quad_plate_internal_forces(UNIT_SQUARE, u, E, NU, T)

    D = E * T**3 / (12 * (1 - NU**2))
    assert forces["Mx"] == pytest.approx(-D * kappa)
    assert forces["My"] == pytest.approx(-D * NU * kappa)
    assert forces["Mxy"] == pytest.approx(0.0)


def test_plate_internal_forces_capture_transverse_shear():
    """A transverse gradient of w with no rotation produces shear only."""
    u = np.zeros(12)
    for i, (x, _y) in enumerate(UNIT_SQUARE):
        u[i * 3] = 1e-4 * x

    forces = get_quad_plate_internal_forces(UNIT_SQUARE, u, E, NU, T)

    G = E / (2 * (1 + NU))
    assert forces["Vx"] == pytest.approx((5.0 / 6.0) * G * T * 1e-4)
    assert forces["Vy"] == pytest.approx(0.0)
    assert forces["Mx"] == pytest.approx(0.0)
