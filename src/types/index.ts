// Types for Another I application

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ThoughtDocument {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  documents: ThoughtDocument[];
  isExpanded: boolean;
}

export interface AppState {
  folders: Folder[];
  activeDocumentId: string | null;
  messages: Message[];
  documentContent: string;
}
