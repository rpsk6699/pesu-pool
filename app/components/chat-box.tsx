'use client'

import { useEffect, useState, useRef } from 'react'
import Pusher from 'pusher-js'

type Message = {
  id: string
  text: string
  sender: { name: string | null }
}

interface ChatBoxProps {
  poolId: string
  userName: string
}

export function ChatBox({ poolId, userName }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false) // <-- NEW: Tracks unread status

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isOpenRef = useRef(isOpen) // Used to check status inside the Pusher callback

  // Keep the ref perfectly synced with the state
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  // 1. Pusher Listener: Always runs in the background to catch notifications
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe(poolId)
    channel.bind('new-message', (newMessage: Message) => {
      // If the chat is closed, trigger the red notification dot!
      if (!isOpenRef.current) {
        setHasUnread(true)
      }
      setMessages((prev) => [...prev, newMessage])
    })

    return () => {
      pusher.unsubscribe(poolId)
    }
  }, [poolId])

  // 2. Fetch History: Only runs when explicitly opened to save API calls
  useEffect(() => {
    if (!isOpen) return

    fetch(`/api/chat?poolId=${poolId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data)
        setHasUnread(false) // Clear the notification badge once they look at it
      })
  }, [isOpen, poolId])

  // Auto-scroll to the newest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const textToSend = inputText
    setInputText('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId: poolId,
          userName: userName,
          text: textToSend,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        alert(`Failed to send: ${errorData.error || 'Check server console'}`)
      }
    } catch (error) {
      console.error('Network error sending message:', error)
      alert('Network error. Is your server running?')
    } finally {
      setIsLoading(false)
    }
  }

  // --- UI FOR CLOSED CHAT BUTTON ---
  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          setHasUnread(false) // Instantly hide the dot on click
        }}
        className="mt-3 relative flex w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        <span>💬</span> Open Pool Chat

        {/* The Unread Notification Dot */}
        {hasUnread && (
          <span className="absolute right-4 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
          </span>
        )}
      </button>
    )
  }

  // --- UI FOR OPEN CHAT ---
  const myMessageCount = messages.filter((m) => m.sender?.name === userName).length
  const messagesLeft = Math.max(0, 15 - myMessageCount)
  const isLimitReached = messagesLeft === 0

  return (
    <div className="mt-3 flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-zinc-100 px-3 py-2 border-b border-zinc-200">
        <span className="text-[12px] font-medium text-zinc-700">Pool Chat</span>
        <button onClick={() => setIsOpen(false)} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800">
          ✕ CLOSE
        </button>
      </div>

      <div className="bg-amber-50 px-3 py-1.5 text-center text-[10px] font-medium text-amber-800 border-b border-amber-100">
        Student App constraints: {messagesLeft} messages remaining.
      </div>

      <div className="flex h-[150px] flex-col gap-2 overflow-y-auto bg-zinc-50 p-3">
        {messages.length === 0 ? (
          <p className="text-center text-[11px] text-zinc-400 mt-4">No messages yet. Keep it brief!</p>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.sender?.name === 'System'
            const isMe = msg.sender?.name === userName

            if (isSystem) {
              return (
                <div key={msg.id} className="my-1 flex justify-center">
                  <div className="rounded-lg bg-zinc-200/70 px-3 py-1 text-[10px] font-medium text-zinc-600 shadow-sm">
                    {msg.text}
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-zinc-400 mb-0.5">{msg.sender?.name ?? 'Someone'}</span>
                <div className={`rounded-lg px-2.5 py-1.5 text-[12px] ${isMe ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-800'}`}>
                  {msg.text}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex border-t border-zinc-200 p-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isLimitReached ? "Message limit reached" : "Message the pool..."}
          className="min-w-0 flex-1 bg-transparent px-2 text-[12px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:opacity-50"
          disabled={isLoading || isLimitReached}
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim() || isLimitReached}
          className="rounded bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}