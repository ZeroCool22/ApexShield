!define APEX_ICON_FILE "apexshield-as-e130a53f.ico"

!macro ApplyApexShortcutIcon shortcut
  !insertmacro IsShortcutTarget "${shortcut}" "$INSTDIR\ApexShield.exe"
  Pop $3
  ${If} $3 = 1
    !insertmacro ComHlpr_CreateInProcInstance ${CLSID_ShellLink} ${IID_IShellLink} r0 ""
    ${If} $0 P<> 0
      ${IUnknown::QueryInterface} $0 '("${IID_IPersistFile}",.r1)'
      ${If} $1 P<> 0
        ${IPersistFile::Load} $1 '("${shortcut}", ${STGM_READWRITE})'
        ${IShellLink::SetIconLocation} $0 '("$INSTDIR\${APEX_ICON_FILE}",0)'
        ${IPersistFile::Save} $1 '("${shortcut}",1)'
        ${IUnknown::Release} $1 ""
      ${EndIf}
      ${IUnknown::Release} $0 ""
    ${EndIf}
    System::Call 'shell32::SHChangeNotify(i 0x2000, i 0x1005, w "${shortcut}", p 0)'
  ${EndIf}
!macroend

Function RefreshApexShortcutIcons
  IfFileExists "$INSTDIR\${APEX_ICON_FILE}" 0 done
  Push $0
  Push $1
  Push $2
  Push $3
  !insertmacro ApplyApexShortcutIcon "$DESKTOP\ApexShield.lnk"
  !insertmacro ApplyApexShortcutIcon "$SMPROGRAMS\ApexShield.lnk"
  Pop $3
  Pop $2
  Pop $1
  Pop $0
  done:
FunctionEnd

!macro NSIS_HOOK_POSTINSTALL
  Call RefreshApexShortcutIcons
!macroend

; The finish page can create the desktop shortcut after the post-install hook.
Function .onGUIEnd
  Call RefreshApexShortcutIcons
FunctionEnd
