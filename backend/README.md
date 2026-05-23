# AxiomEye Backend

FastAPI + PyTorch + Celery scaffold.

## Run API
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Run Celery worker (requires Redis)
```bash
celery -A worker.celery_app worker --loglevel=info
```

