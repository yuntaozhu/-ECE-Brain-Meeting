import { Server as SocketIOServer, Socket } from "socket.io";

export interface ChatMessagePayload {
  type: "chat";
  sender: string;
  text: string;
  timestamp: number;
  roomId: string;
  userRole?: string;
}

export interface VoiceStatePayload {
  type: "voice_state";
  sender: string;
  isMuted: boolean;
  isSpeaking: boolean;
  timestamp: number;
  roomId: string;
}

export interface A2AEventPayload {
  type: "a2a_event" | "a2a_sync";
  agentName?: string;
  action?: string;
  data: any;
  timestamp: number;
  roomId: string;
}

interface RoomParticipant {
  socketId: string;
  userName: string;
  roomId: string;
  userRole?: string;
  joinedAt: number;
}

const activeParticipants = new Map<string, RoomParticipant>();

export function setupSocketIOServer(io: SocketIOServer) {
  // 1. Setup /ws/meeting namespace for socket.io
  const meetingNs = io.of("/ws/meeting");

  const handleConnection = (socket: Socket) => {
    const queryRoomId = (socket.handshake.query.roomId as string) || "10086";
    const queryUserName = (socket.handshake.query.userName as string) || "参会者";
    const queryUserRole = (socket.handshake.query.userRole as string) || "participant";

    // Auto-join room specified in handshake query or default room
    if (queryRoomId) {
      socket.join(queryRoomId);
      activeParticipants.set(socket.id, {
        socketId: socket.id,
        userName: queryUserName,
        roomId: queryRoomId,
        userRole: queryUserRole,
        joinedAt: Date.now()
      });

      console.log(`[Socket.IO /ws/meeting] ${queryUserName} (${queryUserRole}) connected & joined room ${queryRoomId}`);

      // Broadcast system join notification to all participants in room
      socket.to(queryRoomId).emit("system", {
        type: "system",
        sender: "系统总线",
        text: `【Socket.IO 实时通信】 ${queryUserName} 已加入会议室 ${queryRoomId}`,
        timestamp: Date.now(),
        roomId: queryRoomId
      });
    }

    // Event: join_room
    socket.on("join_room", (data: { roomId: string; userName?: string; userRole?: string }) => {
      const roomId = data.roomId || queryRoomId;
      const userName = data.userName || queryUserName;
      const userRole = data.userRole || queryUserRole;

      socket.join(roomId);
      activeParticipants.set(socket.id, {
        socketId: socket.id,
        userName,
        roomId,
        userRole,
        joinedAt: Date.now()
      });

      console.log(`[Socket.IO /ws/meeting] Explicit join_room: ${userName} in room ${roomId}`);

      meetingNs.to(roomId).emit("system", {
        type: "system",
        sender: "系统总线",
        text: `【Socket.IO 实时通信】 ${userName} 加入会议`,
        timestamp: Date.now(),
        roomId
      });
    });

    // Event: chat / chat_message - Real-time chat for all participants regardless of role
    socket.on("chat", (data: any) => {
      const participant = activeParticipants.get(socket.id);
      const roomId = data.roomId || participant?.roomId || queryRoomId;
      const sender = data.sender || participant?.userName || queryUserName;

      const payload: ChatMessagePayload = {
        type: "chat",
        sender,
        text: data.text || data.message || "",
        timestamp: Date.now(),
        roomId,
        userRole: data.userRole || participant?.userRole
      };

      // Broadcast chat message to everyone in the room
      meetingNs.to(roomId).emit("chat", payload);
      meetingNs.to(roomId).emit("chat_message", payload);
    });

    socket.on("chat_message", (data: any) => {
      const participant = activeParticipants.get(socket.id);
      const roomId = data.roomId || participant?.roomId || queryRoomId;
      const sender = data.sender || participant?.userName || queryUserName;

      const payload: ChatMessagePayload = {
        type: "chat",
        sender,
        text: data.text || data.message || "",
        timestamp: Date.now(),
        roomId,
        userRole: data.userRole || participant?.userRole
      };

      meetingNs.to(roomId).emit("chat", payload);
      meetingNs.to(roomId).emit("chat_message", payload);
    });

    // Event: voice_state / voice_state_update - Voice state changes
    socket.on("voice_state", (data: any) => {
      const participant = activeParticipants.get(socket.id);
      const roomId = data.roomId || participant?.roomId || queryRoomId;
      const sender = data.sender || participant?.userName || queryUserName;

      const payload: VoiceStatePayload = {
        type: "voice_state",
        sender,
        isMuted: !!data.isMuted,
        isSpeaking: !!data.isSpeaking,
        timestamp: Date.now(),
        roomId
      };

      meetingNs.to(roomId).emit("voice_state", payload);
      meetingNs.to(roomId).emit("voice_state_update", payload);
    });

    socket.on("voice_state_update", (data: any) => {
      const participant = activeParticipants.get(socket.id);
      const roomId = data.roomId || participant?.roomId || queryRoomId;
      const sender = data.sender || participant?.userName || queryUserName;

      const payload: VoiceStatePayload = {
        type: "voice_state",
        sender,
        isMuted: !!data.isMuted,
        isSpeaking: !!data.isSpeaking,
        timestamp: Date.now(),
        roomId
      };

      meetingNs.to(roomId).emit("voice_state", payload);
      meetingNs.to(roomId).emit("voice_state_update", payload);
    });

    // Event: a2a_event / a2a_sync - A2A system events synchronization
    socket.on("a2a_event", (data: any) => {
      const participant = activeParticipants.get(socket.id);
      const roomId = data.roomId || participant?.roomId || queryRoomId;

      const payload: A2AEventPayload = {
        type: "a2a_event",
        agentName: data.agentName || data.sender || "A2A Engine",
        action: data.action || "sync",
        data: data.data || data.payload || data,
        timestamp: Date.now(),
        roomId
      };

      meetingNs.to(roomId).emit("a2a_event", payload);
      meetingNs.to(roomId).emit("a2a_sync", payload);
    });

    socket.on("a2a_sync", (data: any) => {
      const participant = activeParticipants.get(socket.id);
      const roomId = data.roomId || participant?.roomId || queryRoomId;

      const payload: A2AEventPayload = {
        type: "a2a_sync",
        agentName: data.agentName || data.sender || "A2A Engine",
        action: data.action || "sync",
        data: data.data || data.payload || data,
        timestamp: Date.now(),
        roomId
      };

      meetingNs.to(roomId).emit("a2a_event", payload);
      meetingNs.to(roomId).emit("a2a_sync", payload);
    });

    // Generic "message" fallback broadcast
    socket.on("message", (data: any) => {
      const participant = activeParticipants.get(socket.id);
      const roomId = data?.roomId || participant?.roomId || queryRoomId;

      let parsed = data;
      if (typeof data === "string") {
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = { text: data };
        }
      }

      meetingNs.to(roomId).emit("message", parsed);
    });

    // Disconnect event
    socket.on("disconnect", () => {
      const participant = activeParticipants.get(socket.id);
      if (participant) {
        console.log(`[Socket.IO /ws/meeting] ${participant.userName} disconnected from room ${participant.roomId}`);
        socket.to(participant.roomId).emit("system", {
          type: "system",
          sender: "系统总线",
          text: `【Socket.IO 实时通信】 ${participant.userName} 已离开会议`,
          timestamp: Date.now(),
          roomId: participant.roomId
        });
        activeParticipants.delete(socket.id);
      }
    });
  };

  meetingNs.on("connection", handleConnection);
  io.on("connection", handleConnection);

  console.log("[Socket.IO Server] Initialized /ws/meeting namespace & root handlers successfully.");
}
