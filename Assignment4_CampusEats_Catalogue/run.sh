#!/bin/bash
set -e
python3 -m pip install -r requirements.txt
pytest -q
openapi-spec-validator openapi.yaml
python3 app.py
