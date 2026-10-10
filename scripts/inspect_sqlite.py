import sqlite3

conn = sqlite3.connect('aperio.db')
c = conn.cursor()
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
print(f"Total tables: {len(tables)}")
for t in tables:
    count = c.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
    pks = [col[1] for col in c.execute(f'PRAGMA table_info("{t}")').fetchall() if col[5] > 0]
    fks = [(fk[2], fk[3], fk[4]) for fk in c.execute(f'PRAGMA foreign_key_list("{t}")').fetchall()]
    cols = [col[1] for col in c.execute(f'PRAGMA table_info("{t}")').fetchall()]
    print(f"Table: {t:<22} Rows: {count:<5} PK: {pks} FKs: {fks}")
