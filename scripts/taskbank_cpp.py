# -*- coding: utf-8 -*-
"""Банк задач C++: собирает части из scripts/bank/py*.py."""
import importlib
import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

_PREFIX = 'bank.cpp'
_parts = sorted(p.stem for p in (_HERE / 'bank').glob('*.py') if p.stem.startswith('py') and p.stem[2:].isdigit())

CPP_TOPICS = []
CPP_TASKS = []
for _name in _parts:
    try:
        _mod = importlib.import_module(_PREFIX + _name[2:])
    except ModuleNotFoundError:
        continue
    CPP_TOPICS.extend(getattr(_mod, 'CPP_TOPICS', []))
    CPP_TASKS.extend(getattr(_mod, 'CPP_TASKS', []))
