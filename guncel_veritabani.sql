--
-- PostgreSQL database dump
--

-- Dumped from database version 16.2
-- Dumped by pg_dump version 16.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abc_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abc_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    entry_date date NOT NULL,
    entry_time time without time zone,
    antecedent text NOT NULL,
    behavior text NOT NULL,
    consequence text NOT NULL,
    intensity integer NOT NULL,
    category character varying(255),
    location character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT abc_entries_intensity_check CHECK (((intensity >= 1) AND (intensity <= 5)))
);


--
-- Name: appointment_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    old_status character varying(20),
    new_status character varying(20) NOT NULL,
    changed_by uuid,
    note text,
    changed_at timestamp without time zone DEFAULT now()
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expert_id uuid NOT NULL,
    parent_id uuid,
    child_id uuid,
    appointment_date date NOT NULL,
    appointment_time time without time zone NOT NULL,
    duration integer DEFAULT 50 NOT NULL,
    type character varying(30) DEFAULT 'FACE_TO_FACE'::character varying NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    notes text,
    session_notes text,
    cancellation_reason text,
    meeting_link character varying(500),
    calendar_event_id uuid,
    rating integer,
    rating_comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    recurring_group_id uuid,
    recurrence_index integer,
    deleted_at timestamp without time zone,
    late_cancellation boolean DEFAULT false NOT NULL,
    cancellation_by character varying(20),
    session_summary text,
    follow_up_recommendations text,
    follow_up_task text,
    appointment_topic character varying(250),
    pre_session_notes text,
    CONSTRAINT chk_appointment_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'BLOCKED'::character varying])::text[]))),
    CONSTRAINT chk_appointment_type CHECK (((type)::text = ANY ((ARRAY['FACE_TO_FACE'::character varying, 'ONLINE'::character varying])::text[])))
);


--
-- Name: article_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    article_id uuid NOT NULL,
    author_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_experience boolean DEFAULT false NOT NULL,
    duration_tried character varying(50),
    effectiveness_rating integer,
    CONSTRAINT article_comments_effectiveness_rating_check CHECK (((effectiveness_rating >= 1) AND (effectiveness_rating <= 5)))
);


--
-- Name: article_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_tags (
    article_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(255) NOT NULL,
    resource_type character varying(255),
    resource_id uuid,
    ip_address character varying(255),
    details jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bep_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bep_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    child_id uuid NOT NULL,
    created_by uuid NOT NULL,
    student_name text NOT NULL,
    diagnosis text,
    performance text,
    goals text,
    school_year character varying(255),
    shared_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: buddy_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buddy_relationships (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    requester_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status character varying(255) DEFAULT 'PENDING'::character varying NOT NULL,
    is_mentor_relation boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    request_message character varying(600)
);


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    child_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type character varying(255) NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    recurrence_rule character varying(255),
    reminder_enabled boolean DEFAULT true,
    color character varying(255) DEFAULT '#4F46E5'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'PLANNED'::character varying NOT NULL,
    reminder_minutes_before integer DEFAULT 60,
    location character varying(255),
    reminder_sent boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_calendar_status CHECK (((status)::text = ANY ((ARRAY['PLANNED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: child_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.child_tags (
    child_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: children; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.children (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parent_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    birth_date date,
    diagnosis_info text,
    education_program text,
    therapies text,
    privacy_settings jsonb DEFAULT '{"visible_to_groups": false, "visible_to_experts": false}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    gender character varying(10),
    profile_image_url character varying(512)
);


--
-- Name: clinical_data_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_data_shares (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parent_id uuid NOT NULL,
    child_id uuid NOT NULL,
    expert_id uuid NOT NULL,
    share_behavior_journal boolean DEFAULT false,
    share_sensory_profile boolean DEFAULT false,
    share_screening_results boolean DEFAULT false,
    share_daily_tracker boolean DEFAULT false,
    status character varying(255) DEFAULT 'ACTIVE'::character varying NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: community_meetup_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_meetup_attendees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    meetup_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: community_meetups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_meetups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    district character varying(255),
    venue character varying(255),
    meetup_date date NOT NULL,
    meetup_time time without time zone,
    description text,
    emoji character varying(255),
    organizer_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: conversation_archived_by; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_archived_by (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: conversation_muted_by; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_muted_by (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_participants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: conversation_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    archived boolean DEFAULT false NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying(255) DEFAULT 'DIRECT'::character varying NOT NULL,
    last_message_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    title character varying(255)
);


--
-- Name: development_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.development_notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    child_id uuid NOT NULL,
    title text NOT NULL,
    content text,
    category character varying(255),
    mood character varying(255),
    note_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: diet_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diet_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    user_id uuid NOT NULL,
    gfcf_diet boolean DEFAULT false NOT NULL,
    sugar_free boolean DEFAULT false NOT NULL,
    dairy_free boolean DEFAULT false NOT NULL,
    gluten_free boolean DEFAULT false NOT NULL,
    soy_free boolean DEFAULT false NOT NULL,
    egg_free boolean DEFAULT false NOT NULL,
    other_diet character varying(255),
    notes text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: emergency_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_cards (
    id uuid NOT NULL,
    child_id uuid NOT NULL,
    data jsonb,
    updated_at timestamp(6) without time zone,
    user_id uuid NOT NULL
);


--
-- Name: expert_availabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_availabilities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expert_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    CONSTRAINT expert_availabilities_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);


--
-- Name: expert_availability_blocked_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_availability_blocked_slots (
    availability_id uuid NOT NULL,
    slot_time character varying(255) NOT NULL
);


--
-- Name: expert_consultation_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_consultation_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consultation_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: expert_consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    title character varying(300) NOT NULL,
    description text NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    reply_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: expert_patient_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_patient_connections (
    id uuid NOT NULL,
    expert_id uuid NOT NULL,
    child_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: expert_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_reviews (
    id uuid NOT NULL,
    comment character varying(1000),
    created_at timestamp(6) without time zone,
    rating integer NOT NULL,
    expert_id uuid NOT NULL,
    reviewer_id uuid NOT NULL
);


--
-- Name: expert_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expert_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    child_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category character varying(255),
    difficulty character varying(255),
    frequency character varying(255),
    material_url character varying(255),
    due_date date,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


--
-- Name: forum_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    parent_comment_id uuid,
    like_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    vote_count integer DEFAULT 0,
    is_accepted boolean DEFAULT false,
    is_anonymous boolean DEFAULT false,
    is_expert_approved boolean DEFAULT false
);


--
-- Name: forum_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_posts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    author_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(255),
    is_pinned boolean DEFAULT false,
    like_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    post_type character varying(255) DEFAULT 'DENEYIM'::character varying NOT NULL,
    is_answered boolean DEFAULT false,
    accepted_answer_id uuid,
    privacy_settings jsonb DEFAULT '{"showChildAge": true, "showRealName": true, "showSymptoms": true, "allowMatching": true, "showDiagnosis": false}'::jsonb,
    is_anonymous boolean DEFAULT false,
    is_featured boolean
);


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id uuid NOT NULL,
    active boolean NOT NULL,
    category character varying(255),
    child_id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    description text,
    entries text,
    reward_description character varying(255),
    reward_title character varying(255),
    target_count integer,
    title character varying(255) NOT NULL,
    token_color character varying(255),
    token_emoji character varying(255),
    user_id uuid NOT NULL
);


--
-- Name: group_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_bans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    banned_by uuid,
    reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: group_meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_meetings (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    description text,
    end_time timestamp(6) without time zone,
    meeting_url character varying(255),
    start_time timestamp(6) without time zone NOT NULL,
    title character varying(255) NOT NULL,
    group_id uuid NOT NULL
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(255) DEFAULT 'MEMBER'::character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(255),
    is_verified boolean DEFAULT false,
    avatar_url character varying(255),
    conversation_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institutions (
    id character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    city character varying(255),
    category character varying(50),
    specialties text,
    description text,
    phone character varying(50),
    email character varying(200),
    website text,
    source_url text,
    source_label character varying(255),
    address text,
    sgk_contract boolean,
    free_service boolean,
    age_range character varying(50),
    services text,
    notes text
);


--
-- Name: knowledge_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_articles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(255),
    author_id uuid,
    is_published boolean DEFAULT false,
    view_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    source_name character varying(120),
    source_url character varying(500),
    pending_review boolean DEFAULT false NOT NULL,
    format character varying(50) DEFAULT 'TEXT'::character varying NOT NULL,
    media_url character varying(500),
    source_author character varying(300),
    source_publication character varying(240),
    source_published_at date,
    source_accessed_at date,
    doi character varying(160),
    license_type character varying(40) DEFAULT 'UNKNOWN'::character varying NOT NULL,
    usage_type character varying(40) DEFAULT 'ORIGINAL'::character varying NOT NULL,
    evidence_level character varying(40) DEFAULT 'EXPERT_REVIEW'::character varying NOT NULL,
    original_language character varying(12) DEFAULT 'tr'::character varying NOT NULL,
    ai_generated boolean DEFAULT false NOT NULL,
    reviewed_by_id uuid,
    reviewed_at timestamp without time zone,
    review_notes text
);


--
-- Name: knowledge_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    article_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: medication_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    medication_id uuid NOT NULL,
    child_id uuid NOT NULL,
    log_date date NOT NULL,
    scheduled_time character varying(10),
    taken boolean DEFAULT false,
    taken_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    side_effects jsonb DEFAULT '[]'::jsonb
);


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    dosage character varying(255),
    unit character varying(255),
    frequency character varying(255),
    scheduled_times jsonb,
    notes text,
    is_active boolean DEFAULT true,
    start_date date,
    end_date date,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: meetup_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meetup_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    requester_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    type character varying(255) DEFAULT 'YUZEYUZE'::character varying NOT NULL,
    proposed_date date NOT NULL,
    proposed_time character varying(5) NOT NULL,
    location character varying(300),
    message character varying(600),
    status character varying(255) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: message_read_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_read_receipts (
    id uuid NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    message_type character varying(30) DEFAULT 'TEXT'::character varying NOT NULL,
    is_read boolean DEFAULT false,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    file_url character varying(1000),
    file_name character varying(255),
    file_type character varying(100),
    reply_to_id uuid
);


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    child_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category character varying(255),
    achieved_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: mood_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mood_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    entry_date date NOT NULL,
    mood_level integer NOT NULL,
    notes text,
    triggers jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT mood_entries_mood_level_check CHECK (((mood_level >= 1) AND (mood_level <= 5)))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    body character varying(255),
    created_at timestamp(6) without time zone,
    link character varying(255),
    is_read boolean,
    title character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: nutrition_foods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_foods (
    id uuid NOT NULL,
    accepted boolean NOT NULL,
    category character varying(255),
    child_id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: nutrition_meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_meals (
    id uuid NOT NULL,
    child_id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    date character varying(255) NOT NULL,
    foods text,
    meal_type character varying(255) NOT NULL,
    mood character varying(255),
    notes character varying(255),
    user_id uuid NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: patient_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expert_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    child_id uuid,
    content text NOT NULL,
    category character varying(50) DEFAULT 'GENERAL'::character varying,
    note_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id character varying(255) NOT NULL,
    ai_enabled boolean NOT NULL,
    maintenance_mode boolean NOT NULL,
    registrations_open boolean NOT NULL
);


--
-- Name: post_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_tags (
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh_key text NOT NULL,
    auth_key text NOT NULL,
    user_agent text,
    last_seen_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    used boolean DEFAULT false NOT NULL
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid NOT NULL,
    admin_note character varying(255),
    created_at timestamp(6) without time zone,
    reason character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    target_id uuid NOT NULL,
    target_type character varying(255) NOT NULL,
    reporter_id uuid NOT NULL
);


--
-- Name: routine_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routine_items (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    description character varying(255),
    icon_name character varying(255),
    scheduled_time time(6) without time zone,
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    routine_id uuid NOT NULL
);


--
-- Name: routines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routines (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    description character varying(255),
    is_active boolean NOT NULL,
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    child_id uuid NOT NULL
);


--
-- Name: school_diary_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_diary_entries (
    id uuid NOT NULL,
    category character varying(255),
    child_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp(6) without time zone,
    date character varying(255) NOT NULL,
    from_name character varying(255),
    from_role character varying(255) NOT NULL,
    replies text,
    user_id uuid NOT NULL
);


--
-- Name: screening_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screening_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    test_type character varying(50) NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    risk_level character varying(20) NOT NULL,
    answers text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: sensory_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sensory_profiles (
    id uuid NOT NULL,
    child_id uuid NOT NULL,
    domains text,
    updated_at timestamp(6) without time zone,
    user_id uuid NOT NULL
);


--
-- Name: shared_progress_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_progress_notes (
    id uuid NOT NULL,
    child_id uuid NOT NULL,
    completed_at timestamp(6) without time zone,
    content text NOT NULL,
    created_at timestamp(6) without time zone,
    due_date character varying(255),
    expert_id uuid,
    from_name character varying(255),
    from_role character varying(255) NOT NULL,
    replies text,
    status character varying(255),
    title character varying(255) NOT NULL,
    type character varying(255),
    user_id uuid NOT NULL
);


--
-- Name: sleep_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sleep_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    sleep_date date NOT NULL,
    bedtime character varying(10),
    wake_time character varying(10),
    duration_minutes integer,
    quality integer,
    night_wakings integer DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT sleep_entries_quality_check CHECK (((quality >= 1) AND (quality <= 5)))
);


--
-- Name: social_stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    category character varying(255),
    description text,
    pages jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_public boolean DEFAULT false,
    child_id uuid,
    view_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: social_story_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_story_comments (
    id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    author_id uuid NOT NULL,
    social_story_id uuid NOT NULL
);


--
-- Name: storage_deletion_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_deletion_queue (
    filename character varying(255) NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: stored_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stored_files (
    filename character varying(255) NOT NULL,
    owner_id uuid NOT NULL,
    original_filename character varying(512),
    content_type character varying(100) NOT NULL,
    size bigint NOT NULL,
    visibility character varying(20) DEFAULT 'PRIVATE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    scope_type character varying(30),
    scope_id uuid
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: task_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    parent_note text,
    evidence_url character varying(255),
    expert_feedback text,
    expert_reviewed boolean DEFAULT false NOT NULL,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: treatment_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_states (
    id uuid NOT NULL,
    child_id uuid NOT NULL,
    custom_goals jsonb,
    game_feedback jsonb,
    game_sessions jsonb,
    goal_progress_history jsonb,
    sensory_profile jsonb,
    updated_at timestamp(6) without time zone
);


--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_blocks (
    id uuid NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_user_blocks_self CHECK ((blocker_id <> blocked_id))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    phone character varying(255),
    role character varying(255) DEFAULT 'PARENT'::character varying NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    kvkk_consent boolean DEFAULT false NOT NULL,
    kvkk_consent_date timestamp without time zone,
    profile_image_url character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    expert_title character varying(255),
    city character varying(255),
    institution character varying(255),
    license_number character varying(255),
    bio text,
    matching_enabled boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    latitude double precision,
    longitude double precision,
    specializations jsonb DEFAULT '[]'::jsonb,
    license_verified boolean DEFAULT false NOT NULL,
    license_verified_at timestamp without time zone,
    accepting_patients boolean DEFAULT true NOT NULL,
    email_verified boolean DEFAULT true NOT NULL,
    mfa_secret character varying(255),
    mfa_enabled boolean DEFAULT false,
    consent_ai_analysis boolean DEFAULT false,
    consent_ai_analysis_date timestamp without time zone,
    consent_emergency_card boolean DEFAULT false,
    consent_emergency_card_date timestamp without time zone,
    license_document_url character varying(255),
    age_groups jsonb DEFAULT '[]'::jsonb NOT NULL,
    support_topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    spoken_languages jsonb DEFAULT '["Türkçe"]'::jsonb NOT NULL,
    session_duration_minutes integer DEFAULT 50 NOT NULL,
    cancellation_policy text,
    reschedule_policy text,
    allow_direct_messages boolean DEFAULT true NOT NULL,
    allow_family_messages boolean DEFAULT true NOT NULL,
    hide_online_status boolean DEFAULT false NOT NULL,
    approximate_location_only boolean DEFAULT true NOT NULL,
    communication_preferences jsonb DEFAULT '["YAZISMA"]'::jsonb NOT NULL,
    support_intents jsonb DEFAULT '["DENEYIM_PAYLASIMI"]'::jsonb NOT NULL,
    session_fee_min numeric(10,2),
    session_fee_max numeric(10,2),
    offers_online boolean DEFAULT true NOT NULL,
    offers_face_to_face boolean DEFAULT true NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL
);


--
-- Name: venue_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venue_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    venue_id uuid NOT NULL,
    user_id uuid NOT NULL,
    noise_level integer,
    light_level integer,
    crowd_level integer,
    comments text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: venues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    description text,
    address character varying(255),
    latitude double precision,
    longitude double precision,
    avg_noise_level double precision,
    avg_light_level double precision,
    avg_crowd_level double precision,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.votes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    target_type character varying(255) NOT NULL,
    target_id uuid NOT NULL,
    vote_value integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_answer_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_answer_likes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    answer_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_answers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    question_id uuid NOT NULL,
    author_id uuid NOT NULL,
    text text NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_questions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    question text NOT NULL,
    tag character varying(255),
    week_label character varying(80),
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: wellbeing_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wellbeing_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    entry_date date NOT NULL,
    answers jsonb NOT NULL,
    score integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT wellbeing_entries_score_check CHECK (((score >= 0) AND (score <= 100)))
);


--
-- Name: abc_entries abc_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abc_entries
    ADD CONSTRAINT abc_entries_pkey PRIMARY KEY (id);


--
-- Name: appointment_status_history appointment_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_status_history
    ADD CONSTRAINT appointment_status_history_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: article_comments article_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_pkey PRIMARY KEY (id);


--
-- Name: article_tags article_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_tags
    ADD CONSTRAINT article_tags_pkey PRIMARY KEY (article_id, tag_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bep_reports bep_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bep_reports
    ADD CONSTRAINT bep_reports_pkey PRIMARY KEY (id);


--
-- Name: buddy_relationships buddy_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buddy_relationships
    ADD CONSTRAINT buddy_relationships_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: child_tags child_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_pkey PRIMARY KEY (child_id, tag_id);


--
-- Name: children children_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_pkey PRIMARY KEY (id);


--
-- Name: clinical_data_shares clinical_data_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_data_shares
    ADD CONSTRAINT clinical_data_shares_pkey PRIMARY KEY (id);


--
-- Name: community_meetup_attendees community_meetup_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_meetup_attendees
    ADD CONSTRAINT community_meetup_attendees_pkey PRIMARY KEY (id);


--
-- Name: community_meetups community_meetups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_meetups
    ADD CONSTRAINT community_meetups_pkey PRIMARY KEY (id);


--
-- Name: conversation_archived_by conversation_archived_by_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_archived_by
    ADD CONSTRAINT conversation_archived_by_pkey PRIMARY KEY (conversation_id, user_id);


--
-- Name: conversation_muted_by conversation_muted_by_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_muted_by
    ADD CONSTRAINT conversation_muted_by_pkey PRIMARY KEY (conversation_id, user_id);


--
-- Name: conversation_participants conversation_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversation_settings conversation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT conversation_settings_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: development_notes development_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.development_notes
    ADD CONSTRAINT development_notes_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_token_key UNIQUE (token);


--
-- Name: diet_preferences diet_preferences_child_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diet_preferences
    ADD CONSTRAINT diet_preferences_child_id_key UNIQUE (child_id);


--
-- Name: diet_preferences diet_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diet_preferences
    ADD CONSTRAINT diet_preferences_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: emergency_cards emergency_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_cards
    ADD CONSTRAINT emergency_cards_pkey PRIMARY KEY (id);


--
-- Name: expert_availabilities expert_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_availabilities
    ADD CONSTRAINT expert_availabilities_pkey PRIMARY KEY (id);


--
-- Name: expert_consultation_replies expert_consultation_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultation_replies
    ADD CONSTRAINT expert_consultation_replies_pkey PRIMARY KEY (id);


--
-- Name: expert_consultations expert_consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultations
    ADD CONSTRAINT expert_consultations_pkey PRIMARY KEY (id);


--
-- Name: expert_patient_connections expert_patient_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_patient_connections
    ADD CONSTRAINT expert_patient_connections_pkey PRIMARY KEY (id);


--
-- Name: expert_reviews expert_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_reviews
    ADD CONSTRAINT expert_reviews_pkey PRIMARY KEY (id);


--
-- Name: expert_tasks expert_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_tasks
    ADD CONSTRAINT expert_tasks_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: forum_comments forum_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_pkey PRIMARY KEY (id);


--
-- Name: forum_posts forum_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: group_bans group_bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_pkey PRIMARY KEY (id);


--
-- Name: group_meetings group_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_meetings
    ADD CONSTRAINT group_meetings_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: knowledge_articles knowledge_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_pkey PRIMARY KEY (id);


--
-- Name: knowledge_bookmarks knowledge_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_bookmarks
    ADD CONSTRAINT knowledge_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: medication_logs medication_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_pkey PRIMARY KEY (id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: meetup_requests meetup_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetup_requests
    ADD CONSTRAINT meetup_requests_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: message_read_receipts message_read_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT message_read_receipts_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: mood_entries mood_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_entries
    ADD CONSTRAINT mood_entries_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nutrition_foods nutrition_foods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_foods
    ADD CONSTRAINT nutrition_foods_pkey PRIMARY KEY (id);


--
-- Name: nutrition_meals nutrition_meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_meals
    ADD CONSTRAINT nutrition_meals_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: patient_notes patient_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: post_tags post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_pkey PRIMARY KEY (post_id, tag_id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: routine_items routine_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routine_items
    ADD CONSTRAINT routine_items_pkey PRIMARY KEY (id);


--
-- Name: routines routines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT routines_pkey PRIMARY KEY (id);


--
-- Name: school_diary_entries school_diary_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_diary_entries
    ADD CONSTRAINT school_diary_entries_pkey PRIMARY KEY (id);


--
-- Name: screening_results screening_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_results
    ADD CONSTRAINT screening_results_pkey PRIMARY KEY (id);


--
-- Name: sensory_profiles sensory_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensory_profiles
    ADD CONSTRAINT sensory_profiles_pkey PRIMARY KEY (id);


--
-- Name: shared_progress_notes shared_progress_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_progress_notes
    ADD CONSTRAINT shared_progress_notes_pkey PRIMARY KEY (id);


--
-- Name: sleep_entries sleep_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sleep_entries
    ADD CONSTRAINT sleep_entries_pkey PRIMARY KEY (id);


--
-- Name: social_stories social_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_stories
    ADD CONSTRAINT social_stories_pkey PRIMARY KEY (id);


--
-- Name: social_story_comments social_story_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_story_comments
    ADD CONSTRAINT social_story_comments_pkey PRIMARY KEY (id);


--
-- Name: storage_deletion_queue storage_deletion_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_deletion_queue
    ADD CONSTRAINT storage_deletion_queue_pkey PRIMARY KEY (filename);


--
-- Name: stored_files stored_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_pkey PRIMARY KEY (filename);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: task_submissions task_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_pkey PRIMARY KEY (id);


--
-- Name: treatment_states treatment_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_states
    ADD CONSTRAINT treatment_states_pkey PRIMARY KEY (id);


--
-- Name: weekly_answers uk22tlywokn6tux4ka5oy35rx69; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answers
    ADD CONSTRAINT uk22tlywokn6tux4ka5oy35rx69 UNIQUE (question_id, author_id);


--
-- Name: community_meetup_attendees uk30nrnciwv0a9uhtn8d46x0dtw; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_meetup_attendees
    ADD CONSTRAINT uk30nrnciwv0a9uhtn8d46x0dtw UNIQUE (meetup_id, user_id);


--
-- Name: expert_reviews uk65kh9lr9nc9pj2gvkud79ga7d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_reviews
    ADD CONSTRAINT uk65kh9lr9nc9pj2gvkud79ga7d UNIQUE (expert_id, reviewer_id);


--
-- Name: user_blocks uk6kwyqs53ciqfxmlhquyq5socr; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT uk6kwyqs53ciqfxmlhquyq5socr UNIQUE (blocker_id, blocked_id);


--
-- Name: message_reactions uk97x64hflnew8pcu67n1bky803; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT uk97x64hflnew8pcu67n1bky803 UNIQUE (message_id, user_id, emoji);


--
-- Name: treatment_states uk9sm8gt51clb3o8dhy5cjw84bu; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_states
    ADD CONSTRAINT uk9sm8gt51clb3o8dhy5cjw84bu UNIQUE (child_id);


--
-- Name: votes uk9t1fbxvh0fd4jixg48gnr0xn4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT uk9t1fbxvh0fd4jixg48gnr0xn4 UNIQUE (user_id, target_type, target_id);


--
-- Name: community_meetup_attendees uk_community_meetup_attendees_meetup_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_meetup_attendees
    ADD CONSTRAINT uk_community_meetup_attendees_meetup_user UNIQUE (meetup_id, user_id);


--
-- Name: conversation_settings uk_conversation_settings_conversation_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT uk_conversation_settings_conversation_user UNIQUE (conversation_id, user_id);


--
-- Name: expert_patient_connections uk_expert_child; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_patient_connections
    ADD CONSTRAINT uk_expert_child UNIQUE (expert_id, child_id);


--
-- Name: message_reactions uk_message_reactions_message_user_emoji; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT uk_message_reactions_message_user_emoji UNIQUE (message_id, user_id, emoji);


--
-- Name: message_read_receipts uk_message_read_receipts_message_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT uk_message_read_receipts_message_user UNIQUE (message_id, user_id);


--
-- Name: weekly_answer_likes uk_weekly_answer_likes_answer_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answer_likes
    ADD CONSTRAINT uk_weekly_answer_likes_answer_user UNIQUE (answer_id, user_id);


--
-- Name: weekly_answers uk_weekly_answers_question_author; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answers
    ADD CONSTRAINT uk_weekly_answers_question_author UNIQUE (question_id, author_id);


--
-- Name: wellbeing_entries uk_wellbeing_user_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellbeing_entries
    ADD CONSTRAINT uk_wellbeing_user_date UNIQUE (user_id, entry_date);


--
-- Name: message_read_receipts ukay3698x3rtxmbspw31cevy0xb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT ukay3698x3rtxmbspw31cevy0xb UNIQUE (message_id, user_id);


--
-- Name: knowledge_bookmarks ukbe19wxip7ckvdvi3quuwwtufl; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_bookmarks
    ADD CONSTRAINT ukbe19wxip7ckvdvi3quuwwtufl UNIQUE (user_id, article_id);


--
-- Name: conversation_settings ukgm3kjfyt2m64kc65rwlmo2el6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT ukgm3kjfyt2m64kc65rwlmo2el6 UNIQUE (conversation_id, user_id);


--
-- Name: expert_patient_connections ukisvwn43eglx4rdya6xf6ox773; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_patient_connections
    ADD CONSTRAINT ukisvwn43eglx4rdya6xf6ox773 UNIQUE (expert_id, child_id);


--
-- Name: emergency_cards ukj839xxuew25jqkpmw9gjnieyy; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_cards
    ADD CONSTRAINT ukj839xxuew25jqkpmw9gjnieyy UNIQUE (child_id);


--
-- Name: expert_availabilities ukjq5up0svtv2xbbkabditi48p7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_availabilities
    ADD CONSTRAINT ukjq5up0svtv2xbbkabditi48p7 UNIQUE (expert_id, day_of_week);


--
-- Name: diet_preferences ukn27amiefx6ds31lbfjjo57wqv; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diet_preferences
    ADD CONSTRAINT ukn27amiefx6ds31lbfjjo57wqv UNIQUE (child_id);


--
-- Name: sensory_profiles ukotnwos5s4rnbdfvuji4aghtgw; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensory_profiles
    ADD CONSTRAINT ukotnwos5s4rnbdfvuji4aghtgw UNIQUE (child_id);


--
-- Name: group_members ukp940p7g0r9yihubnf6rtaheog; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT ukp940p7g0r9yihubnf6rtaheog UNIQUE (group_id, user_id);


--
-- Name: group_bans ukpp1myri96ueoix53ljc5uaouw; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT ukpp1myri96ueoix53ljc5uaouw UNIQUE (group_id, user_id);


--
-- Name: weekly_answer_likes ukr9yspm305c9nhxjkthyilijcg; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answer_likes
    ADD CONSTRAINT ukr9yspm305c9nhxjkthyilijcg UNIQUE (answer_id, user_id);


--
-- Name: expert_availabilities uq_expert_availability_day; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_availabilities
    ADD CONSTRAINT uq_expert_availability_day UNIQUE (expert_id, day_of_week);


--
-- Name: group_bans uq_group_bans_group_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT uq_group_bans_group_user UNIQUE (group_id, user_id);


--
-- Name: user_blocks uq_user_blocks; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT uq_user_blocks UNIQUE (blocker_id, blocked_id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: venue_reviews venue_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_reviews
    ADD CONSTRAINT venue_reviews_pkey PRIMARY KEY (id);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (id);


--
-- Name: votes votes_user_id_target_type_target_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_target_type_target_id_key UNIQUE (user_id, target_type, target_id);


--
-- Name: weekly_answer_likes weekly_answer_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answer_likes
    ADD CONSTRAINT weekly_answer_likes_pkey PRIMARY KEY (id);


--
-- Name: weekly_answers weekly_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answers
    ADD CONSTRAINT weekly_answers_pkey PRIMARY KEY (id);


--
-- Name: weekly_questions weekly_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_questions
    ADD CONSTRAINT weekly_questions_pkey PRIMARY KEY (id);


--
-- Name: wellbeing_entries wellbeing_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellbeing_entries
    ADD CONSTRAINT wellbeing_entries_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_abc_child_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abc_child_date ON public.abc_entries USING btree (child_id, entry_date, entry_time);


--
-- Name: idx_appointments_child_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_child_date ON public.appointments USING btree (child_id, appointment_date);


--
-- Name: idx_appointments_expert_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_expert_date ON public.appointments USING btree (expert_id, appointment_date);


--
-- Name: idx_appointments_expert_date_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_expert_date_active ON public.appointments USING btree (expert_id, appointment_date) WHERE (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying])::text[])) AND (deleted_at IS NULL));


--
-- Name: idx_appointments_expert_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_expert_status ON public.appointments USING btree (expert_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_appointments_expert_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_expert_status_date ON public.appointments USING btree (expert_id, status, appointment_date, appointment_time);


--
-- Name: idx_appointments_no_double_confirmed; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_appointments_no_double_confirmed ON public.appointments USING btree (expert_id, appointment_date, appointment_time) WHERE (((status)::text = 'CONFIRMED'::text) AND (deleted_at IS NULL));


--
-- Name: idx_appointments_no_double_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_appointments_no_double_pending ON public.appointments USING btree (expert_id, appointment_date, appointment_time) WHERE (((status)::text = 'PENDING'::text) AND (deleted_at IS NULL));


--
-- Name: idx_appointments_parent_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_parent_date ON public.appointments USING btree (parent_id, appointment_date);


--
-- Name: idx_appointments_parent_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_parent_status_date ON public.appointments USING btree (parent_id, status, appointment_date, appointment_time);


--
-- Name: idx_appointments_recurring_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_recurring_group ON public.appointments USING btree (recurring_group_id);


--
-- Name: idx_appointments_soft_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_soft_deleted ON public.appointments USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_appt_history_appointment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appt_history_appointment ON public.appointment_status_history USING btree (appointment_id);


--
-- Name: idx_appt_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appt_history_changed_at ON public.appointment_status_history USING btree (changed_at);


--
-- Name: idx_article_comments_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_comments_article ON public.article_comments USING btree (article_id);


--
-- Name: idx_article_tags_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_tags_article ON public.article_tags USING btree (article_id);


--
-- Name: idx_article_tags_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_tags_tag ON public.article_tags USING btree (tag_id);


--
-- Name: idx_audit_logs_action_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action_created ON public.audit_logs USING btree (action, created_at DESC);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_logs_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_created ON public.audit_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_buddy_relationships_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buddy_relationships_receiver ON public.buddy_relationships USING btree (receiver_id);


--
-- Name: idx_buddy_relationships_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buddy_relationships_requester ON public.buddy_relationships USING btree (requester_id);


--
-- Name: idx_buddy_relationships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buddy_relationships_status ON public.buddy_relationships USING btree (status);


--
-- Name: idx_calendar_child_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_child_id ON public.calendar_events USING btree (child_id);


--
-- Name: idx_calendar_child_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_child_start ON public.calendar_events USING btree (child_id, start_time);


--
-- Name: idx_calendar_reminders; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_reminders ON public.calendar_events USING btree (start_time, reminder_sent) WHERE (((status)::text = 'PLANNED'::text) AND (reminder_minutes_before IS NOT NULL) AND (reminder_sent = false));


--
-- Name: idx_calendar_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_start_time ON public.calendar_events USING btree (start_time);


--
-- Name: idx_child_tags_child; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_child_tags_child ON public.child_tags USING btree (child_id);


--
-- Name: idx_child_tags_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_child_tags_tag ON public.child_tags USING btree (tag_id);


--
-- Name: idx_children_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_children_parent_id ON public.children USING btree (parent_id);


--
-- Name: idx_clinical_data_shares_active_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_data_shares_active_lookup ON public.clinical_data_shares USING btree (child_id, expert_id, status);


--
-- Name: idx_clinical_data_shares_child_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_data_shares_child_id ON public.clinical_data_shares USING btree (child_id);


--
-- Name: idx_clinical_data_shares_expert_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_data_shares_expert_id ON public.clinical_data_shares USING btree (expert_id);


--
-- Name: idx_clinical_data_shares_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_data_shares_parent_id ON public.clinical_data_shares USING btree (parent_id);


--
-- Name: idx_community_meetups_city_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_meetups_city_date ON public.community_meetups USING btree (city, meetup_date);


--
-- Name: idx_community_meetups_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_community_meetups_date ON public.community_meetups USING btree (meetup_date, meetup_time);


--
-- Name: idx_consultation_replies_consultation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_replies_consultation ON public.expert_consultation_replies USING btree (consultation_id);


--
-- Name: idx_conv_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_participants_user ON public.conversation_participants USING btree (user_id);


--
-- Name: idx_conversation_archived_by_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_archived_by_user ON public.conversation_archived_by USING btree (user_id);


--
-- Name: idx_conversation_muted_by_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_muted_by_user ON public.conversation_muted_by USING btree (user_id);


--
-- Name: idx_conversation_settings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_settings_user ON public.conversation_settings USING btree (user_id);


--
-- Name: idx_conversations_last_message_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_last_message_at ON public.conversations USING btree (last_message_at DESC NULLS LAST);


--
-- Name: idx_dev_notes_child_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_notes_child_id ON public.development_notes USING btree (child_id);


--
-- Name: idx_dev_notes_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_notes_date ON public.development_notes USING btree (note_date);


--
-- Name: idx_device_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_tokens_user ON public.device_tokens USING btree (user_id);


--
-- Name: idx_email_verification_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_user ON public.email_verification_tokens USING btree (user_id);


--
-- Name: idx_expert_availability_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_availability_blocked ON public.expert_availability_blocked_slots USING btree (availability_id);


--
-- Name: idx_expert_availability_expert; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_availability_expert ON public.expert_availabilities USING btree (expert_id);


--
-- Name: idx_expert_consultations_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_consultations_author ON public.expert_consultations USING btree (author_id);


--
-- Name: idx_expert_consultations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_consultations_created ON public.expert_consultations USING btree (created_at DESC);


--
-- Name: idx_expert_consultations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_consultations_status ON public.expert_consultations USING btree (status);


--
-- Name: idx_expert_tasks_child_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_tasks_child_id ON public.expert_tasks USING btree (child_id);


--
-- Name: idx_expert_tasks_expert_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_tasks_expert_id ON public.expert_tasks USING btree (expert_id);


--
-- Name: idx_expert_tasks_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_tasks_parent_id ON public.expert_tasks USING btree (parent_id);


--
-- Name: idx_forum_comments_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_comments_post ON public.forum_comments USING btree (post_id);


--
-- Name: idx_forum_posts_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_posts_author ON public.forum_posts USING btree (author_id);


--
-- Name: idx_forum_posts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forum_posts_category ON public.forum_posts USING btree (category);


--
-- Name: idx_group_bans_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_bans_group ON public.group_bans USING btree (group_id);


--
-- Name: idx_group_bans_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_bans_user ON public.group_bans USING btree (user_id);


--
-- Name: idx_group_members_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_group ON public.group_members USING btree (group_id);


--
-- Name: idx_group_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_members_user ON public.group_members USING btree (user_id);


--
-- Name: idx_knowledge_bookmarks_user_article; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_knowledge_bookmarks_user_article ON public.knowledge_bookmarks USING btree (user_id, article_id);


--
-- Name: idx_knowledge_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_category ON public.knowledge_articles USING btree (category);


--
-- Name: idx_knowledge_evidence_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_evidence_level ON public.knowledge_articles USING btree (evidence_level);


--
-- Name: idx_knowledge_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_reviewed_by ON public.knowledge_articles USING btree (reviewed_by_id);


--
-- Name: idx_knowledge_source_url; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_knowledge_source_url ON public.knowledge_articles USING btree (source_url) WHERE (source_url IS NOT NULL);


--
-- Name: idx_med_logs_child_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_med_logs_child_date ON public.medication_logs USING btree (child_id, log_date);


--
-- Name: idx_medications_child; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_child ON public.medications USING btree (child_id);


--
-- Name: idx_meetup_requests_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetup_requests_recipient ON public.meetup_requests USING btree (recipient_id);


--
-- Name: idx_meetup_requests_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetup_requests_requester ON public.meetup_requests USING btree (requester_id);


--
-- Name: idx_message_reactions_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_message ON public.message_reactions USING btree (message_id);


--
-- Name: idx_message_reactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_user ON public.message_reactions USING btree (user_id);


--
-- Name: idx_message_read_receipts_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts USING btree (message_id);


--
-- Name: idx_message_read_receipts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_read_receipts_user_id ON public.message_read_receipts USING btree (user_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, sent_at);


--
-- Name: idx_messages_reply_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_reply_to ON public.messages USING btree (reply_to_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_milestones_child_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_child_id ON public.milestones USING btree (child_id);


--
-- Name: idx_mood_child_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mood_child_date ON public.mood_entries USING btree (child_id, entry_date);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_patient_notes_expert; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_notes_expert ON public.patient_notes USING btree (expert_id);


--
-- Name: idx_patient_notes_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_notes_parent ON public.patient_notes USING btree (parent_id);


--
-- Name: idx_post_tags_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_tags_post ON public.post_tags USING btree (post_id);


--
-- Name: idx_post_tags_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_tags_tag ON public.post_tags USING btree (tag_id);


--
-- Name: idx_push_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_screening_child_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_screening_child_id ON public.screening_results USING btree (child_id);


--
-- Name: idx_sleep_child_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sleep_child_date ON public.sleep_entries USING btree (child_id, sleep_date);


--
-- Name: idx_stored_files_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stored_files_owner ON public.stored_files USING btree (owner_id);


--
-- Name: idx_stored_files_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stored_files_scope ON public.stored_files USING btree (scope_type, scope_id);


--
-- Name: idx_stories_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_author ON public.social_stories USING btree (author_id);


--
-- Name: idx_stories_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_public ON public.social_stories USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_tags_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tags_category ON public.tags USING btree (category);


--
-- Name: idx_task_submissions_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_submissions_task_id ON public.task_submissions USING btree (task_id);


--
-- Name: idx_user_blocks_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_blocked ON public.user_blocks USING btree (blocked_id);


--
-- Name: idx_user_blocks_blocker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_blocker ON public.user_blocks USING btree (blocker_id);


--
-- Name: idx_users_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_city ON public.users USING btree (city);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_venue_reviews_venue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_reviews_venue_id ON public.venue_reviews USING btree (venue_id);


--
-- Name: idx_votes_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_votes_target ON public.votes USING btree (target_type, target_id);


--
-- Name: idx_votes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_votes_user ON public.votes USING btree (user_id);


--
-- Name: idx_weekly_answers_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weekly_answers_question ON public.weekly_answers USING btree (question_id, created_at DESC);


--
-- Name: idx_wellbeing_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wellbeing_user_date ON public.wellbeing_entries USING btree (user_id, entry_date);


--
-- Name: abc_entries abc_entries_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abc_entries
    ADD CONSTRAINT abc_entries_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: appointment_status_history appointment_status_history_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_status_history
    ADD CONSTRAINT appointment_status_history_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointment_status_history appointment_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_status_history
    ADD CONSTRAINT appointment_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_calendar_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES public.calendar_events(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_expert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: article_comments article_comments_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(id) ON DELETE CASCADE;


--
-- Name: article_comments article_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_comments
    ADD CONSTRAINT article_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: article_tags article_tags_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_tags
    ADD CONSTRAINT article_tags_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(id) ON DELETE CASCADE;


--
-- Name: article_tags article_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_tags
    ADD CONSTRAINT article_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bep_reports bep_reports_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bep_reports
    ADD CONSTRAINT bep_reports_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: bep_reports bep_reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bep_reports
    ADD CONSTRAINT bep_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: buddy_relationships buddy_relationships_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buddy_relationships
    ADD CONSTRAINT buddy_relationships_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: buddy_relationships buddy_relationships_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buddy_relationships
    ADD CONSTRAINT buddy_relationships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: child_tags child_tags_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: child_tags child_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: children children_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: clinical_data_shares clinical_data_shares_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_data_shares
    ADD CONSTRAINT clinical_data_shares_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: clinical_data_shares clinical_data_shares_expert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_data_shares
    ADD CONSTRAINT clinical_data_shares_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: clinical_data_shares clinical_data_shares_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_data_shares
    ADD CONSTRAINT clinical_data_shares_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: community_meetup_attendees community_meetup_attendees_meetup_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_meetup_attendees
    ADD CONSTRAINT community_meetup_attendees_meetup_id_fkey FOREIGN KEY (meetup_id) REFERENCES public.community_meetups(id) ON DELETE CASCADE;


--
-- Name: community_meetup_attendees community_meetup_attendees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_meetup_attendees
    ADD CONSTRAINT community_meetup_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: community_meetups community_meetups_organizer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_meetups
    ADD CONSTRAINT community_meetups_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversation_archived_by conversation_archived_by_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_archived_by
    ADD CONSTRAINT conversation_archived_by_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_muted_by conversation_muted_by_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_muted_by
    ADD CONSTRAINT conversation_muted_by_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversation_settings conversation_settings_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT conversation_settings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_settings conversation_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT conversation_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: development_notes development_notes_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.development_notes
    ADD CONSTRAINT development_notes_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: device_tokens device_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: diet_preferences diet_preferences_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diet_preferences
    ADD CONSTRAINT diet_preferences_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: diet_preferences diet_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diet_preferences
    ADD CONSTRAINT diet_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expert_availabilities expert_availabilities_expert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_availabilities
    ADD CONSTRAINT expert_availabilities_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expert_availability_blocked_slots expert_availability_blocked_slots_availability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_availability_blocked_slots
    ADD CONSTRAINT expert_availability_blocked_slots_availability_id_fkey FOREIGN KEY (availability_id) REFERENCES public.expert_availabilities(id) ON DELETE CASCADE;


--
-- Name: expert_consultation_replies expert_consultation_replies_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultation_replies
    ADD CONSTRAINT expert_consultation_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expert_consultation_replies expert_consultation_replies_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultation_replies
    ADD CONSTRAINT expert_consultation_replies_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.expert_consultations(id) ON DELETE CASCADE;


--
-- Name: expert_consultations expert_consultations_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultations
    ADD CONSTRAINT expert_consultations_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expert_patient_connections expert_patient_connections_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_patient_connections
    ADD CONSTRAINT expert_patient_connections_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: expert_patient_connections expert_patient_connections_expert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_patient_connections
    ADD CONSTRAINT expert_patient_connections_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expert_tasks expert_tasks_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_tasks
    ADD CONSTRAINT expert_tasks_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: expert_tasks expert_tasks_expert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_tasks
    ADD CONSTRAINT expert_tasks_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expert_tasks expert_tasks_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_tasks
    ADD CONSTRAINT expert_tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications fk9y21adhxn0ayjhfocscqox7bh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk9y21adhxn0ayjhfocscqox7bh FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: social_story_comments fkapi0u757byh8e03mioajo4foe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_story_comments
    ADD CONSTRAINT fkapi0u757byh8e03mioajo4foe FOREIGN KEY (social_story_id) REFERENCES public.social_stories(id);


--
-- Name: social_story_comments fkb7n775s25y3jmoqxjhe0usb6m; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_story_comments
    ADD CONSTRAINT fkb7n775s25y3jmoqxjhe0usb6m FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: routine_items fkbuxe25dey1ma7sva6y8f0ka0w; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routine_items
    ADD CONSTRAINT fkbuxe25dey1ma7sva6y8f0ka0w FOREIGN KEY (routine_id) REFERENCES public.routines(id);


--
-- Name: reports fkd3qiw2om5d2oh5xb7fbdcq225; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fkd3qiw2om5d2oh5xb7fbdcq225 FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: expert_reviews fkif2ygrbmtokjwpyb3o3kr2vnd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_reviews
    ADD CONSTRAINT fkif2ygrbmtokjwpyb3o3kr2vnd FOREIGN KEY (expert_id) REFERENCES public.users(id);


--
-- Name: routines fkpvfgoqj5ipt127na2bpd39egu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT fkpvfgoqj5ipt127na2bpd39egu FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: expert_reviews fkqwux41isuly89xj4mt47jio13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_reviews
    ADD CONSTRAINT fkqwux41isuly89xj4mt47jio13 FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: group_meetings fkrto821r5k1oa92mnvsib27wm7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_meetings
    ADD CONSTRAINT fkrto821r5k1oa92mnvsib27wm7 FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: forum_comments forum_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: forum_comments forum_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.forum_comments(id);


--
-- Name: forum_comments forum_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- Name: forum_posts forum_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_bans group_bans_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: group_bans group_bans_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_bans group_bans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_bans
    ADD CONSTRAINT group_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: knowledge_articles knowledge_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: knowledge_articles knowledge_articles_reviewed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_reviewed_by_id_fkey FOREIGN KEY (reviewed_by_id) REFERENCES public.users(id);


--
-- Name: knowledge_bookmarks knowledge_bookmarks_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_bookmarks
    ADD CONSTRAINT knowledge_bookmarks_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(id) ON DELETE CASCADE;


--
-- Name: knowledge_bookmarks knowledge_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_bookmarks
    ADD CONSTRAINT knowledge_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: medication_logs medication_logs_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: medication_logs medication_logs_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: medications medications_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: meetup_requests meetup_requests_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetup_requests
    ADD CONSTRAINT meetup_requests_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: meetup_requests meetup_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetup_requests
    ADD CONSTRAINT meetup_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: message_read_receipts message_read_receipts_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT message_read_receipts_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_read_receipts message_read_receipts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT message_read_receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: mood_entries mood_entries_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_entries
    ADD CONSTRAINT mood_entries_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patient_notes patient_notes_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE SET NULL;


--
-- Name: patient_notes patient_notes_expert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patient_notes patient_notes_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: screening_results screening_results_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_results
    ADD CONSTRAINT screening_results_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: sleep_entries sleep_entries_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sleep_entries
    ADD CONSTRAINT sleep_entries_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: social_stories social_stories_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_stories
    ADD CONSTRAINT social_stories_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: social_stories social_stories_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_stories
    ADD CONSTRAINT social_stories_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE SET NULL;


--
-- Name: stored_files stored_files_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_submissions task_submissions_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_submissions task_submissions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.expert_tasks(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: venue_reviews venue_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_reviews
    ADD CONSTRAINT venue_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: venue_reviews venue_reviews_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_reviews
    ADD CONSTRAINT venue_reviews_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;


--
-- Name: votes votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: weekly_answer_likes weekly_answer_likes_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answer_likes
    ADD CONSTRAINT weekly_answer_likes_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.weekly_answers(id) ON DELETE CASCADE;


--
-- Name: weekly_answer_likes weekly_answer_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answer_likes
    ADD CONSTRAINT weekly_answer_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: weekly_answers weekly_answers_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answers
    ADD CONSTRAINT weekly_answers_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: weekly_answers weekly_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_answers
    ADD CONSTRAINT weekly_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.weekly_questions(id) ON DELETE CASCADE;


--
-- Name: wellbeing_entries wellbeing_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellbeing_entries
    ADD CONSTRAINT wellbeing_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

