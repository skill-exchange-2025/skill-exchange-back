import {
    MessageBody,
    type OnGatewayConnection,
    type OnGatewayDisconnect,
    type OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
  } from "@nestjs/websockets"
  import type { Server, Socket } from "socket.io"
  
  interface User {
    socketId: string
    username: string
    channel: string
  }
  
  interface Message {
    sender: string
    message: string
    channel: string
    timestamp: string
  }
  
  @WebSocketGateway({
    cors: {
      origin: "http://localhost:5000",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  })
  export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server
    private users = new Map<string, User>()
  
    afterInit(server: Server) {
      console.log("WebSocket initialized")
    }
  
    handleConnection(client: Socket) {
      console.log(`Client connected: ${client.id}`)
    }
  
    handleDisconnect(client: Socket) {
      const user = this.users.get(client.id)
      if (user) {
        console.log(`${user.username} disconnected from channel ${user.channel}`)
        this.users.delete(client.id)
  
        // Notify others that a user left
        this.server.emit("message", {
          sender: "System",
          message: `${user.username} has left the chat.`,
          channel: user.channel,
          timestamp: new Date().toISOString(),
        })
  
        // Emit updated users list
        this.emitUserList()
      }
    }
  
    @SubscribeMessage("join")
    handleJoin(@MessageBody() data: { username: string, channel: string }, client: Socket) {
      const { username, channel } = data
  
      // Store the user with their channel
      this.users.set(client.id, { socketId: client.id, username, channel })
      console.log(`${username} joined channel ${channel}`)
  
      // Send a welcome message to the specific channel
      this.server.emit("message", {
        sender: "System",
        message: `${username} has joined #${channel}.`,
        channel,
        timestamp: new Date().toISOString(),
      })
  
      // Emit updated users list
      this.emitUserList()
    }
  
    @SubscribeMessage('message')
    handleMessage(@MessageBody() data: Message) {
      console.log(`Message received in channel ${data.channel}: ${data.sender}: ${data.message}`);
      // Broadcast the message to all clients
      this.server.emit('message', data);
    }
  
    private emitUserList() {
      const usersList = Array.from(this.users.values()).map((user) => user.username)
      this.server.emit("users", usersList)
    }
  }
  
  