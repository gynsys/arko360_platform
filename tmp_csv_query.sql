COPY (
    SELECT "CodMat" AS "Codigo", "Descri" AS "Descripcion", "UniMat" AS "Unidad", "CosMat" AS "Precio" 
    FROM cost360_materials 
    WHERE "CodMat" NOT IN (SELECT DISTINCT "CodIns" FROM cost360_apu_materials)
) TO STDOUT WITH CSV HEADER;
