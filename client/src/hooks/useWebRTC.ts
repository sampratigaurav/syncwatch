import { create } from 'zustand';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import type { VoiceParticipant } from '../../../shared/types';
import { useRoomStore } from '../store/roomStore';

interface WebRTCState {
  isInVoice: boolean;
  isMuted: boolean;
  localStream: MediaStream | null;
  peerConnections: Map<string, RTCPeerConnection>;
  remoteStreams: Map<string, MediaStream>;
  dataChannels: Map<string, RTCDataChannel>;
  voiceParticipants: VoiceParticipant[];
  permissionDenied: boolean;
  
  cachedSubtitlePayload: string | null;

  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
  initiateCall: (targetId: string) => Promise<void>;
  createPeerConnection: (targetId: string) => RTCPeerConnection;
  sendSubtitlePayload: (payload: string) => void;
  sendFingerprintPayload: (payload: number[] | number) => void;
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

let chunkBuffer: string[] = [];

const setupDataChannel = (dc: RTCDataChannel, targetId: string) => {
  dc.onopen = () => {
    console.log(`DataChannel open with ${targetId}`);
    const state = useWebRTC.getState();
    if (state.cachedSubtitlePayload) {
      // If we have a cached subtitle, send it to this new peer immediately
      const payload = state.cachedSubtitlePayload;
      const chunkSize = 16 * 1024;
      const chunks: string[] = [];
      for (let i = 0; i < payload.length; i += chunkSize) {
        chunks.push(payload.substring(i, i + chunkSize));
      }
      
      dc.send(JSON.stringify({ type: 'START', totalSize: payload.length }));
      chunks.forEach((chunk, index) => {
        dc.send(JSON.stringify({ type: 'CHUNK', payload: chunk, index }));
      });
      dc.send(JSON.stringify({ type: 'END' }));
    }

    const fingerprintPayload = useRoomStore.getState().cachedFingerprintPayload;
    if (fingerprintPayload !== null) {
      dc.send(JSON.stringify({ type: 'FINGERPRINT', payload: fingerprintPayload }));
    }
  };

  dc.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'FINGERPRINT') {
        useRoomStore.getState().setCachedFingerprintPayload(data.payload);
      } else if (data.type === 'START') {
        chunkBuffer = [];
      } else if (data.type === 'CHUNK') {
        chunkBuffer.push(data.payload);
      } else if (data.type === 'END') {
        const fullPayload = chunkBuffer.join('');
        chunkBuffer = [];
        
        // Reconstruct blob and push to store
        if (fullPayload === '') {
          useRoomStore.getState().setSubtitleBlobUrl(null);
        } else {
          const blob = new Blob([fullPayload], { type: 'text/vtt' });
          const url = URL.createObjectURL(blob);
          useRoomStore.getState().setSubtitleBlobUrl(url);
        }
      }
    } catch (e) {
      console.warn("Error parsing datachannel message", e);
    }
  };
  
  dc.onclose = () => {
    const state = useWebRTC.getState();
    const newDc = new Map(state.dataChannels);
    newDc.delete(targetId);
    useWebRTC.setState({ dataChannels: newDc });
  };
};

export const useWebRTC = create<WebRTCState>((set, get) => ({
  isInVoice: false,
  isMuted: false,
  localStream: null,
  peerConnections: new Map(),
  remoteStreams: new Map(),
  dataChannels: new Map(),
  voiceParticipants: [],
  permissionDenied: false,
  cachedSubtitlePayload: null,

  sendSubtitlePayload: (payload: string) => {
    set({ cachedSubtitlePayload: payload });
    const { dataChannels } = get();
    
    const chunkSize = 16 * 1024;
    const chunks: string[] = [];
    for (let i = 0; i < payload.length; i += chunkSize) {
      chunks.push(payload.substring(i, i + chunkSize));
    }

    dataChannels.forEach((dc) => {
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'START', totalSize: payload.length }));
        chunks.forEach((chunk, index) => {
          dc.send(JSON.stringify({ type: 'CHUNK', payload: chunk, index }));
        });
        dc.send(JSON.stringify({ type: 'END' }));
      }
    });
  },

  sendFingerprintPayload: (payload: number[] | number) => {
    const { dataChannels } = get();
    dataChannels.forEach((dc) => {
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'FINGERPRINT', payload }));
      }
    });
  },

  joinVoice: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      });

      set({ localStream: stream, permissionDenied: false, isInVoice: true, isMuted: false });
      socket.emit(EVENTS.VOICE_JOIN);

      // Add track to all existing peer connections and renegotiate
      const { peerConnections } = get();
      peerConnections.forEach(async (pc, targetId) => {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit(EVENTS.WEBRTC_OFFER, { offer, targetId });
        } catch (e) {
           console.error(e);
        }
      });

      // Web Audio API for speaking indicator
      try {
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
      
      // Remove tracks from existing PCs and renegotiate
      peerConnections.forEach(async (pc, targetId) => {
        const senders = pc.getSenders();
        senders.forEach(sender => {
           if (sender.track && sender.track.kind === 'audio') {
              pc.removeTrack(sender);
           }
        });
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit(EVENTS.WEBRTC_OFFER, { offer, targetId });
        } catch (e) {
           console.error(e);
        }
      });
    }
    
    if (pollingInterval) clearInterval(pollingInterval);
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
    
    audioContext = null;
    analyser = null;
    pollingInterval = null;

    set({
      isInVoice: false,
      localStream: null,
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
    const { localStream, peerConnections, dataChannels } = get();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Setup datachannel if we are offering
    const dc = pc.createDataChannel('syncwatch-assets', { negotiated: false });
    const newDataChannels = new Map(dataChannels);
    newDataChannels.set(targetId, dc);
    set({ dataChannels: newDataChannels });
    
    setupDataChannel(dc, targetId);

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel, targetId);
    };

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
        const newDcs = new Map(get().dataChannels);
        newDcs.delete(targetId);
        set({ peerConnections: newPeers, remoteStreams: newRemotes, dataChannels: newDcs });
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

export const setupWebRTCSocketListeners = () => {
  socket.on(EVENTS.VOICE_STATE_UPDATE, (participants: VoiceParticipant[]) => {
    useWebRTC.setState({ voiceParticipants: participants });
  });

  // Room Join logic - automatically establish WebRTC for everyone
  socket.on(EVENTS.ROOM_STATE, (roomState) => {
    const { initiateCall, peerConnections } = useWebRTC.getState();
    roomState.participants.forEach((p: any) => {
       if (p.id !== socket.id && socket.id && socket.id < p.id) {
         if (!peerConnections.has(p.id)) {
           initiateCall(p.id);
         }
       }
    });
  });

  socket.on(EVENTS.PARTICIPANT_UPDATE, (participant) => {
    if (participant.status === 'removed') return;
    
    if (socket.id && socket.id < participant.id) {
       const { peerConnections, initiateCall } = useWebRTC.getState();
       if (!peerConnections.has(participant.id)) {
         initiateCall(participant.id);
       }
    }
  });

  socket.on(EVENTS.WEBRTC_OFFER, async ({ offer, fromId }: { offer: RTCSessionDescriptionInit, fromId: string }) => {
    const { createPeerConnection, peerConnections } = useWebRTC.getState();
    
    if (!offer || typeof offer.sdp !== 'string' || offer.type !== 'offer') {
      console.warn('Rejected invalid WebRTC offer from', fromId);
      return;
    }

    let pc = peerConnections.get(fromId);
    if (!pc) {
       pc = createPeerConnection(fromId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit(EVENTS.WEBRTC_ANSWER, { answer, targetId: fromId });
    } catch (err) {
      console.error("Error handling offer from", fromId, err);
    }
  });

  socket.on(EVENTS.WEBRTC_ANSWER, async ({ answer, fromId }: { answer: RTCSessionDescriptionInit, fromId: string }) => {
    const { peerConnections } = useWebRTC.getState();
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
    const { peerConnections } = useWebRTC.getState();
    const pc = peerConnections.get(fromId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    }
  });
  
  socket.on(EVENTS.VOICE_SPEAKING, ({ isSpeaking, fromId }: { isSpeaking: boolean, fromId: string }) => {
     useWebRTC.setState(state => ({
        voiceParticipants: state.voiceParticipants.map(p => 
           p.id === fromId ? { ...p, isSpeaking } : p
        )
     }));
  });
};

setupWebRTCSocketListeners();
