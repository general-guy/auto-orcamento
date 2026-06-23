"""Launch Auto Orçamento in a native WebView2 window with a proper taskbar icon."""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

try:
    import webview
except ImportError:
    print("Dependencia ausente: pywebview")
    print("Instale com: python -m pip install -r requirements.txt")
    raise SystemExit(1) from None

PROJECT_ROOT = Path(__file__).resolve().parent
ICON_PATH = PROJECT_ROOT / "assets" / "app-icon.ico"
APP_URL = "http://localhost:3000"
APP_USER_MODEL_ID = "auto-orcamento.app"
DEFAULT_WIDTH = 1280
DEFAULT_HEIGHT = 900


def configure_windows_app_identity() -> None:
    if sys.platform != "win32":
        return

    try:
        import ctypes

        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_USER_MODEL_ID)
    except (AttributeError, OSError):
        pass


def wait_for_url(url: str, timeout: float = 30.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status < 500:
                    return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.15)
    raise TimeoutError(f"Servidor local nao respondeu a tempo em {url}")


def find_node_executable() -> str:
    node_path = shutil.which("node")
    if node_path:
        return node_path

    for candidate in (
        Path(r"C:\Program Files\nodejs\node.exe"),
        Path(r"C:\Program Files (x86)\nodejs\node.exe"),
    ):
        if candidate.exists():
            return str(candidate)

    raise FileNotFoundError("Node.js nao encontrado. Instale Node.js ou use launch-app.js.")


def start_node_server() -> subprocess.Popen[str]:
    node_path = find_node_executable()
    return subprocess.Popen(
        [node_path, "server.js"],
        cwd=PROJECT_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def stop_node_server(server_process: subprocess.Popen[str] | None) -> None:
    if server_process is None or server_process.poll() is not None:
        return

    server_process.terminate()
    try:
        server_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server_process.kill()
        server_process.wait(timeout=5)


def main() -> int:
    configure_windows_app_identity()

    if not ICON_PATH.exists():
        print(f"Aviso: icone nao encontrado em {ICON_PATH}")
        print("Rode: npm run icon:web")

    server_process: subprocess.Popen[str] | None = None

    try:
        server_process = start_node_server()
        wait_for_url(APP_URL)

        window = webview.create_window(
            "Auto Orçamento",
            APP_URL,
            width=DEFAULT_WIDTH,
            height=DEFAULT_HEIGHT,
            resizable=True,
        )
        window.events.loaded += lambda: window.maximize()

        icon = str(ICON_PATH.resolve()) if ICON_PATH.exists() else None
        webview.start(icon=icon)
        return 0
    finally:
        stop_node_server(server_process)


if __name__ == "__main__":
    raise SystemExit(main())
