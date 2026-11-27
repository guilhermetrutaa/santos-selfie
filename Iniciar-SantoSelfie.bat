@echo off
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    node servidor-local.js
    echo.
    echo O servidor encerrou. Leia a mensagem acima.
    pause
    goto :eof
)

echo Node.js nao foi encontrado. O QR Code precisa do Node.js.
echo Instale o Node.js para gerar o QR Code. Os arquivos do totem vao abrir mesmo assim.
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    py -m http.server 8000 --bind 127.0.0.1
    goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    python -m http.server 8000 --bind 127.0.0.1
    goto :eof
)

echo Python tambem nao foi encontrado. Instale o Node.js ou o Python e tente novamente.
pause
