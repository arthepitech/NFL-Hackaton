import pytest

from config import settings


def pytest_collection_modifyitems(config, items):
    """Les données sous licence ne sont pas en CI : les tests `realdata` y sont ignorés."""
    if (settings.RAW_DIR / "plays.csv").exists():
        return
    skip = pytest.mark.skip(reason="données BDB absentes de data/")
    for item in items:
        if "realdata" in item.keywords:
            item.add_marker(skip)
