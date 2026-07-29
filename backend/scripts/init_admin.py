#!/usr/bin/env python3
"""
Initialize admin user (sebassur90@gmail.com) in the database.
Run this script after initial setup or during application startup.
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.config import DATABASE_URL
from app.models import Colaborador, Sector
from app.auth.local import hash_password

def init_admin():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        ADMIN_EMAIL = "sebassur90@gmail.com"

        # Get or create "operativo" sector
        sector = session.query(Sector).filter(Sector.nombre == "operativo").first()
        if not sector:
            sector = Sector(nombre="operativo", capacidad_maxima=10)
            session.add(sector)
            session.commit()
            print(f"✓ Created 'operativo' sector")

        # Check if admin already exists
        admin = session.query(Colaborador).filter(Colaborador.email == ADMIN_EMAIL).first()

        if admin:
            print(f"✓ Admin user '{ADMIN_EMAIL}' already exists")
            # Mark as admin if not already
            if not admin.es_admin:
                admin.es_admin = True
                session.commit()
                print(f"✓ Updated {ADMIN_EMAIL} to admin status")
        else:
            # Create new admin user
            admin = Colaborador(
                nombre="Administrador",
                email=ADMIN_EMAIL,
                sector_id=sector.id,
                estado_atencion="activo",
                es_admin=True,
                rol="admin"
            )
            session.add(admin)
            session.commit()
            print(f"✓ Created admin user '{ADMIN_EMAIL}'")

        print("✓ Admin initialization complete")

    except Exception as e:
        print(f"✗ Error initializing admin: {e}")
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    init_admin()
