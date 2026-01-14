Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
objShell.CurrentDirectory = scriptDir
cmd = "cmd /c set MATERNIDADE_START_HIDDEN=1 && """ & scriptDir & "\node_modules\electron\dist\electron.exe"" """ & scriptDir & """"
objShell.Run cmd, 0, False
