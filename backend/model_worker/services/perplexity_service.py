# Module: model_worker.services.perplexity_service
# Purpose: Service for proxying Perplexity AI API requests using server-side API key
# Inputs: User query, system prompt
# Outputs: Perplexity API response with citations
# Errors: API key missing, API errors, network errors

import os
import logging
from typing import Dict, List, Any, Optional
import httpx

logger = logging.getLogger(__name__)


class PerplexityService:
    """Service for making Perplexity API calls using server-side API key"""
    
    def __init__(self):
        self.api_key = os.getenv('PERPLEXITY_API_KEY')
        if not self.api_key:
            logger.warning("PERPLEXITY_API_KEY environment variable not set")
        self.base_url = "https://api.perplexity.ai"
        
    def is_available(self) -> bool:
        """Check if Perplexity API key is configured"""
        return bool(self.api_key)
    
    async def chat_completion(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        model: str = "sonar-pro",
        max_tokens: int = 1500,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """
        Make a chat completion request to Perplexity API
        
        Args:
            message: User's message/query
            system_prompt: Optional system prompt for context
            model: Perplexity model to use (default: sonar-pro)
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (0.0-1.0)
            
        Returns:
            Dict containing response content and citations
            
        Raises:
            ValueError: If API key is not configured
            httpx.HTTPError: If API request fails
        """
        if not self.api_key:
            raise ValueError("Perplexity API key not configured on server")
        
        # Build messages array
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})
        
        # Prepare request payload
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "return_citations": True,
            "return_images": False,
            "return_related_questions": False,
            "search_domain_filter": [],
            "web_search_options": {
                "search_context_size": "high"
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # Make API request
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                # Extract response content
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Extract citations
                citations = data.get("search_results") or data.get("citations") or []
                
                # Process citations
                processed_citations = []
                for citation in citations:
                    if citation.get("url"):
                        processed_citations.append({
                            "title": citation.get("title", "Unknown Source"),
                            "url": citation.get("url"),
                            "date": citation.get("date", "Unknown")
                        })
                
                return {
                    "content": content,
                    "citations": processed_citations,
                    "model": model
                }
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Perplexity API HTTP error: {e.response.status_code} - {e.response.text}")
                raise
            except httpx.RequestError as e:
                logger.error(f"Perplexity API request error: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error calling Perplexity API: {str(e)}")
                raise
    
    async def validate_api_key(self) -> bool:
        """
        Validate that the API key is working
        
        Returns:
            True if API key is valid, False otherwise
        """
        if not self.api_key:
            return False
            
        try:
            # Make a minimal test request
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": "sonar-pro",
                        "messages": [{"role": "user", "content": "test"}],
                        "max_tokens": 10
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.api_key}"
                    },
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            return False


# Global instance
perplexity_service = PerplexityService()


