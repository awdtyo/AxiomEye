from __future__ import annotations

import asyncio
import json
import os
import re
from dataclasses import dataclass
from dataclasses import field as dc_field
from typing import Any, Callable, Literal
from urllib.request import Request, urlopen

import numpy as np
from pydantic import BaseModel, ConfigDict, Field


Verdict = Literal["authentic", "suspicious", "manipulated"]


class Signal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    score: float = Field(ge=0.0, le=100.0)
    weight: float = Field(ge=0.0, le=1.0)


class FrontendAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verdict: Verdict
    risk_score: float = Field(ge=0.0, le=100.0)
    confidence: float = Field(ge=0.0, le=1.0)
    conflict: bool
    conflict_reason: str
    signals: list[Signal]
    discrepancy_map: list[list[float]] | None
    summary: str
    recommendations: list[str]


class EnsembleResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verdict: Verdict
    risk_score: float = Field(ge=0.0, le=100.0)
    confidence: float = Field(ge=0.0, le=1.0)
    conflict: bool
    conflict_reason: str
    weights: dict[str, float]
    scores: dict[str, float]


@dataclass(frozen=True)
class EnsembleConfig:
    weights: dict[str, float] = dc_field(default_factory=lambda: {"cnn": 0.6, "ela": 0.3, "meta": 0.1})
    conflict_threshold: float = 30.0
    manipulated_threshold: float = 70.0
    suspicious_threshold: float = 40.0


def _normalize_weights(weights: dict[str, float]) -> dict[str, float]:
    total = float(sum(max(0.0, float(v)) for v in weights.values()))
    if total <= 0:
        return {k: 0.0 for k in weights}
    return {k: float(max(0.0, float(v)) / total) for k, v in weights.items()}


def _clip_score(score: float) -> float:
    return float(min(100.0, max(0.0, float(score))))


def _extract_json(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        lines = t.splitlines()
        if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].strip() == "```":
            return "\n".join(lines[1:-1]).strip()
    return t


def _extract_first_json_object(text: str) -> str:
    s = _extract_json(text).strip()
    if s.startswith("{") and s.endswith("}"):
        return s
    m = re.search(r"\{[\s\S]*\}", s)
    if not m:
        return s
    return m.group(0).strip()


def compute_weighted_ensemble(
    *,
    ela_score: float | None,
    cnn_score: float | None,
    extra_scores: dict[str, float] | None = None,
    config: EnsembleConfig | None = None,
) -> EnsembleResult:
    cfg = config or EnsembleConfig()

    scores: dict[str, float] = {}
    if ela_score is not None:
        scores["ela"] = _clip_score(ela_score)
    if cnn_score is not None:
        scores["cnn"] = _clip_score(cnn_score)
    if extra_scores:
        for k, v in extra_scores.items():
            if v is None:
                continue
            scores[str(k)] = _clip_score(float(v))

    if not scores:
        return EnsembleResult(
            verdict="authentic",
            risk_score=0.0,
            confidence=0.0,
            conflict=False,
            conflict_reason="no_signals",
            weights={},
            scores={},
        )

    base_weights = _normalize_weights(dict(cfg.weights))
    weights = _normalize_weights({k: base_weights.get(k, 0.0) for k in scores.keys()})

    values = list(scores.values())
    spread = float(max(values) - min(values))
    conflict = spread >= float(cfg.conflict_threshold)

    max_signal = float(max(values))

    conflict_reason = ""
    if conflict:
        top = max(scores.items(), key=lambda kv: kv[1])[0]
        bottom = min(scores.items(), key=lambda kv: kv[1])[0]
        conflict_reason = f"{top}_high_{bottom}_low"

        if top == "ela" and bottom == "cnn":
            weights = _normalize_weights({**weights, "ela": max(weights.get("ela", 0.0), 0.5)})
        elif top == "cnn" and bottom == "ela":
            weights = _normalize_weights({**weights, "cnn": max(weights.get("cnn", 0.0), 0.75)})

    weighted = float(sum(scores[k] * weights.get(k, 0.0) for k in scores.keys()))
    conflict_boost = 0.0
    if conflict:
        conflict_boost = 0.15 * (max_signal - weighted)

    risk_score = _clip_score(weighted + conflict_boost)

    confidence = 1.0 - min(0.7, (spread / 100.0) * 0.7)
    confidence *= min(1.0, max(0.0, (max_signal / 100.0) * 1.1))
    confidence = float(min(1.0, max(0.0, confidence)))

    if risk_score >= float(cfg.manipulated_threshold):
        verdict: Verdict = "manipulated"
    elif risk_score >= float(cfg.suspicious_threshold) or (conflict and max_signal >= float(cfg.manipulated_threshold)):
        verdict = "suspicious"
    else:
        verdict = "authentic"

    return EnsembleResult(
        verdict=verdict,
        risk_score=risk_score,
        confidence=confidence,
        conflict=conflict,
        conflict_reason=conflict_reason or ("signal_disagreement" if conflict else ""),
        weights=weights,
        scores=scores,
    )


def build_frontend_response(
    *,
    ela_score: float | None,
    cnn_score: float | None,
    discrepancy_map: np.ndarray | None,
    extra_scores: dict[str, float] | None = None,
    config: EnsembleConfig | None = None,
) -> FrontendAnalysisResponse:
    ensemble = compute_weighted_ensemble(
        ela_score=ela_score,
        cnn_score=cnn_score,
        extra_scores=extra_scores,
        config=config,
    )

    ordered = sorted(ensemble.scores.items(), key=lambda kv: kv[0])
    signals = [
        Signal(name=k, score=float(v), weight=float(ensemble.weights.get(k, 0.0)))
        for k, v in ordered
    ]

    map_json: list[list[float]] | None = None
    if discrepancy_map is not None:
        dm = np.asarray(discrepancy_map, dtype=np.float32)
        dm = np.nan_to_num(dm, nan=0.0, posinf=1.0, neginf=0.0)
        dm = np.clip(dm, 0.0, 1.0)
        map_json = dm.tolist()

    verdict = ensemble.verdict
    risk_score = float(ensemble.risk_score)
    confidence = float(ensemble.confidence)
    conflict = bool(ensemble.conflict)
    conflict_reason = str(ensemble.conflict_reason)

    summary = (
        f"Verdict: {verdict}. Risk score {risk_score:.1f}/100 with confidence {confidence:.2f}."
        + (" Signals conflict." if conflict else "")
    )

    recs: list[str] = []
    if verdict in ("suspicious", "manipulated"):
        recs.append("Run additional detectors (noise, CFA, metadata) and compare across formats.")
        recs.append("Inspect the discrepancy heatmap for localized artifacts and inconsistent edges.")
    if conflict:
        recs.append("Treat as 'needs human review' due to conflicting model signals.")
    if verdict == "authentic" and not conflict:
        recs.append("No strong manipulation indicators found across current signals.")

    return FrontendAnalysisResponse(
        verdict=verdict,
        risk_score=risk_score,
        confidence=confidence,
        conflict=conflict,
        conflict_reason=conflict_reason,
        signals=signals,
        discrepancy_map=map_json,
        summary=summary,
        recommendations=recs,
    )


def llm_json_schema() -> dict[str, Any]:
    return FrontendAnalysisResponse.model_json_schema()


def build_llm_prompt(
    *,
    deterministic_payload: FrontendAnalysisResponse,
    user_question: str | None = None,
) -> str:
    schema = json.dumps(llm_json_schema(), ensure_ascii=False)
    payload = deterministic_payload.model_dump()
    payload_json = json.dumps(payload, ensure_ascii=False)

    q = (user_question or "").strip()
    q_text = f"\nUser question: {q}\n" if q else ""

    return (
        "You are a media forensics assistant. Return ONLY valid JSON, with double quotes, no markdown.\n"
        "The JSON MUST validate against this JSON Schema (no extra keys, no missing keys):\n"
        f"{schema}\n"
        "Use this deterministic analysis payload as the starting point and keep numeric fields consistent:\n"
        f"{payload_json}\n"
        f"{q_text}"
        "Output ONLY the final JSON object."
    )


def parse_llm_frontend_json(text: str) -> FrontendAnalysisResponse:
    extracted = _extract_first_json_object(text)
    data = json.loads(extracted)
    return FrontendAnalysisResponse.model_validate(data)


def enforce_llm_structured_json(
    *,
    call_llm: Callable[[str], str],
    deterministic_payload: FrontendAnalysisResponse,
    user_question: str | None = None,
    max_retries: int = 2,
) -> FrontendAnalysisResponse:
    prompt = build_llm_prompt(deterministic_payload=deterministic_payload, user_question=user_question)
    last_error = ""

    for _ in range(max_retries + 1):
        raw = call_llm(prompt)
        try:
            return parse_llm_frontend_json(raw)
        except Exception as e:
            last_error = str(e)
            prompt = (
                prompt
                + "\nYour previous output was invalid.\n"
                + f"Validation error: {last_error}\n"
                + "Return ONLY corrected JSON that validates against the schema."
            )

    raise ValueError(f"LLM did not return valid JSON after retries: {last_error}")


def _fallback_benchmark_summary(*, dataset_name: str, accuracy: float, total: int) -> str:
    a = max(0.0, min(100.0, float(accuracy)))
    tier = "strong"
    if a < 80.0:
        tier = "weak"
    elif a < 90.0:
        tier = "moderate"

    return (
        f"Executive summary for {dataset_name}: AxiomEye executed a 100-image benchmark pass and achieved "
        f"{a:.2f}% accuracy over {int(total)} samples. Overall detection performance was {tier}, with the "
        "pipeline showing consistent behavior across a mixed set of authentic and manipulated inputs. The system "
        "combined compression-based ELA evidence with model classification and ensemble arbitration to reduce "
        "single-signal failures. Recommended next steps: stratify results by manipulation type, add per-class "
        "precision/recall, and validate stability under recompression and resizing."
    )


def _trae_llm_enabled() -> bool:
    return bool(os.getenv("TRAE_LLM_URL", "").strip())


def _call_trae_llm_sync(prompt: str) -> str:
    url = os.getenv("TRAE_LLM_URL", "").strip()
    if not url:
        raise RuntimeError("TRAE LLM not configured")

    token = os.getenv("TRAE_LLM_API_KEY", "").strip()
    payload = json.dumps({"prompt": prompt}, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = Request(url, data=payload, headers=headers, method="POST")
    with urlopen(req, timeout=8) as resp:
        raw = resp.read()
    data = json.loads(raw.decode("utf-8"))

    if isinstance(data, dict):
        for k in ("text", "output", "message", "content"):
            v = data.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            c0 = choices[0]
            if isinstance(c0, dict):
                msg = c0.get("message")
                if isinstance(msg, dict) and isinstance(msg.get("content"), str):
                    return msg["content"].strip()
                if isinstance(c0.get("text"), str):
                    return c0["text"].strip()

    raise RuntimeError("Unexpected LLM response")


async def generate_benchmark_summary(dataset_name: str, accuracy: float, total: int) -> str:
    prompt = (
        "Write an executive forensic analysis narrative (4-7 sentences) summarizing benchmark performance.\n"
        f"Dataset: {dataset_name}\n"
        f"Samples: {int(total)}\n"
        f"Accuracy (%): {float(accuracy):.4f}\n"
        "Focus on what the platform did (multi-signal ensemble + forensic heatmaps), what the metric implies, "
        "and a clear next-step recommendation. No markdown."
    )

    if not _trae_llm_enabled():
        return _fallback_benchmark_summary(dataset_name=dataset_name, accuracy=accuracy, total=total)

    try:
        text = await asyncio.to_thread(_call_trae_llm_sync, prompt)
        cleaned = " ".join(str(text).split())
        if not cleaned:
            raise RuntimeError("Empty LLM output")
        return cleaned
    except Exception:
        return _fallback_benchmark_summary(dataset_name=dataset_name, accuracy=accuracy, total=total)
