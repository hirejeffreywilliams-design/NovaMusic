import { useRef, useCallback, useEffect } from "react";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTCBroadcast(ws: WebSocket | null, isDJ: boolean) {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const analyzerCtxRef = useRef<AudioContext | null>(null);
  const analyzerDataRef = useRef<Uint8Array | null>(null);
  const masterDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const cleanupListenerAudio = useCallback(() => {
    if (analyzerCtxRef.current) {
      analyzerCtxRef.current.close().catch(() => {});
      analyzerCtxRef.current = null;
    }
    analyzerRef.current = null;
    analyzerDataRef.current = null;
  }, []);

  const cleanupListenerPeer = useCallback(() => {
    const pc = peerConnections.current.get("dj");
    if (pc) { pc.close(); peerConnections.current.delete("dj"); }
    cleanupListenerAudio();
  }, [cleanupListenerAudio]);

  const createDJPeerForListener = useCallback((listenerId: string): RTCPeerConnection | null => {
    if (!localStreamRef.current || !ws) return null;
    const existing = peerConnections.current.get(listenerId);
    if (existing) {
      existing.close();
      peerConnections.current.delete(listenerId);
    }
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    peerConnections.current.set(listenerId, pc);
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });
    pc.onicecandidate = (e) => {
      if (e.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "rtc_ice", candidate: e.candidate, toListener: listenerId }));
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        peerConnections.current.delete(listenerId);
      }
    };
    return pc;
  }, [ws]);

  const offerToListener = useCallback(async (listenerId: string) => {
    if (!ws || !localStreamRef.current) return;
    const pc = createDJPeerForListener(listenerId);
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "rtc_offer", sdp: pc.localDescription, toListener: listenerId }));
  }, [ws, createDJPeerForListener]);

  const startBroadcast = useCallback(async (stream: MediaStream, masterDest?: MediaStreamAudioDestinationNode) => {
    if (!isDJ) return;
    localStreamRef.current = stream;
    masterDestRef.current = masterDest || null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "rtc_broadcasting" }));
    }
  }, [isDJ, ws]);

  const stopBroadcast = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (masterDestRef.current) {
      try { masterDestRef.current.disconnect(); } catch (_) {}
      masterDestRef.current = null;
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "rtc_stopped" }));
    }
  }, [ws]);

  const getAnalyzerData = useCallback((): Uint8Array | null => {
    if (analyzerRef.current && analyzerDataRef.current) {
      analyzerRef.current.getByteFrequencyData(analyzerDataRef.current);
      return analyzerDataRef.current;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!ws) return;
    const handler = async (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (isDJ) {
          if (msg.type === "rtc_request_offer") {
            await offerToListener(msg.fromListener || "unknown");
          }
          if (msg.type === "rtc_answer" && msg.fromListener) {
            const pc = peerConnections.current.get(msg.fromListener);
            if (pc && pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }
          }
          if (msg.type === "rtc_ice" && msg.fromListener) {
            const pc = peerConnections.current.get(msg.fromListener);
            if (pc && msg.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
            }
          }
        } else {
          if (msg.type === "rtc_stopped") {
            cleanupListenerPeer();
          }
          if (msg.type === "rtc_broadcasting") {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "rtc_request_offer" }));
            }
          }
          if (msg.type === "rtc_offer") {
            cleanupListenerPeer();
            const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
            peerConnections.current.set("dj", pc);
            pc.ontrack = (e) => {
              const stream = e.streams[0];
              try {
                const ctx = new AudioContext();
                const source = ctx.createMediaStreamSource(stream);
                const analyzer = ctx.createAnalyser();
                analyzer.fftSize = 256;
                analyzerCtxRef.current = ctx;
                analyzerRef.current = analyzer;
                analyzerDataRef.current = new Uint8Array(analyzer.frequencyBinCount);
                source.connect(analyzer);
                analyzer.connect(ctx.destination);
              } catch (_) {}
            };
            pc.onicecandidate = (ev) => {
              if (ev.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "rtc_ice", candidate: ev.candidate }));
              }
            };
            pc.onconnectionstatechange = () => {
              if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                cleanupListenerPeer();
              }
            };
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "rtc_answer", sdp: pc.localDescription }));
            }
          }
          if (msg.type === "rtc_ice" && !msg.fromListener) {
            const pc = peerConnections.current.get("dj");
            if (pc && msg.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
            }
          }
        }
      } catch (_) {}
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws, isDJ, offerToListener, cleanupListenerPeer]);

  useEffect(() => {
    return () => {
      stopBroadcast();
      cleanupListenerAudio();
    };
  }, []);

  return { startBroadcast, stopBroadcast, getAnalyzerData };
}
