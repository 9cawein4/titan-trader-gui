import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export type WsEventType =
  | "trade_executed"
  | "portfolio_update"
  | "risk_event"
  | "kill_switch"
  | "sentiment_update"
  | "system_status"
  | "cycle_complete"
  | "agent_health"
  | "connected"
  | "heartbeat";

export interface WsEvent {
  type: WsEventType;
  data?: unknown;
  timestamp: string;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [agentHealth, setAgentHealth] = useState<"healthy" | "degraded" | "offline">("offline");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsEvent = JSON.parse(event.data);
        switch (msg.type) {
          case "trade_executed":
            queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
            queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
            toast({ title: "Trade Executed", description: `New trade signal processed` });
            break;
          case "portfolio_update":
            queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
            break;
          case "risk_event":
            queryClient.invalidateQueries({ queryKey: ["/api/risk"] });
            toast({ title: "Risk Event", description: "New risk event detected", variant: "destructive" });
            break;
          case "kill_switch":
            queryClient.invalidateQueries({ queryKey: ["/api/risk"] });
            toast({ title: "KILL SWITCH", description: "Kill switch state changed", variant: "destructive" });
            break;
          case "agent_health":
            if (msg.data && typeof msg.data === "object" && "status" in msg.data) {
              setAgentHealth((msg.data as { status: "healthy" | "degraded" | "offline" }).status);
            }
            break;
          case "system_status":
            queryClient.invalidateQueries({ queryKey: ["/api/system"] });
            break;
          case "cycle_complete":
            queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
            queryClient.invalidateQueries({ queryKey: ["/api/sentiment"] });
            queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
            break;
          case "heartbeat":
          case "connected":
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [queryClient, toast]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, agentHealth };
}
