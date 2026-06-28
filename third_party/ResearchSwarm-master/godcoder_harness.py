"""GodCoder <-> ResearchSwarm self-optimizing harness bridge.

This module is the seam between the GodCoder coding agent (Rust core, desktop
adapter) and the ResearchSwarm "Digital Cognitive Labor" + memory stack. It is
intentionally additive: it imports the existing ResearchSwarm modules unchanged
and exposes a small JSON CLI the agent can drive through its `bash` tool.

The harness gives GodCoder a feedback loop that improves over time:

  1. route    -- classify an incoming task (text / human / hybrid) and pull the
                 most relevant past lessons so the agent starts informed.
  2. log      -- record the outcome of a task (success / failure + summary) as a
                 reusable PATTERN in the shared AI-Memory SQLite store.
  3. recall   -- fetch recent lessons/patterns for context injection.
  4. optimize -- aggregate every logged outcome into ranked, self-improving
                 guidance (success rate per approach/tag) that biases future runs.

Nothing here trains weights or touches train.py; it is the *control* surface
that makes the agent harness compound knowledge across sessions.
"""

from __future__ import annotations

import argparse
from contextlib import closing
import json
from pathlib import Path
import re
import sqlite3
import sys
from typing import Any

from researchswarm_agent import DigitalCognitiveLaborAgent
from researchswarm_memory import DEFAULT_MEMORY_DB_PATH, ResearchSwarmMemoryStore


HARNESS_TAG_PREFIX = "GODCODER"


def _store(db_path: str | None) -> ResearchSwarmMemoryStore:
    return ResearchSwarmMemoryStore(db_path or DEFAULT_MEMORY_DB_PATH)


def route(instruction: str, *, db_path: str | None = None, limit: int = 5) -> dict[str, Any]:
    """Classify a task and attach the most relevant prior lessons."""
    agent = DigitalCognitiveLaborAgent()
    profile = agent.classify_task(instruction).to_dict()
    store = _store(db_path)
    lessons = store.recent_context_lines(limit=limit)
    return {
        "instruction": instruction,
        "domain": profile["domain"],
        "confidence": profile["confidence"],
        "digital_segments": profile["digital_segments"],
        "human_segments": profile["human_segments"],
        "recommended_action": profile["recommended_action"],
        "execution_steps": profile["execution_steps"],
        "memory_context": lessons,
    }


def log_outcome(
    *,
    status: str,
    summary: str,
    tag: str = "task",
    instruction: str = "",
    db_path: str | None = None,
) -> dict[str, Any]:
    """Persist a task outcome as a reusable PATTERN for future runs."""
    status = status.lower().strip()
    if status not in {"success", "failure", "partial"}:
        raise ValueError("status must be one of: success | failure | partial")

    store = _store(db_path)
    entry_id = store.record_entry(
        "PATTERN",
        tag=f"{HARNESS_TAG_PREFIX}:{tag}",
        content=summary,
        metadata={
            "instruction": instruction,
            "status": status,
            "tag": tag,
            "source": "godcoder",
        },
        phase="execute",
        progress_status=status,
    )
    return {"recorded": True, "id": entry_id, "status": status, "tag": tag}


def recall(*, db_path: str | None = None, limit: int = 8) -> dict[str, Any]:
    store = _store(db_path)
    return {"lessons": store.recent_context_lines(limit=limit)}


# Human-action verbs that CAN be actuated digitally (via GUI automation /
# computer-use / OS scripting) rather than handed off to a person. Maps each
# verb to a concrete actuation primitive CoWork can drive.
DIGITAL_ACTUATION: dict[str, str] = {
    "click": "Move the cursor and click the target UI element (computer-use click).",
    "press": "Send the key press / button activation (computer-use keystroke).",
    "open": "Launch or focus the target app/window (computer-use or `start`/`open`).",
    "install": "Run the installer or package manager non-interactively (bash/PowerShell).",
    "email": "Compose and send the message via the mail client or an API (computer-use or SMTP).",
    "fax": "Send via an online/e-fax service (computer-use in the browser).",
    "file": "Save/organize the document into the target location (file tools).",
    "scan": "Capture the on-screen content as an image (screenshot / computer-use).",
    "sign": "Apply an e-signature in the document/web flow (computer-use).",
    "call": "Place the call through a VoIP/softphone client (computer-use).",
    "phone": "Place the call through a VoIP/softphone client (computer-use).",
    "meet": "Join the video meeting in the browser/app (computer-use).",
    "attend": "Join the online session in the browser/app (computer-use).",
    "interview": "Run the session in the video/chat app (computer-use).",
    "negotiate": "Conduct the exchange via the chat/email surface (computer-use).",
    "purchase": "Complete the checkout flow in the browser (computer-use).",
    "operate": "Drive the target application's controls (computer-use).",
    "move": "Drag/relocate the window, file, or element (computer-use or file tools).",
    "pick": "Select the target item in the UI (computer-use).",
    "photograph": "Take a screenshot of the target region (computer-use).",
    "speak": "Emit the speech via text-to-speech (OS TTS).",
    "deliver": "Transmit the digital artifact to its destination (upload/send).",
    "ship": "Submit the digital order/handoff in the web app (computer-use).",
}

# Verbs / signals that genuinely require a physical body and cannot be actuated
# from software. These remain a human handoff even in CoWork actuation mode.
PHYSICAL_ONLY: set[str] = {
    "assemble",
    "bring",
    "carry",
    "clean",
    "drive",
    "lift",
    "repair",
    "travel",
    "walk",
}


def act(instruction: str, *, db_path: str | None = None, limit: int = 5) -> dict[str, Any]:
    """Turn a human-action / hybrid task into an executable GUI/OS actuation plan.

    Unlike `route` (which escalates human-action work to a person), `act` is the
    CoWork surface: it reframes human-action segments as things the agent can
    actuate through Open Cowork's computer-use / GUI automation, and only flags
    the segments that truly require a physical body as a human handoff.
    """
    agent = DigitalCognitiveLaborAgent()
    profile = agent.classify_task(instruction).to_dict()

    # Segments the router flagged as human-action become actuation candidates;
    # for a pure human-action task with no split, treat the whole instruction.
    candidate_segments = profile["human_segments"] or (
        [instruction] if profile["domain"] in {"human-action", "hybrid"} else []
    )

    actuatable: list[str] = []
    physical_blocked: list[str] = []
    plan: list[str] = []
    tokens_seen: set[str] = set()

    for segment in candidate_segments:
        seg_tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9_-]*", segment.lower())
        physical = [t for t in seg_tokens if t in PHYSICAL_ONLY]
        digital_verbs = [t for t in seg_tokens if t in DIGITAL_ACTUATION]
        physically_pinned = bool(re.search(r"\bin person\b|\bphysically\b|\bon[- ]site\b|\bwet signature\b", segment, re.IGNORECASE))
        if (physical and not digital_verbs) or physically_pinned:
            physical_blocked.append(segment)
            continue
        actuatable.append(segment)
        for verb in digital_verbs:
            if verb not in tokens_seen:
                tokens_seen.add(verb)
                plan.append(f"{verb}: {DIGITAL_ACTUATION[verb]}")
    if actuatable and not plan:
        # Actuatable segment with no recognized verb: give a generic computer-use step.
        plan.append("Drive the required UI via Open Cowork computer-use, then capture a screenshot as evidence.")

    if physical_blocked:
        recommended = (
            "Actuate the digital/GUI segments now via Open Cowork computer-use and OS automation; "
            "hand off ONLY the physically-blocked segments to the user."
        )
    elif actuatable:
        recommended = "Actuate every segment via Open Cowork computer-use and OS automation; verify with screenshots."
    else:
        recommended = profile["recommended_action"]

    store = _store(db_path)
    return {
        "instruction": instruction,
        "domain": profile["domain"],
        "mode": "cowork-actuation",
        "surface": "open-cowork computer-use + OS automation (bash/PowerShell)",
        "actuatable_segments": actuatable,
        "physical_blocked_segments": physical_blocked,
        "actuation_plan": plan,
        "verify": "After each action, capture a screenshot or read back state to confirm the effect before continuing.",
        "recommended_action": recommended,
        "memory_context": store.recent_context_lines(limit=limit),
    }



def optimize(*, db_path: str | None = None) -> dict[str, Any]:
    """Aggregate all GodCoder outcomes into ranked, self-improving guidance.

    This is what makes the harness optimize over time: every logged outcome
    shifts the success-rate ranking, so the recommendations the agent reads back
    get sharper the more it is used.
    """
    path = Path(db_path) if db_path else DEFAULT_MEMORY_DB_PATH
    if not path.exists():
        return {"samples": 0, "recommendations": [], "note": "No memory yet."}

    rows: list[sqlite3.Row] = []
    with closing(sqlite3.connect(path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT tag, content, progress_status
            FROM entries
            WHERE tag LIKE ? AND progress_status IS NOT NULL
            """,
            (f"{HARNESS_TAG_PREFIX}:%",),
        ).fetchall()

    stats: dict[str, dict[str, Any]] = {}
    for row in rows:
        tag = row["tag"].split(":", 1)[-1]
        bucket = stats.setdefault(tag, {"success": 0, "failure": 0, "partial": 0, "examples": []})
        status = (row["progress_status"] or "").lower()
        if status in bucket:
            bucket[status] += 1
        if status in {"success", "partial"} and len(bucket["examples"]) < 3:
            bucket["examples"].append(row["content"])

    recommendations = []
    for tag, b in stats.items():
        total = b["success"] + b["failure"] + b["partial"]
        if total == 0:
            continue
        score = round((b["success"] + 0.5 * b["partial"]) / total, 3)
        recommendations.append(
            {
                "approach": tag,
                "samples": total,
                "success_rate": score,
                "wins": b["success"],
                "losses": b["failure"],
                "what_worked": b["examples"],
            }
        )

    recommendations.sort(key=lambda r: (r["success_rate"], r["samples"]), reverse=True)
    return {
        "samples": sum(r["samples"] for r in recommendations),
        "recommendations": recommendations,
        "guidance": [
            f"Prefer '{r['approach']}' (success {int(r['success_rate'] * 100)}% over {r['samples']} runs)"
            for r in recommendations[:5]
            if r["success_rate"] >= 0.5
        ],
    }


def _emit(payload: dict[str, Any]) -> None:
    json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="GodCoder self-optimizing harness bridge.")
    parser.add_argument("--db-path", default=None, help="Override AI-Memory SQLite path.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_route = sub.add_parser("route", help="Classify a task + attach prior lessons.")
    p_route.add_argument("instruction")
    p_route.add_argument("--limit", type=int, default=5)

    p_act = sub.add_parser("act", help="Turn a human-action/hybrid task into a GUI/OS actuation plan (CoWork).")
    p_act.add_argument("instruction")
    p_act.add_argument("--limit", type=int, default=5)

    p_log = sub.add_parser("log", help="Record a task outcome as a reusable pattern.")
    p_log.add_argument("--status", required=True, choices=["success", "failure", "partial"])
    p_log.add_argument("--summary", required=True)
    p_log.add_argument("--tag", default="task")
    p_log.add_argument("--instruction", default="")

    p_recall = sub.add_parser("recall", help="Fetch recent lessons for context.")
    p_recall.add_argument("--limit", type=int, default=8)

    sub.add_parser("optimize", help="Rank approaches by success rate (improves over time).")

    args = parser.parse_args(argv)

    if args.command == "route":
        _emit(route(args.instruction, db_path=args.db_path, limit=args.limit))
    elif args.command == "act":
        _emit(act(args.instruction, db_path=args.db_path, limit=args.limit))
    elif args.command == "log":
        _emit(
            log_outcome(
                status=args.status,
                summary=args.summary,
                tag=args.tag,
                instruction=args.instruction,
                db_path=args.db_path,
            )
        )
    elif args.command == "recall":
        _emit(recall(db_path=args.db_path, limit=args.limit))
    elif args.command == "optimize":
        _emit(optimize(db_path=args.db_path))
    else:  # pragma: no cover - argparse enforces choices
        parser.error(f"unknown command: {args.command}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
