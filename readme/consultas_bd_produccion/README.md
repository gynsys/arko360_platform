# Consultas en Base de Datos de Producción (PostgreSQL)

Para evitar el uso manual y lento de `ssh_runner.py` con comandos anidados y evitar que PowerShell corrompa las comillas en los comandos SQL, se ha creado un script wrapper en la raíz del proyecto llamado `run_prod_query.py`.

## Uso Rápido

El script automatiza:
1. La creación de un archivo `.sql` temporal.
2. La carga de este archivo al servidor en la nube vía SCP (`/tmp/query_xxxxx.sql`).
3. La ejecución directa dentro del contenedor `arko360_platform-db-1` usando redirección de entrada nativa (evitando bugs de strings en la consola).
4. La impresión del resultado y la limpieza del archivo temporal.

### Método 1: Pasando un archivo `.sql`
Crea un archivo SQL (ej. `mi_consulta.sql`) con tu query:

```sql
SELECT "CodMat", "Descri" FROM cost360_materials LIMIT 5;
```

Luego ejecuta en la consola de Windows:
```powershell
python run_prod_query.py mi_consulta.sql
```

### Método 2: Pegando el código en consola (Piping/Stdin)
Si ejecutas el script sin argumentos, quedará escuchando tu entrada:
```powershell
python run_prod_query.py
```
Pega tu bloque de SQL completo, presiona `Enter` y luego presiona `Ctrl+Z` (y `Enter`) en Windows para finalizar la entrada (o `Ctrl+D` en Linux/Mac).

---

## Notas de Base de Datos
- Las consultas se dirigen por defecto al usuario `arko_user` en la base de datos `arko360`.
- Recuerda siempre encerrar en comillas dobles los nombres de las columnas en PostgreSQL si fueron creadas con Case Sensitivity (ej. `"CodMat"`, `"Descri"`, `"CosMat"`).
