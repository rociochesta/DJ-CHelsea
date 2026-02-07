// utils/latencyPing.js
export function startRttPinger(room, onRttMs) {
  if (!room) return () => {};

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let timer = null;

  const onData = (payload) => {
    try {
      const msg = JSON.parse(dec.decode(payload));
      if (msg.type === "PING") {
        const pong = JSON.stringify({ type: "PONG", t: msg.t });
        room.localParticipant.publishData(enc.encode(pong), { reliable: false });
      }
      if (msg.type === "PONG") {
        const rtt = performance.now() - msg.t;
        onRttMs?.(rtt);
      }
    } catch {}
  };

  room.on("dataReceived", onData);

  const sendPing = () => {
    const t = performance.now();
    const ping = JSON.stringify({ type: "PING", t });
    room.localParticipant.publishData(enc.encode(ping), { reliable: false });
  };

  timer = setInterval(sendPing, 1000);
  sendPing();

  return () => {
    clearInterval(timer);
    room.off("dataReceived", onData);
  };
}