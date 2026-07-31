import sqlite3

def run():
    try:
        # Connect to the correct db in the project root
        conn = sqlite3.connect('arko360.db')
        cur = conn.cursor()
        
        # Check Equipment
        cur.execute("SELECT CodEqu, Descri, CosDia FROM cost360_equipment WHERE CodEqu = 'COP074'")
        print("Equipment COP074:", cur.fetchone())
        
        # Check Labor
        cur.execute("SELECT CodMan, Descri, Jornal, Bono FROM cost360_labor WHERE CodMan IN ('1-1.1', '24-226')")
        print("Labor samples:", cur.fetchall())
        
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    run()
