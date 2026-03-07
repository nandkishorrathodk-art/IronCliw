@echo off
title IronCliw Gateway - DO NOT CLOSE THIS WINDOW
color 0B
echo.
echo  ___  ____   ___  _   _  ____ _     _____        __ 
echo ^|_ _^|  _ \ / _ \^| \ ^| ^|/ ___^| ^|   ^|_ _\ \      / / 
echo  ^| ^|^| ^|_) ^| ^| ^| ^|  \^| ^| ^|   ^| ^|    ^| ^| \ \ /\ / /  
echo  ^| ^|^|  _ ^<^| ^|_^| ^| ^|\  ^| ^|___^| ^|___ ^| ^|  \ V  V /   
echo ^|___^|_^| \_\\___/^|_^| \_^|\____^|_____^|___^|  \_/\_/    
echo.
echo   IRONCLIW v2026.0.3 - Starting Gateway...
echo   Dashboard: http://127.0.0.1:18789/
echo.
echo   YE WINDOW BAND MAT KARO - Gateway is running!
echo =====================================================

cd /d "C:\Users\nandk\fresh-IronCliw"
node IronCliw.mjs gateway --port 18789

echo.
echo Gateway stopped. Press any key to exit.
pause
