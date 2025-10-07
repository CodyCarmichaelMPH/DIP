# Import the properly configured root_app from simple_backend
# This includes CORS middleware and all routes mounted at /api
from simple_backend import root_app

# If you ever want to test locally:
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:root_app", host="0.0.0.0", port=8000, reload=True)
