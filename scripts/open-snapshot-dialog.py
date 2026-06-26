"""Open a native file picker for budget JSON snapshots."""

from __future__ import annotations

import os
import sys


def configure_dpi_awareness() -> None:
    if sys.platform != "win32":
        return

    try:
        import ctypes

        if hasattr(ctypes.windll, "shcore"):
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
            return
    except Exception:
        pass

    try:
        import ctypes

        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass


def pick_with_pywebview(initial_dir: str) -> str | None:
    import webview

    selection: list[str | None] = [None]

    def open_dialog(window):
        try:
            result = window.create_file_dialog(
                webview.OPEN_DIALOG,
                directory=initial_dir,
                allow_multiple=False,
                file_types=("Arquivos JSON (*.json)", "Todos (*.*)"),
            )
            if result:
                selection[0] = os.path.normpath(result[0])
        finally:
            window.destroy()

    window = webview.create_window(
        "Abrir orçamento",
        html="<html><head><meta charset='utf-8'></head><body></body></html>",
        hidden=True,
        width=1,
        height=1,
    )
    webview.start(open_dialog, window, gui="edgechromium")
    return selection[0]


def pick_with_tkinter(initial_dir: str) -> str | None:
    configure_dpi_awareness()

    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    root.update_idletasks()

    try:
        selected = filedialog.askopenfilename(
            initialdir=initial_dir,
            title="Abrir orçamento",
            filetypes=[
                ("Arquivos JSON", "*.json"),
                ("Todos", "*.*"),
            ],
        )
    finally:
        root.destroy()

    return os.path.normpath(selected) if selected else None


def main() -> int:
    initial_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    initial_dir = os.path.normpath(initial_dir)

    if not os.path.isdir(initial_dir):
        print(f"Pasta inicial inexistente: {initial_dir}", file=sys.stderr)
        return 2

    selected: str | None = None

    try:
        selected = pick_with_pywebview(initial_dir)
    except Exception as error:
        print(f"Seletor pywebview indisponível: {error}", file=sys.stderr)
        try:
            selected = pick_with_tkinter(initial_dir)
        except ImportError:
            print("tkinter indisponível neste Python.", file=sys.stderr)
            return 3

    if not selected:
        return 1

    print(selected)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
