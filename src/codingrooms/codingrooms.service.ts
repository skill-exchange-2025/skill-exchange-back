import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CodingRoom,
  CodingRoomDocument,
  ParticipantRole,
} from './schemas/codingroom.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ObjectId } from 'mongodb';

@Injectable()
export class CodingRoomsService {
  constructor(
    @InjectModel(CodingRoom.name)
    private codingRoomModel: Model<CodingRoomDocument>
  ) {}

  async create(
    creatorId: string,
    createRoomDto: CreateRoomDto
  ): Promise<CodingRoom> {
    const newRoom = new this.codingRoomModel({
      creator: creatorId,
      ...createRoomDto,
      participants: [{ user: creatorId, role: ParticipantRole.OWNER }],
    });

    return await newRoom.save();
  }

  async findAll(userId: string): Promise<CodingRoom[]> {
    return this.codingRoomModel
      .find({
        $or: [
          { creator: userId },
          { 'participants.user': userId },
          { isPrivate: false },
        ],
      })
      .populate('creator', 'username email')
      .populate('participants.user', 'username email')
      .exec();
  }

  async findById(id: string): Promise<CodingRoom> {
    const room = await this.codingRoomModel
      .findById(id)
      .populate('creator', 'username email')
      .populate('participants.user', 'username email')
      .exec();

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async update(
    id: string,
    userId: string,
    updateRoomDto: UpdateRoomDto
  ): Promise<CodingRoom> {
    const room = await this.findById(id);

    // Check if user has permission to update
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const isCreator = room.creator.toString() === userId;
    const isOwner = room.participants.some(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string,@typescript-eslint/no-unsafe-enum-comparison
      (p) => p.user.toString() === userId && p.role === ParticipantRole.OWNER
    );

    if (!isCreator && !isOwner) {
      throw new ForbiddenException('Only room owner can update room details');
    }

    const updatedRoom = await this.codingRoomModel
      .findByIdAndUpdate(id, updateRoomDto, { new: true })
      .exec();

    if (!updatedRoom) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return updatedRoom;
  }

  async updateCode(
    roomId: string,
    code: string,
    language?: string
  ): Promise<CodingRoom> {
    const updateData: any = {};

    if (code !== null && code !== undefined) {
      updateData.currentCode = code;
    }

    if (language) {
      updateData.language = language;
    }

    const updatedRoom = await this.codingRoomModel
      .findByIdAndUpdate(roomId, updateData, { new: true })
      .exec();

    if (!updatedRoom) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return updatedRoom;
  }

  async updateTheme(roomId: string, theme: string): Promise<CodingRoom> {
    const updatedRoom = await this.codingRoomModel
      .findByIdAndUpdate(roomId, { theme }, { new: true })
      .exec();

    if (!updatedRoom) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return updatedRoom;
  }

  async delete(id: string, userId: string): Promise<void> {
    const room = await this.findById(id);

    // Only creator can delete the room
    if (room.creator.toString() !== userId) {
      throw new ForbiddenException('Only the room creator can delete it');
    }

    const deletedRoom = await this.codingRoomModel.findByIdAndDelete(id).exec();

    if (!deletedRoom) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
  }

  async addParticipant(
    roomId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.VIEWER
  ): Promise<CodingRoom> {
    const room = await this.findById(roomId);

    // Check if user is already a participant
    const existingParticipant = room.participants.find(
      (p) => p.user.toString() === userId
    );

    if (existingParticipant) {
      // Update role if it's different
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (existingParticipant.role !== role) {
        const updatedRoom = await this.codingRoomModel
          .findOneAndUpdate(
            { _id: roomId, 'participants.user': userId },
            { $set: { 'participants.$.role': role } },
            { new: true }
          )
          .exec();

        if (!updatedRoom) {
          throw new NotFoundException(`Room with ID ${roomId} not found`);
        }

        return updatedRoom;
      }
      return room;
    }

    // Add new participant
    const updatedRoom = await this.codingRoomModel
      .findByIdAndUpdate(
        roomId,
        { $push: { participants: { user: userId, role } } },
        { new: true }
      )
      .exec();

    if (!updatedRoom) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return updatedRoom;
  }

  async removeParticipant(
    roomId: string,
    userId: string,
    participantId: string
  ): Promise<CodingRoom> {
    const room = await this.findById(roomId);

    // Check if requester has permission to remove participants
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const isCreator = room.creator.toString() === userId;
    const isOwner = room.participants.some(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      (p) => p.user.toString() === userId && p.role === ParticipantRole.OWNER
    );

    if (!isCreator && !isOwner) {
      throw new ForbiddenException('Only room owner can remove participants');
    }

    // Cannot remove the creator
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (participantId === room.creator.toString()) {
      throw new ForbiddenException('Cannot remove the room creator');
    }

    const updatedRoom = await this.codingRoomModel
      .findByIdAndUpdate(
        roomId,
        { $pull: { participants: { user: participantId } } },
        { new: true }
      )
      .exec();

    if (!updatedRoom) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return updatedRoom;
  }

  async checkUserAccess(roomId: string, userId: string): Promise<boolean> {
    // Validate roomId is a valid ObjectId
    if (!ObjectId.isValid(roomId)) {
      return false;
    }

    const room = await this.codingRoomModel.findById(roomId).exec();
    if (!room) return false;

    // If room is public, allow access
    if (!room.isPrivate) return true;

    // Compare creator ID with userId
    const creatorId = room.creator.toString();
    const normalizedUserId = userId.toString();

    if (creatorId === normalizedUserId) return true;

    // Check if user is a participant
    const participant = room.participants.find((p) => {
      const participantId =
        p.user instanceof ObjectId
          ? p.user.toString()
          : p.user._id
            ? p.user._id.toString()
            : p.user.toString();
      return participantId === normalizedUserId;
    });

    return !!participant;
  }

  async checkEditPermission(roomId: string, userId: string): Promise<boolean> {
    const room = await this.codingRoomModel.findById(roomId).exec();
    if (!room) return false;

    // If user is creator, allow edit
    if (room.creator.toString() === userId) return true;

    // Check if user has editor or owner role
    const participant = room.participants.find(
      (p) => p.user.toString() === userId
    );

    if (!participant) return false;

    return (
      participant.role === ParticipantRole.EDITOR ||
      participant.role === ParticipantRole.OWNER
    );
  }

  async findPublicRooms(): Promise<CodingRoom[]> {
    return this.codingRoomModel
      .find({
        isPrivate: false,
        status: 'active',
      })
      .populate('creator', 'username email')
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }

  async searchRooms(query: string, userId: string): Promise<CodingRoom[]> {
    const searchRegex = new RegExp(query, 'i');

    return this.codingRoomModel
      .find({
        $and: [
          {
            $or: [
              { name: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
              { tags: { $in: [searchRegex] } },
            ],
          },
          {
            $or: [
              { creator: userId },
              { 'participants.user': userId },
              { isPrivate: false },
            ],
          },
        ],
      })
      .populate('creator', 'username email')
      .populate('participants.user', 'username email')
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }
}
