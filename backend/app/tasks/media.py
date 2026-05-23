from app.core.celery_app import celery_app


@celery_app.task(name="media.ping")
def ping():
    return {"pong": True}

