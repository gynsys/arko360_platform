"""
FoundationSlabDesigner - Backward compatibility re-export.
The engine has been refactored into app.engine.foundation package.
"""
from app.engine.foundation.facade import FoundationSlabDesigner
from app.engine.foundation.models import Wall, Beam, Column

__all__ = ["FoundationSlabDesigner", "Wall", "Beam", "Column"]
