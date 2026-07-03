import api from './api';
import type { ApiResponse } from '@/types';

export interface WeeklyAnswer {
  id: string;
  author: string;
  city?: string;
  text: string;
  likes: number;
  liked: boolean;
  createdAt?: string;
}

export interface WeeklyQuestion {
  id: string;
  tag?: string;
  question: string;
  weekLabel?: string;
  answers: WeeklyAnswer[];
}

export interface CommunityMeetup {
  id: string;
  title: string;
  city: string;
  district?: string;
  venue?: string;
  date: string;
  time?: string;
  description?: string;
  organizer?: string;
  attendees: number;
  joined: boolean;
  emoji?: string;
  createdAt?: string;
}

export const communityService = {
  getWeeklyQuestions: () =>
    api.get<ApiResponse<WeeklyQuestion[]>>('/community/weekly-questions').then(r => r.data.data),

  createWeeklyAnswer: (questionId: string, text: string) =>
    api.post<ApiResponse<WeeklyAnswer>>(`/community/weekly-questions/${questionId}/answers`, { text }).then(r => r.data.data),

  toggleWeeklyAnswerLike: (answerId: string) =>
    api.post<ApiResponse<WeeklyAnswer>>(`/community/weekly-answers/${answerId}/like`).then(r => r.data.data),

  getMeetups: (city?: string) =>
    api.get<ApiResponse<CommunityMeetup[]>>('/community/meetups', { params: city && city !== 'Tümü' ? { city } : undefined })
      .then(r => r.data.data),

  createMeetup: (data: Partial<CommunityMeetup>) =>
    api.post<ApiResponse<CommunityMeetup>>('/community/meetups', data).then(r => r.data.data),

  toggleMeetupAttendance: (meetupId: string) =>
    api.post<ApiResponse<CommunityMeetup>>(`/community/meetups/${meetupId}/attendance`).then(r => r.data.data),
};
