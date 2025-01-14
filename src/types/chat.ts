export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
  createdAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: string[]; // user IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  isPrivate: boolean;
  members: string[]; // user IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  channelId: string;
  workspaceId: string;
  replyTo?: string; // message ID
  reactions?: {
    [key: string]: string[]; // emoji: userIds[]
  };
  attachments?: {
    url: string;
    type: 'image' | 'file';
    name: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
} 