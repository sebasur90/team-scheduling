from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/preferencias", tags=["preferencias"], redirect_slashes=False)


@router.post("", status_code=status.HTTP_410_GONE)
@router.post("/", status_code=status.HTTP_410_GONE)
def create_preferencia_deprecated():
    """This endpoint has been deprecated. Use PATCH /api/colaboradores/me/preferencia instead."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint is deprecated. Use PATCH /api/colaboradores/me/preferencia to set your general franja preference."
    )


@router.get("", status_code=status.HTTP_410_GONE)
@router.get("/", status_code=status.HTTP_410_GONE)
def get_preferencia_deprecated():
    """This endpoint has been deprecated. General preferences are now stored in Colaborador.franja_preferida_id."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint is deprecated. General preferences are now part of your user profile."
    )
