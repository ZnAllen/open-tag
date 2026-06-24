// Control-plane WebSocket client with exponential-backoff reconnection.
import WebSocket from "ws";
import { createLogger } from "../log.js";

export class Connection {
  private ws: WebSocket | null = null;
  private delay = 1000;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private should = true;
  private log = createLogger("daemon:conn");

  constructor(
    private url: string,
    private key: string,
    private onMsg: (m: any) => void,
    private onOpen: () => void,
  ) {}

  connect(): void { this.should = true; this.doConnect(); }
  send(m: unknown): void { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m)); }
  close(): void { this.should = false; if (this.timer) clearTimeout(this.timer); this.ws?.close(); }

  private doConnect(): void {
    if (!this.should) return;
    const wsUrl = this.url.replace(/^http/, "ws") + `/daemon/connect?key=${encodeURIComponent(this.key)}`;
    this.log.info("connecting", { url: this.url });
    this.ws = new WebSocket(wsUrl);
    this.ws.on("open", () => { this.delay = 1000; this.log.info("connected"); this.onOpen(); });
    this.ws.on("message", (d) => { let m: any; try { m = JSON.parse(d.toString()); } catch { return; } this.onMsg(m); });
    this.ws.on("close", () => { this.log.warn("disconnected"); this.scheduleReconnect(); });
    this.ws.on("error", (e: any) => this.log.error("ws error", { detail: String(e?.message ?? e) }));
  }
  private scheduleReconnect(): void {
    if (!this.should || this.timer) return;
    this.log.info("reconnecting", { ms: this.delay });
    this.timer = setTimeout(() => { this.timer = null; this.doConnect(); }, this.delay);
    this.delay = Math.min(this.delay * 2, 30000);
  }
}
