FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for face recognition
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-advanced.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-advanced.txt

# Copy application code
COPY . .

# Create FAISS store directory
RUN mkdir -p ./faiss_store

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

# Start application
CMD ["python", "run_advanced.py"]

