# -*- coding: utf-8 -*-
"""Банк задач Python: собирает части из scripts/bank/py*.py."""
import importlib
import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

_PREFIX = 'bank.py'
_parts = sorted(p.stem for p in (_HERE / 'bank').glob('*.py') if p.stem.startswith('py') and p.stem[2:].isdigit())

PY_TOPICS = []
PY_TASKS = []
for _name in _parts:
    _mod = importlib.import_module(_PREFIX + _name[2:])
    PY_TOPICS.extend(getattr(_mod, 'PY_TOPICS', []))
    PY_TASKS.extend(getattr(_mod, 'PY_TASKS', []))
