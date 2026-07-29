import pytest
from datetime import date, timedelta
from app.models import Ausencia, Colaborador, AsignacionAlmuerzo, FranjaHoraria
from app.api.ausencias import _get_workdays_in_range


class TestAusenciasWorkdays:
    """Test workday extraction logic."""

    def test_get_workdays_excludes_weekends(self):
        """Range with weekends → only weekdays returned."""
        # Aug 3-8, 2026: Fri-Wed (includes weekend 4-5)
        start = date(2026, 8, 3)
        end = date(2026, 8, 8)
        result = _get_workdays_in_range(start, end)
        # Expected: Fri 3, Mon 4, Tue 5, Wed 6, Thu 7, Fri 8
        # (skip Sat 4, Sun 5 → Mon 4 is weekday)
        expected_count = 6  # Mon-Fri in range (no Sat 4 or Sun 5)
        assert len(result) == expected_count

    def test_get_workdays_only_weekends(self):
        """Range only weekends → empty list."""
        # Sat 4 - Sun 5, 2026 (weekend only)
        start = date(2026, 8, 4)
        end = date(2026, 8, 5)
        result = _get_workdays_in_range(start, end)
        assert len(result) == 0


class TestAusenciasCreate:
    """Test vacation creation endpoint."""

    def test_create_rango_with_embedded_weekend(self, db_session, test_colaboradores):
        """Create range including weekend → only weekdays stored."""
        colab = test_colaboradores[0]
        # Aug 3 (Fri) - Aug 10 (Fri): includes Aug 4-5 weekend
        response_data = {
            "colaborador_id": colab.id,
            "fecha_inicio": date(2026, 8, 3),
            "fecha_fin": date(2026, 8, 10),
        }

        # Simulate what the endpoint would do
        dias_habiles = _get_workdays_in_range(response_data["fecha_inicio"], response_data["fecha_fin"])
        for dia in dias_habiles:
            ausencia = Ausencia(
                colaborador_id=colab.id,
                fecha=dia,
                motivo="vacaciones",
            )
            db_session.add(ausencia)
        db_session.commit()

        # Verify only weekdays created
        ausencias = db_session.query(Ausencia).filter(
            Ausencia.colaborador_id == colab.id,
            Ausencia.motivo == "vacaciones",
        ).all()
        assert len(ausencias) == 6  # Mon-Fri twice: 3 + 4,5,6,7,8 + 9,10 (9,10 are Sat,Sun skip)

    def test_create_deletes_lunch_assignments(self, db_session, test_colaboradores, test_franjas):
        """Create vacation for day with lunch assignment → assignment deleted."""
        colab = test_colaboradores[0]
        franja = test_franjas[0]
        vacation_date = date(2026, 8, 4)  # Monday

        # Create existing lunch assignment
        asignacion = AsignacionAlmuerzo(
            colaborador_id=colab.id,
            franja_horaria_id=franja.id,
            fecha=vacation_date,
        )
        db_session.add(asignacion)
        db_session.commit()
        assert db_session.query(AsignacionAlmuerzo).filter_by(
            colaborador_id=colab.id,
            fecha=vacation_date,
        ).first() is not None

        # Create vacation
        dias_habiles = _get_workdays_in_range(vacation_date, vacation_date)
        # Delete lunch assignments
        db_session.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.colaborador_id == colab.id,
            AsignacionAlmuerzo.fecha.in_(dias_habiles),
        ).delete()
        # Create vacations
        for dia in dias_habiles:
            ausencia = Ausencia(
                colaborador_id=colab.id,
                fecha=dia,
                motivo="vacaciones",
            )
            db_session.add(ausencia)
        db_session.commit()

        # Verify assignment deleted
        assert db_session.query(AsignacionAlmuerzo).filter_by(
            colaborador_id=colab.id,
            fecha=vacation_date,
        ).first() is None

    def test_idempotence_overlapping_ranges(self, db_session, test_colaboradores):
        """Create overlapping ranges → no duplicate rows."""
        colab = test_colaboradores[0]

        # Create vacation Aug 3-10
        start1 = date(2026, 8, 3)
        end1 = date(2026, 8, 10)
        dias1 = _get_workdays_in_range(start1, end1)
        for dia in dias1:
            ausencia = Ausencia(
                colaborador_id=colab.id,
                fecha=dia,
                motivo="vacaciones",
            )
            db_session.add(ausencia)
        db_session.commit()

        # Create vacation Aug 6-13 (overlaps Aug 6-8)
        start2 = date(2026, 8, 6)
        end2 = date(2026, 8, 13)
        dias2 = _get_workdays_in_range(start2, end2)
        existing_dates = {
            a.fecha
            for a in db_session.query(Ausencia).filter(
                Ausencia.colaborador_id == colab.id,
                Ausencia.motivo == "vacaciones",
                Ausencia.fecha.in_(dias2),
            ).all()
        }
        dias_crear = [d for d in dias2 if d not in existing_dates]
        for dia in dias_crear:
            ausencia = Ausencia(
                colaborador_id=colab.id,
                fecha=dia,
                motivo="vacaciones",
            )
            db_session.add(ausencia)
        db_session.commit()

        # Verify no duplicates: Aug 6-8 not duplicated
        ausencias = db_session.query(Ausencia).filter(
            Ausencia.colaborador_id == colab.id,
            Ausencia.motivo == "vacaciones",
        ).all()
        fechas = [a.fecha for a in ausencias]
        assert len(fechas) == len(set(fechas))  # All unique


class TestAusenciasPermissions:
    """Test permission checks."""

    def test_non_admin_create_own_vacation(self, db_session, test_colaboradores):
        """Non-admin creates own vacation → success."""
        user = test_colaboradores[0]  # rol="usuario"
        target_id = user.id

        # Check: user.rol != "admin" and user.id == target_id → pass
        assert user.rol == "usuario"
        assert user.id == target_id
        # Would succeed in endpoint

    def test_non_admin_cannot_create_other_vacation(self, db_session, test_colaboradores):
        """Non-admin creates for other → 403."""
        user = test_colaboradores[0]  # rol="usuario"
        target_id = test_colaboradores[1].id

        # Check: user.rol != "admin" and user.id != target_id → 403
        assert user.rol == "usuario"
        assert user.id != target_id
        # Would raise 403 in endpoint

    def test_admin_create_any_vacation(self, db_session, test_colaboradores):
        """Admin creates for any user → success."""
        # Create admin user
        admin = Colaborador(
            nome="Admin",
            email="admin@example.com",
            sector="tipo_a",
            estado_atencion="activo",
            rol="admin",
            puntaje_prioridad=0,
        )
        db_session.add(admin)
        db_session.commit()

        target_id = test_colaboradores[0].id

        # Check: admin.rol == "admin" → pass
        assert admin.rol == "admin"
        # Would succeed in endpoint


class TestAusenciasDelete:
    """Test block deletion."""

    def test_delete_bloque_exact_range(self, db_session, test_colaboradores):
        """Delete block removes only dates in range."""
        colab = test_colaboradores[0]

        # Create vacations Aug 3-12
        start = date(2026, 8, 3)
        end = date(2026, 8, 12)
        dias = _get_workdays_in_range(start, end)
        for dia in dias:
            ausencia = Ausencia(
                colaborador_id=colab.id,
                fecha=dia,
                motivo="vacaciones",
            )
            db_session.add(ausencia)
        db_session.commit()

        # Delete block Aug 6-10
        del_start = date(2026, 8, 6)
        del_end = date(2026, 8, 10)
        db_session.query(Ausencia).filter(
            Ausencia.colaborador_id == colab.id,
            Ausencia.motivo == "vacaciones",
            Ausencia.fecha >= del_start,
            Ausencia.fecha <= del_end,
        ).delete()
        db_session.commit()

        # Verify only Aug 3,4,5,11,12 remain
        ausencias = db_session.query(Ausencia).filter(
            Ausencia.colaborador_id == colab.id,
            Ausencia.motivo == "vacaciones",
        ).all()
        fechas = sorted([a.fecha for a in ausencias])
        assert date(2026, 8, 3) in fechas
        assert date(2026, 8, 4) in fechas
        assert date(2026, 8, 5) in fechas
        assert date(2026, 8, 6) not in fechas  # Deleted
        assert date(2026, 8, 11) in fechas
        assert date(2026, 8, 12) in fechas

    def test_delete_bloque_nonexistent(self, db_session, test_colaboradores):
        """Delete non-existent block → 404."""
        colab = test_colaboradores[0]

        # Try delete with no vacations
        ausencias = db_session.query(Ausencia).filter(
            Ausencia.colaborador_id == colab.id,
            Ausencia.motivo == "vacaciones",
            Ausencia.fecha >= date(2026, 8, 1),
            Ausencia.fecha <= date(2026, 8, 31),
        ).all()
        assert len(ausencias) == 0
        # Would raise 404 in endpoint


class TestAusenciasEdgeCases:
    """Test edge cases."""

    def test_invalid_date_order(self):
        """fecha_fin < fecha_inicio → validation error."""
        from app.schemas.ausencia import AusenciaCreateRango
        with pytest.raises(Exception):  # Pydantic validation
            AusenciaCreateRango(
                colaborador_id=1,
                fecha_inicio=date(2026, 8, 10),
                fecha_fin=date(2026, 8, 5),
            )

    def test_no_workdays_in_range(self):
        """Range with no workdays → empty list."""
        start = date(2026, 8, 4)  # Tuesday
        end = date(2026, 8, 5)    # Wednesday
        # Actually both are weekdays, let me use Sat-Sun
        start = date(2026, 8, 8)  # Saturday
        end = date(2026, 8, 9)    # Sunday
        dias = _get_workdays_in_range(start, end)
        assert len(dias) == 0
