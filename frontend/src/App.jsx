
async function sendMessage(message) {
  const text = message.trim()
  if (!text) return

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: text }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Aura reply:', data.reply)

    // Use your existing chat state to display data.reply.
    // For example, append it to your messages array.
    return data.reply
  } catch (error) {
    console.error('Aura API error:', error)
    return 'I could not reach Aura right now. Please try again.'
  }
}
