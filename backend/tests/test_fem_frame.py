"""Unit tests for app.engine.fem_frame (3D frame element matrices)."""
import numpy as np
import pytest

from app.engine.fem_frame import (
    get_3d_frame_local_stiffness,
    get_rotation_matrix,
    get_tapered_3d_frame_local_stiffness,
)

E = 200e9
G = 77e9
A = 0.01
J = 1e-5
IY = 2e-5
IZ = 4e-5
L = 3.0


@pytest.fixture
def k_local():
    return get_3d_frame_local_stiffness(E, G, A, J, IY, IZ, L)


def test_local_stiffness_is_symmetric(k_local):
    assert k_local.shape == (12, 12)
    assert np.allclose(k_local, k_local.T)


def test_local_stiffness_axial_and_torsional_terms(k_local):
    assert k_local[0, 0] == pytest.approx(E * A / L)
    assert k_local[0, 6] == pytest.approx(-E * A / L)
    assert k_local[3, 3] == pytest.approx(G * J / L)
    assert k_local[3, 9] == pytest.approx(-G * J / L)


def test_local_stiffness_bending_terms(k_local):
    assert k_local[1, 1] == pytest.approx(12 * E * IZ / L**3)
    assert k_local[5, 5] == pytest.approx(4 * E * IZ / L)
    assert k_local[5, 11] == pytest.approx(2 * E * IZ / L)
    assert k_local[2, 2] == pytest.approx(12 * E * IY / L**3)
    assert k_local[4, 4] == pytest.approx(4 * E * IY / L)
    assert k_local[4, 10] == pytest.approx(2 * E * IY / L)


def test_local_stiffness_has_six_rigid_body_modes(k_local):
    # A free element must be singular with a 6-dimensional null space.
    eigenvalues = np.linalg.eigvalsh(k_local)
    near_zero = np.sum(np.abs(eigenvalues) < 1e-6 * np.max(np.abs(eigenvalues)))

    assert near_zero == 6


def test_local_stiffness_axial_rigid_translation_produces_no_force(k_local):
    u = np.zeros(12)
    u[0] = u[6] = 1.0

    assert np.allclose(k_local @ u, 0.0)


def test_cantilever_tip_deflection_matches_beam_theory(k_local):
    """A unit tip load on a fixed-free element gives PL^3/(3EI)."""
    free = [6, 7, 8, 9, 10, 11]
    k_ff = k_local[np.ix_(free, free)]
    load = np.zeros(6)
    load[1] = 1000.0  # shear along local y

    disp = np.linalg.solve(k_ff, load)

    assert disp[1] == pytest.approx(1000.0 * L**3 / (3 * E * IZ), rel=1e-9)


def test_rotation_matrix_is_orthogonal_and_block_diagonal():
    T = get_rotation_matrix(np.array([0.0, 0.0, 0.0]), np.array([3.0, 4.0, 0.0]))

    assert T.shape == (12, 12)
    assert np.allclose(T @ T.T, np.eye(12))
    for i in range(4):
        assert np.allclose(T[0:3, 0:3], T[i * 3 : (i + 1) * 3, i * 3 : (i + 1) * 3])
    assert np.allclose(T[0:3, 9:12], 0.0)


def test_rotation_matrix_maps_axis_to_local_x():
    node_i, node_j = np.array([0.0, 0.0, 0.0]), np.array([3.0, 4.0, 0.0])
    T_sub = get_rotation_matrix(node_i, node_j)[0:3, 0:3]

    axis = (node_j - node_i) / np.linalg.norm(node_j - node_i)

    assert np.allclose(T_sub @ axis, [1.0, 0.0, 0.0])


@pytest.mark.parametrize("tip", [[0.0, 0.0, 4.0], [0.0, 0.0, -4.0]])
def test_rotation_matrix_handles_vertical_members(tip):
    node_i, node_j = np.array([0.0, 0.0, 0.0]), np.array(tip)
    T = get_rotation_matrix(node_i, node_j)

    axis = (node_j - node_i) / np.linalg.norm(node_j - node_i)

    assert np.allclose(T @ T.T, np.eye(12))
    assert np.allclose(T[0:3, 0:3] @ axis, [1.0, 0.0, 0.0])


def test_rotation_matrix_beta_roll_rotates_local_axes():
    node_i, node_j = np.array([0.0, 0.0, 0.0]), np.array([1.0, 0.0, 0.0])
    T0 = get_rotation_matrix(node_i, node_j, beta=0)[0:3, 0:3]
    T90 = get_rotation_matrix(node_i, node_j, beta=90)[0:3, 0:3]

    assert np.allclose(T0, np.eye(3))
    assert np.allclose(T90 @ T90.T, np.eye(3))
    # Local x is unchanged by the roll; local y maps onto the old local z.
    assert np.allclose(T90[0], T0[0])
    assert np.allclose(T90[1], T0[2])


def test_tapered_stiffness_is_symmetric_with_rigid_body_modes():
    K = get_tapered_3d_frame_local_stiffness(
        E, G, L, ht_start=0.6, ht_end=0.3, w=0.2, t_f=0.012, t_w=0.008, N=6
    )

    assert K.shape == (12, 12)
    assert np.allclose(K, K.T, atol=1e-3 * np.max(np.abs(K)))

    u = np.zeros(12)
    u[0] = u[6] = 1.0
    assert np.allclose(K @ u, 0.0, atol=1e-3)


def test_tapered_stiffness_matches_prismatic_element_when_depth_is_constant():
    ht, w, t_f, t_w = 0.4, 0.2, 0.012, 0.008
    hw = ht - 2 * t_f
    A_x = 2 * (w * t_f) + hw * t_w
    Iy_x = 2 * (t_f * w**3 / 12) + (hw * t_w**3 / 12)
    Iz_x = 2 * (w * t_f**3 / 12 + w * t_f * ((ht - t_f) / 2) ** 2) + (t_w * hw**3 / 12)
    J_x = (2 * w * t_f**3 + hw * t_w**3) / 3.0

    K_tapered = get_tapered_3d_frame_local_stiffness(
        E, G, L, ht_start=ht, ht_end=ht, w=w, t_f=t_f, t_w=t_w, N=8
    )
    K_prismatic = get_3d_frame_local_stiffness(E, G, A_x, J_x, Iy_x, Iz_x, L)

    assert np.allclose(K_tapered, K_prismatic, rtol=1e-6, atol=1e-3)


def test_tapered_element_is_stiffer_when_deeper():
    shallow = get_tapered_3d_frame_local_stiffness(
        E, G, L, ht_start=0.3, ht_end=0.3, w=0.2, t_f=0.012, t_w=0.008, N=6
    )
    deep = get_tapered_3d_frame_local_stiffness(
        E, G, L, ht_start=0.6, ht_end=0.6, w=0.2, t_f=0.012, t_w=0.008, N=6
    )

    assert deep[1, 1] > shallow[1, 1]
