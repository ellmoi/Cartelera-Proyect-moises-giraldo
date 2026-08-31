Option Explicit
Dim shell, fso, projectDir, command, exitCode, attempts, apiReady, webReady
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
command = "cmd.exe /c cd /d """ & projectDir & """ && node scripts\start-background.js"
exitCode = shell.Run(command, 0, True)
If exitCode <> 0 Then
  MsgBox "No se pudo iniciar THE MOI CINEMAS. Ejecuta npm install una vez y vuelve a intentarlo.", vbCritical, "THE MOI CINEMAS"
  WScript.Quit exitCode
End If
WScript.Sleep 1800
shell.Run "http://localhost:5500", 1, False
MsgBox "THE MOI CINEMAS esta activo." & vbCrLf & "Frontend: http://localhost:5500" & vbCrLf & "Base de datos: http://localhost:3000", vbInformation, "THE MOI CINEMAS"