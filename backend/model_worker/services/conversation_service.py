# Module: model_worker.services.conversation_service
# Purpose: Service for managing SILAS (Researcher) conversations
# Inputs: User ID, conversation data
# Outputs: Conversation CRUD operations
# Errors: User not found, conversation not found, validation errors
# Tests: test_conversation_service.py

"""
PSEUDOCODE
1) Initialize in-memory storage for conversations
2) Implement CRUD operations for conversations
3) Validate user permissions
4) Handle message management within conversations
5) Provide search and filtering capabilities
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional
from ..domain.models import Conversation, Message, ConversationCreate, ConversationUpdate, ConversationResponse

class ConversationService:
    """Service for managing SILAS (Researcher) conversations"""
    
    def __init__(self):
        # In-memory storage - in production, this would be a database
        self._conversations: Dict[str, Conversation] = {}
        self._user_conversations: Dict[str, List[str]] = {}  # user_id -> list of conversation_ids
    
    def create_conversation(self, user_id: str, conversation_data: ConversationCreate) -> Conversation:
        """Create a new conversation for a user"""
        conversation_id = str(uuid.uuid4())
        now = datetime.now()
        
        conversation = Conversation(
            id=conversation_id,
            user_id=user_id,
            title=conversation_data.title,
            messages=[],
            created_at=now,
            updated_at=now
        )
        
        # Add initial message if provided
        if conversation_data.initial_message:
            conversation.messages.append(conversation_data.initial_message)
            conversation.updated_at = now
        
        # Store conversation
        self._conversations[conversation_id] = conversation
        
        # Add to user's conversation list
        if user_id not in self._user_conversations:
            self._user_conversations[user_id] = []
        self._user_conversations[user_id].append(conversation_id)
        
        return conversation
    
    def get_conversation(self, user_id: str, conversation_id: str) -> Optional[Conversation]:
        """Get a specific conversation for a user"""
        conversation = self._conversations.get(conversation_id)
        if conversation and conversation.user_id == user_id:
            return conversation
        return None
    
    def get_user_conversations(self, user_id: str) -> List[ConversationResponse]:
        """Get all conversations for a user"""
        conversation_ids = self._user_conversations.get(user_id, [])
        conversations = []
        
        for conv_id in conversation_ids:
            conversation = self._conversations.get(conv_id)
            if conversation:
                # Create response with summary info
                last_message_preview = None
                if conversation.messages:
                    last_message = conversation.messages[-1]
                    last_message_preview = last_message.content[:100] + "..." if len(last_message.content) > 100 else last_message.content
                
                response = ConversationResponse(
                    id=conversation.id,
                    title=conversation.title,
                    created_at=conversation.created_at,
                    updated_at=conversation.updated_at,
                    message_count=len(conversation.messages),
                    last_message_preview=last_message_preview
                )
                conversations.append(response)
        
        # Sort by updated_at descending (most recent first)
        conversations.sort(key=lambda x: x.updated_at, reverse=True)
        return conversations
    
    def update_conversation(self, user_id: str, conversation_id: str, update_data: ConversationUpdate) -> Optional[Conversation]:
        """Update a conversation"""
        conversation = self.get_conversation(user_id, conversation_id)
        if not conversation:
            return None
        
        # Update fields if provided
        if update_data.title is not None:
            conversation.title = update_data.title
        
        if update_data.messages is not None:
            conversation.messages = update_data.messages
        
        conversation.updated_at = datetime.now()
        
        return conversation
    
    def add_message(self, user_id: str, conversation_id: str, message: Message) -> Optional[Conversation]:
        """Add a message to a conversation"""
        conversation = self.get_conversation(user_id, conversation_id)
        if not conversation:
            return None
        
        conversation.messages.append(message)
        conversation.updated_at = datetime.now()
        
        return conversation
    
    def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        """Delete a conversation"""
        conversation = self.get_conversation(user_id, conversation_id)
        if not conversation:
            return False
        
        # Remove from storage
        del self._conversations[conversation_id]
        
        # Remove from user's conversation list
        if user_id in self._user_conversations:
            try:
                self._user_conversations[user_id].remove(conversation_id)
            except ValueError:
                pass  # Already removed
        
        return True
    
    def get_conversation_count(self, user_id: str) -> int:
        """Get the number of conversations for a user"""
        return len(self._user_conversations.get(user_id, []))
    
    def search_conversations(self, user_id: str, query: str) -> List[ConversationResponse]:
        """Search conversations by title or content"""
        user_conversations = self.get_user_conversations(user_id)
        query_lower = query.lower()
        
        matching_conversations = []
        for conv_response in user_conversations:
            conversation = self._conversations.get(conv_response.id)
            if conversation:
                # Search in title
                if query_lower in conversation.title.lower():
                    matching_conversations.append(conv_response)
                    continue
                
                # Search in message content
                for message in conversation.messages:
                    if query_lower in message.content.lower():
                        matching_conversations.append(conv_response)
                        break
        
        return matching_conversations

# Global instance
conversation_service = ConversationService()
