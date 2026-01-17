From python:latest
workdir /app
copy . .
Run RUN pip install --no-cache-dir -r requirements.txt
CMD ["python","main.py"]
