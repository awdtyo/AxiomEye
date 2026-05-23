from app.core.celery_app import celery_app

# Expose celery app for: celery -A worker.celery_app worker --loglevel=info

