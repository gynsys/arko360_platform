import os
import pandas as pd
import json
import sys

def process_excels():
    base_dir = r"C:\Users\pablo\Desktop\BD_COST360"
    categorias_dir = os.path.join(base_dir, "CATEGORIAS")
    subcategorias_dir = os.path.join(base_dir, "SUB CATEGORIAS")

    mapping = {}

    # Process Categorias (Ignoring BD MAESTRA)
    for f in os.listdir(categorias_dir):
        if not f.endswith(".xlsx") or f.startswith("~"): continue
        cat_name = f.replace(".xlsx", "")
        if "MAESTRA" in cat_name.upper(): 
            print(f"Skipping {f}...")
            continue
            
        print(f"Procesando {f}...")
        df = pd.read_excel(os.path.join(categorias_dir, f))
        
        ref_col = next((c for c in df.columns if "referencia" in c.lower() or "codigo" in c.lower()), None)
        if 'Referencia' in df.columns:
            ref_col = 'Referencia'
            
        for _, row in df.iterrows():
            code = str(row[ref_col]).strip()
            if code and code != 'nan':
                if code not in mapping:
                    mapping[code] = {"categoria": None, "subcategoria": None}
                mapping[code]["categoria"] = cat_name

    # Process Subcategorias
    for f in os.listdir(subcategorias_dir):
        if not f.endswith(".xlsx") or f.startswith("~"): continue
        sub_name = f.replace(".xlsx", "")
        df = pd.read_excel(os.path.join(subcategorias_dir, f))
        ref_col = next((c for c in df.columns if "referencia" in c.lower() or "codigo" in c.lower()), None)
        if 'Referencia' in df.columns:
            ref_col = 'Referencia'
            
        for _, row in df.iterrows():
            code = str(row[ref_col]).strip()
            if code and code != 'nan':
                if code not in mapping:
                    mapping[code] = {"categoria": None, "subcategoria": None}
                mapping[code]["subcategoria"] = sub_name

    output_path = r"C:\Users\pablo\Documents\arko360_platform\category_mapping_fixed.json"
    with open(output_path, "w", encoding="utf-8") as out_f:
        json.dump(mapping, out_f, ensure_ascii=False, indent=2)
        
    print(f"Mapped {len(mapping)} items without BD MAESTRA.")

if __name__ == "__main__":
    process_excels()
