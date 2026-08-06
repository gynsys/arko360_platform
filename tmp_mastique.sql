SELECT 
    m."CodMat", 
    m."Descri", 
    m."UniMat", 
    m."CosMat",
    CASE 
        WHEN m."CodMat" IN (SELECT DISTINCT "CodIns" FROM cost360_apu_materials) THEN 'Usado'
        ELSE 'NO USADO'
    END as status
FROM cost360_materials m
WHERE m."Descri" ILIKE '%mastique%'
ORDER BY status DESC;
