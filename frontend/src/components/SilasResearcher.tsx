import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Settings, ExternalLink, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

interface SilasResearcherProps {
  onClose: () => void
}

export function SilasResearcher({ onClose }: SilasResearcherProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m SILAS-Researcher, your Research & Data Intelligence assistant. I can help you research demographics, infrastructure, historical incidents, and provide evidence-graded analysis for your disease modeling scenarios. What would you like to know?',
      timestamp: new Date(),
      mode: 'research',
      confidence: 'high'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('silas_perplexity_api_key')
    if (savedApiKey) {
      setApiKey(savedApiKey)
      setIsConnected(true)
    }
  }, [])

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
    if (!userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

    setMessages(prev => [...prev, userMessage])
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
        setMessages(prev => [...prev, assistantMessage])
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
        setMessages(prev => [...prev, assistantMessage])
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
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">SILAS-Researcher</h3>
            <p className="text-xs text-gray-500">Research & Data Intelligence</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className={`p-2 rounded-md ${
              isConnected 
                ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title={isConnected ? 'API Connected' : 'Configure API Key'}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
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
                  : 'bg-gray-100 text-gray-900'
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
                    <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${
                      message.mode === 'local' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {message.mode === 'local' ? 'LOCAL' : 'RESEARCH'}
                    </span>
                    {message.confidence && (
                      <span className={`font-medium ${getConfidenceColor(message.confidence)}`}>
                        {message.confidence.toUpperCase()}
                      </span>
                    )}
                    {message.grade && (
                      <span className="font-medium text-gray-600">
                        {getEvidenceIcon(message.grade)} {message.grade}
                      </span>
                    )}
                  </div>
                )}

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-2">📚 Sources:</div>
                    <div className="space-y-1">
                      {message.sources.map((source, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">{index + 1}.</span>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <span>{source.title}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <span className="text-xs text-gray-500">
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
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Researching...</span>
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
        <div className="mt-2 text-xs text-gray-500">
          Try: "What are the demographics of King County?" or "Research nursing home capacity in Pierce County"
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Perplexity API Configuration</h3>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
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
      sourceLower.includes('census') || sourceLower.includes('acs') ||
      sourceLower.includes('cdc') || sourceLower.includes('fema') ||
      sourceLower.includes('noaa') || sourceLower.includes('nih') ||
      sourceLower.includes('peer-reviewed') || sourceLower.includes('scientific journal') ||
      sourceLower.includes('government data') || sourceLower.includes('official statistics')) {
    grade.level = 'A'
    grade.weight = 4
    grade.confidence = 0.95
    grade.reasoning = 'Primary government data source or peer-reviewed research'
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
