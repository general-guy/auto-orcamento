' Relaunch abrir-auto-orcamento.bat with a hidden console (window style 0).
If WScript.Arguments.Count = 0 Then WScript.Quit 1

Set shell = CreateObject("WScript.Shell")
batPath = WScript.Arguments(0)
shell.Run Chr(34) & batPath & Chr(34) & " __hidden__", 0, False
