'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, Send, Loader2, Volume2, VolumeX, MessageCircle, Sparkles } from 'lucide-react'
import Navbar from '../components/Navbar'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface User {
  id: string
  email: string
  name: string
  role: string
}

const INITIAL_SUGGESTIONS = [
  "I need to hang a heavy picture",
  "What paint do you recommend?",
  "Help me fix a leaky faucet",
  "I'm starting a DIY project"
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(INITIAL_SUGGESTIONS)
  const [user, setUser] = useState<User | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(false)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechRef = useRef<number>(0)
  const inputRef = useRef<string>('')
  const sendMessageRef = useRef<((msg?: string) => void) | null>(null)
  const router = useRouter()

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/inventory')
        if (res.status === 401) {
          router.push('/')
          return
        }
        const data = await res.json()
        setUser(data.user || null)
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setPageLoading(false)
      }
    }
    fetchUser()
  }, [router])

  useEffect(() => {
    listeningRef.current = listening
  }, [listening])

  // Keep inputRef in sync with input state for silence detection
  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, interimTranscript])

  // Setup speech recognition with auto-send after silence
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim)
      lastSpeechRef.current = Date.now()
      
      if (final) {
        setInput((prev) => (prev + ' ' + final).trim())
        setInterimTranscript('')
        lastSpeechRef.current = Date.now()
      }
    }

    recognition.onerror = (event) => {
      console.log('Speech error:', event.error)
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') {
        if (listeningRef.current) {
          setTimeout(() => { try { recognition.start() } catch {} }, 500)
        }
      }
    }

    recognition.onend = () => {
      if (listeningRef.current) {
        setTimeout(() => { try { recognition.start() } catch {} }, 500)
      } else {
        setListening(false)
        setInterimTranscript('')
      }
    }

    recognitionRef.current = recognition
    return () => { 
      recognition.stop()
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current)
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
      setSpeaking(false)
    }
    listeningRef.current = true
    setListening(true)
    lastSpeechRef.current = 0 // Reset - no speech detected yet
    try { recognitionRef.current.start() } catch {}
    
    // Start silence detection timer - auto-send after 2 seconds of silence
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current)
    silenceTimerRef.current = setInterval(() => {
      const now = Date.now()
      const timeSinceLastSpeech = now - lastSpeechRef.current
      // If we have speech input and 2 seconds of silence, auto-send
      if (lastSpeechRef.current > 0 && timeSinceLastSpeech > 2000 && inputRef.current.trim()) {
        // Stop listening and send
        if (silenceTimerRef.current) clearInterval(silenceTimerRef.current)
        if (sendMessageRef.current) {
          sendMessageRef.current()
        }
      }
    }, 500)
  }, [])

  const stopListening = useCallback(() => {
    listeningRef.current = false
    setListening(false)
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
    setInterimTranscript('')
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const toggleListening = () => {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const speakResponse = useCallback((text: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    
    // Clean text for speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/•/g, '')
      .replace(/\n+/g, '. ')
    
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    speechSynthesis.speak(utterance)
  }, [soundEnabled])

  const sendMessage = async (messageOverride?: string) => {
    const messageToSend = messageOverride || (input + ' ' + interimTranscript).trim()
    if (!messageToSend || loading) return

    stopListening()
    setInput('')
    setInterimTranscript('')
    
    const newUserMessage: Message = { role: 'user', content: messageToSend }
    const updatedMessages = [...messages, newUserMessage]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: messageToSend,
          conversationHistory: updatedMessages.slice(-6)
        }),
      })

      if (!res.ok) {
        if (res.status === 401) { router.push('/'); return }
        throw new Error('Failed')
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      setSuggestedQuestions(data.suggestedQuestions || [])
      speakResponse(data.response)
    } catch {
      const errorMsg = "Sorry, I'm having trouble connecting. Please try again."
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
    } finally {
      setLoading(false)
    }
  }

  // Keep sendMessage ref updated for silence detection
  useEffect(() => {
    sendMessageRef.current = sendMessage
  })

  const handleLogout = async () => {
    stopListening()
    if ('speechSynthesis' in window) speechSynthesis.cancel()
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    sendMessage(suggestion)
  }

  const currentInput = (input + ' ' + interimTranscript).trim()

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <Navbar user={user} />

      {/* Voice Controls Bar */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <MessageCircle className="text-white" size={16} />
          </div>
          <p className="text-sm text-gray-600">Voice-powered product recommendations</p>
        </div>
        <button
          onClick={() => {
            if (speaking) speechSynthesis.cancel()
            setSoundEnabled(!soundEnabled)
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${soundEnabled ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
          title={soundEnabled ? 'Voice on' : 'Voice off'}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span className="hidden sm:inline">{soundEnabled ? 'Voice On' : 'Voice Off'}</span>
        </button>
      </div>

      {/* Status Banner */}
      {(listening || speaking) && (
        <div className={`py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 ${
          listening ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          {listening ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Listening... Speak now
            </>
          ) : (
            <>
              <Volume2 size={16} className="animate-pulse" />
              Speaking...
              <button onClick={() => speechSynthesis.cancel()} className="ml-2 underline text-xs opacity-80">Stop</button>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
          {/* Welcome State */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="text-white" size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-gray-500 mb-8">
                Ask me about products, projects, or tap the mic to speak
              </p>
              
              {/* Quick Suggestions */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {suggestedQuestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Live Transcript */}
          {currentInput && listening && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-blue-100 text-blue-800 border border-blue-200">
                <p className="text-sm">
                  {input}{input && interimTranscript ? ' ' : ''}
                  <span className="text-blue-500">{interimTranscript}</span>
                  <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse align-middle" />
                </p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="animate-spin text-blue-500" size={18} />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          )}

          {/* Follow-up Suggestions (after AI response) */}
          {messages.length > 0 && !loading && suggestedQuestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(q)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-xs rounded-full transition border border-transparent hover:border-blue-200"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Mic Button */}
            <button
              onClick={toggleListening}
              disabled={loading}
              className={`relative p-4 rounded-2xl transition-all ${
                listening
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
              } ${loading ? 'opacity-50' : ''}`}
            >
              {listening ? <MicOff size={24} /> : <Mic size={24} />}
              {listening && (
                <span className="absolute inset-0 rounded-2xl bg-red-400 animate-ping opacity-30" />
              )}
            </button>

            {/* Input */}
            <input
              type="text"
              value={currentInput}
              onChange={(e) => { setInput(e.target.value); setInterimTranscript('') }}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={listening ? '🎤 Listening...' : 'Ask about products, projects, repairs...'}
              disabled={loading}
              className={`flex-1 px-4 py-3.5 border-2 rounded-2xl text-sm focus:outline-none transition ${
                listening ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-500'
              }`}
            />

            {/* Send Button */}
            <button
              onClick={() => sendMessage()}
              disabled={loading || !currentInput}
              className={`p-4 rounded-2xl transition-all ${
                currentInput && !loading
                  ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
          
          <p className="text-center text-xs text-gray-400 mt-3">
            {listening ? '🎤 Listening... Will send after you stop speaking' : 'Tap 🎤 to speak or type your question'}
          </p>
        </div>
      </div>
    </div>
  )
}
