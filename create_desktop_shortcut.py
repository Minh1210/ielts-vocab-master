import os

vbs_content = r'''Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "C:\Users\ADMIN\Desktop\IELTS Vocab Master.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "e:\học tiếng anh\IELTS_Vocab_Master.exe"
oLink.WorkingDirectory = "e:\học tiếng anh"
oLink.IconLocation = "e:\học tiếng anh\ielts_vocab_app\app_icon.ico,0"
oLink.Description = "IELTS Vocab Master - Luyen Tu Vung IELTS Chuyen Sau"
oLink.Save
'''

vbs_path = os.path.join(os.environ.get('TEMP', '.'), 'create_shortcut.vbs')
with open(vbs_path, 'w', encoding='utf-16') as f:
    f.write(vbs_content)

os.system(f'cscript //nologo "{vbs_path}"')
target_exists = os.path.exists(r"C:\Users\ADMIN\Desktop\IELTS Vocab Master.lnk")
print(f"Shortcut created successfully: {target_exists}")
