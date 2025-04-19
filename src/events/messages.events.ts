import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrivateMessagesGateway } from '../private-messages/private-messages.gateway';
import { PrivateMessage } from '../private-messages/private-message.schema';
import { FriendRequest } from '../friend-requests/friend-request.schema';
@Injectable()
export class MessagesEvents {
  constructor(private readonly gateway: PrivateMessagesGateway) {}

  @OnEvent('message.created')
  handleMessageCreated(message: PrivateMessage) {
    const recipientSocket = this.gateway.getUserSocket(message.recipient.toString());
    if (recipientSocket) {
      this.gateway.server.to(recipientSocket).emit('newMessage', message);
    }
  }
  @OnEvent('friendrequest.accepted')
handleFriendRequestAccepted(request: FriendRequest) {
  // Notify both users about the new friendship
  const senderSocket = this.gateway.getUserSocket(request.sender.toString());
  const recipientSocket = this.gateway.getUserSocket(request.recipient.toString());

  if (senderSocket) {
    this.gateway.server.to(senderSocket).emit('friendRequestAccepted', request);
    // Trigger a friend list refresh
    this.gateway.server.to(senderSocket).emit('refreshFriends');
  }

  if (recipientSocket) {
    this.gateway.server.to(recipientSocket).emit('friendRequestAccepted', request);
    // Trigger a friend list refresh
    this.gateway.server.to(recipientSocket).emit('refreshFriends');
  }
}

  @OnEvent('message.updated')
  handleMessageUpdated(payload: { messageId: string; content: string }) {
    this.gateway.server.emit('messageUpdated', payload);
  }

  @OnEvent('message.deleted')
  handleMessageDeleted(messageId: string) {
    this.gateway.server.emit('messageDeleted', messageId);
  }

  @OnEvent('friendrequest.created')
  handleFriendRequestCreated(request: FriendRequest) {
    const recipientSocket = this.gateway.getUserSocket(request.recipient.toString());
    if (recipientSocket) {
      this.gateway.server.to(recipientSocket).emit('newFriendRequest', request);
    }
  }
}