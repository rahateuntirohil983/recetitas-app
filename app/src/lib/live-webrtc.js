const waitForIceGathering = (peer, timeout = 5000) => new Promise((resolve) => {
  if (peer.iceGatheringState === "complete") {
    resolve();
    return;
  }
  const finish = () => {
    peer.removeEventListener("icegatheringstatechange", check);
    window.clearTimeout(timer);
    resolve();
  };
  const check = () => {
    if (peer.iceGatheringState === "complete") finish();
  };
  const timer = window.setTimeout(finish, timeout);
  peer.addEventListener("icegatheringstatechange", check);
});

const sessionUrlFrom = (response, endpoint) => {
  const location = response.headers.get("location");
  if (!location) return null;
  const endpointUrl = new URL(endpoint);
  if (location.startsWith("/") && endpointUrl.pathname.startsWith("/live/") && !location.startsWith("/live/")) {
    return new URL(`/live${location}`, endpointUrl).href;
  }
  return new URL(location, endpointUrl).href;
};

const exchangeSdp = async (peer, endpoint, token = "") => {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  await waitForIceGathering(peer);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/sdp",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: peer.localDescription.sdp,
  });
  if (!response.ok) throw new Error(response.status === 404 ? "El directo todavía se está conectando." : "No pudimos conectar el video en vivo.");
  const answer = await response.text();
  await peer.setRemoteDescription({ type: "answer", sdp: answer });
  return sessionUrlFrom(response, endpoint);
};

class LiveWebRtcSession {
  constructor({ endpoint, token = "", onState = () => {} }) {
    this.endpoint = endpoint;
    this.token = token;
    this.onState = onState;
    this.peer = null;
    this.sessionUrl = null;
  }

  watchConnection() {
    this.peer.addEventListener("connectionstatechange", () => this.onState(this.peer.connectionState));
  }

  async close() {
    const sessionUrl = this.sessionUrl;
    this.sessionUrl = null;
    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }
    if (sessionUrl) {
      fetch(sessionUrl, {
        method: "DELETE",
        headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
        keepalive: true,
      }).catch(() => null);
    }
  }
}

export class WhipPublisher extends LiveWebRtcSession {
  async connect(stream) {
    this.peer = new RTCPeerConnection();
    this.watchConnection();
    stream.getTracks().forEach((track) => this.peer.addTrack(track, stream));
    this.sessionUrl = await exchangeSdp(this.peer, this.endpoint, this.token);
  }

  async replaceVideoTrack(track) {
    const sender = this.peer?.getSenders().find((item) => item.track?.kind === "video");
    if (sender) await sender.replaceTrack(track);
  }
}

export class WhepReader extends LiveWebRtcSession {
  constructor(options) {
    super(options);
    this.onTrack = options.onTrack || (() => {});
    this.videoQuality = options.videoQuality || "auto";
    this.videoTrack = null;
  }

  async setVideoQuality(quality = "auto") {
    this.videoQuality = quality;
    if (!this.videoTrack?.applyConstraints) return false;
    const maxEdge = quality === "data" ? 640 : quality === "balanced" ? 960 : quality === "high" ? 1280 : null;
    try {
      await this.videoTrack.applyConstraints(maxEdge ? { width: { max: maxEdge }, height: { max: maxEdge } } : {});
      return true;
    } catch {
      return false;
    }
  }

  async connect() {
    this.peer = new RTCPeerConnection();
    this.watchConnection();
    this.peer.addTransceiver("video", { direction: "recvonly" });
    this.peer.addTransceiver("audio", { direction: "recvonly" });
    this.peer.addEventListener("track", async (event) => {
      if (event.track.kind === "video") {
        this.videoTrack = event.track;
        await this.setVideoQuality(this.videoQuality);
      }
      this.onTrack(event.streams[0] || new MediaStream([event.track]));
    });
    this.sessionUrl = await exchangeSdp(this.peer, this.endpoint);
  }

  async close() {
    this.videoTrack = null;
    await super.close();
  }
}
