import { Server as SocketIOServer } from 'socket.io'; import { Server as HttpServer } from 'http';
export let io: SocketIOServer;
export function initializeWebSocket(server: HttpServer) {
  io = new SocketIOServer(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
  io.on("connection", (socket) => {
    socket.on("intervene_call", (data) => { io.emit("intervention_triggered", { message: "Supervisor interveio na chamada!" }); });
  });
}
