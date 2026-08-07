"""Unit tests for app.services.preprocessing_service pure helpers."""
from types import SimpleNamespace

import pytest

from app.services.preprocessing_service import (
    InsumoStat,
    OBLIGATORY_THRESHOLD,
    PRESENCE_THRESHOLD,
    TOP_ITEMS_LIMIT,
    _calculate_similarity_score,
    _calculate_statistics,
    _detect_warnings,
    _extract_keywords,
    _format_rendimientos,
    _normalize_unit,
    _score_and_filter_items,
)


def item(descri, unipar="m3", codpar="P1"):
    """Lightweight stand-in for a CostItem row."""
    return SimpleNamespace(Descri=descri, UniPar=unipar, CodPar=codpar)


# ---------------------------------------------------------------------------
# _extract_keywords
# ---------------------------------------------------------------------------
def test_extract_keywords_drops_stopwords_and_short_words():
    assert _extract_keywords("Concreto de 210 kg/cm2 para losa") == [
        "concreto",
        "kg/cm2",
        "losa",
    ]


def test_extract_keywords_strips_punctuation_and_lowercases():
    assert _extract_keywords("Encofrado, (Viga); ACERO!") == ["encofrado", "viga", "acero"]


@pytest.mark.parametrize("value", ["", "   ", None, 123, []])
def test_extract_keywords_handles_invalid_input(value):
    assert _extract_keywords(value) == []


# ---------------------------------------------------------------------------
# _normalize_unit
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "raw,expected",
    [
        ("m2", "m²"),
        ("M3", "m³"),
        (" m2. ", "m²"),
        ("Kg.", "kg"),
        ("UNIDADES", "und"),
        ("unidad", "und"),
        ("dia", "día"),
        ("ml", "ml"),
    ],
)
def test_normalize_unit_maps_known_variants(raw, expected):
    assert _normalize_unit(raw) == expected


@pytest.mark.parametrize("value", [None, ""])
def test_normalize_unit_defaults_to_nd(value):
    assert _normalize_unit(value) == "ND"


# ---------------------------------------------------------------------------
# _calculate_similarity_score
# ---------------------------------------------------------------------------
def test_similarity_score_is_one_when_all_keywords_match():
    assert _calculate_similarity_score(item("Concreto para losa"), ["concreto", "losa"]) == 1.0


def test_similarity_score_is_fraction_of_matched_keywords():
    score = _calculate_similarity_score(item("Concreto armado"), ["concreto", "encofrado"])

    assert score == pytest.approx(0.5)


def test_similarity_score_matches_substrings_in_both_directions():
    assert _calculate_similarity_score(item("Encofrados metalicos"), ["encofrado"]) == 1.0


def test_similarity_score_counts_each_keyword_once():
    assert _calculate_similarity_score(item("losa losa losa"), ["losa"]) == 1.0


@pytest.mark.parametrize(
    "cost_item,keywords",
    [
        (item("Concreto"), []),
        (item(None), ["concreto"]),
        (item(""), ["concreto"]),
        (item("de la el"), ["concreto"]),
    ],
)
def test_similarity_score_returns_zero_for_degenerate_input(cost_item, keywords):
    assert _calculate_similarity_score(cost_item, keywords) == 0.0


# ---------------------------------------------------------------------------
# _score_and_filter_items
# ---------------------------------------------------------------------------
def test_score_and_filter_returns_untouched_slice_without_keywords():
    items = [item(f"Partida {i}") for i in range(TOP_ITEMS_LIMIT + 5)]

    result, best = _score_and_filter_items(items, [])

    assert len(result) == TOP_ITEMS_LIMIT
    assert best == 0.0


def test_score_and_filter_returns_empty_for_empty_items():
    assert _score_and_filter_items([], ["losa"]) == ([], 0.0)


def test_score_and_filter_sorts_by_score_and_applies_dynamic_cutoff():
    best_item = item("Concreto armado losa maciza")
    mid_item = item("Concreto ciclopeo")
    weak_item = item("Pintura esmalte sobre pared")

    result, best_score = _score_and_filter_items(
        [weak_item, mid_item, best_item], ["concreto", "losa", "maciza"]
    )

    assert best_score == pytest.approx(1.0)
    assert result == [best_item]


def test_score_and_filter_drops_items_below_similarity_threshold():
    result, best_score = _score_and_filter_items(
        [item("Pintura esmalte")], ["concreto", "losa", "acero", "encofrado"]
    )

    assert result == []
    assert best_score == 0.0


def test_score_and_filter_caps_results_at_top_limit():
    items = [item("Concreto losa") for _ in range(TOP_ITEMS_LIMIT + 3)]

    result, _ = _score_and_filter_items(items, ["concreto", "losa"])

    assert len(result) == TOP_ITEMS_LIMIT


# ---------------------------------------------------------------------------
# InsumoStat
# ---------------------------------------------------------------------------
def test_insumo_stat_aggregates_quantities():
    stat = InsumoStat(
        descripcion="Cemento",
        unidad="kg",
        cantidades=[1.0, 2.0, 6.0],
        codigos={"C1", "C2"},
        total_partidas_unidad=6,
    )

    assert stat.frecuencia == 3
    assert stat.promedio == pytest.approx(3.0)
    assert stat.minimo == 1.0
    assert stat.maximo == 6.0
    assert stat.porcentaje_presencia == pytest.approx(50.0)
    assert stat.to_dict() == {
        "descripcion": "Cemento",
        "unidad": "kg",
        "min": 1.0,
        "max": 6.0,
        "promedio": 3.0,
        "frecuencia": 3,
        "total_partidas_unidad": 6,
        "porcentaje_presencia": 50.0,
        "codigos": ["C1", "C2"],
    }


def test_insumo_stat_without_quantities_is_empty():
    stat = InsumoStat(descripcion="Cemento", unidad="kg")

    assert stat.frecuencia == 0
    assert stat.promedio is None
    assert stat.minimo is None
    assert stat.maximo is None
    assert stat.porcentaje_presencia == 0.0
    assert stat.to_dict()["min"] is None


def test_insumo_stat_presence_is_zero_without_reference_count():
    stat = InsumoStat(descripcion="Cemento", unidad="kg", cantidades=[1.0])

    assert stat.porcentaje_presencia == 0.0


# ---------------------------------------------------------------------------
# _calculate_statistics
# ---------------------------------------------------------------------------
def _materiales_group(quantities):
    return {"m³": {"Cemento | kg": [{"cantidad": q, "codigo": "C1"} for q in quantities]}}


def test_calculate_statistics_builds_stats_per_unit():
    similar = [item("a", unipar="m3"), item("b", unipar="m3."), item("c", unipar="m2")]

    stats = _calculate_statistics(_materiales_group([1.0, 3.0]), {}, {}, similar)
    stat = stats["materiales"]["m³"]["Cemento | kg"]

    assert stat.descripcion == "Cemento"
    assert stat.unidad == "kg"
    assert stat.cantidades == [1.0, 3.0]
    assert stat.codigos == {"C1"}
    # m3 and "m3." normalize to the same unit, so two partidas are counted.
    assert stat.total_partidas_unidad == 2


def test_calculate_statistics_ignores_null_and_non_positive_quantities():
    materiales = {
        "m³": {
            "Cemento | kg": [
                {"cantidad": None, "codigo": "C1"},
                {"cantidad": 0, "codigo": "C1"},
                {"cantidad": 2.0, "codigo": "C1"},
            ],
            "Arena | m³": [{"cantidad": None, "codigo": "A1"}],
        }
    }

    stats = _calculate_statistics(materiales, {}, {}, [item("a")])

    assert stats["materiales"]["m³"]["Cemento | kg"].cantidades == [2.0]
    assert "Arena | m³" not in stats["materiales"]["m³"]


def test_calculate_statistics_covers_all_insumo_types():
    group = _materiales_group([1.0])

    stats = _calculate_statistics(group, group, group, [item("a")])

    assert set(stats) == {"materiales", "mano_obra", "equipos"}
    for tipo in stats:
        assert stats[tipo]["m³"]["Cemento | kg"].frecuencia == 1


# ---------------------------------------------------------------------------
# _detect_warnings
# ---------------------------------------------------------------------------
def _stats_with(cantidades, total=10):
    return {
        "materiales": {
            "m³": {
                "Cemento | kg": InsumoStat(
                    descripcion="Cemento",
                    unidad="kg",
                    cantidades=cantidades,
                    total_partidas_unidad=total,
                )
            }
        }
    }


def test_detect_warnings_flags_high_variability():
    warnings = _detect_warnings(_stats_with([1.0, 10.0, 1.0, 10.0, 1.0]))

    assert len(warnings) == 1
    assert "MATERIALES" in warnings[0]
    assert "alta variabilidad" in warnings[0]


def test_detect_warnings_ignores_stable_insumos():
    assert _detect_warnings(_stats_with([5.0, 5.1, 5.0, 4.9, 5.0])) == []


def test_detect_warnings_ignores_rare_insumos():
    # 1 of 100 partidas is below the presence threshold.
    assert _detect_warnings(_stats_with([1.0, 50.0], total=1000)) == []
    assert PRESENCE_THRESHOLD > 0


def test_detect_warnings_ignores_zero_average():
    assert _detect_warnings(_stats_with([0.0, 0.0])) == []


# ---------------------------------------------------------------------------
# _format_rendimientos
# ---------------------------------------------------------------------------
def test_format_rendimientos_groups_by_partida_unit():
    stats = _stats_with([2.0] * 9, total=10)

    rendimientos = _format_rendimientos(stats)
    entry = rendimientos["m³"]["materiales"][0]

    assert set(rendimientos["m³"]) == {"materiales", "mano_obra", "equipos"}
    assert entry["descripcion"] == "Cemento"
    assert entry["unidad_insumo"] == "kg"
    assert entry["cantidad_promedio"] == pytest.approx(2.0)
    assert entry["frecuencia"] == "9/10 partidas"
    assert entry["obligatorio"] is True
    assert entry["opcional"] is False


def test_format_rendimientos_marks_infrequent_insumos_as_optional():
    stats = _stats_with([2.0] * 3, total=10)

    entry = _format_rendimientos(stats)["m³"]["materiales"][0]

    assert entry["obligatorio"] is False
    assert entry["opcional"] is True
    assert OBLIGATORY_THRESHOLD > PRESENCE_THRESHOLD


def test_format_rendimientos_skips_insumos_below_presence_threshold():
    stats = _stats_with([2.0], total=100)

    assert _format_rendimientos(stats)["m³"]["materiales"] == []


def test_format_rendimientos_returns_empty_for_empty_stats():
    assert _format_rendimientos({}) == {}
