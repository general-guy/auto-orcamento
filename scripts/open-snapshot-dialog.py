"""Open a native file picker for budget JSON snapshots."""

from __future__ import annotations

import os
import sys


def main() -> int:
    initial_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    initial_dir = os.path.normpath(initial_dir)

    if not os.path.isdir(initial_dir):
        print(f"Pasta inicial inexistente: {initial_dir}", file=sys.stderr)
        return 2

    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        print("tkinter indisponível neste Python.", file=sys.stderr)
        return 3

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

    if not selected:
        return 1

    print(os.path.normpath(selected))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
