"""Unit tests for the reinforcement design mixin (app.engine.foundation.designer)."""
import numpy as np
import pytest

from app.engine.foundation.designer import ReinforcementDesigner


class Designer(ReinforcementDesigner):
    """Minimal host exposing only the attributes the mixin needs."""

    def __init__(self, h=0.30, f_c=25.0, f_y=420.0, cover=0.05, bar_diam=0.012):
        self.h = h
        self.f_c = f_c
        self.f_y = f_y
        self.d_eff = h - cover - bar_diam / 2
        self.rho_min = 0.0018
        self.phi_flex = 0.9
        self.bar_diameters_mm = [7, 8, 10, 12, 16, 20, 25]
        self.bar_areas_mm2 = {d: np.pi * d**2 / 4 for d in self.bar_diameters_mm}


@pytest.fixture
def designer():
    return Designer()


# ---------------------------------------------------------------------------
# _calc_steel
# ---------------------------------------------------------------------------
def test_calc_steel_returns_minimum_for_negligible_moments(designer):
    As, a, As_calc = designer._calc_steel(np.zeros(3))

    assert np.allclose(As, designer.rho_min * designer.h)
    assert np.allclose(a, 0.0)
    assert np.allclose(As_calc, 0.0)


def test_calc_steel_matches_aci_closed_form(designer):
    Mu = np.array([80_000.0])  # N·m/m

    As, a, As_calc = designer._calc_steel(Mu)

    fc, fy, d = designer.f_c * 1e6, designer.f_y * 1e6, designer.d_eff
    expected_a = d - np.sqrt(d**2 - 2 * Mu[0] / (designer.phi_flex * 0.85 * fc))
    expected_As = 0.85 * fc * expected_a / fy

    assert a[0] == pytest.approx(expected_a)
    assert As_calc[0] == pytest.approx(expected_As)
    assert As[0] == pytest.approx(expected_As)


def test_calc_steel_never_returns_less_than_minimum(designer):
    As, _, As_calc = designer._calc_steel(np.array([1.0]))

    assert As[0] == pytest.approx(designer.rho_min * designer.h)
    assert As_calc[0] < As[0]


def test_calc_steel_is_monotonic_in_moment(designer):
    As, _, _ = designer._calc_steel(np.array([50_000.0, 100_000.0, 150_000.0]))

    assert np.all(np.diff(As) > 0)


def test_calc_steel_clips_negative_discriminant(designer):
    """A moment beyond the section capacity must not produce NaNs."""
    As, a, _ = designer._calc_steel(np.array([1e9]))

    assert np.isfinite(As).all()
    assert a[0] == pytest.approx(designer.d_eff)


def test_calc_steel_preserves_array_shape(designer):
    Mu = np.array([[0.0, 40_000.0], [80_000.0, 0.0]])

    As, a, As_calc = designer._calc_steel(Mu)

    assert As.shape == a.shape == As_calc.shape == Mu.shape


# ---------------------------------------------------------------------------
# _propose_bars
# ---------------------------------------------------------------------------
def test_propose_bars_returns_none_required_for_zero_area(designer):
    proposal = designer._propose_bars(0.0)

    assert proposal["diam_mm"] == 0
    assert proposal["sep_m"] == 0
    assert proposal["As_prov_cm2_m"] == 0
    assert proposal["note"] == "Mínimo no requerido"


def test_propose_bars_provides_at_least_the_required_area(designer):
    As_req = 8e-4  # m²/m == 8 cm²/m

    proposal = designer._propose_bars(As_req)

    assert proposal["note"] == "OK"
    assert proposal["As_req_cm2_m"] == pytest.approx(8.0)
    assert proposal["As_prov_cm2_m"] >= proposal["As_req_cm2_m"]
    assert "score" not in proposal


def test_propose_bars_respects_spacing_bounds(designer):
    proposal = designer._propose_bars(2e-4)
    s_max = min(0.45, 3 * designer.h)

    assert proposal["sep_m"] <= s_max
    assert proposal["sep_m"] >= max(0.10, 1.5 * proposal["diam_mm"] / 1000.0)
    # Spacings are rounded down to 2.5 cm multiples.
    assert proposal["sep_m"] * 1000 % 25 == pytest.approx(0.0)


def test_propose_bars_prefers_smaller_diameters(designer):
    proposal = designer._propose_bars(4e-4)

    assert proposal["diam_mm"] <= 12


def test_propose_bars_uses_larger_diameters_as_demand_grows(designer):
    light = designer._propose_bars(3e-4)
    heavy = designer._propose_bars(3e-3)

    assert heavy["diam_mm"] >= light["diam_mm"]
    assert heavy["As_prov_cm2_m"] > light["As_prov_cm2_m"]


def test_propose_bars_flags_demand_above_maximum_capacity(designer):
    proposal = designer._propose_bars(1.0)  # 10 000 cm²/m — impossible

    assert proposal["diam_mm"] == max(designer.bar_diameters_mm)
    assert proposal["note"].startswith("REVISAR")
    assert proposal["sep_m"] == pytest.approx(max(0.10, 1.5 * 25 / 1000.0))
