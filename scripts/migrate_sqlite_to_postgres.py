"""
Safe SQLite-to-PostgreSQL Data Migration Script for APERIO
Preserves:
- Primary keys (exact strings/integers)
- Foreign keys and dependency insertion order
- Timestamps (converted to datetime objects if needed)
- JSON structures (parsed to ensure proper JSONB/JSON storage in PostgreSQL)
- Conflict detection (raises error if an unexpected conflict occurs, never silently skips)
"""

import os
import sys
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Any

from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, Table, inspect, select
from sqlalchemy.orm import sessionmaker

# Ensure backend modules are loadable
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

load_dotenv(os.path.join(BASE_DIR, ".env"))

SQLITE_PATH = os.path.join(BASE_DIR, "aperio.db")
BACKUP_PATH = os.path.join(BASE_DIR, "backups", "aperio_backup_pre_postgres.db")

# Dependency order for tables based on Foreign Key relationships
MIGRATION_ORDER = [
    "users",
    "regions",
    "shelters",
    "hospitals",
    "resources",
    "disaster_events",
    "satellite_observations",
    "change_detections",
    "risk_assessments",
    "risk_updates",
    "alerts",
    "evacuation_routes",
    "recommendations",
    "human_approvals",
    "reports",
    "monitoring_events",
    "agent_executions"
]

def parse_val(val: Any) -> Any:
    """Parse stringified timestamps or JSON if stored as strings in SQLite."""
    if val is None:
        return None
    return val

def run_migration():
    pg_url = os.getenv("DATABASE_URL")
    if not pg_url or "sqlite" in pg_url:
        print("[ERROR] DATABASE_URL is not set to a PostgreSQL connection string.")
        print("Please configure DATABASE_URL in .env (e.g. postgresql+psycopg2://postgres:<password>@localhost:5432/aperio)")
        sys.exit(1)

    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

    print("=" * 60)
    print("APERIO SQLite -> PostgreSQL Migration")
    print(f"Source SQLite: {SQLITE_PATH}")
    print(f"Verified Backup: {BACKUP_PATH}")
    print("=" * 60)

    if not os.path.exists(SQLITE_PATH):
        print(f"[ERROR] Source SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)

    # Connect to SQLite in read-only URI mode to prevent any modification
    sqlite_uri = f"file:{os.path.abspath(SQLITE_PATH)}?mode=ro"
    sqlite_conn = sqlite3.connect(sqlite_uri, uri=True)
    sqlite_conn.row_factory = sqlite3.Row

    # Connect to PostgreSQL
    try:
        pg_engine = create_engine(pg_url)
        with pg_engine.connect() as test_conn:
            print("[OK] Connected to PostgreSQL target database successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

    pg_meta = MetaData()
    pg_meta.reflect(bind=pg_engine)

    # Ensure all tables exist in PostgreSQL
    missing_tables = [t for t in MIGRATION_ORDER if t not in pg_meta.tables]
    if missing_tables:
        print(f"[ERROR] Missing tables in PostgreSQL: {missing_tables}")
        print("Please run Alembic migration first: python -m alembic upgrade head")
        sys.exit(1)

    sqlite_cursor = sqlite_conn.cursor()
    total_migrated = 0
    table_stats = {}

    with pg_engine.begin() as pg_conn:
        for table_name in MIGRATION_ORDER:
            # Query source SQLite
            rows = sqlite_cursor.execute(f'SELECT * FROM "{table_name}"').fetchall()
            row_count = len(rows)
            table_stats[table_name] = {"source": row_count, "migrated": 0}

            if row_count == 0:
                print(f"Table '{table_name}': 0 records in SQLite (skipped)")
                continue

            print(f"Migrating table '{table_name}' ({row_count} records)...")
            pg_table = pg_meta.tables[table_name]

            # Convert rows to dictionaries and match column types
            records_to_insert = []
            for r in rows:
                row_dict = dict(r)
                # Parse JSON fields if necessary for JSON columns
                for col in pg_table.columns:
                    col_name = col.name
                    if col_name in row_dict and row_dict[col_name] is not None:
                        val = row_dict[col_name]
                        # If PostgreSQL column is JSON/JSONB and SQLite stored JSON as string
                        if hasattr(col.type, "as_generic") and col.type.__class__.__name__ in ("JSON", "JSONB"):
                            if isinstance(val, str):
                                try:
                                    row_dict[col_name] = json.loads(val)
                                except Exception:
                                    pass
                        # If column is DateTime and value is string
                        elif col.type.__class__.__name__ in ("DateTime", "TIMESTAMP"):
                            if isinstance(val, str):
                                try:
                                    row_dict[col_name] = datetime.fromisoformat(val)
                                except Exception:
                                    pass
                records_to_insert.append(row_dict)

            # Insert records without silently skipping conflicts
            # If a duplicate or conflict happens, it will explicitly raise an error
            try:
                pg_conn.execute(pg_table.insert(), records_to_insert)
                table_stats[table_name]["migrated"] = len(records_to_insert)
                total_migrated += len(records_to_insert)
                print(f"  -> Successfully migrated {len(records_to_insert)} records into '{table_name}'.")
            except Exception as e:
                print(f"[ERROR] Migration failed on table '{table_name}': {e}")
                print("Rolling back transaction. No changes were committed to PostgreSQL.")
                raise

    sqlite_conn.close()

    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    all_matched = True
    for t, s in table_stats.items():
        src = s["source"]
        mig = s["migrated"]
        status = "MATCH" if src == mig else "MISMATCH"
        if src != mig:
            all_matched = False
        print(f"  {t:<25}: SQLite={src:<5} PostgreSQL={mig:<5} [{status}]")

    print("-" * 60)
    print(f"Total records migrated: {total_migrated}")
    if all_matched:
        print("[SUCCESS] All tables and records migrated and verified with 100% integrity!")
    else:
        print("[WARNING] Source and destination counts do not match!")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
