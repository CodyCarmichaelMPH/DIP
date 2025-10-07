import { useState } from 'react'
import { MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode?: 'local' | 'research'
  confidence?: 'low' | 'medium' | 'high'
  grade?: 'A' | 'B' | 'C' | 'D' | 'F'
}

export function AICopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your Disease Intelligence Program assistant. I can help you interpret data, explain model results, and answer questions about disease spread patterns. What would you like to know?',
      timestamp: new Date(),
      mode: 'local',
      confidence: 'high'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        {
          content: 'Based on the current data, I can see that COVID cases are trending upward in the past 4 weeks. The model suggests a 15% increase in hospitalizations if current patterns continue. Would you like me to run a scenario to explore potential interventions?',
          mode: 'local' as const,
          confidence: 'high' as const
        },
        {
          content: 'The facility risk analysis shows 3 high-risk nursing homes in the area. These facilities have occupancy rates above 80% and limited staff-to-resident ratios. I recommend prioritizing vaccination campaigns and enhanced infection control measures at these locations.',
          mode: 'local' as const,
          confidence: 'medium' as const
        },
        {
          content: 'According to recent CDC guidelines and peer-reviewed studies, the current vaccination coverage of 85% provides good protection, but there are still vulnerable populations. The research suggests that targeted vaccination campaigns in high-risk facilities could reduce transmission by 40-60%.',
          mode: 'research' as const,
          grade: 'A' as const
        }
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: randomResponse.content,
        timestamp: new Date(),
        mode: randomResponse.mode,
        confidence: randomResponse.confidence,
        grade: randomResponse.grade
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-900">AI Assistant</h3>
        </div>
        <div className="text-xs text-gray-500">
          Ask about your data
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
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
                <p className="text-sm">{message.content}</p>
                {message.type === 'assistant' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      message.mode === 'local' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {message.mode === 'local' ? 'LOCAL' : 'RESEARCH'}
                    </span>
                    {message.confidence && (
                      <span className="text-xs text-gray-500">
                        Confidence: {message.confidence}
                      </span>
                    )}
                    {message.grade && (
                      <span className="text-xs text-gray-500">
                        Grade: {message.grade}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex mr-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
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
            placeholder="Ask about disease patterns, facility risks, or model results..."
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
          Try: "What are the highest risk facilities?" or "Explain the current COVID trends"
        </div>
      </div>
    </div>
  )
}
