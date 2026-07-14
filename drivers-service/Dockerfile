FROM python:3.11-slim
WORKDIR /app

# Install dependencies first so Docker can cache this layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8082
# gunicorn serves the WSGI app; 3 workers is plenty for the demo.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8082", "--workers", "3"]
