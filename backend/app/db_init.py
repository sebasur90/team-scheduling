"""
Database initialization script to apply pending migrations.
This should be called once at startup to ensure schema is up-to-date.
"""
import sqlite3
import os
from pathlib import Path

def apply_migrations():
    """Apply all SQL migrations in migrations/ directory."""
    db_path = os.getenv('DATABASE_URL', 'sqlite:///./database.db').replace('sqlite:///', './')

    migrations_dir = Path(__file__).parent.parent / 'migrations'
    if not migrations_dir.exists():
        print(f"Migrations directory not found: {migrations_dir}")
        return

    # Get all migration files sorted by name
    migration_files = sorted(migrations_dir.glob('*.sql'))

    if not migration_files:
        print("No migration files found")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    for migration_file in migration_files:
        try:
            with open(migration_file, 'r') as f:
                sql = f.read()
            c.executescript(sql)
            print(f"✓ Applied: {migration_file.name}")
        except sqlite3.OperationalError as e:
            # Column already exists is OK - migration idempotent
            if 'already exists' in str(e) or 'duplicate column' in str(e):
                print(f"  (Already applied: {migration_file.name})")
            else:
                print(f"✗ Error in {migration_file.name}: {e}")
        except Exception as e:
            print(f"✗ Error in {migration_file.name}: {e}")

    conn.commit()
    conn.close()
    print("Database initialization complete")

if __name__ == '__main__':
    apply_migrations()
