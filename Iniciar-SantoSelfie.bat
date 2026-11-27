@echo off
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    py -m http.server 8000 --bind 127.0.0.1
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        start "" http://localhost:8000
        python -m http.server 8000 --bind 127.0.0.1
    ) else (
        echo Python nao foi encontrado. Instale o Python e tente novamente.
        pause
    )
)
