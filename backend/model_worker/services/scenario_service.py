# Module: model_worker.services.scenario_service
# Purpose: Service for managing simulation scenarios
# Inputs: User ID, scenario data
# Outputs: Scenario CRUD operations
# Errors: User not found, scenario not found, validation errors
# Tests: test_scenario_service.py

"""
PSEUDOCODE
1) Initialize in-memory storage for scenarios
2) Implement CRUD operations for scenarios
3) Validate user permissions
4) Handle scenario parameter management
5) Provide search and filtering capabilities
6) Track scenario run history
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional
from ..domain.models import Scenario, ScenarioParameters, ScenarioCreate, ScenarioUpdate, ScenarioResponse, ScenarioShare

class ScenarioService:
    """Service for managing simulation scenarios"""
    
    def __init__(self):
        # In-memory storage - in production, this would be a database
        self._scenarios: Dict[str, Scenario] = {}
        self._user_scenarios: Dict[str, List[str]] = {}  # user_id -> list of scenario_ids
    
    def create_scenario(self, user_id: str, scenario_data: ScenarioCreate) -> Scenario:
        """Create a new scenario for a user"""
        scenario_id = str(uuid.uuid4())
        now = datetime.now()
        
        scenario = Scenario(
            id=scenario_id,
            user_id=user_id,
            name=scenario_data.name,
            description=scenario_data.description,
            parameters=scenario_data.parameters,
            created_at=now,
            updated_at=now,
            last_run_at=None,
            run_count=0,
            is_public=scenario_data.is_public,
            is_shared=False,
            shared_with=None,
            tags=scenario_data.tags,
            author_name=scenario_data.author_name
        )
        
        # Store scenario
        self._scenarios[scenario_id] = scenario
        
        # Add to user's scenario list
        if user_id not in self._user_scenarios:
            self._user_scenarios[user_id] = []
        self._user_scenarios[user_id].append(scenario_id)
        
        return scenario
    
    def get_scenario(self, user_id: str, scenario_id: str) -> Optional[Scenario]:
        """Get a specific scenario for a user"""
        scenario = self._scenarios.get(scenario_id)
        if scenario and scenario.user_id == user_id:
            return scenario
        return None
    
    def get_user_scenarios(self, user_id: str) -> List[ScenarioResponse]:
        """Get all scenarios for a user"""
        scenario_ids = self._user_scenarios.get(user_id, [])
        scenarios = []
        
        for scenario_id in scenario_ids:
            scenario = self._scenarios.get(scenario_id)
            if scenario:
                # Create response with summary info
                response = ScenarioResponse(
                    id=scenario.id,
                    name=scenario.name,
                    description=scenario.description,
                    created_at=scenario.created_at,
                    updated_at=scenario.updated_at,
                    last_run_at=scenario.last_run_at,
                    run_count=scenario.run_count,
                    disease_name=scenario.parameters.disease_name,
                    model_type=scenario.parameters.model_type,
                    is_public=scenario.is_public,
                    is_shared=scenario.is_shared,
                    tags=scenario.tags,
                    author_name=scenario.author_name,
                    user_id=scenario.user_id,
                    is_owner=(scenario.user_id == user_id)
                )
                scenarios.append(response)
        
        # Sort by updated_at descending (most recent first)
        scenarios.sort(key=lambda x: x.updated_at, reverse=True)
        return scenarios
    
    def update_scenario(self, user_id: str, scenario_id: str, update_data: ScenarioUpdate) -> Optional[Scenario]:
        """Update a scenario"""
        scenario = self.get_scenario(user_id, scenario_id)
        if not scenario:
            return None
        
        # Update fields if provided
        if update_data.name is not None:
            scenario.name = update_data.name
        
        if update_data.description is not None:
            scenario.description = update_data.description
        
        if update_data.parameters is not None:
            scenario.parameters = update_data.parameters
        
        if update_data.is_public is not None:
            scenario.is_public = update_data.is_public
        
        if update_data.tags is not None:
            scenario.tags = update_data.tags
        
        if update_data.shared_with is not None:
            scenario.shared_with = update_data.shared_with
            scenario.is_shared = len(update_data.shared_with) > 0
        
        scenario.updated_at = datetime.now()
        
        return scenario
    
    def delete_scenario(self, user_id: str, scenario_id: str) -> bool:
        """Delete a scenario"""
        scenario = self.get_scenario(user_id, scenario_id)
        if not scenario:
            return False
        
        # Remove from storage
        del self._scenarios[scenario_id]
        
        # Remove from user's scenario list
        if user_id in self._user_scenarios:
            try:
                self._user_scenarios[user_id].remove(scenario_id)
            except ValueError:
                pass  # Already removed
        
        return True
    
    def record_scenario_run(self, user_id: str, scenario_id: str) -> Optional[Scenario]:
        """Record that a scenario was run"""
        scenario = self.get_scenario(user_id, scenario_id)
        if not scenario:
            return None
        
        scenario.run_count += 1
        scenario.last_run_at = datetime.now()
        scenario.updated_at = datetime.now()
        
        return scenario
    
    def get_scenario_count(self, user_id: str) -> int:
        """Get the number of scenarios for a user"""
        return len(self._user_scenarios.get(user_id, []))
    
    def search_scenarios(self, user_id: str, query: str) -> List[ScenarioResponse]:
        """Search scenarios by name, description, or disease"""
        user_scenarios = self.get_user_scenarios(user_id)
        query_lower = query.lower()
        
        matching_scenarios = []
        for scenario_response in user_scenarios:
            scenario = self._scenarios.get(scenario_response.id)
            if scenario:
                # Search in name
                if query_lower in scenario.name.lower():
                    matching_scenarios.append(scenario_response)
                    continue
                
                # Search in description
                if scenario.description and query_lower in scenario.description.lower():
                    matching_scenarios.append(scenario_response)
                    continue
                
                # Search in disease name
                if query_lower in scenario.parameters.disease_name.lower():
                    matching_scenarios.append(scenario_response)
                    continue
                
                # Search in model type
                if query_lower in scenario.parameters.model_type.lower():
                    matching_scenarios.append(scenario_response)
                    continue
        
        return matching_scenarios
    
    def get_scenarios_by_disease(self, user_id: str, disease_name: str) -> List[ScenarioResponse]:
        """Get scenarios filtered by disease name"""
        user_scenarios = self.get_user_scenarios(user_id)
        return [s for s in user_scenarios if s.disease_name.lower() == disease_name.lower()]
    
    def get_scenarios_by_model_type(self, user_id: str, model_type: str) -> List[ScenarioResponse]:
        """Get scenarios filtered by model type"""
        user_scenarios = self.get_user_scenarios(user_id)
        return [s for s in user_scenarios if s.model_type.lower() == model_type.lower()]
    
    def get_recent_scenarios(self, user_id: str, limit: int = 10) -> List[ScenarioResponse]:
        """Get recently updated scenarios"""
        user_scenarios = self.get_user_scenarios(user_id)
        return user_scenarios[:limit]
    
    def get_most_run_scenarios(self, user_id: str, limit: int = 10) -> List[ScenarioResponse]:
        """Get most frequently run scenarios"""
        user_scenarios = self.get_user_scenarios(user_id)
        # Sort by run_count descending
        sorted_scenarios = sorted(user_scenarios, key=lambda x: x.run_count, reverse=True)
        return sorted_scenarios[:limit]
    
    def get_public_scenarios(self, user_id: str, limit: int = 50) -> List[ScenarioResponse]:
        """Get public scenarios from all users"""
        public_scenarios = []
        
        for scenario in self._scenarios.values():
            if scenario.is_public:
                response = ScenarioResponse(
                    id=scenario.id,
                    name=scenario.name,
                    description=scenario.description,
                    created_at=scenario.created_at,
                    updated_at=scenario.updated_at,
                    last_run_at=scenario.last_run_at,
                    run_count=scenario.run_count,
                    disease_name=scenario.parameters.disease_name,
                    model_type=scenario.parameters.model_type,
                    is_public=scenario.is_public,
                    is_shared=scenario.is_shared,
                    tags=scenario.tags,
                    author_name=scenario.author_name,
                    user_id=scenario.user_id,
                    is_owner=(scenario.user_id == user_id)
                )
                public_scenarios.append(response)
        
        # Sort by updated_at descending (most recent first)
        public_scenarios.sort(key=lambda x: x.updated_at, reverse=True)
        return public_scenarios[:limit]
    
    def get_shared_scenarios(self, user_id: str) -> List[ScenarioResponse]:
        """Get scenarios shared with the user"""
        shared_scenarios = []
        
        for scenario in self._scenarios.values():
            if scenario.shared_with and user_id in scenario.shared_with:
                response = ScenarioResponse(
                    id=scenario.id,
                    name=scenario.name,
                    description=scenario.description,
                    created_at=scenario.created_at,
                    updated_at=scenario.updated_at,
                    last_run_at=scenario.last_run_at,
                    run_count=scenario.run_count,
                    disease_name=scenario.parameters.disease_name,
                    model_type=scenario.parameters.model_type,
                    is_public=scenario.is_public,
                    is_shared=scenario.is_shared,
                    tags=scenario.tags,
                    author_name=scenario.author_name,
                    user_id=scenario.user_id,
                    is_owner=(scenario.user_id == user_id)
                )
                shared_scenarios.append(response)
        
        # Sort by updated_at descending (most recent first)
        shared_scenarios.sort(key=lambda x: x.updated_at, reverse=True)
        return shared_scenarios
    
    def share_scenario(self, user_id: str, scenario_id: str, share_data: ScenarioShare) -> bool:
        """Share a scenario with specific users"""
        scenario = self.get_scenario(user_id, scenario_id)
        if not scenario:
            return False
        
        # Update shared_with list
        if scenario.shared_with is None:
            scenario.shared_with = []
        
        # Add new users to shared list
        for target_user_id in share_data.user_ids:
            if target_user_id not in scenario.shared_with:
                scenario.shared_with.append(target_user_id)
        
        scenario.is_shared = len(scenario.shared_with) > 0
        scenario.updated_at = datetime.now()
        
        return True
    
    def unshare_scenario(self, user_id: str, scenario_id: str, target_user_id: str) -> bool:
        """Remove a user from scenario sharing"""
        scenario = self.get_scenario(user_id, scenario_id)
        if not scenario or not scenario.shared_with:
            return False
        
        # Remove user from shared list
        if target_user_id in scenario.shared_with:
            scenario.shared_with.remove(target_user_id)
        
        scenario.is_shared = len(scenario.shared_with) > 0
        scenario.updated_at = datetime.now()
        
        return True
    
    def get_scenarios_by_tag(self, user_id: str, tag: str) -> List[ScenarioResponse]:
        """Get scenarios filtered by tag"""
        user_scenarios = self.get_user_scenarios(user_id)
        return [s for s in user_scenarios if s.tags and tag.lower() in [t.lower() for t in s.tags]]
    
    def get_public_scenarios_by_tag(self, user_id: str, tag: str) -> List[ScenarioResponse]:
        """Get public scenarios filtered by tag"""
        public_scenarios = self.get_public_scenarios(user_id)
        return [s for s in public_scenarios if s.tags and tag.lower() in [t.lower() for t in s.tags]]

# Global instance
scenario_service = ScenarioService()
