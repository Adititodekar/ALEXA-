import { useState, useRef, useEffect } from 'react'
import './App.css'

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm Nova, your next-generation multimodal assistant. How can I assist you today?"
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function handleSendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg = { role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const replyText = data.speech_reply || data.reply || data.display_reply || 'Message received.'
      setMessages((prev) => [...prev, { role: 'assistant', text: replyText }])
    } catch (error) {
      console.error('Nova API error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I could not connect to Nova right now. Please ensure the backend server is running.'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">✨</div>
          <div>
            <h1>NOVA AI</h1>
            <p>Alexa-Next 2.0 Companion</p>
          </div>
        </div>
        <div className="status">● Live &amp; Connected</div>
      </header>

      <main>
        <section className="hero">
          <div className="avatar-wrap">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="avatar">🎙️</div>
          </div>
          <p className="eyebrow">NEXT-GEN MULTIMODAL ASSISTANT</p>
          <h2>How can I help you today?</h2>
          <p className="muted">
            Conversational Voice, Smart Home IoT, Proactive Agendas &amp; Daily Planning
          </p>
        </section>

        <section className="features">
          <div className="panel">
            <div className="feature-icon">⚡</div>
            <h3>Autonomous Planning</h3>
            <p>Extracts deadlines and schedules reminders directly from your voice and messages.</p>
          </div>
          <div className="panel">
            <div className="feature-icon">🏠</div>
            <h3>Smart Home IoT</h3>
            <p>Control lights, fans, and appliances with real-time power draw and energy monitoring.</p>
          </div>
        </section>

        <section className="chat">
          <div className="messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.role === 'user' ? 'you' : ''}`}
              >
                <strong>{msg.role === 'user' ? 'You' : 'Nova'}</strong>
                <p>{msg.text}</p>
              </div>
            ))}
            {isLoading && (
              <div className="message">
                <strong>Nova</strong>
                <p>Thinking...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Ask Nova anything, e.g. 'Turn on bedroom fan' or 'Remind me tomorrow at 5pm'..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? '...' : 'Send'}
            </button>
          </form>
        </section>
      </main>

      <footer>
        Nova AI Assistant &bull; Multimodal Companion Dashboard &bull; Powered by FastAPI &amp; FastMCP
      </footer>
    </div>
  )
}
