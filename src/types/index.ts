export interface SwarmAgent {
  id: string;
  name: string;
  color: string;
  specialty: string;
}

export interface SwarmMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isAgent: boolean;
  color?: string;
}