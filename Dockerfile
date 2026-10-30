FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY frontend/dist ./frontend/dist
COPY server.py .
ENV PORT=10000
EXPOSE 10000
CMD ["python", "server.py"]
