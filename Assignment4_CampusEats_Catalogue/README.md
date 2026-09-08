# CampusEats Assignment 4 — Catalogue

## Requirements

- Python 3.9+
- Flask
- pytest
- openapi-spec-validator

## Run

```bash
python3 -m pip install -r requirements.txt
pytest -q
openapi-spec-validator openapi.yaml
python3 app.py
```

The API listens on `http://localhost:5000`.

## Optional outbound dependency

To configure the hardened outbound HTTP call:

```bash
export PAYMENTS_URL=http://localhost:6000/charge
```

Do not put credentials or real secrets into the repository.

## Important submission step

Before submitting, run the curl commands in `NOTES.md` with `curl -i` and paste the actual terminal output into your report/transcript. Also replace the Assignment 3/OpenAPI line-count placeholders with the exact counts from the files you submit.
