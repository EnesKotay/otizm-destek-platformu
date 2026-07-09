export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'PARENT' | 'EXPERT' | 'ADMIN';
  expertTitle?: string;
  city?: string;
  institution?: string;
  licenseNumber?: string;
  licenseVerified?: boolean;
  latitude?: number;
  longitude?: number;
  specializations?: string[];
  bio?: string;
  verified: boolean;
  kvkkConsent: boolean;
  profileImageUrl?: string;
  isActive?: boolean;
  createdAt: string;
  avgRating?: number;
  articleCount?: number;
  reviewCount?: number;
  acceptingPatients?: boolean;
}

export interface ConsultationReply {
  id: string;
  consultationId: string;
  authorId: string;
  authorName: string;
  authorTitle?: string;
  authorImageUrl?: string;
  content: string;
  createdAt: string;
}

export interface ConsultationCase {
  id: string;
  authorId: string;
  authorName: string;
  authorTitle?: string;
  authorImageUrl?: string;
  title: string;
  description: string;
  tags: string[];
  status: 'OPEN' | 'RESOLVED' | 'ARCHIVED';
  replyCount: number;
  createdAt: string;
  replies?: ConsultationReply[];
}

export interface Tag {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface Child {
  id: string;
  name: string;
  birthDate?: string;
  diagnosisInfo?: string;
  educationProgram?: string;
  therapies?: string;
  gender?: 'ERKEK' | 'KIZ';
  profileImageUrl?: string;
  privacySettings?: Record<string, unknown>;
  treatmentState?: Record<string, unknown>;
  tags?: Tag[];
  tagIds?: string[];
  createdAt: string;
}

export interface DevelopmentNote {
  id: string;
  title: string;
  content?: string;
  category?: string;
  mood?: string;
  authorName?: string;
  noteDate: string;
  childId: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startTime: string;
  endTime?: string;
  recurrenceRule?: string;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
  location?: string;
  reminderMinutesBefore?: number | null;
  color?: string;
  childId: string;
  childName?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  category?: string;
  achievedDate: string;
  childId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  lastMessageAt?: string;
  muted?: boolean;
  archived?: boolean;
}

export interface ReactionSummary {
  count: number;
  reactedByMe: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderProfileImage?: string;
  content: string;
  messageType: string;
  senderRole?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  read: boolean;
  sentAt: string;
  replyToId?: string;
  replyToContent?: string;
  replyToSenderName?: string;
  replyToFileUrl?: string;
  reactions?: Record<string, ReactionSummary>;
  readBy?: User[];
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  category?: string;
  verified: boolean;
  avatarUrl?: string;
  memberCount: number;
  expertCount: number;
  createdByUserId: string;
  isMember: boolean;
  conversationId?: string;
  unreadCount?: number;
  createdAt: string;
}

export interface GroupMeeting {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  meetingUrl?: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
}

export interface PostPrivacySettings {
  showRealName: boolean;
  showChildAge: boolean;
  showSymptoms: boolean;
  showDiagnosis: boolean;
  allowMatching: boolean;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category?: string;
  postType: 'DENEYIM' | 'BASARI_HIKAYESI' | 'TAVSIYE' | 'QUESTION';
  pinned: boolean;
  answered: boolean;
  acceptedAnswerId?: string;
  likeCount: number;
  commentCount: number;
  privacySettings?: PostPrivacySettings;
  tags?: Tag[];
  tagIds?: string[];
  likedByMe?: boolean;
  ownedByMe?: boolean;
  anonymous?: boolean;
  author: User;
  createdAt: string;
}

export interface ForumComment {
  id: string;
  content: string;
  postId: string;
  parentCommentId?: string;
  likeCount: number;
  voteCount: number;
  accepted: boolean;
  upvotedByMe?: boolean;
  downvotedByMe?: boolean;
  anonymous?: boolean;
  expertApproved?: boolean;
  ownedByMe?: boolean;
  author: User;
  createdAt: string;
}

export interface VoteRequest {
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  voteValue: number;
}

export interface SimilarFamily {
  parentId: string;
  parentName: string;
  parentCity?: string;
  childName?: string;
  childAgeRange: string;
  commonTags: Tag[];
  totalCommonTags: number;
  similarityScore: number;
  tagScore: number;
  ageScore: number;
  therapyScore: number;
  educationScore: number;
  sensoryScore: number;
  matchReasons?: string[];
  relationshipStatus?: 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
  mentorRelation?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface SearchResult {
  id: string;
  type: 'POST' | 'ARTICLE' | 'GROUP' | 'EXPERT';
  title: string;
  excerpt?: string;
  createdAt?: string;
  rank: number;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
  summary?: string;
  format?: string;
  mediaUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
  pendingReview?: boolean;
  bookmarked?: boolean;
  tags?: Tag[];
  author?: User;
  published: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  adminNote?: string;
  createdAt?: string;
  reporter?: User;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AdminStats {
  totalUsers: number;
  totalExperts: number;
  pendingExperts: number;
  totalPosts: number;
  totalMessages: number;
  newUsersThisWeek: number;
  pendingReports: number;
}

export interface AppointmentRecord {
  id: string;
  expertId: string;
  expertName: string;
  expertTitle?: string;
  parentId: string;
  parentName: string;
  childId: string;
  childName?: string;
  date: string;
  time: string;
  duration: number;
  type: 'ONLINE' | 'FACE_TO_FACE';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'BLOCKED';
  notes?: string;
  meetingLink?: string;
  calendarEventId?: string;
  sessionNotes?: string;
  cancellationReason?: string;
  rating?: number;
  ratingComment?: string;
  createdAt?: string;
  recurringGroupId?: string;
  recurrenceIndex?: number;
}


export interface ExpertAvailability {
  dayOfWeek: number;
  enabled: boolean;
  startTime?: string | null;
  endTime?: string | null;
  blockedSlots?: string[];
}

export interface PatientSummary {
  id: string;
  parentId: string;
  childId: string;
  name: string;
  parentName: string;
  age: number;
  diagnosis?: string;
  /** Legacy display label used by older views. Prefer lastSessionDate for new code. */
  lastSession?: string;
  /** ISO date string (YYYY-MM-DD) or null when no completed session exists. */
  lastSessionDate: string | null;
  tasksCompleted: number;
  totalTasks: number;
  /** True when the patient has no explicit connection — access is appointment-based. */
  implicit: boolean;
}

export interface ExpertTask {
  id: string;
  expertId: string;
  parentId: string;
  childId: string;
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  frequency?: string;
  materialUrl?: string;
  dueDate?: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface ExpertStats {
  completedThisMonth: number;
  cancelledThisMonth: number;
  totalThisMonth: number;
  avgRating: number;
  pendingTasksCount: number;
  monthlyData: { label: string; completed: number; cancelled: number }[];
}

export interface Medication {
  id: string;
  childId: string;
  name: string;
  dosage?: string;
  unit?: string;
  frequency?: string;
  scheduledTimes?: string[];
  notes?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  todayLogs?: MedicationLog[];
  currentStock?: number;
  stockAlertThreshold?: number;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  childId: string;
  logDate: string;
  scheduledTime?: string;
  taken: boolean;
  takenAt?: string;
  notes?: string;
  sideEffects?: string[];
}

export interface MoodEntry {
  id: string;
  childId: string;
  entryDate: string;
  moodLevel: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  triggers?: string[];
  createdAt: string;
}

export interface WellbeingEntry {
  id: string;
  userId?: string;
  date: string;
  answers: number[];
  score: number;
  notes?: string;
  createdAt: string;
}

export interface ABCEntry {
  id: string;
  childId: string;
  date: string;
  time: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  category: string;
  location: string;
  notes?: string;
  createdAt: string;
}

export interface SleepEntry {
  id: string;
  childId: string;
  sleepDate: string;
  bedtime?: string;
  wakeTime?: string;
  durationMinutes?: number;
  quality?: 1 | 2 | 3 | 4 | 5;
  nightWakings: number;
  notes?: string;
  createdAt: string;
}

export interface StoryPage {
  order: number;
  text: string;
  imageUrl?: string;
}

export interface SocialStory {
  id: string;
  authorId: string;
  authorName?: string;
  title: string;
  category?: string;
  description?: string;
  pages: StoryPage[];
  isPublic: boolean;
  childId?: string;
  viewCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SocialStoryComment {
  id: string;
  socialStoryId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityResult {
  id: string;
  childId: string;
  activityId: string;
  activityTitle: string;
  score: number;
  total: number;
  detail: string;
  completedAt: string;
}

export interface ExpertAnalytics {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalComments: number;
}

export interface ArticleComment {
  id: string;
  content: string;
  articleId: string;
  author: User;
  isExperience?: boolean;
  durationTried?: string;
  effectivenessRating?: number;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  parentId: string;
  parentNote?: string;
  evidenceUrl?: string;
  expertFeedback?: string;
  expertReviewed: boolean;
  submittedAt: string;
  updatedAt: string;
}

export interface ExpertConnectionRequest {
  id: string;
  expertId: string;
  expertName: string;
  childId: string;
  childName: string;
  parentName?: string;
  createdAt: string;
}
