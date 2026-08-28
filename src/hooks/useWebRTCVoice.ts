import { useEffect, useRef, useState, useCallback } from 'react';
import type { RoomParticipant } from '../types.ts';
import { proximityVoiceManager } from '../audio/proximityVoice.ts';

export interface VoiceSocketInterface {
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
}

// تنظیمات سرورهای STUN برای اتصال از طریق اینترنت
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTCVoice(
  socket: VoiceSocketInterface | null,
  myId: string,
  participants: RoomParticipant[]
) {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ایجاد کانتینر مخفی برای پخش صدای سایر اعضا
  const getAudioContainer = (): HTMLElement => {
    let container = document.getElementById('webrtc-remote-audio-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'webrtc-remote-audio-container';
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    return container;
  };

  // ارسال ICE Candidateهای صف‌بندی‌شده
  const drainPendingCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current.get(peerId);
    if (queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('Error adding queued ICE candidate:', err);
        }
      }
      pendingCandidatesRef.current.set(peerId, []);
    }
  };

  // ساخت PeerConnection برای اتصال P2P با کاربری دیگر
  const createPeerConnection = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      if (peerConnectionsRef.current.has(remoteUserId)) {
        return peerConnectionsRef.current.get(remoteUserId)!;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current.set(remoteUserId, pc);

      if (!pendingCandidatesRef.current.has(remoteUserId)) {
        pendingCandidatesRef.current.set(remoteUserId, []);
      }

      // افزودن ترک صوتی خودمان به اتصال
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch (err) {
            console.warn('Error adding track to PC:', err);
          }
        });
      }

      // ارسال کاندیدهای شبکه (ICE Candidates)
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('voice:signal', {
            to: remoteUserId,
            signal: event.candidate,
            type: 'candidate',
          });
        }
      };

      // دریافت صدای کاربر مقابل و پخش آن
      pc.ontrack = (event) => {
        const stream =
          event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        let audioEl = remoteAudiosRef.current.get(remoteUserId);

        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = `remote-audio-${remoteUserId}`;
          audioEl.autoplay = true;
          (audioEl as any).playsInline = true;
          audioEl.volume = 1.0;
          getAudioContainer().appendChild(audioEl);
          remoteAudiosRef.current.set(remoteUserId, audioEl);
        }

        audioEl.srcObject = stream;
        audioEl.play().catch(() => {
          const unlockAudio = () => {
            audioEl?.play().catch(() => {});
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
          };
          window.addEventListener('click', unlockAudio, { once: true });
          window.addEventListener('touchstart', unlockAudio, { once: true });
        });

        // Also connect to spatial proximity manager for 3D positional audio
        try {
          proximityVoiceManager.attachRemoteStream(stream);
        } catch (e) {
          console.warn('Spatial audio attach:', e);
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          try {
            pc.close();
          } catch (_) {}
          peerConnectionsRef.current.delete(remoteUserId);
        }
      };

      return pc;
    },
    [socket]
  );

  // گوش دادن به سیگنال‌های Socket برای برقراری ویسکال
  useEffect(() => {
    if (!socket) return;

    const handleVoiceUserJoined = ({ userId }: { userId: string }) => {
      setVoiceMembers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      if (localStreamRef.current && userId !== myId) {
        const pc = createPeerConnection(userId);
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false })
          .then((offer) => pc.setLocalDescription(offer).then(() => offer))
          .then((offer) => {
            socket.emit('voice:signal', { to: userId, signal: offer, type: 'offer' });
          })
          .catch((err) => console.error(`Error sending offer to ${userId}:`, err));
      }
    };

    const handleVoiceUserLeft = ({ userId }: { userId: string }) => {
      setVoiceMembers((prev) => prev.filter((id) => id !== userId));
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) {
        try {
          pc.close();
        } catch (_) {}
        peerConnectionsRef.current.delete(userId);
      }
      const audio = remoteAudiosRef.current.get(userId);
      if (audio) {
        audio.srcObject = null;
        audio.remove();
        remoteAudiosRef.current.delete(userId);
      }
    };

    const handleExistingMembers = async ({ members }: { members: RoomParticipant[] }) => {
      const memberIds = members.map((m) => m.id);
      setVoiceMembers(memberIds);

      if (localStreamRef.current) {
        for (const member of members) {
          if (member.id === myId) continue;
          const pc = createPeerConnection(member.id);
          try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
            await pc.setLocalDescription(offer);
            socket.emit('voice:signal', { to: member.id, signal: offer, type: 'offer' });
          } catch (err) {
            console.error(`Error sending offer to ${member.id}:`, err);
          }
        }
      }
    };

    const handleSignal = async ({ from, signal, type }: { from: string; signal: any; type: string }) => {
      if (from === myId) return;
      const pc = createPeerConnection(from);

      try {
        if (type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          await drainPendingCandidates(from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:signal', { to: from, signal: answer, type: 'answer' });
        } else if (type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          await drainPendingCandidates(from, pc);
        } else if (type === 'candidate') {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
          } else {
            const queue = pendingCandidatesRef.current.get(from) || [];
            queue.push(signal);
            pendingCandidatesRef.current.set(from, queue);
          }
        }
      } catch (err) {
        console.error('Signal handling error:', err);
      }
    };

    socket.on('voice:userJoined', handleVoiceUserJoined);
    socket.on('voice:userLeft', handleVoiceUserLeft);
    socket.on('voice:existingMembers', handleExistingMembers);
    socket.on('voice:signal', handleSignal);

    return () => {
      socket.off('voice:userJoined', handleVoiceUserJoined);
      socket.off('voice:userLeft', handleVoiceUserLeft);
      socket.off('voice:existingMembers', handleExistingMembers);
      socket.off('voice:signal', handleSignal);
    };
  }, [socket, myId, createPeerConnection]);

  // آنالیزور شدت صدا برای نمایش امواج و وضعیت صحبت (Speaking)
  const startAudioAnalyzer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let speakingDebounce = false;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setAudioLevel(normalized);

        const isCurrentlySpeaking = normalized > 14;
        if (isCurrentlySpeaking !== speakingDebounce) {
          speakingDebounce = isCurrentlySpeaking;
          setIsSpeaking(isCurrentlySpeaking);
          if (socket) socket.emit('voice:speaking', { isSpeaking: isCurrentlySpeaking });
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  };

  // ورود به ویسکال
  const joinVoice = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setIsInVoice(true);
      setIsMuted(false);
      startAudioAnalyzer(stream);

      // Add tracks to any existing peer connections
      peerConnectionsRef.current.forEach((pc) => {
        stream.getAudioTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
          } catch (err) {
            console.warn('AddTrack to existing PC error:', err);
          }
        });
      });

      if (socket) socket.emit('voice:join');
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setPermissionError('دسترسی به میکروفون تایید نشد یا دستگاه یافت نشد.');
    }
  };

  // خروج از ویسکال
  const leaveVoice = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (_) {}
    });
    peerConnectionsRef.current.clear();

    remoteAudiosRef.current.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    remoteAudiosRef.current.clear();

    setIsInVoice(false);
    setIsMuted(false);
    setIsSpeaking(false);
    setAudioLevel(0);

    if (socket) socket.emit('voice:leave');
  }, [socket]);

  // قطع/وصل میکروفون
  const toggleMute = () => {
    if (localStreamRef.current) {
      const newMuted = !isMuted;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
      setIsMuted(newMuted);
      if (socket) socket.emit('voice:mute', { isMuted: newMuted });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch (_) {}
      });
    };
  }, []);

  return {
    isInVoice,
    isMuted,
    isSpeaking,
    audioLevel,
    voiceMembers,
    permissionError,
    joinVoice,
    leaveVoice,
    toggleMute,
  };
}
