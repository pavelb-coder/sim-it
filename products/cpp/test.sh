#!/usr/bin/env bash
# Тесты C++-класса: решения задач и учебные программы сверяются с настоящим g++.
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 products/cpp/test.py
