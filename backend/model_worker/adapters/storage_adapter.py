# Module: model_worker.adapters.storage_adapter
# Purpose: Adapter for storage operations (Firestore, Cloud Storage)
# Inputs: Data to store, paths to retrieve
# Outputs: Retrieved data, storage paths
# Errors: Storage access errors, not found errors
# Tests: test_storage_adapter.py

"""
PSEUDOCODE
1) Initialize adapter with configuration
2) Define methods for:
   a. Storing run results
   b. Retrieving run results
   c. Updating run status
   d. Getting run status
   e. Storing artifacts (JSON, CSV, PDF)
   f. Getting signed URLs for artifacts
3) Handle both local and cloud storage based on configuration
"""

import json
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud.firestore_v1.base_query import FieldFilter
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class StorageAdapter:
    """Adapter for storage operations"""
    
    def __init__(self):
        """Initialize with configuration"""
        load_dotenv()
        
        self.use_emulator = os.getenv("FIREBASE_EMULATORS", "false").lower() == "true"
        self.project_id = os.getenv("FIREBASE_PROJECT_ID", "demo-lhj")
        self.storage_bucket = os.getenv("STORAGE_BUCKET", "local-artifacts")
        
        # Initialize Firebase if not already initialized
        if not firebase_admin._apps:
            try:
                if self.use_emulator:
                    # Use emulator
                    os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
                    os.environ["FIREBASE_STORAGE_EMULATOR_HOST"] = "localhost:9199"
                    firebase_admin.initialize_app(options={"projectId": self.project_id})
                else:
                    # Use production credentials
                    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                    if cred_path and os.path.exists(cred_path):
                        creds = credentials.Certificate(cred_path)
                        firebase_admin.initialize_app(creds, {
                            "storageBucket": f"{self.storage_bucket}.appspot.com"
                        })
                    else:
                        # Use default credentials
                        firebase_admin.initialize_app(options={
                            "projectId": self.project_id,
                            "storageBucket": f"{self.storage_bucket}.appspot.com"
                        })
            except Exception as e:
                logger.error(f"Error initializing Firebase: {str(e)}")
                # Fall back to local storage
                self.use_local_storage = True
        
        # Initialize Firestore client
        try:
            self.db = firestore.client()
            self.use_local_storage = False
        except Exception as e:
            logger.error(f"Error connecting to Firestore: {str(e)}")
            self.use_local_storage = True
        
        # Create local artifacts directory if using local storage
        if self.use_local_storage:
            self.local_artifacts_dir = Path("local_artifacts")
            self.local_artifacts_dir.mkdir(exist_ok=True)
            logger.info(f"Using local storage at {self.local_artifacts_dir}")
    
    def store_run_result(self, run_id: str, run_result: Dict[str, Any]):
        """Store run results"""
        if self.use_local_storage:
            # Store locally as JSON
            result_path = self.local_artifacts_dir / f"run_{run_id}_result.json"
            with open(result_path, "w") as f:
                json.dump(run_result, f, default=str)
            logger.info(f"Stored run result locally at {result_path}")
        else:
            # Store in Firestore
            run_ref = self.db.collection("runs").document(run_id)
            run_ref.set(run_result)
            logger.info(f"Stored run result in Firestore with ID {run_id}")
    
    def get_run_result(self, run_id: str) -> Dict[str, Any]:
        """Get run results"""
        if self.use_local_storage:
            # Get from local JSON
            result_path = self.local_artifacts_dir / f"run_{run_id}_result.json"
            if not result_path.exists():
                raise ValueError(f"Run result not found for {run_id}")
            
            with open(result_path, "r") as f:
                return json.load(f)
        else:
            # Get from Firestore
            run_ref = self.db.collection("runs").document(run_id)
            run_doc = run_ref.get()
            
            if not run_doc.exists:
                raise ValueError(f"Run result not found for {run_id}")
            
            return run_doc.to_dict()
    
    def update_run_status(self, run_id: str, status_data: Dict[str, Any]):
        """Update run status"""
        if self.use_local_storage:
            # Update local JSON
            status_path = self.local_artifacts_dir / f"run_{run_id}_status.json"
            with open(status_path, "w") as f:
                json.dump(status_data, f, default=str)
            logger.info(f"Updated run status locally at {status_path}")
        else:
            # Update in Firestore
            status_ref = self.db.collection("run_status").document(run_id)
            status_ref.set(status_data, merge=True)
            logger.info(f"Updated run status in Firestore with ID {run_id}")
    
    def get_run_status(self, run_id: str) -> Dict[str, Any]:
        """Get run status"""
        if self.use_local_storage:
            # Get from local JSON
            status_path = self.local_artifacts_dir / f"run_{run_id}_status.json"
            if not status_path.exists():
                raise ValueError(f"Run status not found for {run_id}")
            
            with open(status_path, "r") as f:
                return json.load(f)
        else:
            # Get from Firestore
            status_ref = self.db.collection("run_status").document(run_id)
            status_doc = status_ref.get()
            
            if not status_doc.exists:
                raise ValueError(f"Run status not found for {run_id}")
            
            return status_doc.to_dict()
    
    def store_artifact(self, run_id: str, artifact_type: str, content: bytes) -> str:
        """Store an artifact and return its path"""
        artifact_name = f"{run_id}_{artifact_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        if artifact_type == "json":
            artifact_name += ".json"
        elif artifact_type == "csv":
            artifact_name += ".csv"
        elif artifact_type == "pdf":
            artifact_name += ".pdf"
        
        if self.use_local_storage:
            # Store locally
            artifact_path = self.local_artifacts_dir / artifact_name
            with open(artifact_path, "wb") as f:
                f.write(content)
            
            return str(artifact_path)
        else:
            # Store in Cloud Storage
            bucket = storage.bucket()
            blob = bucket.blob(f"artifacts/{artifact_name}")
            blob.upload_from_string(content)
            
            return f"artifacts/{artifact_name}"
    
    def get_signed_url(self, path: str) -> str:
        """Get a signed URL for an artifact"""
        if self.use_local_storage:
            # For local storage, just return the file path
            if not path.startswith("local_artifacts"):
                path = str(self.local_artifacts_dir / path)
            
            if not os.path.exists(path):
                raise ValueError(f"Artifact not found at {path}")
            
            return f"file://{path}"
        else:
            # Get signed URL from Cloud Storage
            bucket = storage.bucket()
            blob = bucket.blob(path)
            
            if not blob.exists():
                raise ValueError(f"Artifact not found at {path}")
            
            # Generate signed URL with 1 hour expiration
            url = blob.generate_signed_url(
                expiration=datetime.now() + timedelta(hours=1),
                method="GET"
            )
            
            return url

