// src/codingrooms/codingrooms.controller.ts changes
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Put,
  Delete,
  ForbiddenException,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CodingRoomsService } from './codingrooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParticipantRole } from './schemas/codingroom.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('coding-rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CodingRoomsController {
  constructor(private readonly codingRoomsService: CodingRoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coding room' })
  async create(@Request() req, @Body() createRoomDto: CreateRoomDto) {
    return this.codingRoomsService.create(req.user._id, createRoomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rooms or public rooms' })
  async findAll(@Request() req, @Query('public') isPublic: string) {
    if (isPublic === 'true') {
      return this.codingRoomsService.findPublicRooms();
    }
    return this.codingRoomsService.findAll(req.user._id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search rooms by name, description or tags' })
  async searchRooms(@Request() req, @Query('q') query: string) {
    if (!query || query.trim() === '') {
      return [];
    }
    return this.codingRoomsService.searchRooms(query, req.user._id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a room by ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    const room = await this.codingRoomsService.findById(id);
    const hasAccess = await this.codingRoomsService.checkUserAccess(
      id,
      req.user._id
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this room');
    }

    return room;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a room' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto
  ) {
    return this.codingRoomsService.update(id, req.user._id, updateRoomDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a room' })
  async delete(@Request() req, @Param('id') id: string) {
    await this.codingRoomsService.delete(id, req.user._id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a room' })
  async joinRoom(@Request() req, @Param('id') id: string) {
    return this.codingRoomsService.addParticipant(id, req.user._id);
  }

  @Post(':id/theme')
  @ApiOperation({ summary: 'Update room theme' })
  async updateTheme(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { theme: string }
  ) {
    const canEdit = await this.codingRoomsService.checkEditPermission(
      id,
      req.user._id
    );
    if (!canEdit) {
      throw new ForbiddenException('Not authorized to change room theme');
    }

    return this.codingRoomsService.updateTheme(id, body.theme);
  }

  @Put(':id/participants/:userId/role')
  @ApiOperation({ summary: 'Update participant role' })
  async updateParticipantRole(
    @Request() req,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { role: ParticipantRole }
  ) {
    const room = await this.codingRoomsService.findById(id);
    const isCreator = room.creator.toString() === req.user._id.toString();
    const isOwner = room.participants.some(
      (p) =>
        p.user.toString() === req.user._id.toString() &&
        p.role === ParticipantRole.OWNER
    );

    if (!isCreator && !isOwner) {
      throw new ForbiddenException(
        'Only room owner can change participant roles'
      );
    }

    return this.codingRoomsService.addParticipant(id, userId, body.role);
  }

  @Delete(':id/participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove participant from room' })
  async removeParticipant(
    @Request() req,
    @Param('id') id: string,
    @Param('participantId') participantId: string
  ) {
    await this.codingRoomsService.removeParticipant(
      id,
      req.user._id,
      participantId
    );
  }
}
