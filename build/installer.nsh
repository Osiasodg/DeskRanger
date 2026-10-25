; Désinstallation : remet sur le bureau les éléments que DeskRanger avait cachés (ils étaient rangés
; dans des zones) et retire l'entrée « Lancer avec Windows ». Ignoré lors d'une simple mise à jour,
; où la nouvelle version reprend la main.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    IfFileExists "$APPDATA\DeskRanger\restore-desktop.ps1" 0 +2
      nsExec::Exec 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$APPDATA\DeskRanger\restore-desktop.ps1"'
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.DeskRanger"
  ${endIf}
!macroend
