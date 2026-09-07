FROM python:3.11-slim

WORKDIR /app

# Copy all project files
COPY . /app

# Set port environment variable (overridden by Railway at runtime)
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["python", "app.py"]
