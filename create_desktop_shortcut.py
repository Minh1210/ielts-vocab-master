import subprocess

ps_command = r'''
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\ADMIN\Desktop\IELTS Vocab Master.lnk")
$Shortcut.TargetPath = "E:\HCTING~1\IELTS_Vocab_Master.exe"
$Shortcut.WorkingDirectory = "E:\HCTING~1"
$Shortcut.IconLocation = "E:\HCTING~1\ielts_vocab_app\app_icon.ico,0"
$Shortcut.Description = "IELTS Vocab Master - Luyen Tu Vung IELTS Chuyen Sau"
$Shortcut.Save()
Write-Output "SHORTCUT_SAVED_SUCCESS"
'''

proc = subprocess.run(["powershell", "-NoProfile", "-Command", ps_command], capture_output=True, text=True)
print(proc.stdout)
