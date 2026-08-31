Option Explicit
Dim shell, fso, projectDir, command, exitCode
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
command = "cmd.exe /c cd /d """ & projectDir & """ && node scripts\stop-background.js"
exitCode = shell.Run(command, 0, True)
If exitCode = 0 Then
  MsgBox "JSON Server fue detenido.", vbInformation, "THE MOI CINEMAS"
Else
  MsgBox "No se pudo detener JSON Server.", vbCritical, "THE MOI CINEMAS"
End If