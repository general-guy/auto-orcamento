"""Launch Auto Orçamento in a native WebView2 window with a proper taskbar icon."""

from __future__ import annotations

import argparse
import os
import shutil
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
ICON_PATH = PROJECT_ROOT / "assets" / "app-icon.ico"
LAUNCHER_PAGE = PROJECT_ROOT / "assets" / "launcher.html"
APP_HOST = "127.0.0.1"
APP_PORT = 3000
APP_URL = f"http://{APP_HOST}:{APP_PORT}"
APP_READY_URL = f"{APP_URL}/api/settings"
APP_USER_MODEL_ID = "auto-orcamento.app"
DEFAULT_WIDTH = 1280
DEFAULT_HEIGHT = 900

_NODE_EXECUTABLE: str | None = None


def configure_windows_app_identity() -> None:
    if sys.platform != "win32":
        return

    try:
        import ctypes

        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_USER_MODEL_ID)
    except (AttributeError, OSError):
        pass


def is_port_in_use(port: int, host: str = APP_HOST) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((host, port)) == 0


def free_tcp_port(port: int) -> None:
    if sys.platform != "win32" or not is_port_in_use(port):
        return

    try:
        output = subprocess.check_output(
            ["netstat", "-ano", "-p", "tcp"],
            text=True,
            errors="replace",
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return

    current_pid = str(os.getpid())

    for line in output.splitlines():
        if f":{port}" not in line or "LISTENING" not in line.upper():
            continue

        parts = line.split()
        if not parts:
            continue

        pid = parts[-1]
        if not pid.isdigit() or pid == current_pid:
            continue

        subprocess.run(
            ["taskkill", "/F", "/PID", pid],
            capture_output=True,
            check=False,
        )


def find_node_executable() -> str:
    global _NODE_EXECUTABLE

    if _NODE_EXECUTABLE:
        return _NODE_EXECUTABLE

    node_path = shutil.which("node")
    if node_path:
        _NODE_EXECUTABLE = node_path
        return _NODE_EXECUTABLE

    for candidate in (
        Path(r"C:\Program Files\nodejs\node.exe"),
        Path(r"C:\Program Files (x86)\nodejs\node.exe"),
    ):
        if candidate.exists():
            _NODE_EXECUTABLE = str(candidate)
            return _NODE_EXECUTABLE

    raise FileNotFoundError("Node.js nao encontrado. Instale Node.js ou use launch-app.js.")


def start_node_server() -> subprocess.Popen[str]:
    node_path = find_node_executable()
    popen_kwargs: dict = {
        "cwd": PROJECT_ROOT,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }
    if sys.platform == "win32":
        popen_kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW

    return subprocess.Popen([node_path, "server.js"], **popen_kwargs)


def stop_node_server(server_process: subprocess.Popen[str] | None) -> None:
    if server_process is None or server_process.poll() is not None:
        return

    server_process.terminate()
    try:
        server_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server_process.kill()
        server_process.wait(timeout=5)


def shutdown_server_via_api() -> bool:
    request = urllib.request.Request(
        f"{APP_URL}/api/shutdown",
        method="POST",
        headers={"Content-Length": "0"},
    )

    try:
        with urllib.request.urlopen(request, timeout=1):
            return True
    except (urllib.error.URLError, TimeoutError):
        return False


def ensure_server_stopped(owns_server: bool, server_process: subprocess.Popen[str] | None) -> None:
    if owns_server:
        stop_node_server(server_process)
        return

    if not shutdown_server_via_api():
        free_tcp_port(APP_PORT)


def is_server_ready() -> bool:
    try:
        with urllib.request.urlopen(APP_READY_URL, timeout=0.2) as response:
            return response.status < 500
    except (urllib.error.URLError, TimeoutError):
        return False


def resolve_startup_url() -> str:
    if is_server_ready():
        return APP_URL

    if LAUNCHER_PAGE.exists():
        return LAUNCHER_PAGE.resolve().as_uri()

    return APP_URL


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--external-server", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    configure_windows_app_identity()

    if not ICON_PATH.exists():
        print(f"Aviso: icone nao encontrado em {ICON_PATH}")
        print("Rode: npm run icon:web")

    server_process: subprocess.Popen[str] | None = None
    owns_server = not args.external_server
    server_stopped = False

    def stop_server() -> None:
        nonlocal server_stopped
        if server_stopped:
            return
        server_stopped = True
        ensure_server_stopped(owns_server, server_process)

    try:
        if owns_server:
            free_tcp_port(APP_PORT)
            server_process = start_node_server()

        try:
            import webview
        except ImportError:
            print("Dependencia ausente: pywebview")
            print("Instale com: python -m pip install -r requirements.txt")
            return 1

        window = webview.create_window(
            "Auto Orçamento",
            resolve_startup_url(),
            width=DEFAULT_WIDTH,
            height=DEFAULT_HEIGHT,
            resizable=True,
        )
        window.events.loaded += lambda: window.maximize()

        icon = str(ICON_PATH.resolve()) if ICON_PATH.exists() else None
        webview.start(icon=icon)
        return 0
    finally:
        stop_server()


if __name__ == "__main__":
    raise SystemExit(main())
