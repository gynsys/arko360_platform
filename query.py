import sqlite3

def test_local_db():
    try:
        db = sqlite3.connect('cost360/cost360dolar.db')
        row = db.execute("SELECT codigo, precio_unitario FROM cost360_material WHERE codigo='CEM041'").fetchone()
        print("CEM041 in cost360dolar.db:", row)
        
        row_agr1 = db.execute("SELECT codigo, precio_unitario FROM cost360_material WHERE codigo='AGR001'").fetchone()
        print("AGR001 in cost360dolar.db:", row_agr1)
        
        row_agr2 = db.execute("SELECT codigo, precio_unitario FROM cost360_material WHERE codigo='AGR002'").fetchone()
        print("AGR002 in cost360dolar.db:", row_agr2)
    except Exception as e:
        print("Error reading cost360dolar.db:", e)

    try:
        db2 = sqlite3.connect('cost360/cost360bolivar.db')
        row2 = db2.execute("SELECT codigo, precio_unitario FROM cost360_material WHERE codigo='CEM041'").fetchone()
        print("CEM041 in cost360bolivar.db:", row2)
    except Exception as e:
        print("Error reading cost360bolivar.db:", e)

if __name__ == '__main__':
    test_local_db()
