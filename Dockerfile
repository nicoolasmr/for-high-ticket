FROM python:3.12-slim

WORKDIR /app

COPY . /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=3000

EXPOSE 3000

CMD ["python", "server.py"]
