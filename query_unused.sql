SELECT "CodMat", "Descri", "UniMat", "CosMat" 
FROM cost360_materials 
WHERE "CodMat" NOT IN (SELECT DISTINCT "CodIns" FROM cost360_apu_materials) 
LIMIT 5;
