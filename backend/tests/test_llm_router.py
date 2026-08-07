"""Unit tests for app.services.llm_router (provider dispatch, fallback, caching)."""
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.services import llm_router


def make_provider(
    provider_key="groq",
    display_name="Groq",
    priority=1,
    model_name="llama3",
    base_url=None,
    extra_params=None,
):
    return SimpleNamespace(
        provider_key=provider_key,
        display_name=display_name,
        priority=priority,
        model_name=model_name,
        base_url=base_url,
        extra_params=extra_params,
        api_key_enc="enc",
    )


@pytest.fixture(autouse=True)
def clean_cache():
    llm_router.invalidate_llm_cache()
    yield
    llm_router.invalidate_llm_cache()


@pytest.fixture
def no_providers(monkeypatch):
    monkeypatch.setattr(llm_router, "_load_providers", lambda use_case="all": [])


def patch_dispatch(monkeypatch, side_effects):
    """Replace _dispatch with a recorder returning/raising the given effects."""
    calls = []

    def fake_dispatch(provider, prompt, expect_json):
        calls.append((provider.display_name, prompt, expect_json))
        effect = side_effects.pop(0)
        if isinstance(effect, Exception):
            raise effect
        return effect

    monkeypatch.setattr(llm_router, "_dispatch", fake_dispatch)
    return calls


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
def test_load_providers_caches_result_per_use_case(monkeypatch):
    db_calls = []
    providers = [make_provider()]

    monkeypatch.setattr(llm_router, "SessionLocal", lambda: SimpleNamespace(close=lambda: None))
    monkeypatch.setattr(
        "app.crud.llm.get_active_providers_for_use_case",
        lambda db, use_case: (db_calls.append(use_case), providers)[1],
    )

    assert llm_router._load_providers("social") == providers
    assert llm_router._load_providers("social") == providers
    assert db_calls == ["social"]

    # A different use case bypasses the cache entry.
    assert llm_router._load_providers("apu") == providers
    assert db_calls == ["social", "apu"]


def test_load_providers_refetches_after_cache_expiry(monkeypatch):
    db_calls = []
    monkeypatch.setattr(llm_router, "SessionLocal", lambda: SimpleNamespace(close=lambda: None))
    monkeypatch.setattr(
        "app.crud.llm.get_active_providers_for_use_case",
        lambda db, use_case: (db_calls.append(use_case), [])[1],
    )

    llm_router._load_providers("all")
    llm_router._cache_expiry = datetime.utcnow() - timedelta(minutes=1)
    llm_router._load_providers("all")

    assert len(db_calls) == 2


def test_invalidate_llm_cache_clears_state():
    llm_router._cache = [make_provider()]
    llm_router._cache_use_case = "all"
    llm_router._cache_expiry = datetime.utcnow() + timedelta(minutes=5)

    llm_router.invalidate_llm_cache()

    assert llm_router._cache is None
    assert llm_router._cache_use_case is None
    assert llm_router._cache_expiry is None


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("key", ["groq", "openai", "custom", "mistral", "ollama", "OpenAI"])
def test_dispatch_routes_openai_compatible_providers(monkeypatch, key):
    monkeypatch.setattr(
        llm_router, "_call_openai_compatible", lambda p, prompt, expect_json: "openai"
    )
    monkeypatch.setattr(llm_router, "_call_gemini", lambda p, prompt, expect_json: "gemini")

    assert llm_router._dispatch(make_provider(provider_key=key), "hi", False) == "openai"


def test_dispatch_routes_gemini(monkeypatch):
    monkeypatch.setattr(llm_router, "_call_gemini", lambda p, prompt, expect_json: "gemini")

    assert llm_router._dispatch(make_provider(provider_key="Gemini"), "hi", False) == "gemini"


def test_dispatch_rejects_unknown_provider():
    with pytest.raises(ValueError, match="Unknown provider_key"):
        llm_router._dispatch(make_provider(provider_key="skynet"), "hi", False)


def test_call_openai_compatible_builds_request(monkeypatch):
    captured = {}

    class Response:
        def raise_for_status(self):
            captured["raised"] = True

        def json(self):
            return {"choices": [{"message": {"content": "hello"}}]}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, payload=json, timeout=timeout)
        return Response()

    monkeypatch.setattr(llm_router.requests, "post", fake_post)
    monkeypatch.setattr(llm_router, "decrypt_api_key", lambda enc: "plain-key")

    provider = make_provider(
        base_url="https://api.groq.com/openai/v1/",
        extra_params={"temperature": 0.1, "max_tokens": 64},
    )
    result = llm_router._call_openai_compatible(provider, "prompt", expect_json=True)

    assert result == "hello"
    assert captured["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer plain-key"
    assert captured["payload"]["temperature"] == 0.1
    assert captured["payload"]["max_tokens"] == 64
    assert captured["payload"]["response_format"] == {"type": "json_object"}
    assert captured["payload"]["messages"][1] == {"role": "user", "content": "prompt"}


def test_call_openai_compatible_defaults(monkeypatch):
    captured = {}

    class Response:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": "text"}}]}

    monkeypatch.setattr(
        llm_router.requests,
        "post",
        lambda url, headers, json, timeout: (captured.update(url=url, payload=json), Response())[1],
    )
    monkeypatch.setattr(llm_router, "decrypt_api_key", lambda enc: "k")

    llm_router._call_openai_compatible(make_provider(), "prompt", expect_json=False)

    assert captured["url"] == "https://api.openai.com/v1/chat/completions"
    assert captured["payload"]["temperature"] == 0.7
    assert captured["payload"]["max_tokens"] == 2048
    assert "response_format" not in captured["payload"]


# ---------------------------------------------------------------------------
# call_llm_text
# ---------------------------------------------------------------------------
def test_call_llm_text_returns_first_success(monkeypatch):
    monkeypatch.setattr(
        llm_router,
        "_load_providers",
        lambda use_case="all": [make_provider(display_name="A"), make_provider(display_name="B")],
    )
    calls = patch_dispatch(monkeypatch, ["answer"])

    assert llm_router.call_llm_text("prompt") == "answer"
    assert len(calls) == 1
    assert calls[0][2] is False


def test_call_llm_text_falls_back_to_next_provider(monkeypatch):
    monkeypatch.setattr(
        llm_router,
        "_load_providers",
        lambda use_case="all": [make_provider(display_name="A"), make_provider(display_name="B")],
    )
    calls = patch_dispatch(monkeypatch, [RuntimeError("down"), "answer"])

    assert llm_router.call_llm_text("prompt") == "answer"
    assert [c[0] for c in calls] == ["A", "B"]


def test_call_llm_text_raises_when_all_providers_fail(monkeypatch):
    monkeypatch.setattr(llm_router, "_load_providers", lambda use_case="all": [make_provider()])
    patch_dispatch(monkeypatch, [RuntimeError("boom")])

    with pytest.raises(ValueError, match="All LLM providers failed"):
        llm_router.call_llm_text("prompt")


def test_call_llm_text_raises_without_providers(no_providers):
    with pytest.raises(ValueError, match="No active LLM providers"):
        llm_router.call_llm_text("prompt")


# ---------------------------------------------------------------------------
# call_llm_json
# ---------------------------------------------------------------------------
def test_call_llm_json_parses_direct_json(monkeypatch):
    monkeypatch.setattr(llm_router, "_load_providers", lambda use_case="all": [make_provider()])
    calls = patch_dispatch(monkeypatch, ['{"a": 1}'])

    assert llm_router.call_llm_json("prompt") == {"a": 1}
    assert calls[0][2] is True


def test_call_llm_json_extracts_json_block_from_prose(monkeypatch):
    monkeypatch.setattr(llm_router, "_load_providers", lambda use_case="all": [make_provider()])
    patch_dispatch(monkeypatch, ['Claro:\n```json\n{"a": [1, 2]}\n```\nEso es todo.'])

    assert llm_router.call_llm_json("prompt") == {"a": [1, 2]}


def test_call_llm_json_falls_back_when_response_is_not_json(monkeypatch):
    monkeypatch.setattr(
        llm_router,
        "_load_providers",
        lambda use_case="all": [make_provider(display_name="A"), make_provider(display_name="B")],
    )
    calls = patch_dispatch(monkeypatch, ["no json here", '{"ok": true}'])

    assert llm_router.call_llm_json("prompt") == {"ok": True}
    assert len(calls) == 2


def test_call_llm_json_raises_when_all_providers_fail(monkeypatch):
    monkeypatch.setattr(llm_router, "_load_providers", lambda use_case="all": [make_provider()])
    patch_dispatch(monkeypatch, ["not json"])

    with pytest.raises(ValueError, match="All LLM providers failed"):
        llm_router.call_llm_json("prompt")


def test_call_llm_json_raises_without_providers(no_providers):
    with pytest.raises(ValueError, match="No active LLM providers"):
        llm_router.call_llm_json("prompt")


# ---------------------------------------------------------------------------
# test_provider
# ---------------------------------------------------------------------------
def test_test_provider_reports_success(monkeypatch):
    patch_dispatch(monkeypatch, ["GynSys OK"])

    result = llm_router.test_provider(make_provider())

    assert result["success"] is True
    assert result["response_preview"] == "GynSys OK"
    assert result["error"] is None
    assert result["latency_ms"] >= 0


def test_test_provider_truncates_long_preview(monkeypatch):
    patch_dispatch(monkeypatch, ["x" * 200])

    assert len(llm_router.test_provider(make_provider())["response_preview"]) == 80


def test_test_provider_reports_empty_response(monkeypatch):
    patch_dispatch(monkeypatch, [""])

    assert llm_router.test_provider(make_provider())["response_preview"] == "(respuesta vacía)"


def test_test_provider_reports_failure(monkeypatch):
    patch_dispatch(monkeypatch, [RuntimeError("401 unauthorized")])

    result = llm_router.test_provider(make_provider())

    assert result["success"] is False
    assert result["latency_ms"] is None
    assert "401" in result["error"]
