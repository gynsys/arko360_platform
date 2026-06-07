@echo off
echo ==========================================
echo    Despliegue de Arko360 Platform
echo ==========================================

echo.
echo [1/3] Añadiendo cambios a Git...
git add .
set /p commit_msg="Ingresa el mensaje del commit (deja vacio para 'Actualizacion'): "
if "%commit_msg%"=="" set commit_msg=Actualizacion

git commit -m "%commit_msg%"

echo.
echo [2/3] Subiendo cambios a GitHub (git push)...
git push

echo.
echo [3/3] Actualizando y reconstruyendo contenedores en DigitalOcean...
python ssh_runner.py "cd /var/www/arko360_platform && git pull origin main && docker compose pull && docker compose up -d --build"

echo.
echo ==========================================
echo    Despliegue finalizado exitosamente!
echo ==========================================
pause
