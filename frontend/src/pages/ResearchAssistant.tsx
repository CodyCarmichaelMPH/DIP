import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, ExternalLink, Cloud, CloudOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../lib/auth'
import { conversationService } from '../lib/conversationService'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode?: 'local' | 'research'
  confidence?: 'low' | 'medium' | 'high'
  grade?: 'A' | 'B' | 'C' | 'D'
  sources?: Citation[]
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface Citation {
  title: string
  url: string
  date?: string
  evidence: {
    level: 'A' | 'B' | 'C' | 'D'
    weight: number
    confidence: number
    reasoning: string
    sourceType: string
    reliability: string
  }
}

export function ResearchAssistant() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m SILAS (Researcher), your Research & Data Intelligence assistant. I can help you research demographics, infrastructure, historical incidents, and provide evidence-graded analysis for your disease modeling scenarios. What would you like to know?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isServerConnected, setIsServerConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load API key and conversations from localStorage on mount
  // Server sync functions
  const syncWithServer = async () => {
    if (!user) return

    try {
      setIsSyncing(true)
      setIsServerConnected(true)
      
      // Try to sync local conversations to server
      const localConversations = conversations
      if (localConversations.length > 0) {
        await conversationService.syncConversationsToServer(user.uid, localConversations)
      }
      
      // Load conversations from server
      const serverConversations = await conversationService.syncConversationsFromServer(user.uid)
      
      if (serverConversations.length > 0) {
        // Convert server data to local format
        const convertedConversations = serverConversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          messages: conv.messages.map((msg: any) => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            confidence: msg.confidence,
            grade: msg.grade,
            sources: msg.sources
          })),
          createdAt: new Date(conv.created_at),
          updatedAt: new Date(conv.updated_at)
        }))
        
        setConversations(convertedConversations)
        
        // Save to localStorage as backup
        localStorage.setItem('silas_conversations', JSON.stringify(convertedConversations))
      }
    } catch (error) {
      console.error('Error syncing with server:', error)
      setIsServerConnected(false)
      // Fall back to local storage
      loadFromLocalStorage()
    } finally {
      setIsSyncing(false)
    }
  }

  const loadFromLocalStorage = () => {
    const savedConversations = localStorage.getItem('silas_conversations')
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations)
      setConversations(parsed.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      })))
    }
  }

  useEffect(() => {
    const savedApiKey = localStorage.getItem('silas_perplexity_api_key')
    if (savedApiKey) {
      setApiKey(savedApiKey)
      setIsConnected(true)
    }
    
    // Load conversations (server sync if user is logged in, otherwise local storage)
    if (user) {
      syncWithServer()
    } else {
      loadFromLocalStorage()
    }
  }, [user])

  // Save conversations to localStorage whenever conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('silas_conversations', JSON.stringify(conversations))
    }
  }, [conversations])

  // Conversation management functions
  const createNewConversation = async () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [{
        id: '1',
        type: 'assistant',
        content: 'Hello! I\'m SILAS (Researcher), your Research & Data Intelligence assistant. I can help you research demographics, infrastructure, historical incidents, and provide evidence-graded analysis for your disease modeling scenarios. What would you like to know?',
        timestamp: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Create on server if user is logged in
    if (user && isServerConnected) {
      try {
        const serverConversation = await conversationService.createConversation(user.uid, {
          title: newConversation.title,
          initial_message: newConversation.messages[0]
        })
        newConversation.id = serverConversation.id
      } catch (error) {
        console.error('Error creating conversation on server:', error)
        setIsServerConnected(false)
      }
    }
    
    setConversations(prev => [newConversation, ...prev])
    setCurrentConversationId(newConversation.id)
    setMessages(newConversation.messages)
  }

  const loadConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      setCurrentConversationId(conversationId)
      setMessages(conversation.messages)
    }
  }

  const updateConversationTitle = async (conversationId: string, newTitle: string) => {
    // Update on server if user is logged in
    if (user && isServerConnected) {
      try {
        await conversationService.updateConversation(user.uid, conversationId, {
          title: newTitle
        })
      } catch (error) {
        console.error('Error updating conversation title on server:', error)
        setIsServerConnected(false)
      }
    }
    
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, title: newTitle, updatedAt: new Date() }
        : conv
    ))
    setEditingTitle(null)
    setNewTitle('')
  }

  const deleteConversation = async (conversationId: string) => {
    // Delete on server if user is logged in
    if (user && isServerConnected) {
      try {
        await conversationService.deleteConversation(user.uid, conversationId)
      } catch (error) {
        console.error('Error deleting conversation on server:', error)
        setIsServerConnected(false)
      }
    }
    
    setConversations(prev => prev.filter(conv => conv.id !== conversationId))
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null)
      setMessages([{
        id: '1',
        type: 'assistant',
        content: 'Hello! I\'m SILAS (Researcher), your Research & Data Intelligence assistant. I can help you research demographics, infrastructure, historical incidents, and provide evidence-graded analysis for your disease modeling scenarios. What would you like to know?',
        timestamp: new Date()
      }])
    }
  }

  // Handle scroll position tracking
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current
    if (!messagesContainer) return

    const handleScroll = () => {
      const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100
      setUserScrolledUp(!isNearBottom)
    }

    messagesContainer.addEventListener('scroll', handleScroll)
    return () => messagesContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (!userScrolledUp && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, userScrolledUp])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    
    // If no current conversation, create one automatically
    if (!currentConversationId) {
      const now = new Date()
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: YYYY-MM-DDTHH-MM-SS
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: `Chat-${timestamp}`,
        messages: updatedMessages,
        createdAt: now,
        updatedAt: now
      }
      
      // Create on server if user is logged in
      if (user && isServerConnected) {
        try {
          const serverConversation = await conversationService.createConversation(user.uid, {
            title: newConversation.title,
            initial_message: userMessage
          })
          newConversation.id = serverConversation.id
        } catch (error) {
          console.error('Error creating conversation on server:', error)
          setIsServerConnected(false)
        }
      }
      
      setConversations(prev => [newConversation, ...prev])
      setCurrentConversationId(newConversation.id)
    } else {
      // Update current conversation if it exists
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, messages: updatedMessages, updatedAt: new Date() }
          : conv
      ))
      
      // Add message to server if user is logged in
      if (user && isServerConnected) {
        try {
          await conversationService.addMessage(user.uid, currentConversationId, userMessage)
        } catch (error) {
          console.error('Error adding message to server:', error)
          setIsServerConnected(false)
        }
      }
    }
    
    const currentInput = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      if (apiKey && isConnected) {
        // Use real Perplexity API
        const response = await callPerplexity(currentInput, apiKey)
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.content,
          timestamp: new Date(),
          mode: 'research',
          confidence: 'high',
          sources: response.sources
        }
        const finalMessages = [...updatedMessages, assistantMessage]
        setMessages(finalMessages)
        
        // Update current conversation (should exist now due to auto-creation)
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, messages: finalMessages, updatedAt: new Date() }
            : conv
        ))
        
        // Add assistant message to server if user is logged in
        if (user && isServerConnected) {
          try {
            await conversationService.addMessage(user.uid, currentConversationId!, assistantMessage)
          } catch (error) {
            console.error('Error adding assistant message to server:', error)
            setIsServerConnected(false)
          }
        }
      } else {
        // Fallback to simulated response
        const simulatedResponse = getSimulatedResponse(currentInput)
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: simulatedResponse.content,
          timestamp: new Date(),
          mode: simulatedResponse.mode,
          confidence: simulatedResponse.confidence,
          grade: simulatedResponse.grade
        }
        const finalMessages = [...updatedMessages, assistantMessage]
        setMessages(finalMessages)
        
        // Update current conversation (should exist now due to auto-creation)
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, messages: finalMessages, updatedAt: new Date() }
            : conv
        ))
        
        // Add assistant message to server if user is logged in
        if (user && isServerConnected) {
          try {
            await conversationService.addMessage(user.uid, currentConversationId!, assistantMessage)
          } catch (error) {
            console.error('Error adding assistant message to server:', error)
            setIsServerConnected(false)
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please check your API key configuration or try again later.',
        timestamp: new Date(),
        mode: 'local',
        confidence: 'low'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleApiKeySet = async (newApiKey: string) => {
    setApiKey(newApiKey)
    localStorage.setItem('silas_perplexity_api_key', newApiKey)
    
    try {
      const isValid = await validatePerplexityApiKey(newApiKey)
      setIsConnected(isValid)
      setShowApiKeyModal(false)
      
      if (isValid) {
        // Add success message
        const successMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: '✅ Successfully connected to Perplexity API! I can now provide real-time research with evidence-graded sources.',
          timestamp: new Date(),
          mode: 'research',
          confidence: 'high'
        }
        setMessages(prev => [...prev, successMessage])
      } else {
        // Add error message
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: '❌ Failed to validate API key. Please check your key and try again.',
          timestamp: new Date(),
          mode: 'local',
          confidence: 'low'
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('API key validation error:', error)
      setIsConnected(false)
    }
  }

  const getSimulatedResponse = (input: string) => {
    const responses = [
      {
        content: 'Based on current data patterns, I can see that COVID cases are trending upward in the past 4 weeks. The model suggests a 15% increase in hospitalizations if current patterns continue. However, I need access to real-time research capabilities to provide evidence-graded analysis. Please configure your Perplexity API key in Settings to enable comprehensive research.',
        mode: 'local' as const,
        confidence: 'medium' as const,
        grade: 'C' as const
      },
      {
        content: 'The facility risk analysis shows 3 high-risk nursing homes in the area. These facilities have occupancy rates above 80% and limited staff-to-resident ratios. I recommend prioritizing vaccination campaigns and enhanced infection control measures at these locations. For detailed demographic and infrastructure research, please configure your Perplexity API key.',
        mode: 'local' as const,
        confidence: 'medium' as const,
        grade: 'B' as const
      },
      {
        content: 'I can provide general guidance on disease modeling and facility risk assessment, but for comprehensive research with evidence-graded sources, I need access to real-time data through the Perplexity API. Please visit Settings to configure your API key for full research capabilities.',
        mode: 'local' as const,
        confidence: 'low' as const,
        grade: 'D' as const
      }
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  const getEvidenceIcon = (grade: string) => {
    switch (grade) {
      case 'A': return '🟢'
      case 'B': return '🟡'
      case 'C': return '🟠'
      case 'D': return '🔴'
      default: return '⚪'
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
      </div>

      <div className="flex gap-6">
        {/* Conversations Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg h-[calc(100vh-200px)] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Conversations</h3>
                <button
                  onClick={createNewConversation}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  New Chat
                </button>
              </div>
              
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversationId === conversation.id
                      ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-blue-800 hover:bg-gray-100 dark:hover:bg-blue-700'
                  }`}
                  onClick={() => loadConversation(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    {editingTitle === conversation.id ? (
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={() => updateConversationTitle(conversation.id, newTitle)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            updateConversationTitle(conversation.id, newTitle)
                          }
                        }}
                        className="flex-1 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                        autoFocus
                      />
                    ) : (
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conversation.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTitle(conversation.id)
                          setNewTitle(conversation.title)
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Edit title"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conversation.id)
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete conversation"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1">
          <div className="h-[calc(100vh-200px)] flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">SILAS (Researcher)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Research & Data Intelligence</p>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span className="text-sm text-yellow-800">
                Limited mode - Configure Perplexity API key for full research capabilities
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div className={`rounded-lg px-3 py-2 ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}>
                  <div className="text-sm prose prose-sm max-w-none">
                    {message.type === 'assistant' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Custom styling for markdown elements
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-sm">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          code: ({children}) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({children}) => <pre className="bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-3 italic mb-2">{children}</blockquote>,
                          table: ({children}) => <table className="border-collapse border border-gray-300 text-xs mb-2">{children}</table>,
                          th: ({children}) => <th className="border border-gray-300 px-2 py-1 bg-gray-200 font-semibold">{children}</th>,
                          td: ({children}) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
                          a: ({href, children}) => (
                            <a 
                              href={href} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  
                  {message.type === 'assistant' && (
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      {message.confidence && (
                        <span className={`font-medium ${getConfidenceColor(message.confidence)}`}>
                          {message.confidence.toUpperCase()}
                        </span>
                      )}
                      {message.grade && (
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          {getEvidenceIcon(message.grade)} {message.grade}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">📚 Sources:</div>
                      <div className="space-y-1">
                        {message.sources.map((source, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{index + 1}.</span>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            >
                              <span>{source.title}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getEvidenceIcon(source.evidence.level)} {source.evidence.level}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex mr-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Researching...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
          
          {/* Scroll to bottom button */}
          {userScrolledUp && (
            <button
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                setUserScrolledUp(false)
              }}
              className="absolute bottom-20 right-4 bg-primary-600 text-white p-2 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
              title="Scroll to bottom"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about demographics, infrastructure, historical incidents..."
              className="flex-1 input text-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="btn btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Try: "What are the demographics of King County?" or "Research nursing home capacity in Pierce County"
          </div>
        </div>

        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Perplexity API Configuration</h3>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Enter your Perplexity API key to enable real-time research capabilities with evidence-graded sources.
                  Your API key is stored locally and never sent to our servers.
                </p>
                
                {isConnected && (
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-2 rounded-md mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-sm">Connected to Perplexity API</span>
                  </div>
                )}
              </div>

              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="pplx-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApiKeySet(apiKey)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* About SILAS (Researcher) - Bottom of page */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">About SILAS (Researcher)</h3>
        <div className="text-sm text-blue-800 space-y-3">
          <p>
            <strong>SILAS (Simplified Institutional Language Analysis System) Researcher</strong> is the dedicated research model of the SILAS Model Set, built specifically to answer questions factually with accurate references, citations, and grading of those sources against strict criteria.
          </p>
          <p>
            SILAS (Researcher) is not designed to perform as a general purpose AI Chatbot and does not have full access to any data in the system itself. Rather, it serves solely as a researcher/archivist of sources for any queries you may have around populations, disease dynamics, modeling parameters, and related epidemiological research.
          </p>
          <p>
            For more comprehensive research needs, a local document researcher and archivist is available through contacting BroadlyEpi that can handle onsite documentation, summary, organization and more.
          </p>
          <p>
            <strong>Important:</strong> While SILAS (Researcher) is built off state-of-the-art models, it may still be prone to errors. Checking the sources provided is highly encouraged to verify information accuracy.
          </p>
        </div>
      </div>
    </div>
  )
}

// Perplexity API Functions (adapted from PREPARES-POLARIS-TESTING)
async function callPerplexity(message: string, apiKey: string): Promise<{ content: string; sources: Citation[] }> {
  const systemPrompt = `You are SILAS-Researcher, a research and data intelligence agent in the Disease Intelligence Program. Your role is to provide evidence-based research about communities, demographics, infrastructure, and historical incidents to inform disease modeling and public health scenarios.

RESEARCH METHODOLOGY:
- Conduct comprehensive research using real-time web search
- Apply evidence grading system (A=primary data, B=top-tier journalism/expert, C=reliable secondary, D=weak/rumors)
- Focus on factual, verifiable information from authoritative sources
- Analyze and synthesize findings with clear evidence grading
- Provide detailed analysis for disease modeling and public health scenarios

EVIDENCE GRADING SYSTEM:
A-Grade: Primary data sources (Census, ACS, official government data, peer-reviewed research)
B-Grade: Top-tier journalism, expert analysis, established institutions
C-Grade: Reliable secondary sources, reputable organizations
D-Grade: Weak sources, rumors, unverified claims

RESEARCH FOCUS:
- Community demographics and vulnerable populations
- Critical infrastructure and emergency services
- Historical incidents and public health patterns
- Economic and social factors affecting health outcomes
- Geographic and environmental considerations

RESPONSE FORMATTING:
- Use Markdown formatting for better readability
- Use **bold** for key terms and important data points
- Use bullet points (-) for lists and key findings
- Use numbered lists (1.) for sequential information
- Use tables when presenting structured data
- Use > blockquotes for important insights or quotes
- Use code formatting for specific values, percentages, or technical terms

IMPORTANT: 
- Do not include URLs or source links in your response text
- The system will automatically add proper citations from the search results
- Focus on delivering comprehensive, accurate research content
- If you cannot find reliable sources for specific information, state this clearly
- Only provide information that you can verify from your search results
- When citing sources, use clear source descriptions (e.g., "U.S. Census Bureau", "CDC", "National Center for Health Statistics") that can be matched to search results`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ]

  // Call backend proxy instead of Perplexity directly (uses server-side API key)
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
  const response = await fetch(`${API_BASE}/perplexity/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,
      system_prompt: systemPrompt,
      model: 'sonar-pro',
      max_tokens: 1500,
      temperature: 0.2
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const responseContent = data.content || 'No response content available'
  const citations = data.citations || []

  // Process citations with evidence grading
  const processedSources: Citation[] = citations.map((citation: any, index: number) => {
    if (citation.url) {
      const evidence = gradeEvidence(citation.title || `Source ${index + 1}`, '', citation.url)
      return {
        title: citation.title || `Source ${index + 1}`,
        url: citation.url,
        date: citation.date || 'Unknown',
        evidence: evidence
      }
    }
    return null
  }).filter(Boolean)

  return {
    content: responseContent,
    sources: processedSources
  }
}

async function validatePerplexityApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a research assistant.' },
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10,
        return_citations: true
      })
    })
    
    return response.ok
  } catch (error) {
    console.error('Error validating Perplexity API key:', error)
    return false
  }
}

// Enhanced evidence grading system
function gradeEvidence(source: string, content: string, url: string) {
  const grade = {
    level: 'D' as 'A' | 'B' | 'C' | 'D',
    weight: 1,
    confidence: 0.5,
    reasoning: 'Default grade - needs manual review',
    sourceType: 'Unknown',
    reliability: 'Low'
  }

  const sourceLower = source.toLowerCase()
  const urlLower = url.toLowerCase()

  // A-Grade: Primary data sources and peer-reviewed research
  if (urlLower.includes('.gov') || 
      urlLower.includes('census.gov') || urlLower.includes('acs') || 
      urlLower.includes('cdc.gov') || urlLower.includes('fema.gov') || 
      urlLower.includes('noaa.gov') || urlLower.includes('nih.gov') || 
      urlLower.includes('nist.gov') || urlLower.includes('dot.gov') ||
      urlLower.includes('usgs.gov') || urlLower.includes('nws.noaa.gov') || 
      urlLower.includes('weather.gov') || urlLower.includes('bls.gov') ||
      urlLower.includes('cbo.gov') || urlLower.includes('gao.gov') ||
      urlLower.includes('pubmed.ncbi.nlm.nih.gov') || urlLower.includes('scholar.google.com') ||
      // Academic and research institutions
      urlLower.includes('idmod.org') || urlLower.includes('cebm.net') ||
      urlLower.includes('cebm.ox.ac.uk') || urlLower.includes('evidence-based-medicine') ||
      urlLower.includes('.edu') || urlLower.includes('harvard.edu') ||
      urlLower.includes('stanford.edu') || urlLower.includes('mit.edu') ||
      urlLower.includes('berkeley.edu') || urlLower.includes('yale.edu') ||
      urlLower.includes('princeton.edu') || urlLower.includes('columbia.edu') ||
      urlLower.includes('jhu.edu') || urlLower.includes('hopkins.edu') ||
      urlLower.includes('mayo.edu') || urlLower.includes('clevelandclinic.org') ||
      urlLower.includes('who.int') || urlLower.includes('un.org') ||
      urlLower.includes('worldbank.org') || urlLower.includes('imf.org') ||
      urlLower.includes('oecd.org') || urlLower.includes('euro.who.int') ||
      sourceLower.includes('census') || sourceLower.includes('acs') ||
      sourceLower.includes('cdc') || sourceLower.includes('fema') ||
      sourceLower.includes('noaa') || sourceLower.includes('nih') ||
      sourceLower.includes('peer-reviewed') || sourceLower.includes('scientific journal') ||
      sourceLower.includes('government data') || sourceLower.includes('official statistics') ||
      // Academic institution keywords
      sourceLower.includes('idmod') || sourceLower.includes('institute for disease modeling') ||
      sourceLower.includes('center for evidence based medicine') || sourceLower.includes('cebm') ||
      sourceLower.includes('university') || sourceLower.includes('medical school') ||
      sourceLower.includes('research institute') || sourceLower.includes('academic') ||
      sourceLower.includes('peer review') || sourceLower.includes('scientific') ||
      sourceLower.includes('epidemiology') || sourceLower.includes('public health') ||
      sourceLower.includes('medical journal') || sourceLower.includes('clinical trial') ||
      sourceLower.includes('systematic review') || sourceLower.includes('meta-analysis')) {
    grade.level = 'A'
    grade.weight = 4
    grade.confidence = 0.95
    grade.reasoning = 'Primary government data source, peer-reviewed research, or academic institution'
    grade.sourceType = 'Government/Academic'
    grade.reliability = 'Very High'
  }
  // B-Grade: Top-tier journalism, expert sources, and established institutions
  else if (urlLower.includes('reuters.com') || urlLower.includes('ap.org') || 
           urlLower.includes('bbc.com') || urlLower.includes('nytimes.com') || 
           urlLower.includes('washingtonpost.com') || urlLower.includes('npr.org') || 
           urlLower.includes('propublica.org') || urlLower.includes('bloomberg.com') ||
           urlLower.includes('wsj.com') || urlLower.includes('ft.com') || 
           urlLower.includes('economist.com') || urlLower.includes('nature.com') || 
           urlLower.includes('science.org') || urlLower.includes('jstor.org') ||
           urlLower.includes('pbs.org') || urlLower.includes('cbsnews.com') ||
           urlLower.includes('abcnews.go.com') || urlLower.includes('nbcnews.com') ||
           sourceLower.includes('university') || sourceLower.includes('research institute') ||
           sourceLower.includes('peer review') || sourceLower.includes('academic') ||
           sourceLower.includes('expert analysis') || sourceLower.includes('policy institute') ||
           sourceLower.includes('think tank') || sourceLower.includes('research center')) {
    grade.level = 'B'
    grade.weight = 3
    grade.confidence = 0.85
    grade.reasoning = 'Top-tier journalism, expert source, or academic institution'
    grade.sourceType = 'Journalism/Academic'
    grade.reliability = 'High'
  }
  // C-Grade: Reliable secondary sources and established organizations
  else if (urlLower.includes('wikipedia.org') || urlLower.includes('britannica.com') ||
           urlLower.includes('usnews.com') || urlLower.includes('cnn.com') ||
           urlLower.includes('foxnews.com') || urlLower.includes('abcnews.go.com') ||
           urlLower.includes('usatoday.com') || urlLower.includes('latimes.com') ||
           urlLower.includes('chicagotribune.com') || urlLower.includes('bostonglobe.com') ||
           urlLower.includes('redcross.org') || urlLower.includes('who.int') ||
           urlLower.includes('un.org') || urlLower.includes('worldbank.org') ||
           sourceLower.includes('news') || sourceLower.includes('report') ||
           sourceLower.includes('study') || sourceLower.includes('analysis')) {
    grade.level = 'C'
    grade.weight = 2
    grade.confidence = 0.7
    grade.reasoning = 'Reliable secondary source or established organization'
    grade.sourceType = 'News/Organization'
    grade.reliability = 'Medium'
  }
  // D-Grade: Weak sources, blogs, social media, or unverified content
  else if (urlLower.includes('blogspot.com') || urlLower.includes('wordpress.com') ||
           urlLower.includes('medium.com') || urlLower.includes('reddit.com') ||
           urlLower.includes('facebook.com') || urlLower.includes('twitter.com') ||
           urlLower.includes('instagram.com') || urlLower.includes('youtube.com') ||
           sourceLower.includes('blog') || sourceLower.includes('opinion') ||
           sourceLower.includes('rumor') || sourceLower.includes('unverified')) {
    grade.level = 'D'
    grade.weight = 1
    grade.confidence = 0.3
    grade.reasoning = 'Weak source, blog, or social media content'
    grade.sourceType = 'Blog/Social'
    grade.reliability = 'Low'
  }
  // Default D-Grade for unknown sources
  else {
    grade.level = 'D'
    grade.weight = 1
    grade.confidence = 0.3
    grade.reasoning = 'Unknown or unverified source'
    grade.sourceType = 'Unknown'
    grade.reliability = 'Low'
  }

  return grade
}

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../lib/auth'
import { conversationService } from '../lib/conversationService'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode?: 'local' | 'research'
  confidence?: 'low' | 'medium' | 'high'
  grade?: 'A' | 'B' | 'C' | 'D'
  sources?: Citation[]
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface Citation {
  title: string
  url: string
  date?: string
  evidence: {
    level: 'A' | 'B' | 'C' | 'D'
    weight: number
    confidence: number
    reasoning: string
    sourceType: string
    reliability: string
  }
}

export function ResearchAssistant() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m SILAS (Researcher), your Research & Data Intelligence assistant. I can help you research demographics, infrastructure, historical incidents, and provide evidence-graded analysis for your disease modeling scenarios. What would you like to know?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isServerConnected, setIsServerConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load API key and conversations from localStorage on mount
  // Server sync functions
  const syncWithServer = async () => {
    if (!user) return

    try {
      setIsSyncing(true)
      setIsServerConnected(true)
      
      // Try to sync local conversations to server
      const localConversations = conversations
      if (localConversations.length > 0) {
        await conversationService.syncConversationsToServer(user.uid, localConversations)
      }
      
      // Load conversations from server
      const serverConversations = await conversationService.syncConversationsFromServer(user.uid)
      
      if (serverConversations.length > 0) {
        // Convert server data to local format
        const convertedConversations = serverConversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          messages: conv.messages.map((msg: any) => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            confidence: msg.confidence,
            grade: msg.grade,
            sources: msg.sources
          })),
          createdAt: new Date(conv.created_at),
          updatedAt: new Date(conv.updated_at)
        }))
        
        setConversations(convertedConversations)
        
        // Save to localStorage as backup
        localStorage.setItem('silas_conversations', JSON.stringify(convertedConversations))
      }
    } catch (error) {
      console.error('Error syncing with server:', error)
      setIsServerConnected(false)
      // Fall back to local storage
      loadFromLocalStorage()
    } finally {
      setIsSyncing(false)
    }
  }

  const loadFromLocalStorage = () => {
    const savedConversations = localStorage.getItem('silas_conversations')
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations)
      setConversations(parsed.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      })))
    }
  }

  useEffect(() => {
    const savedApiKey = localStorage.getItem('silas_perplexity_api_key')
    if (savedApiKey) {
      setApiKey(savedApiKey)
      setIsConnected(true)
    }
    
    // Load conversations (server sync if user is logged in, otherwise local storage)
    if (user) {
      syncWithServer()
    } else {
      loadFromLocalStorage()
    }
  }, [user])

  // Save conversations to localStorage whenever conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('silas_conversations', JSON.stringify(conversations))
    }
  }, [conversations])

  // Conversation management functions
  const createNewConversation = async () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [{
        id: '1',
        type: 'assistant',
        content: 'Hello! I\'m SILAS (Researcher), your Research & Data Intelligence assistant. I can help you research demographics, infrastructure, historical incidents, and provide evidence-graded analysis for your disease modeling scenarios. What would you like to know?',
        timestamp: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Create on server if user is logged in
    if (user && isServerConnected) {
      try {
        const serverConversation = await conversationService.createConversation(user.uid, {
          title: newConversation.title,
          initial_message: newConversation.messages[0]
        })
        newConversation.id = serverConversation.id
      } catch (error) {
        console.error('Error creating conversation on server:', error)
        setIsServerConnected(false)
      }
    }
    
    setConversations(prev => [newConversation, ...prev])
    setCurrentConversationId(newConversation.id)
    setMessages(newConversation.messages)
  }

  const loadConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      setCurrentConversationId(conversationId)
      setMessages(conversation.messages)
    }
  }

  const updateConversationTitle = async (conversationId: string, newTitle: string) => {
    // Update on server if user is logged in
    if (user && isServerConnected) {
      try {
        await conversationService.updateConversation(user.uid, conversationId, {
          title: newTitle
        })
      } catch (error) {
        console.error('Error updating conversation title on server:', error)
        setIsServerConnected(false)
      }
    }
    
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, title: newTitle, updatedAt: new Date() }
        : conv
    ))
    setEditingTitle(null)
    setNewTitle('')
  }

  const deleteConversation = async (conversationId: string) => {
    // Delete on server if user is logged in
    if (user && isServerConnected) {
      try {
        await conversationService.deleteConversation(user.uid, conversationId)
      } catch (error) {
        console.error('Error deleting conversation on server:', error)
        setIsServerConnected(false)
      }
    }
    
    setConversations(prev => prev.filter(conv => conv.id !== conversationId))
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null)
      setMessages([{
        id: '1',
        type: 'assistant',
        content: 'Hello! I\'m SILAS (Researcher), your Research & Data Intelligence assistant. I can help you research demographics, infrastructure, historical incidents, and provide evidence-graded analysis for your disease modeling scenarios. What would you like to know?',
        timestamp: new Date()
      }])
    }
  }

  // Handle scroll position tracking
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current
    if (!messagesContainer) return

    const handleScroll = () => {
      const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100
      setUserScrolledUp(!isNearBottom)
    }

    messagesContainer.addEventListener('scroll', handleScroll)
    return () => messagesContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (!userScrolledUp && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages, userScrolledUp])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    
    // If no current conversation, create one automatically
    if (!currentConversationId) {
      const now = new Date()
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: YYYY-MM-DDTHH-MM-SS
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: `Chat-${timestamp}`,
        messages: updatedMessages,
        createdAt: now,
        updatedAt: now
      }
      
      // Create on server if user is logged in
      if (user && isServerConnected) {
        try {
          const serverConversation = await conversationService.createConversation(user.uid, {
            title: newConversation.title,
            initial_message: userMessage
          })
          newConversation.id = serverConversation.id
        } catch (error) {
          console.error('Error creating conversation on server:', error)
          setIsServerConnected(false)
        }
      }
      
      setConversations(prev => [newConversation, ...prev])
      setCurrentConversationId(newConversation.id)
    } else {
      // Update current conversation if it exists
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, messages: updatedMessages, updatedAt: new Date() }
          : conv
      ))
      
      // Add message to server if user is logged in
      if (user && isServerConnected) {
        try {
          await conversationService.addMessage(user.uid, currentConversationId, userMessage)
        } catch (error) {
          console.error('Error adding message to server:', error)
          setIsServerConnected(false)
        }
      }
    }
    
    const currentInput = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      if (apiKey && isConnected) {
        // Use real Perplexity API
        const response = await callPerplexity(currentInput, apiKey)
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.content,
          timestamp: new Date(),
          mode: 'research',
          confidence: 'high',
          sources: response.sources
        }
        const finalMessages = [...updatedMessages, assistantMessage]
        setMessages(finalMessages)
        
        // Update current conversation (should exist now due to auto-creation)
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, messages: finalMessages, updatedAt: new Date() }
            : conv
        ))
        
        // Add assistant message to server if user is logged in
        if (user && isServerConnected) {
          try {
            await conversationService.addMessage(user.uid, currentConversationId!, assistantMessage)
          } catch (error) {
            console.error('Error adding assistant message to server:', error)
            setIsServerConnected(false)
          }
        }
      } else {
        // Fallback to simulated response
        const simulatedResponse = getSimulatedResponse(currentInput)
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: simulatedResponse.content,
          timestamp: new Date(),
          mode: simulatedResponse.mode,
          confidence: simulatedResponse.confidence,
          grade: simulatedResponse.grade
        }
        const finalMessages = [...updatedMessages, assistantMessage]
        setMessages(finalMessages)
        
        // Update current conversation (should exist now due to auto-creation)
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, messages: finalMessages, updatedAt: new Date() }
            : conv
        ))
        
        // Add assistant message to server if user is logged in
        if (user && isServerConnected) {
          try {
            await conversationService.addMessage(user.uid, currentConversationId!, assistantMessage)
          } catch (error) {
            console.error('Error adding assistant message to server:', error)
            setIsServerConnected(false)
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please check your API key configuration or try again later.',
        timestamp: new Date(),
        mode: 'local',
        confidence: 'low'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleApiKeySet = async (newApiKey: string) => {
    setApiKey(newApiKey)
    localStorage.setItem('silas_perplexity_api_key', newApiKey)
    
    try {
      const isValid = await validatePerplexityApiKey(newApiKey)
      setIsConnected(isValid)
      setShowApiKeyModal(false)
      
      if (isValid) {
        // Add success message
        const successMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: '✅ Successfully connected to Perplexity API! I can now provide real-time research with evidence-graded sources.',
          timestamp: new Date(),
          mode: 'research',
          confidence: 'high'
        }
        setMessages(prev => [...prev, successMessage])
      } else {
        // Add error message
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: '❌ Failed to validate API key. Please check your key and try again.',
          timestamp: new Date(),
          mode: 'local',
          confidence: 'low'
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('API key validation error:', error)
      setIsConnected(false)
    }
  }

  const getSimulatedResponse = (input: string) => {
    const responses = [
      {
        content: 'Based on current data patterns, I can see that COVID cases are trending upward in the past 4 weeks. The model suggests a 15% increase in hospitalizations if current patterns continue. However, I need access to real-time research capabilities to provide evidence-graded analysis. Please configure your Perplexity API key in Settings to enable comprehensive research.',
        mode: 'local' as const,
        confidence: 'medium' as const,
        grade: 'C' as const
      },
      {
        content: 'The facility risk analysis shows 3 high-risk nursing homes in the area. These facilities have occupancy rates above 80% and limited staff-to-resident ratios. I recommend prioritizing vaccination campaigns and enhanced infection control measures at these locations. For detailed demographic and infrastructure research, please configure your Perplexity API key.',
        mode: 'local' as const,
        confidence: 'medium' as const,
        grade: 'B' as const
      },
      {
        content: 'I can provide general guidance on disease modeling and facility risk assessment, but for comprehensive research with evidence-graded sources, I need access to real-time data through the Perplexity API. Please visit Settings to configure your API key for full research capabilities.',
        mode: 'local' as const,
        confidence: 'low' as const,
        grade: 'D' as const
      }
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  const getEvidenceIcon = (grade: string) => {
    switch (grade) {
      case 'A': return '🟢'
      case 'B': return '🟡'
      case 'C': return '🟠'
      case 'D': return '🔴'
      default: return '⚪'
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
      </div>

      <div className="flex gap-6">
        {/* Conversations Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg h-[calc(100vh-200px)] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Conversations</h3>
                <button
                  onClick={createNewConversation}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  New Chat
                </button>
              </div>
              
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversationId === conversation.id
                      ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-blue-800 hover:bg-gray-100 dark:hover:bg-blue-700'
                  }`}
                  onClick={() => loadConversation(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    {editingTitle === conversation.id ? (
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={() => updateConversationTitle(conversation.id, newTitle)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            updateConversationTitle(conversation.id, newTitle)
                          }
                        }}
                        className="flex-1 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                        autoFocus
                      />
                    ) : (
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conversation.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTitle(conversation.id)
                          setNewTitle(conversation.title)
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Edit title"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conversation.id)
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete conversation"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1">
          <div className="h-[calc(100vh-200px)] flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">SILAS (Researcher)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Research & Data Intelligence</p>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span className="text-sm text-yellow-800">
                Limited mode - Configure Perplexity API key for full research capabilities
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div className={`rounded-lg px-3 py-2 ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}>
                  <div className="text-sm prose prose-sm max-w-none">
                    {message.type === 'assistant' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Custom styling for markdown elements
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-sm">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          code: ({children}) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({children}) => <pre className="bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-3 italic mb-2">{children}</blockquote>,
                          table: ({children}) => <table className="border-collapse border border-gray-300 text-xs mb-2">{children}</table>,
                          th: ({children}) => <th className="border border-gray-300 px-2 py-1 bg-gray-200 font-semibold">{children}</th>,
                          td: ({children}) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
                          a: ({href, children}) => (
                            <a 
                              href={href} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  
                  {message.type === 'assistant' && (
                    <div className="mt-2 flex items-center space-x-2 text-xs">
                      {message.confidence && (
                        <span className={`font-medium ${getConfidenceColor(message.confidence)}`}>
                          {message.confidence.toUpperCase()}
                        </span>
                      )}
                      {message.grade && (
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          {getEvidenceIcon(message.grade)} {message.grade}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">📚 Sources:</div>
                      <div className="space-y-1">
                        {message.sources.map((source, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{index + 1}.</span>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            >
                              <span>{source.title}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getEvidenceIcon(source.evidence.level)} {source.evidence.level}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex mr-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Researching...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
          
          {/* Scroll to bottom button */}
          {userScrolledUp && (
            <button
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                setUserScrolledUp(false)
              }}
              className="absolute bottom-20 right-4 bg-primary-600 text-white p-2 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
              title="Scroll to bottom"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about demographics, infrastructure, historical incidents..."
              className="flex-1 input text-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="btn btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Try: "What are the demographics of King County?" or "Research nursing home capacity in Pierce County"
          </div>
        </div>

        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Perplexity API Configuration</h3>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Enter your Perplexity API key to enable real-time research capabilities with evidence-graded sources.
                  Your API key is stored locally and never sent to our servers.
                </p>
                
                {isConnected && (
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-2 rounded-md mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-sm">Connected to Perplexity API</span>
                  </div>
                )}
              </div>

              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="pplx-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApiKeySet(apiKey)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* About SILAS (Researcher) - Bottom of page */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">About SILAS (Researcher)</h3>
        <div className="text-sm text-blue-800 space-y-3">
          <p>
            <strong>SILAS (Simplified Institutional Language Analysis System) Researcher</strong> is the dedicated research model of the SILAS Model Set, built specifically to answer questions factually with accurate references, citations, and grading of those sources against strict criteria.
          </p>
          <p>
            SILAS (Researcher) is not designed to perform as a general purpose AI Chatbot and does not have full access to any data in the system itself. Rather, it serves solely as a researcher/archivist of sources for any queries you may have around populations, disease dynamics, modeling parameters, and related epidemiological research.
          </p>
          <p>
            For more comprehensive research needs, a local document researcher and archivist is available through contacting BroadlyEpi that can handle onsite documentation, summary, organization and more.
          </p>
          <p>
            <strong>Important:</strong> While SILAS (Researcher) is built off state-of-the-art models, it may still be prone to errors. Checking the sources provided is highly encouraged to verify information accuracy.
          </p>
        </div>
      </div>
    </div>
  )
}

// Perplexity API Functions (adapted from PREPARES-POLARIS-TESTING)
async function callPerplexity(message: string, apiKey: string): Promise<{ content: string; sources: Citation[] }> {
  const systemPrompt = `You are SILAS-Researcher, a research and data intelligence agent in the Disease Intelligence Program. Your role is to provide evidence-based research about communities, demographics, infrastructure, and historical incidents to inform disease modeling and public health scenarios.

RESEARCH METHODOLOGY:
- Conduct comprehensive research using real-time web search
- Apply evidence grading system (A=primary data, B=top-tier journalism/expert, C=reliable secondary, D=weak/rumors)
- Focus on factual, verifiable information from authoritative sources
- Analyze and synthesize findings with clear evidence grading
- Provide detailed analysis for disease modeling and public health scenarios

EVIDENCE GRADING SYSTEM:
A-Grade: Primary data sources (Census, ACS, official government data, peer-reviewed research)
B-Grade: Top-tier journalism, expert analysis, established institutions
C-Grade: Reliable secondary sources, reputable organizations
D-Grade: Weak sources, rumors, unverified claims

RESEARCH FOCUS:
- Community demographics and vulnerable populations
- Critical infrastructure and emergency services
- Historical incidents and public health patterns
- Economic and social factors affecting health outcomes
- Geographic and environmental considerations

RESPONSE FORMATTING:
- Use Markdown formatting for better readability
- Use **bold** for key terms and important data points
- Use bullet points (-) for lists and key findings
- Use numbered lists (1.) for sequential information
- Use tables when presenting structured data
- Use > blockquotes for important insights or quotes
- Use code formatting for specific values, percentages, or technical terms

IMPORTANT: 
- Do not include URLs or source links in your response text
- The system will automatically add proper citations from the search results
- Focus on delivering comprehensive, accurate research content
- If you cannot find reliable sources for specific information, state this clearly
- Only provide information that you can verify from your search results
- When citing sources, use clear source descriptions (e.g., "U.S. Census Bureau", "CDC", "National Center for Health Statistics") that can be matched to search results`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ]

  // Call backend proxy instead of Perplexity directly (uses server-side API key)
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
  const response = await fetch(`${API_BASE}/perplexity/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,
      system_prompt: systemPrompt,
      model: 'sonar-pro',
      max_tokens: 1500,
      temperature: 0.2
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const responseContent = data.content || 'No response content available'
  const citations = data.citations || []

  // Process citations with evidence grading
  const processedSources: Citation[] = citations.map((citation: any, index: number) => {
    if (citation.url) {
      const evidence = gradeEvidence(citation.title || `Source ${index + 1}`, '', citation.url)
      return {
        title: citation.title || `Source ${index + 1}`,
        url: citation.url,
        date: citation.date || 'Unknown',
        evidence: evidence
      }
    }
    return null
  }).filter(Boolean)

  return {
    content: responseContent,
    sources: processedSources
  }
}

async function validatePerplexityApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a research assistant.' },
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10,
        return_citations: true
      })
    })
    
    return response.ok
  } catch (error) {
    console.error('Error validating Perplexity API key:', error)
    return false
  }
}

// Enhanced evidence grading system
function gradeEvidence(source: string, content: string, url: string) {
  const grade = {
    level: 'D' as 'A' | 'B' | 'C' | 'D',
    weight: 1,
    confidence: 0.5,
    reasoning: 'Default grade - needs manual review',
    sourceType: 'Unknown',
    reliability: 'Low'
  }

  const sourceLower = source.toLowerCase()
  const urlLower = url.toLowerCase()

  // A-Grade: Primary data sources and peer-reviewed research
  if (urlLower.includes('.gov') || 
      urlLower.includes('census.gov') || urlLower.includes('acs') || 
      urlLower.includes('cdc.gov') || urlLower.includes('fema.gov') || 
      urlLower.includes('noaa.gov') || urlLower.includes('nih.gov') || 
      urlLower.includes('nist.gov') || urlLower.includes('dot.gov') ||
      urlLower.includes('usgs.gov') || urlLower.includes('nws.noaa.gov') || 
      urlLower.includes('weather.gov') || urlLower.includes('bls.gov') ||
      urlLower.includes('cbo.gov') || urlLower.includes('gao.gov') ||
      urlLower.includes('pubmed.ncbi.nlm.nih.gov') || urlLower.includes('scholar.google.com') ||
      // Academic and research institutions
      urlLower.includes('idmod.org') || urlLower.includes('cebm.net') ||
      urlLower.includes('cebm.ox.ac.uk') || urlLower.includes('evidence-based-medicine') ||
      urlLower.includes('.edu') || urlLower.includes('harvard.edu') ||
      urlLower.includes('stanford.edu') || urlLower.includes('mit.edu') ||
      urlLower.includes('berkeley.edu') || urlLower.includes('yale.edu') ||
      urlLower.includes('princeton.edu') || urlLower.includes('columbia.edu') ||
      urlLower.includes('jhu.edu') || urlLower.includes('hopkins.edu') ||
      urlLower.includes('mayo.edu') || urlLower.includes('clevelandclinic.org') ||
      urlLower.includes('who.int') || urlLower.includes('un.org') ||
      urlLower.includes('worldbank.org') || urlLower.includes('imf.org') ||
      urlLower.includes('oecd.org') || urlLower.includes('euro.who.int') ||
      sourceLower.includes('census') || sourceLower.includes('acs') ||
      sourceLower.includes('cdc') || sourceLower.includes('fema') ||
      sourceLower.includes('noaa') || sourceLower.includes('nih') ||
      sourceLower.includes('peer-reviewed') || sourceLower.includes('scientific journal') ||
      sourceLower.includes('government data') || sourceLower.includes('official statistics') ||
      // Academic institution keywords
      sourceLower.includes('idmod') || sourceLower.includes('institute for disease modeling') ||
      sourceLower.includes('center for evidence based medicine') || sourceLower.includes('cebm') ||
      sourceLower.includes('university') || sourceLower.includes('medical school') ||
      sourceLower.includes('research institute') || sourceLower.includes('academic') ||
      sourceLower.includes('peer review') || sourceLower.includes('scientific') ||
      sourceLower.includes('epidemiology') || sourceLower.includes('public health') ||
      sourceLower.includes('medical journal') || sourceLower.includes('clinical trial') ||
      sourceLower.includes('systematic review') || sourceLower.includes('meta-analysis')) {
    grade.level = 'A'
    grade.weight = 4
    grade.confidence = 0.95
    grade.reasoning = 'Primary government data source, peer-reviewed research, or academic institution'
    grade.sourceType = 'Government/Academic'
    grade.reliability = 'Very High'
  }
  // B-Grade: Top-tier journalism, expert sources, and established institutions
  else if (urlLower.includes('reuters.com') || urlLower.includes('ap.org') || 
           urlLower.includes('bbc.com') || urlLower.includes('nytimes.com') || 
           urlLower.includes('washingtonpost.com') || urlLower.includes('npr.org') || 
           urlLower.includes('propublica.org') || urlLower.includes('bloomberg.com') ||
           urlLower.includes('wsj.com') || urlLower.includes('ft.com') || 
           urlLower.includes('economist.com') || urlLower.includes('nature.com') || 
           urlLower.includes('science.org') || urlLower.includes('jstor.org') ||
           urlLower.includes('pbs.org') || urlLower.includes('cbsnews.com') ||
           urlLower.includes('abcnews.go.com') || urlLower.includes('nbcnews.com') ||
           sourceLower.includes('university') || sourceLower.includes('research institute') ||
           sourceLower.includes('peer review') || sourceLower.includes('academic') ||
           sourceLower.includes('expert analysis') || sourceLower.includes('policy institute') ||
           sourceLower.includes('think tank') || sourceLower.includes('research center')) {
    grade.level = 'B'
    grade.weight = 3
    grade.confidence = 0.85
    grade.reasoning = 'Top-tier journalism, expert source, or academic institution'
    grade.sourceType = 'Journalism/Academic'
    grade.reliability = 'High'
  }
  // C-Grade: Reliable secondary sources and established organizations
  else if (urlLower.includes('wikipedia.org') || urlLower.includes('britannica.com') ||
           urlLower.includes('usnews.com') || urlLower.includes('cnn.com') ||
           urlLower.includes('foxnews.com') || urlLower.includes('abcnews.go.com') ||
           urlLower.includes('usatoday.com') || urlLower.includes('latimes.com') ||
           urlLower.includes('chicagotribune.com') || urlLower.includes('bostonglobe.com') ||
           urlLower.includes('redcross.org') || urlLower.includes('who.int') ||
           urlLower.includes('un.org') || urlLower.includes('worldbank.org') ||
           sourceLower.includes('news') || sourceLower.includes('report') ||
           sourceLower.includes('study') || sourceLower.includes('analysis')) {
    grade.level = 'C'
    grade.weight = 2
    grade.confidence = 0.7
    grade.reasoning = 'Reliable secondary source or established organization'
    grade.sourceType = 'News/Organization'
    grade.reliability = 'Medium'
  }
  // D-Grade: Weak sources, blogs, social media, or unverified content
  else if (urlLower.includes('blogspot.com') || urlLower.includes('wordpress.com') ||
           urlLower.includes('medium.com') || urlLower.includes('reddit.com') ||
           urlLower.includes('facebook.com') || urlLower.includes('twitter.com') ||
           urlLower.includes('instagram.com') || urlLower.includes('youtube.com') ||
           sourceLower.includes('blog') || sourceLower.includes('opinion') ||
           sourceLower.includes('rumor') || sourceLower.includes('unverified')) {
    grade.level = 'D'
    grade.weight = 1
    grade.confidence = 0.3
    grade.reasoning = 'Weak source, blog, or social media content'
    grade.sourceType = 'Blog/Social'
    grade.reliability = 'Low'
  }
  // Default D-Grade for unknown sources
  else {
    grade.level = 'D'
    grade.weight = 1
    grade.confidence = 0.3
    grade.reasoning = 'Unknown or unverified source'
    grade.sourceType = 'Unknown'
    grade.reliability = 'Low'
  }

  return grade
}





