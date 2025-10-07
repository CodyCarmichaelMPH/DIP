#!/usr/bin/env python3
"""
Verify ASGI entrypoint for FastAPI application
"""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    # Import the FastAPI app
    from simple_backend import app
    
    print("ASGI Entrypoint Verification")
    print("=" * 40)
    print(f"File: simple_backend.py")
    print(f"App Variable: app")
    print(f"ASGI Entrypoint: simple_backend:app")
    print(f"FastAPI Version: {app.__class__.__module__}")
    print(f"Title: {app.title}")
    print(f"Routes: {len(app.routes)} endpoints")
    
    # List main routes
    print("\nMain API Endpoints:")
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ', '.join(route.methods) if route.methods else 'GET'
            print(f"   {methods:8} {route.path}")
    
    print("\nASGI entrypoint is correctly configured!")
    print("   Use: simple_backend:app")
    
except ImportError as e:
    print(f"Import Error: {e}")
    print("   Make sure you're in the Production directory")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

Verify ASGI entrypoint for FastAPI application
"""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    # Import the FastAPI app
    from simple_backend import app
    
    print("ASGI Entrypoint Verification")
    print("=" * 40)
    print(f"File: simple_backend.py")
    print(f"App Variable: app")
    print(f"ASGI Entrypoint: simple_backend:app")
    print(f"FastAPI Version: {app.__class__.__module__}")
    print(f"Title: {app.title}")
    print(f"Routes: {len(app.routes)} endpoints")
    
    # List main routes
    print("\nMain API Endpoints:")
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ', '.join(route.methods) if route.methods else 'GET'
            print(f"   {methods:8} {route.path}")
    
    print("\nASGI entrypoint is correctly configured!")
    print("   Use: simple_backend:app")
    
except ImportError as e:
    print(f"Import Error: {e}")
    print("   Make sure you're in the Production directory")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)


