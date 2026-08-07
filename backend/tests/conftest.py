"""Shared pytest fixtures and import shims for the backend unit tests.

The application modules build a PostgreSQL engine at import time, so the
psycopg2 driver is stubbed out when it is not installed. No test in this
package touches a real database: DB-dependent code is exercised through
lightweight fakes.
"""
import os
import sys
from unittest.mock import MagicMock

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

try:  # pragma: no cover - depends on the local environment
    import psycopg2  # noqa: F401
except ImportError:  # pragma: no cover
    sys.modules["psycopg2"] = MagicMock()
