import { create } from 'zustand';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import type { VoiceParticipant } from '../../../shared/types';

interface VoiceChatState {
  isInVoice: boolean;
  isMuted: boolean;
  localStream: MediaStream | null;
  peerConnections: Map<string, RTCPeerConnection>;
  remoteStreams: Map<string, MediaStream>;
  voiceParticipants: VoiceParticipant[];
  permissionDenied: boolean;

  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
  initiateCall: (targetId: string) => Promise<void>;
  createPeerConnection: (targetId: string) => RTCPeerConnection;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const useVoiceChat = create<VoiceChatState>((set, get) => ({
  isInVoice: false,
  isMuted: false,
  localStream: null,
  peerConnections: new Map(),
  remoteStreams: new Map(),
  voiceParticipants: [],
  permissionDenied: false,

  joinVoice: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        },
        video: false
      });

      set({ localStream: stream, permissionDenied: false, isInVoice: true, isMuted: false });
      socket.emit(EVENTS.VOICE_JOIN);

      // Web Audio API for speaking indicator
      try {
        // Need ts-ignore or window interface check for Safari
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioCtx();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        pollingInterval = setInterval(() => {
          if (!analyser || get().isMuted) return;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const isSpeaking = average > 20;

          const currentSelf = get().voiceParticipants.find(p => p.id === socket.id);
          if (currentSelf && currentSelf.isSpeaking !== isSpeaking) {
            // Optimistic update locally
            set(state => ({
              voiceParticipants: state.voiceParticipants.map(p => 
                p.id === socket.id ? { ...p, isSpeaking } : p
              )
            }));
            socket.emit(EVENTS.VOICE_SPEAKING, { isSpeaking });
          }
        }, 100);
      } catch (e) {
        console.warn("AudioContext error: ", e);
      }
    } catch (err) {
      console.error('Microphone permission denied', err);
      set({ permissionDenied: true });
    }
  },

  leaveVoice: () => {
    const { localStream, peerConnections } = get();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    peerConnections.forEach(pc => pc.close());
    
    if (pollingInterval) clearInterval(pollingInterval);
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
    
    audioContext = null;
    analyser = null;
    pollingInterval = null;

    set({
      isInVoice: false,
      localStream: null,
      peerConnections: new Map(),
      remoteStreams: new Map()
    });

    socket.emit(EVENTS.VOICE_LEAVE);
  },

  toggleMute: () => {
    const { isMuted, localStream } = get();
    const newMuted = !isMuted;
    
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
    }
    
    set({ isMuted: newMuted });
    socket.emit(EVENTS.VOICE_MUTE_TOGGLE, { isMuted: newMuted });
  },

  createPeerConnection: (targetId: string) => {
    const { localStream, peerConnections } = get();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(EVENTS.WEBRTC_ICE_CANDIDATE, { candidate: event.candidate, targetId });
      }
    };

    pc.ontrack = (event) => {
      const newRemote = new Map(get().remoteStreams);
      newRemote.set(targetId, event.streams[0]);
      set({ remoteStreams: newRemote });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        const newPeers = new Map(get().peerConnections);
        newPeers.delete(targetId);
        const newRemotes = new Map(get().remoteStreams);
        newRemotes.delete(targetId);
        set({ peerConnections: newPeers, remoteStreams: newRemotes });
      }
    };

    const newPeers = new Map(peerConnections);
    newPeers.set(targetId, pc);
    set({ peerConnections: newPeers });

    return pc;
  },

  initiateCall: async (targetId: string) => {
    const pc = get().createPeerConnection(targetId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit(EVENTS.WEBRTC_OFFER, { offer, targetId });
    } catch (err) {
      console.error("Error creating offer", err);
    }
  }
}));

// Setup socket listeners outside the store so they always run effectively 
export const setupVoiceSocketListeners = () => {
  socket.on(EVENTS.VOICE_STATE_UPDATE, (participants: VoiceParticipant[]) => {
    useVoiceChat.setState({ voiceParticipants: participants });
  });

  socket.on(EVENTS.VOICE_JOIN, (newParticipant: VoiceParticipant) => {
    const { isInVoice, initiateCall } = useVoiceChat.getState();
    if (isInVoice) {
      initiateCall(newParticipant.id);
    }
  });

  socket.on(EVENTS.WEBRTC_OFFER, async ({ offer, fromId }: { offer: RTCSessionDescriptionInit, fromId: string }) => {
    const { createPeerConnection, isInVoice } = useVoiceChat.getState();
    if (!isInVoice) return;
    
    const pc = createPeerConnection(fromId);
    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(EVENTS.WEBRTC_ANSWER, { answer, targetId: fromId });
    } catch (err) {
      console.error("Error handling offer", err);
    }
  });

  socket.on(EVENTS.WEBRTC_ANSWER, async ({ answer, fromId }: { answer: RTCSessionDescriptionInit, fromId: string }) => {
    const { peerConnections } = useVoiceChat.getState();
    const pc = peerConnections.get(fromId);
    if (pc) {
      try {
        await pc.setRemoteDescription(answer);
      } catch (err) {
        console.error("Error handling answer", err);
      }
    }
  });

  socket.on(EVENTS.WEBRTC_ICE_CANDIDATE, async ({ candidate, fromId }: { candidate: RTCIceCandidateInit, fromId: string }) => {
    const { peerConnections } = useVoiceChat.getState();
    const pc = peerConnections.get(fromId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    }
  });
  
  // Custom listener for speaking indicator
  socket.on(EVENTS.VOICE_SPEAKING, ({ isSpeaking, fromId }: { isSpeaking: boolean, fromId: string }) => {
     useVoiceChat.setState(state => ({
        voiceParticipants: state.voiceParticipants.map(p => 
           p.id === fromId ? { ...p, isSpeaking } : p
        )
     }));
  });
};

// Initialize listeners proactively
setupVoiceSocketListeners();
