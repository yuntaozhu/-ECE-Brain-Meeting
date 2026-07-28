export type AgendaStageType = 'IceBreaking' | 'MainDiscussion' | 'Conclusion';
export type UserRoleType = 'creator' | 'attendee';

export interface DynamicAgendaItem {
  id: string; // 'IceBreaking' | 'MainDiscussion' | 'Conclusion'
  title: string;
  description: string;
  durationSeconds: number;
}

export interface KaibanAnalysisResult {
  shouldIntervene: boolean;
  interventionText: string;
  latestToDos: string[];
  nextStageRecommendation?: AgendaStageType | null;
}

export interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: Date;
}

