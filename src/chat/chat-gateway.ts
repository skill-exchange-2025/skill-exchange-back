import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from './chat.service'; // Ensure the path is correct
import { CreateMessageDto } from "./create-message.dto";

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer() server: Server;

  // Store connected users by user ID and their sockets
  private users: Map<string, Socket> = new Map();

  // Handle new connection
  handleConnection(client: Socket) {
    console.log('New user connected...', client.id);

    // Assuming user sends a user ID upon connection, extract it from the handshake or another method
    const userId = client.handshake.query.userId as string;  // Example: userId sent by frontend

    if (userId) {
      this.users.set(userId, client);  // Store user ID and socket
      console.log(`User ${userId} connected with socket ID ${client.id}`);
    }

    // Notify everyone that a new user has joined
    client.broadcast.emit('user-joined', {
      message: `New user joined: ${userId}`,
    });

    // Notify the new user that they have joined the chat
    client.emit('user-joined', {
      message: 'You have joined the chat',
    });
  }

  // Handle disconnection
  handleDisconnect(client: Socket) {
    console.log('User disconnected...', client.id);

    // Find and remove user by socket ID
    const userId = [...this.users.entries()].find(([_, socket]) => socket.id === client.id)?.[0];
    if (userId) {
      this.users.delete(userId);
      console.log(`User ${userId} disconnected`);

      // Notify everyone that a user has left
      this.server.emit('user-left', {
        message: `User left: ${userId}`,
      });
    }
  }

  // Handle a new message from a user
  @SubscribeMessage('newM')
  async handleNewMessage(@MessageBody() message: { content: string; sender: string; receiver: string }) {
    const { content, sender, receiver } = message;
    console.log(`New message from ${sender} to ${receiver}: ${content}`);
    const createMessageDto: CreateMessageDto = {
        sender,
        receiver,
        content,
      };

    // Save the message to the database
    await this.chatService.saveMessage(createMessageDto);

    // Find the recipient's socket by user ID (receiver)
    const recipientSocket = this.users.get(receiver);

    if (recipientSocket) {
      // Send the message to the specific user
      recipientSocket.emit('message', { sender, content });
      console.log(`Message sent to user: ${receiver}`);
    } else {
      console.log('User not found, message not sent.');
    }
  }

  // Fetch previous messages for a conversation (optional)
  @SubscribeMessage('getMessages')
async handleGetMessages(@MessageBody() { sender, receiver }: { sender: string; receiver: string }) {
  // Concatenate sender and receiver into a conversationId string
  const conversationId = `${sender}-${receiver}`;

  // Retrieve chat history from the database using conversationId
  const messages = await this.chatService.getMessages(conversationId);

  // Send the chat history back to the requesting user
  const clientSocket = this.users.get(sender);
  if (clientSocket) {
    clientSocket.emit('chat-history', messages);
  }
}

}
