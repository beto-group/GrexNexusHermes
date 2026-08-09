"""Grex Nexus Sovereign Mothership Plugin — Hermes Agent Integration.

Provides:
  1. Dashboard UI tab: Grex Nexus Sovereign Mothership (Tiling WM + Component Store)
  2. Tools: `grex_status`, `grex_exec`, `grex_host_exec`
  3. Slash command: `/grex`
"""

from __future__ import annotations

import os
import logging
import urllib.request
import json
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger("hermes.plugins.grex_nexus")

def _get_auth_token() -> str:
    """Load sidecar token from home or workspace app_data."""
    token_paths = [
        Path.home() / ".hermes" / "sidecar.token",
        Path.home() / ".hermes" / "app_data" / "sidecar.token",
        Path("/home/hermes/.hermes/sidecar.token"),
        Path("/home/hermes/.hermes/app_data/sidecar.token"),
    ]
    for p in token_paths:
        if p.exists():
            try:
                t = p.read_text(encoding="utf-8").strip()
                if t:
                    return t
            except Exception:
                pass
    return os.environ.get("HERMES_SIDECAR_TOKEN", "d1190638238ca1d6ff5756f04563f672f4c81e9af456bd7a085f84bc6b0703a9")

GREX_STATUS_SCHEMA: Dict[str, Any] = {
    "name": "grex_status",
    "description": "Get runtime telemetry and status for Grex Nexus Sovereign Mothership, Podman containers, and sidecar daemon.",
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}

GREX_EXEC_SCHEMA: Dict[str, Any] = {
    "name": "grex_exec",
    "description": "Execute a bash command inside the container via Grex Nexus sidecar daemon.",
    "parameters": {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The bash command string to execute.",
            },
        },
        "required": ["command"],
    },
}

GREX_HOST_EXEC_SCHEMA: Dict[str, Any] = {
    "name": "grex_host_exec",
    "description": "Execute a host OS command (manage Podman pods, build container images, spawn evolved agent instances) via sidecar daemon IPC.",
    "parameters": {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The host OS command string to execute (e.g. 'podman ps', 'podman play kube ...').",
            },
        },
        "required": ["command"],
    },
}

def _make_request(url: str, payload: dict | None = None, timeout: int = 10) -> dict:
    headers = {"Content-Type": "application/json"}
    token = _get_auth_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    data_bytes = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data_bytes, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

def _handle_grex_status(*args, **kwargs) -> str:
    urls = [
        "http://host.containers.internal:7777/api/status",
        "http://localhost:7777/api/status"
    ]
    for url in urls:
        try:
            data = _make_request(url, timeout=3)
            return f"🟢 Grex Nexus Sidecar Daemon Online:\n{json.dumps(data, indent=2)}"
        except Exception:
            continue
    return "🔴 Grex Nexus Sidecar Daemon offline or unreachable."

def _handle_grex_exec(*args, **kwargs) -> str:
    cmd_str = ""
    if args and isinstance(args[0], dict):
        cmd_str = args[0].get("command", "")
    if not cmd_str:
        cmd_str = kwargs.get("command", "")
    if not cmd_str:
        return "Error: command string required."
        
    urls = [
        "http://host.containers.internal:7777/api/exec",
        "http://localhost:7777/api/exec"
    ]
    for url in urls:
        try:
            res = _make_request(url, payload={"command": cmd_str}, timeout=30)
            return f"Exit Code: {res.get('exit_code', 0)}\nStdout:\n{res.get('stdout', '')}\nStderr:\n{res.get('stderr', '')}"
        except Exception as ex:
            last_ex = ex
            continue
    return f"Execution failed: {last_ex}"

def _handle_grex_host_exec(*args, **kwargs) -> str:
    cmd_str = ""
    if args and isinstance(args[0], dict):
        cmd_str = args[0].get("command", "")
    if not cmd_str:
        cmd_str = kwargs.get("command", "")
    if not cmd_str:
        return "Error: command string required."
        
    urls = [
        "http://host.containers.internal:7777/api/host/exec",
        "http://localhost:7777/api/host/exec"
    ]
    for url in urls:
        try:
            res = _make_request(url, payload={"command": cmd_str}, timeout=300)
            return f"Exit Code: {res.get('exit_code', 0)}\nStdout:\n{res.get('stdout', '')}\nStderr:\n{res.get('stderr', '')}"
        except Exception as ex:
            last_ex = ex
            continue
    return f"Host execution failed: {last_ex}"

def _cmd_grex(raw_args: str) -> str:
    return "🛰️ Grex Nexus Sovereign Mothership Host Engine — Dashboard tab active at /grex-nexus."

def _ensure_cli_bin():
    try:
        plugin_dir = Path(__file__).parent
        grex_bin = plugin_dir / "bin" / "grex"
        if grex_bin.exists():
            target_dir = Path.home() / ".local" / "bin"
            target_dir.mkdir(parents=True, exist_ok=True)
            target_bin = target_dir / "grex"
            if target_bin.exists() or target_bin.is_symlink():
                try:
                    target_bin.unlink()
                except Exception:
                    pass
            os.symlink(str(grex_bin), str(target_bin))
            os.chmod(str(grex_bin), 0o755)
    except Exception as e:
        logger.warning("Could not create grex CLI symlink: %s", e)

def register(ctx) -> None:
    """Register Grex Nexus tools, commands, and hooks."""
    _ensure_cli_bin()

    if hasattr(ctx, "register_tool"):
        try:
            ctx.register_tool(
                name="grex_status",
                toolset="grex-nexus",
                schema=GREX_STATUS_SCHEMA,
                handler=_handle_grex_status,
            )
            ctx.register_tool(
                name="grex_exec",
                toolset="grex-nexus",
                schema=GREX_EXEC_SCHEMA,
                handler=_handle_grex_exec,
            )
            ctx.register_tool(
                name="grex_host_exec",
                toolset="grex-nexus",
                schema=GREX_HOST_EXEC_SCHEMA,
                handler=_handle_grex_host_exec,
            )
            logger.info("Registered Grex Nexus tools: grex_status, grex_exec, grex_host_exec")
        except Exception as e:
            try:
                ctx.register_tool(GREX_STATUS_SCHEMA, _handle_grex_status)
                ctx.register_tool(GREX_EXEC_SCHEMA, _handle_grex_exec)
                ctx.register_tool(GREX_HOST_EXEC_SCHEMA, _handle_grex_host_exec)
            except Exception as ex:
                logger.error("Could not register tools: %s (fallback %s)", e, ex)

    if hasattr(ctx, "register_command"):
        ctx.register_command("grex", _cmd_grex, description="Grex Nexus Sovereign Mothership status")
