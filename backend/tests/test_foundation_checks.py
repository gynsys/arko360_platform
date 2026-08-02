"""Unit tests for app.engine.foundation.checks helpers and the sliding check."""
import math
import re
from types import SimpleNamespace

import numpy as np
import pytest

from app.engine.foundation.checks import (
    StructuralChecks,
    get_equivalent_rebars_count,
    get_equivalent_rebars_spacing,
)
from app.engine.foundation.grillage_solver import GrillageSolver

REBAR_AREAS_CM2 = {7: 0.385, 8: 0.503, 10: 0.785, 12: 1.13, 16: 1.99, 19: 2.84}


# ---------------------------------------------------------------------------
# get_equivalent_rebars_spacing
# ---------------------------------------------------------------------------
def test_spacing_options_are_unique_and_well_formed():
    options = get_equivalent_rebars_spacing(2.0)

    assert options == list(dict.fromkeys(options))
    for opt in options:
        assert re.fullmatch(r"Ø\d+@\d+cm", opt)


def test_spacing_options_respect_bounds():
    options = get_equivalent_rebars_spacing(2.0, min_spacing=10, max_spacing=30)

    for opt in options:
        spacing = int(opt.split("@")[1].removesuffix("cm"))
        assert 10 <= spacing <= 30


def test_spacing_option_covers_required_area():
    as_req = 2.0  # cm²/m
    calculated = get_equivalent_rebars_spacing(as_req)[0]
    diam, spacing = (int(x) for x in re.findall(r"\d+", calculated))

    provided = REBAR_AREAS_CM2[diam] * 100 / spacing

    assert provided >= as_req * 0.999


def test_spacing_falls_back_to_max_when_demand_is_tiny():
    options = get_equivalent_rebars_spacing(0.01, max_spacing=30)

    assert "Ø7@30cm" in options


def test_spacing_skips_diameters_needing_less_than_min_spacing():
    """A demand no commercial bar can meet leaves only the standard spacings."""
    commercial = [f"Ø{d}@{s}cm" for d in (7, 8, 10, 12, 16) for s in (10, 12, 15, 18, 20, 25, 30)]

    # 30 cm²/m would require every diameter to be spaced below the 10 cm minimum.
    assert get_equivalent_rebars_spacing(30.0) == commercial


def test_spacing_always_offers_commercial_fallbacks():
    options = get_equivalent_rebars_spacing(1.0)

    for spacing in (10, 12, 15, 18, 20, 25, 30):
        assert f"Ø12@{spacing}cm" in options


# ---------------------------------------------------------------------------
# get_equivalent_rebars_count
# ---------------------------------------------------------------------------
def test_count_options_cover_required_area():
    as_req = 5.0

    for opt in get_equivalent_rebars_count(as_req):
        n, diam = (int(x) for x in re.findall(r"\d+", opt))
        assert n * REBAR_AREAS_CM2[diam] >= as_req


def test_count_respects_minimum_bar_count():
    for opt in get_equivalent_rebars_count(0.1, min_bars=2):
        assert opt.startswith("2Ø")


def test_count_omits_options_above_max_bars():
    options = get_equivalent_rebars_count(12.0, max_bars=6)

    assert "Ø10" not in "".join(options)  # would need 16 bars
    assert options


def test_count_falls_back_when_no_option_fits():
    assert get_equivalent_rebars_count(1000.0) == ["2Ø19"]


def test_count_rounds_up_to_whole_bars():
    # 1.6 cm² needs ceil(1.6 / 0.785) = 3 bars of Ø10.
    assert "3Ø10" in get_equivalent_rebars_count(1.6)


# ---------------------------------------------------------------------------
# _point_segment_distance (geometry helper used by the checks)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "point,expected",
    [
        ((0.5, 1.0), 1.0),   # perpendicular from the middle
        ((-1.0, 0.0), 1.0),  # beyond the start node
        ((2.0, 0.0), 1.0),   # beyond the end node
        ((0.5, 0.0), 0.0),   # on the segment
    ],
)
def test_point_segment_distance(point, expected):
    distance = GrillageSolver._point_segment_distance(*point, 0.0, 0.0, 1.0, 0.0)

    assert distance == pytest.approx(expected)


def test_point_segment_distance_for_degenerate_segment():
    distance = GrillageSolver._point_segment_distance(3.0, 4.0, 1.0, 1.0, 1.0, 1.0)

    assert distance == pytest.approx(math.hypot(2.0, 3.0))


# ---------------------------------------------------------------------------
# check_sliding
# ---------------------------------------------------------------------------
class SlidingModel(StructuralChecks):
    """Minimal host exposing the attributes check_sliding depends on."""

    def __init__(self, retaining_walls):
        self.retaining_walls = retaining_walls
        self.Lx = 5.0
        self.Ly = 4.0
        self.h = 0.2
        self.gamma_horm = 2400.0
        self.walls = []
        self.columns = []


def retaining_wall(v_base=1000.0, phi=30.0, length=5.0, q_vertical=1200.0):
    return SimpleNamespace(v_base=v_base, phi=phi, length=length, q_vertical=q_vertical)


def test_check_sliding_is_inactive_without_retaining_walls():
    assert SlidingModel([]).check_sliding() == {"active": False}


def test_check_sliding_is_inactive_when_attribute_missing():
    model = SlidingModel([])
    del model.retaining_walls

    assert model.check_sliding() == {"active": False}


def test_check_sliding_computes_factor_of_safety():
    model = SlidingModel([retaining_wall()])
    model.walls = [SimpleNamespace(q_lineal=2400.0, load_factor=1.2, length=5.0)]
    model.columns = [SimpleNamespace(load_kgf=1000.0)]

    result = model.check_sliding()

    expected_h = 1000.0 * 5.0
    expected_v = (
        5.0 * 4.0 * 0.2 * 2400.0 * 9.81
        + (2400.0 / 1.2) * 5.0
        + (1200.0 / 1.2) * 5.0
        + 1000.0 * 9.81
    )
    expected_mu = math.tan(math.radians(30.0))

    assert result["active"] is True
    assert result["total_H_kN"] == pytest.approx(expected_h / 1000)
    assert result["total_V_kN"] == pytest.approx(expected_v / 1000)
    assert result["mu"] == pytest.approx(expected_mu)
    assert result["fs"] == pytest.approx(expected_v * expected_mu / expected_h)
    assert result["ok"] is (result["fs"] >= 1.5)
    assert model.sliding_data == result


def test_check_sliding_flags_insufficient_safety_factor():
    model = SlidingModel([retaining_wall(v_base=1e6)])

    result = model.check_sliding()

    assert result["fs"] < 1.5
    assert result["ok"] is False


def test_check_sliding_returns_sentinel_without_horizontal_thrust():
    model = SlidingModel([retaining_wall(v_base=0.0)])

    result = model.check_sliding()

    assert result["fs"] == pytest.approx(999.0)
    assert result["ok"] is True


def test_check_sliding_uses_phi_of_first_retaining_wall():
    model = SlidingModel([retaining_wall(phi=25.0), retaining_wall(phi=40.0)])

    assert model.check_sliding()["mu"] == pytest.approx(np.tan(np.radians(25.0)))
