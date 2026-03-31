import React, { useEffect, useState, useCallback, useRef } from 'react'
import type { ExtensionState, ExtensionMessage, MessageResponse, Participant } from '../shared/messages'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner(): React.JSX.Element {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        border: '2px solid #1f2937',
        borderTopColor: '#1D9E75',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  const [extState, setExtState] = useState<ExtensionState | null>(null)
  const [initialised, setInitialised] = useState(false)
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [leaveArmed, setLeaveArmed] = useState(false)
  const [isYouTube, setIsYouTube] = useState(false)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Mount: load nickname, get state, detect YouTube tab ──────────────────

  useEffect(() => {
    chrome.storage.local.get(['nickname'], (result) => {
      if (typeof result['nickname'] === 'string') setNickname(result['nickname'])
    })

    chrome.runtime.sendMessage(
      { type: 'GET_STATE' } satisfies ExtensionMessage,
      (response: ExtensionState) => {
        if (chrome.runtime.lastError) {
          setInitialised(true)
          return
        }
        setExtState(response)
        setInitialised(true)
      },
    )

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? ''
      setIsYouTube(url.includes('youtube.com/watch'))
    })

    const listener = (msg: ExtensionMessage) => {
      if (msg.type === 'STATE_UPDATE') setExtState(msg.state)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (nickname.trim().length < 2) {
      setError('Nickname must be at least 2 characters')
      return
    }
    setError('')
    setIsBusy(true)
    chrome.storage.local.set({ nickname: nickname.trim() })
    chrome.runtime.sendMessage(
      { type: 'CREATE_ROOM', nickname: nickname.trim() } satisfies ExtensionMessage,
      (response: MessageResponse | undefined) => {
        setIsBusy(false)
        if (chrome.runtime.lastError || !response?.success) {
          setError(response?.success === false ? response.error : 'Failed to create room')
        }
      },
    )
  }, [nickname])

  const handleJoin = useCallback(() => {
    if (nickname.trim().length < 2) {
      setError('Nickname must be at least 2 characters')
      return
    }
    if (!roomCode.trim()) {
      setError('Enter a room code')
      return
    }
    setError('')
    setIsBusy(true)
    chrome.storage.local.set({ nickname: nickname.trim() })
    chrome.runtime.sendMessage(
      {
        type: 'JOIN_ROOM',
        roomId: roomCode.trim().toUpperCase(),
        nickname: nickname.trim(),
      } satisfies ExtensionMessage,
      (response: MessageResponse | undefined) => {
        setIsBusy(false)
        if (chrome.runtime.lastError || !response?.success) {
          setError(response?.success === false ? response.error : 'Failed to join room')
        }
      },
    )
  }, [nickname, roomCode])

  const handleLeave = useCallback(() => {
    if (!leaveArmed) {
      setLeaveArmed(true)
      leaveTimerRef.current = setTimeout(() => setLeaveArmed(false), 3_000)
      return
    }
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setLeaveArmed(false)
    chrome.runtime.sendMessage({ type: 'LEAVE_ROOM' } satisfies ExtensionMessage).catch(() => {})
  }, [leaveArmed])

  const handleCopy = useCallback(() => {
    if (extState?.roomId) {
      navigator.clipboard.writeText(extState.roomId).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2_000)
      })
    }
  }, [extState?.roomId])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!initialised) return <LoadingView />

  if (extState?.isInRoom) {
    return (
      <InRoomView
        state={extState}
        copied={copied}
        leaveArmed={leaveArmed}
        onCopy={handleCopy}
        onLeave={handleLeave}
      />
    )
  }

  return (
    <IdleView
      nickname={nickname}
      setNickname={setNickname}
      roomCode={roomCode}
      setRoomCode={setRoomCode}
      error={error}
      isYouTube={isYouTube}
      isBusy={isBusy}
      onCreate={handleCreate}
      onJoin={handleJoin}
    />
  )
}

// ─── Loading view ─────────────────────────────────────────────────────────────

function LoadingView(): React.JSX.Element {
  return (
    <div style={S.container}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
        <Spinner />
        <span style={{ color: '#6b7280', fontSize: 13 }}>Connecting…</span>
      </div>
    </div>
  )
}

// ─── Idle view (create / join) ────────────────────────────────────────────────

interface IdleViewProps {
  nickname: string
  setNickname: (v: string) => void
  roomCode: string
  setRoomCode: (v: string) => void
  error: string
  isYouTube: boolean
  isBusy: boolean
  onCreate: () => void
  onJoin: () => void
}

function IdleView({
  nickname,
  setNickname,
  roomCode,
  setRoomCode,
  error,
  isYouTube,
  isBusy,
  onCreate,
  onJoin,
}: IdleViewProps): React.JSX.Element {
  return (
    <div style={S.container}>
      {/* Logo */}
      <div style={S.header}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
          <circle cx="12" cy="12" r="10" stroke="#1D9E75" strokeWidth="2" />
          <path d="M9 8l7 4-7 4V8z" fill="#1D9E75" />
        </svg>
        <span style={S.logo}>SyncWatch</span>
      </div>

      {/* YouTube detection status */}
      <div style={{ marginBottom: 16 }}>
        {isYouTube ? (
          <div style={{ color: '#1D9E75', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>●</span> YouTube video detected
          </div>
        ) : (
          <div style={{ color: '#6b7280', fontSize: 12 }}>
            Navigate to a YouTube video first
          </div>
        )}
      </div>

      {/* Nickname */}
      <div style={S.field}>
        <label style={S.label}>Your nickname</label>
        <input
          style={S.input}
          type="text"
          value={nickname}
          placeholder="e.g. Alice"
          maxLength={24}
          onChange={e => setNickname(e.target.value)}
        />
      </div>

      {/* Create Room */}
      <button
        style={{ ...S.btnPrimary, opacity: isBusy ? 0.6 : 1 }}
        disabled={isBusy}
        onClick={onCreate}
      >
        {isBusy ? <Spinner /> : 'Create Room'}
      </button>

      {/* Divider */}
      <div style={S.divider}>
        <hr style={S.dividerLine} />
        <span style={S.dividerText}>or</span>
        <hr style={S.dividerLine} />
      </div>

      {/* Join Room */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...S.input, flex: 1, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}
          type="text"
          value={roomCode}
          placeholder="ROOM CODE"
          maxLength={12}
          onChange={e => setRoomCode(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') onJoin() }}
        />
        <button
          style={{ ...S.btnSecondary, opacity: isBusy ? 0.6 : 1 }}
          disabled={isBusy}
          onClick={onJoin}
        >
          {isBusy ? <Spinner /> : 'Join'}
        </button>
      </div>

      {/* Error */}
      {error && <div style={S.error}>{error}</div>}
    </div>
  )
}

// ─── In-room view ─────────────────────────────────────────────────────────────

interface InRoomViewProps {
  state: ExtensionState
  copied: boolean
  leaveArmed: boolean
  onCopy: () => void
  onLeave: () => void
}

function InRoomView({ state, copied, leaveArmed, onCopy, onLeave }: InRoomViewProps): React.JSX.Element {
  const host = state.participants.find(p => p.role === 'host')

  return (
    <div style={S.container}>
      {/* Logo small */}
      <div style={{ ...S.header, marginBottom: 12 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
          <circle cx="12" cy="12" r="10" stroke="#1D9E75" strokeWidth="2" />
          <path d="M9 8l7 4-7 4V8z" fill="#1D9E75" />
        </svg>
        <span style={{ ...S.logo, fontSize: 15 }}>SyncWatch</span>
        <ConnectionDot status={state.connectionStatus} />
      </div>

      {/* Room code + copy */}
      <div style={S.roomCodeBox}>
        <div style={S.roomCode}>{state.roomId}</div>
        <button style={S.copyBtn} onClick={onCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Role badge */}
      <div style={{ marginBottom: 12 }}>
        {state.role === 'host' ? (
          <span style={S.badgeHost}>You are the host</span>
        ) : (
          <span style={S.badgeViewer}>
            Following {host?.nickname ?? 'host'}
          </span>
        )}
      </div>

      {/* Latency */}
      {state.latencyMs > 0 && (
        <div style={S.latency}>Latency: {state.latencyMs} ms</div>
      )}

      {/* Participants */}
      <div style={{ marginBottom: 16 }}>
        <div style={S.sectionLabel}>Participants ({state.participants.length})</div>
        {state.participants.map(p => (
          <ParticipantRow key={p.id} participant={p} myNickname={state.nickname} />
        ))}
        {state.participants.length === 0 && (
          <div style={{ color: '#6b7280', fontSize: 12, padding: '4px 0' }}>Waiting for others…</div>
        )}
      </div>

      {/* Leave */}
      <button
        style={{ ...S.btnLeave, borderColor: leaveArmed ? '#ef4444' : '#374151' }}
        onClick={onLeave}
      >
        {leaveArmed ? 'Tap again to confirm leave' : 'Leave Room'}
      </button>
    </div>
  )
}

function ParticipantRow({ participant: p, myNickname }: { participant: Participant; myNickname: string }): React.JSX.Element {
  const isMe = p.nickname === myNickname

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #1a1a24' }}>
      {/* Avatar */}
      <div style={S.avatar}>{initials(p.nickname)}</div>

      {/* Name + role */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: isMe ? 600 : 400, fontSize: 13, color: isMe ? '#e0e0e0' : '#b0b0b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.nickname}{isMe && <span style={{ color: '#6b7280', fontWeight: 400 }}> (you)</span>}
          </span>
          <span style={p.role === 'host' ? S.tagHost : S.tagViewer}>
            {p.role}
          </span>
        </div>
      </div>

      {/* Status dot */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#1D9E75', flexShrink: 0 }} />
    </div>
  )
}

function ConnectionDot({ status }: { status: ExtensionState['connectionStatus'] }): React.JSX.Element {
  const color = status === 'connected' ? '#1D9E75' : status === 'connecting' ? '#f59e0b' : '#6b7280'
  return <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, marginLeft: 'auto', flexShrink: 0 }} />
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  container: {
    width: 320,
    backgroundColor: '#0a0a0f',
    padding: 16,
    boxSizing: 'border-box' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 16,
    fontWeight: 700,
    color: '#e0e0e0',
    letterSpacing: -0.3,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    backgroundColor: '#13131a',
    border: '1px solid #1f2937',
    borderRadius: 6,
    color: '#e0e0e0',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  btnPrimary: {
    width: '100%',
    padding: '10px 0',
    backgroundColor: '#1D9E75',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  btnSecondary: {
    padding: '8px 16px',
    backgroundColor: '#13131a',
    color: '#1D9E75',
    border: '1px solid #1D9E75',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  btnLeave: {
    width: '100%',
    padding: '9px 0',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #374151',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '12px 0',
  },
  dividerLine: {
    flex: 1,
    border: 'none',
    borderTop: '1px solid #1f2937',
    margin: 0,
  },
  dividerText: {
    fontSize: 12,
    color: '#6b7280',
  },
  error: {
    marginTop: 10,
    padding: '7px 10px',
    backgroundColor: '#1a0a0a',
    border: '1px solid #7f1d1d',
    borderRadius: 5,
    color: '#fca5a5',
    fontSize: 12,
  },
  roomCodeBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#13131a',
    border: '1px solid #1f2937',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 12,
  },
  roomCode: {
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: 700,
    color: '#e0e0e0',
    letterSpacing: 3,
  },
  copyBtn: {
    padding: '5px 12px',
    backgroundColor: '#1D9E75',
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  badgeHost: {
    display: 'inline-block',
    padding: '3px 10px',
    backgroundColor: '#0d2e22',
    color: '#1D9E75',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  badgeViewer: {
    display: 'inline-block',
    padding: '3px 10px',
    backgroundColor: '#1a1a24',
    color: '#6b7280',
    borderRadius: 12,
    fontSize: 12,
  },
  latency: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
    fontWeight: 600,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#0d2e22',
    color: '#1D9E75',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tagHost: {
    display: 'inline-block',
    padding: '1px 6px',
    backgroundColor: '#0d2e22',
    color: '#1D9E75',
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 600,
  },
  tagViewer: {
    display: 'inline-block',
    padding: '1px 6px',
    backgroundColor: '#1a1a24',
    color: '#6b7280',
    borderRadius: 8,
    fontSize: 10,
  },
} as const
