#!/bin/bash

echo "=========================================="
echo "   Despliegue de Arko360 Platform"
echo "=========================================="
echo ""

echo "[1/3] Añadiendo cambios a Git..."
git add .

read -p "Ingresa el mensaje del commit (deja vacio para 'Actualizacion'): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Actualizacion"
fi

git commit -m "$commit_msg"

echo ""
echo "[2/3] Subiendo cambios a GitHub (git push)..."
git push

echo ""
echo "[3/3] Actualizando y reconstruyendo contenedores en DigitalOcean..."
python3 ssh_runner.py "cd /var/www/arko360_platform && docker compose pull && docker compose up -d --build"

echo ""
echo "=========================================="
echo "   Despliegue finalizado exitosamente!"
echo "=========================================="
