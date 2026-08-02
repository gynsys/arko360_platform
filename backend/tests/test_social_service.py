"""Unit tests for app.services.social_service (content cleaning and generation)."""
import pytest

from app.services import social_service
from app.services.social_service import clean_content_for_ai, generate_social_content


def test_clean_content_replaces_images_with_placeholder():
    html = '<p>Antes</p><img src="foo.png" alt="x"/><p>Despues</p>'

    assert clean_content_for_ai(html) == "Antes [imagen] Despues"


def test_clean_content_strips_inline_base64_payloads():
    html = 'background: url(data:image/png;base64,AAAABBBBCCCC) rest'

    cleaned = clean_content_for_ai(html)

    assert "base64" not in cleaned
    assert "rest" in cleaned


def test_clean_content_strips_tags_but_keeps_text():
    assert clean_content_for_ai("<h1>Losa</h1><p>maciza</p>") == "Losa maciza"


def test_clean_content_collapses_whitespace():
    assert clean_content_for_ai("  a\n\n  b\t c  ") == "a b c"


def test_clean_content_truncates_to_15k_chars():
    assert len(clean_content_for_ai("x" * 20000)) == 15000


@pytest.mark.parametrize("value", ["", None])
def test_clean_content_handles_empty_input(value):
    assert clean_content_for_ai(value) == ""


def capture_prompt(monkeypatch, response):
    prompts = []

    def fake_call(prompt, use_case="all"):
        prompts.append((prompt, use_case))
        if isinstance(response, Exception):
            raise response
        return response

    monkeypatch.setattr(social_service, "call_llm_json", fake_call)
    return prompts


def test_generate_social_content_uses_social_use_case(monkeypatch):
    prompts = capture_prompt(monkeypatch, {"slides": []})

    generate_social_content("Titulo", "<p>Cuerpo</p>")

    assert prompts[0][1] == "social"
    assert "Titulo" in prompts[0][0]
    assert "Cuerpo" in prompts[0][0]
    assert "<p>" not in prompts[0][0]


def test_generate_social_content_normalizes_dict_slides(monkeypatch):
    capture_prompt(monkeypatch, {"slides": {"1": {"title": "a"}, "2": {"title": "b"}}})

    result = generate_social_content("T", "C", generation_type="carousel")

    assert result["slides"] == [{"title": "a"}, {"title": "b"}]


def test_generate_social_content_keeps_list_slides(monkeypatch):
    capture_prompt(monkeypatch, {"slides": [{"title": "a"}]})

    assert generate_social_content("T", "C")["slides"] == [{"title": "a"}]


def test_generate_social_content_includes_special_instructions(monkeypatch):
    prompts = capture_prompt(monkeypatch, {})

    generate_social_content("T", "C", special_instructions="Usa tono formal")

    assert "Usa tono formal" in prompts[0][0]


def test_generate_social_content_includes_existing_content(monkeypatch):
    prompts = capture_prompt(monkeypatch, {})

    generate_social_content("T", "C", existing_content={"slides": [{"title": "previa"}]})

    assert "previa" in prompts[0][0]
    assert "DIAPOSITIVAS ACTUALES EXISTENTES" in prompts[0][0]


@pytest.mark.parametrize("generation_type", ["video", "reel", "carousel"])
def test_generate_social_content_supports_generation_types(monkeypatch, generation_type):
    prompts = capture_prompt(monkeypatch, {})

    generate_social_content("T", "C", generation_type=generation_type)

    assert prompts[0][0].strip()


@pytest.mark.parametrize("message", ["429 Too Many Requests", "Quota exceeded"])
def test_generate_social_content_translates_quota_errors(monkeypatch, message):
    capture_prompt(monkeypatch, RuntimeError(message))

    with pytest.raises(ValueError, match="límites de uso de IA"):
        generate_social_content("T", "C")


def test_generate_social_content_propagates_other_errors(monkeypatch):
    capture_prompt(monkeypatch, RuntimeError("connection reset"))

    with pytest.raises(RuntimeError, match="connection reset"):
        generate_social_content("T", "C")
