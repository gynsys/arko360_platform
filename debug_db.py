import sqlite3

def run():
    conn = sqlite3.connect('backend/arko360.db')
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cur.fetchall()
    print("Tables:", tables)

    if ('cost360_labor',) in tables:
        cur.execute("SELECT CodMan, Descri, Jornal, Bono FROM cost360_labor LIMIT 5")
        print("Labor samples:", cur.fetchall())

if __name__ == '__main__':
    run()
