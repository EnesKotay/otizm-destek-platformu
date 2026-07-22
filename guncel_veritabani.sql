--
-- PostgreSQL database dump
--

\restrict ouh5aeu3uPUQ7R5p06nrFJm4lkm6CZHOeIfuyVeX1sa9urZi8at2UJxvkBez7vA

-- Dumped from database version 14.22 (Homebrew)
-- Dumped by pg_dump version 14.22 (Homebrew)

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
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abc_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.abc_entries (
    id uuid NOT NULL,
    antecedent text NOT NULL,
    behavior text NOT NULL,
    category character varying(255),
    consequence text NOT NULL,
    created_at timestamp(6) without time zone,
    entry_date date NOT NULL,
    entry_time time(6) without time zone,
    intensity integer NOT NULL,
    location character varying(255),
    notes text,
    child_id uuid NOT NULL
);


ALTER TABLE public.abc_entries OWNER TO postgres;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id uuid NOT NULL,
    appointment_date date NOT NULL,
    appointment_time time(6) without time zone NOT NULL,
    calendar_event_id uuid,
    cancellation_reason text,
    created_at timestamp(6) without time zone,
    duration integer NOT NULL,
    meeting_link character varying(500),
    notes text,
    rating integer,
    rating_comment text,
    session_notes text,
    status character varying(30) NOT NULL,
    type character varying(30) NOT NULL,
    updated_at timestamp(6) without time zone,
    child_id uuid,
    expert_id uuid NOT NULL,
    parent_id uuid
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: bep_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bep_reports (
    id uuid NOT NULL,
    diagnosis text,
    goals jsonb,
    performance text,
    school_year character varying(255),
    shared_at timestamp(6) without time zone,
    student_name character varying(255) NOT NULL,
    child_id uuid NOT NULL,
    created_by uuid NOT NULL
);


ALTER TABLE public.bep_reports OWNER TO postgres;

--
-- Name: buddy_relationships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buddy_relationships (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    is_mentor_relation boolean,
    status character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    receiver_id uuid NOT NULL,
    requester_id uuid NOT NULL
);


ALTER TABLE public.buddy_relationships OWNER TO postgres;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: postgres
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.calendar_events OWNER TO postgres;

--
-- Name: child_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.child_tags (
    child_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.child_tags OWNER TO postgres;

--
-- Name: children; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.children OWNER TO postgres;

--
-- Name: clinical_data_shares; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinical_data_shares (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    expires_at timestamp(6) without time zone,
    share_behavior_journal boolean,
    share_daily_tracker boolean,
    share_screening_results boolean,
    share_sensory_profile boolean,
    status character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    child_id uuid NOT NULL,
    expert_id uuid NOT NULL,
    parent_id uuid NOT NULL
);


ALTER TABLE public.clinical_data_shares OWNER TO postgres;

--
-- Name: conversation_archived_by; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_archived_by (
    conversation_id uuid NOT NULL,
    user_id uuid
);


ALTER TABLE public.conversation_archived_by OWNER TO postgres;

--
-- Name: conversation_muted_by; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_muted_by (
    conversation_id uuid NOT NULL,
    user_id uuid
);


ALTER TABLE public.conversation_muted_by OWNER TO postgres;

--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_participants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conversation_participants OWNER TO postgres;

--
-- Name: conversation_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_settings (
    id uuid NOT NULL,
    archived boolean NOT NULL,
    muted boolean NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.conversation_settings OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying(255) DEFAULT 'DIRECT'::character varying NOT NULL,
    last_message_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    title character varying(255)
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: development_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.development_notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    child_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    category character varying(255),
    mood character varying(255),
    note_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.development_notes OWNER TO postgres;

--
-- Name: diet_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diet_preferences (
    id uuid NOT NULL,
    child_id uuid NOT NULL,
    dairy_free boolean,
    egg_free boolean,
    gfcf_diet boolean,
    gluten_free boolean,
    notes text,
    other_diet character varying(255),
    soy_free boolean,
    sugar_free boolean,
    updated_at timestamp(6) without time zone,
    user_id uuid NOT NULL
);


ALTER TABLE public.diet_preferences OWNER TO postgres;

--
-- Name: emergency_cards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emergency_cards (
    id uuid NOT NULL,
    child_id uuid NOT NULL,
    data text,
    updated_at timestamp(6) without time zone,
    user_id uuid NOT NULL
);


ALTER TABLE public.emergency_cards OWNER TO postgres;

--
-- Name: expert_availabilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expert_availabilities (
    id uuid NOT NULL,
    day_of_week integer NOT NULL,
    enabled boolean NOT NULL,
    end_time time(6) without time zone,
    start_time time(6) without time zone,
    expert_id uuid NOT NULL
);


ALTER TABLE public.expert_availabilities OWNER TO postgres;

--
-- Name: expert_availability_blocked_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expert_availability_blocked_slots (
    availability_id uuid NOT NULL,
    slot_time character varying(255)
);


ALTER TABLE public.expert_availability_blocked_slots OWNER TO postgres;

--
-- Name: expert_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expert_reviews (
    id uuid NOT NULL,
    comment character varying(1000),
    created_at timestamp(6) without time zone,
    rating integer NOT NULL,
    expert_id uuid NOT NULL,
    reviewer_id uuid NOT NULL
);


ALTER TABLE public.expert_reviews OWNER TO postgres;

--
-- Name: expert_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expert_tasks (
    id uuid NOT NULL,
    category character varying(255),
    created_at timestamp(6) without time zone,
    description text,
    difficulty character varying(255),
    due_date date,
    frequency character varying(255),
    material_url character varying(255),
    status character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    child_id uuid NOT NULL,
    expert_id uuid NOT NULL,
    parent_id uuid NOT NULL
);


ALTER TABLE public.expert_tasks OWNER TO postgres;

--
-- Name: family_meetings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.family_meetings (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    meeting_link character varying(500),
    notes character varying(255),
    scheduled_time timestamp(6) without time zone NOT NULL,
    status character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    guest_parent_id uuid NOT NULL,
    host_parent_id uuid NOT NULL
);


ALTER TABLE public.family_meetings OWNER TO postgres;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.flyway_schema_history OWNER TO postgres;

--
-- Name: forum_comments; Type: TABLE; Schema: public; Owner: postgres
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
    is_anonymous boolean,
    is_expert_approved boolean
);


ALTER TABLE public.forum_comments OWNER TO postgres;

--
-- Name: forum_posts; Type: TABLE; Schema: public; Owner: postgres
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
    is_anonymous boolean,
    is_featured boolean
);


ALTER TABLE public.forum_posts OWNER TO postgres;

--
-- Name: goals; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.goals OWNER TO postgres;

--
-- Name: group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(255) DEFAULT 'MEMBER'::character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.group_members OWNER TO postgres;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: knowledge_articles; Type: TABLE; Schema: public; Owner: postgres
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
    format character varying(50),
    media_url character varying(500)
);


ALTER TABLE public.knowledge_articles OWNER TO postgres;

--
-- Name: medication_logs; Type: TABLE; Schema: public; Owner: postgres
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
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.medication_logs OWNER TO postgres;

--
-- Name: medications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.medications OWNER TO postgres;

--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reactions (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    emoji character varying(10) NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.message_reactions OWNER TO postgres;

--
-- Name: message_read_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_read_receipts (
    id uuid NOT NULL,
    read_at timestamp(6) without time zone NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.message_read_receipts OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    message_type character varying(255) DEFAULT 'TEXT'::character varying NOT NULL,
    is_read boolean DEFAULT false,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    file_name character varying(255),
    file_type character varying(100),
    file_url character varying(1000),
    reply_to_id uuid
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: milestones; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.milestones OWNER TO postgres;

--
-- Name: mood_entries; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.mood_entries OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: nutrition_foods; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.nutrition_foods OWNER TO postgres;

--
-- Name: nutrition_meals; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.nutrition_meals OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    expires_at timestamp(6) without time zone NOT NULL,
    token character varying(255) NOT NULL,
    used boolean NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_settings (
    id character varying(255) NOT NULL,
    ai_enabled boolean NOT NULL,
    maintenance_mode boolean NOT NULL,
    registrations_open boolean NOT NULL
);


ALTER TABLE public.platform_settings OWNER TO postgres;

--
-- Name: post_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_tags (
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.post_tags OWNER TO postgres;

--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_subscriptions (
    id uuid NOT NULL,
    auth_key text NOT NULL,
    created_at timestamp(6) without time zone,
    endpoint text NOT NULL,
    last_seen_at timestamp(6) without time zone,
    p256dh_key text NOT NULL,
    updated_at timestamp(6) without time zone,
    user_agent text,
    user_id uuid NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    used boolean NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: routine_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.routine_items OWNER TO postgres;

--
-- Name: routines; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.routines OWNER TO postgres;

--
-- Name: school_diary_entries; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.school_diary_entries OWNER TO postgres;

--
-- Name: screening_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.screening_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    test_type character varying(50) NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    risk_level character varying(20) NOT NULL,
    answers jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.screening_results OWNER TO postgres;

--
-- Name: sensory_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensory_profiles (
    id uuid NOT NULL,
    child_id uuid NOT NULL,
    domains text,
    updated_at timestamp(6) without time zone,
    user_id uuid NOT NULL
);


ALTER TABLE public.sensory_profiles OWNER TO postgres;

--
-- Name: shared_progress_notes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.shared_progress_notes OWNER TO postgres;

--
-- Name: sleep_entries; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.sleep_entries OWNER TO postgres;

--
-- Name: social_stories; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.social_stories OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Name: task_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_submissions (
    id uuid NOT NULL,
    evidence_url character varying(255),
    expert_feedback text,
    expert_reviewed boolean,
    parent_note text,
    submitted_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    parent_id uuid NOT NULL,
    task_id uuid NOT NULL
);


ALTER TABLE public.task_submissions OWNER TO postgres;

--
-- Name: treatment_states; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.treatment_states OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    bio text,
    city character varying(255),
    expert_title character varying(255),
    institution character varying(255),
    is_active boolean,
    latitude double precision,
    license_number character varying(255),
    license_verified boolean,
    license_verified_at timestamp(6) without time zone,
    longitude double precision,
    matching_enabled boolean,
    specializations jsonb
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: venue_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venue_reviews (
    id uuid NOT NULL,
    comments text,
    created_at timestamp(6) without time zone,
    crowd_level integer,
    light_level integer,
    noise_level integer,
    user_id uuid NOT NULL,
    venue_id uuid NOT NULL
);


ALTER TABLE public.venue_reviews OWNER TO postgres;

--
-- Name: venues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venues (
    id uuid NOT NULL,
    address character varying(255),
    avg_crowd_level double precision,
    avg_light_level double precision,
    avg_noise_level double precision,
    category character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    description text,
    latitude double precision,
    longitude double precision,
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);


ALTER TABLE public.venues OWNER TO postgres;

--
-- Name: votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.votes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    target_type character varying(255) NOT NULL,
    target_id uuid NOT NULL,
    vote_value integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.votes OWNER TO postgres;

--
-- Name: wellbeing_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wellbeing_entries (
    id uuid NOT NULL,
    answers jsonb NOT NULL,
    created_at timestamp(6) without time zone,
    entry_date date NOT NULL,
    notes text,
    score integer NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.wellbeing_entries OWNER TO postgres;

--
-- Data for Name: abc_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.abc_entries (id, antecedent, behavior, category, consequence, created_at, entry_date, entry_time, intensity, location, notes, child_id) FROM stdin;
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointments (id, appointment_date, appointment_time, calendar_event_id, cancellation_reason, created_at, duration, meeting_link, notes, rating, rating_comment, session_notes, status, type, updated_at, child_id, expert_id, parent_id) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, resource_type, resource_id, ip_address, details, created_at) FROM stdin;
\.


--
-- Data for Name: bep_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bep_reports (id, diagnosis, goals, performance, school_year, shared_at, student_name, child_id, created_by) FROM stdin;
\.


--
-- Data for Name: buddy_relationships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.buddy_relationships (id, created_at, is_mentor_relation, status, updated_at, receiver_id, requester_id) FROM stdin;
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendar_events (id, child_id, title, description, event_type, start_time, end_time, recurrence_rule, reminder_enabled, color, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: child_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.child_tags (child_id, tag_id) FROM stdin;
\.


--
-- Data for Name: children; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.children (id, parent_id, name, birth_date, diagnosis_info, education_program, therapies, privacy_settings, created_at, updated_at, gender, profile_image_url) FROM stdin;
\.


--
-- Data for Name: clinical_data_shares; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinical_data_shares (id, created_at, expires_at, share_behavior_journal, share_daily_tracker, share_screening_results, share_sensory_profile, status, updated_at, child_id, expert_id, parent_id) FROM stdin;
\.


--
-- Data for Name: conversation_archived_by; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_archived_by (conversation_id, user_id) FROM stdin;
\.


--
-- Data for Name: conversation_muted_by; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_muted_by (conversation_id, user_id) FROM stdin;
\.


--
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_participants (id, conversation_id, user_id, joined_at) FROM stdin;
\.


--
-- Data for Name: conversation_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_settings (id, archived, muted, conversation_id, user_id) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, type, last_message_at, created_at, title) FROM stdin;
\.


--
-- Data for Name: development_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.development_notes (id, child_id, title, content, category, mood, note_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: diet_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.diet_preferences (id, child_id, dairy_free, egg_free, gfcf_diet, gluten_free, notes, other_diet, soy_free, sugar_free, updated_at, user_id) FROM stdin;
\.


--
-- Data for Name: emergency_cards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.emergency_cards (id, child_id, data, updated_at, user_id) FROM stdin;
\.


--
-- Data for Name: expert_availabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expert_availabilities (id, day_of_week, enabled, end_time, start_time, expert_id) FROM stdin;
\.


--
-- Data for Name: expert_availability_blocked_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expert_availability_blocked_slots (availability_id, slot_time) FROM stdin;
\.


--
-- Data for Name: expert_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expert_reviews (id, comment, created_at, rating, expert_id, reviewer_id) FROM stdin;
\.


--
-- Data for Name: expert_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expert_tasks (id, category, created_at, description, difficulty, due_date, frequency, material_url, status, title, updated_at, child_id, expert_id, parent_id) FROM stdin;
\.


--
-- Data for Name: family_meetings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.family_meetings (id, created_at, meeting_link, notes, scheduled_time, status, updated_at, guest_parent_id, host_parent_id) FROM stdin;
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	1	initial schema	SQL	V1__initial_schema.sql	-1791436107	postgres	2026-06-05 17:07:07.787794	98	t
2	2	forum enhancement	SQL	V2__forum_enhancement.sql	-457875597	postgres	2026-06-05 17:07:07.901844	8	t
3	3	children gender photo	SQL	V3__children_gender_photo.sql	546831343	postgres	2026-06-05 17:07:07.918657	0	t
4	4	screening results	SQL	V4__screening_results.sql	106711381	postgres	2026-06-05 17:07:07.921766	2	t
5	5	daily tracking social stories	SQL	V5__daily_tracking_social_stories.sql	-1480394914	postgres	2026-06-05 17:07:07.926232	8	t
6	6	remove blocked appointments	SQL	V6__remove_blocked_appointments.sql	-504133379	postgres	2026-06-05 17:07:07.937282	34	t
\.


--
-- Data for Name: forum_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forum_comments (id, post_id, author_id, content, parent_comment_id, like_count, created_at, updated_at, vote_count, is_accepted, is_anonymous, is_expert_approved) FROM stdin;
\.


--
-- Data for Name: forum_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forum_posts (id, author_id, title, content, category, is_pinned, like_count, comment_count, created_at, updated_at, post_type, is_answered, accepted_answer_id, privacy_settings, is_anonymous, is_featured) FROM stdin;
\.


--
-- Data for Name: goals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.goals (id, active, category, child_id, created_at, description, entries, reward_description, reward_title, target_count, title, token_color, token_emoji, user_id) FROM stdin;
\.


--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_members (id, group_id, user_id, role, joined_at) FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, name, description, category, is_verified, avatar_url, conversation_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: knowledge_articles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_articles (id, title, content, category, author_id, is_published, view_count, created_at, updated_at, format, media_url) FROM stdin;
\.


--
-- Data for Name: medication_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.medication_logs (id, medication_id, child_id, log_date, scheduled_time, taken, taken_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: medications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.medications (id, child_id, name, dosage, unit, frequency, scheduled_times, notes, is_active, start_date, end_date, created_at) FROM stdin;
\.


--
-- Data for Name: message_reactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_reactions (id, created_at, emoji, message_id, user_id) FROM stdin;
\.


--
-- Data for Name: message_read_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_read_receipts (id, read_at, message_id, user_id) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, sender_id, content, message_type, is_read, sent_at, file_name, file_type, file_url, reply_to_id) FROM stdin;
\.


--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.milestones (id, child_id, title, description, category, achieved_date, created_at) FROM stdin;
\.


--
-- Data for Name: mood_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mood_entries (id, child_id, entry_date, mood_level, notes, triggers, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, body, created_at, link, is_read, title, type, user_id) FROM stdin;
\.


--
-- Data for Name: nutrition_foods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nutrition_foods (id, accepted, category, child_id, created_at, name, user_id) FROM stdin;
\.


--
-- Data for Name: nutrition_meals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nutrition_meals (id, child_id, created_at, date, foods, meal_type, mood, notes, user_id) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, created_at, expires_at, token, used, user_id) FROM stdin;
\.


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_settings (id, ai_enabled, maintenance_mode, registrations_open) FROM stdin;
\.


--
-- Data for Name: post_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_tags (post_id, tag_id) FROM stdin;
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.push_subscriptions (id, auth_key, created_at, endpoint, last_seen_at, p256dh_key, updated_at, user_agent, user_id) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token, expires_at, created_at, used) FROM stdin;
1741f2d9-7fa8-4598-963b-debb691e851d	ce4efcc2-db86-4796-9e40-137346b815ad	eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZTRlZmNjMi1kYjg2LTQ3OTYtOWU0MC0xMzczNDZiODE1YWQiLCJqdGkiOiI5ZTk1NGExOC1iNzJkLTQ3NjYtYjVkZS1jZDc0NWMyZmQxMGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4MDY2ODcyNSwiZXhwIjoxNzgxMjczNTI1fQ.oRggwY-F94K-YJqTeT08jRcWompaq57TDLw2ri-4PIuSrLbl_mO9MzKDVdPSTEfcTOmFiJ5j3yrRUp9jGRVcRg	2026-06-12 17:12:05.335417	2026-06-05 17:12:05.335437	f
cce168f8-ff0e-4847-86cf-77bb9d9fb964	ce4efcc2-db86-4796-9e40-137346b815ad	eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZTRlZmNjMi1kYjg2LTQ3OTYtOWU0MC0xMzczNDZiODE1YWQiLCJqdGkiOiIxNTRiYTg5YS05NTc5LTQ1OTMtYmFmMi03M2NkOTQ1OGMwZmIiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4MDY2ODczMSwiZXhwIjoxNzgxMjczNTMxfQ.6HT4ygctXppTpWS1AN382oIDsXeIhLT2Td_57fM3jaBbjcwtTrscAdffPNriueKaiFHWyt0Tg1dsg-O3S-7odg	2026-06-12 17:12:11.88812	2026-06-05 17:12:11.888131	f
e08a6664-dbdc-478e-8ae8-ee66d33c8c70	ce4efcc2-db86-4796-9e40-137346b815ad	eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjZTRlZmNjMi1kYjg2LTQ3OTYtOWU0MC0xMzczNDZiODE1YWQiLCJqdGkiOiI0MjY5NGQyYS0zMTNmLTQ4ZDQtYjA1NS0wZWZhOTM0NzQxZDQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4MDY2ODczOSwiZXhwIjoxNzgxMjczNTM5fQ.PeONa70UTjdHhL2-Cwqsq7gEgBfFaZXMQu8ytKJyswMAaSUsZrNemImcl69c3E8amd6PV78iP_U5UqlIyvggdA	2026-06-12 17:12:19.628417	2026-06-05 17:12:19.628427	f
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, admin_note, created_at, reason, status, target_id, target_type, reporter_id) FROM stdin;
\.


--
-- Data for Name: routine_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routine_items (id, created_at, description, icon_name, scheduled_time, title, updated_at, routine_id) FROM stdin;
\.


--
-- Data for Name: routines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routines (id, created_at, description, is_active, name, updated_at, child_id) FROM stdin;
\.


--
-- Data for Name: school_diary_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.school_diary_entries (id, category, child_id, content, created_at, date, from_name, from_role, replies, user_id) FROM stdin;
\.


--
-- Data for Name: screening_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.screening_results (id, child_id, test_type, score, risk_level, answers, created_at) FROM stdin;
\.


--
-- Data for Name: sensory_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sensory_profiles (id, child_id, domains, updated_at, user_id) FROM stdin;
\.


--
-- Data for Name: shared_progress_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shared_progress_notes (id, child_id, completed_at, content, created_at, due_date, expert_id, from_name, from_role, replies, status, title, type, user_id) FROM stdin;
\.


--
-- Data for Name: sleep_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sleep_entries (id, child_id, sleep_date, bedtime, wake_time, duration_minutes, quality, night_wakings, notes, created_at) FROM stdin;
\.


--
-- Data for Name: social_stories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.social_stories (id, author_id, title, category, description, pages, is_public, child_id, view_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, name, category, description, created_at) FROM stdin;
d9605747-53b5-4be5-bd02-e5b439e653ad	Konuşma Gecikmesi	ILETISIM	Yaşına göre beklenen konuşma seviyesinin gerisinde kalma	2026-06-05 17:07:07.908729
34dfdec6-94ce-4a06-a3d4-f9cbe5c96a01	Sözel Olmayan İletişim	ILETISIM	Jest, mimik ve beden dili ile iletişim	2026-06-05 17:07:07.908729
80a6124b-1aec-486b-8317-f9811e8d7247	Ekolali	ILETISIM	Duyulan sözcük veya cümlelerin tekrarı	2026-06-05 17:07:07.908729
e6adab8b-2987-41c3-aed6-7047d8d06be2	Dil Gerilemesi	ILETISIM	Önceden kazanılan dil becerilerinin kaybı	2026-06-05 17:07:07.908729
5a6b2972-6afd-42ae-b182-1024a9fdf23c	Zamirleri Ters Kullanma	ILETISIM	'Ben' yerine 'Sen' veya üçüncü tekil şahıs kullanma	2026-06-05 17:07:07.908729
ad53602e-7015-49d9-9144-6cf2f2f7fcef	Sözel Komutları Anlama Zorluğu	ILETISIM	İşitme sorunu olmamasına rağmen komutlara tepki vermeme	2026-06-05 17:07:07.908729
6ca71b2c-ead1-4fd1-ab42-64083d38835e	Düz Ses Tonu	ILETISIM	Monoton, prosodi eksikliği veya robotik ses tonuyla konuşma	2026-06-05 17:07:07.908729
8d51de4f-8bed-4ff1-aebc-54dc7d44612d	Karşılıklı Sohbet Zorluğu	ILETISIM	Kendi ilgi alanları dışında sohbeti başlatma ve sürdürmede güçlük	2026-06-05 17:07:07.908729
9e6d64d4-d288-4b6a-9456-132de6a65ee3	Mecazları Anlama Zorluğu	ILETISIM	Deyimleri, şakaları ve mecaz anlamları kelimesi kelimesine algılama	2026-06-05 17:07:07.908729
174877f9-3753-453c-b0d9-6ee767e3ef16	Göz Teması Zorluğu	SOSYAL	Göz teması kurmada veya sürdürmede zorluk	2026-06-05 17:07:07.908729
8a3961f5-d0f2-4da1-83d5-286aaa247b89	Sosyal İzolasyon	SOSYAL	Akranlarla etkileşimden kaçınma	2026-06-05 17:07:07.908729
1d9feba9-da00-433f-b60c-71f3725bc1fa	Oyun Becerileri	SOSYAL	Hayal gücü oyunu veya paylaşımlı oyun zorluğu	2026-06-05 17:07:07.908729
4d177abf-fde6-46a4-b4eb-97632cb909bd	Taklit Zorluğu	SOSYAL	Hareketleri veya sesleri taklit etmede zorluk	2026-06-05 17:07:07.908729
961d4d8a-d87a-4509-9e81-03d9024c2947	Ortak Dikkat Eksikliği	SOSYAL	Bir nesneye/olaya ilgi çekmek için parmakla işaret etmeme	2026-06-05 17:07:07.908729
bf7ec52f-d87b-4cd8-9466-e046217f254d	Empati Kurma Zorluğu	SOSYAL	Başkalarının duygusal ipuçlarını anlama ve uygun tepki vermede güçlük	2026-06-05 17:07:07.908729
07d41d3e-b520-467c-bdd7-ae66f39a2235	Akran İlişkilerinde Güçlük	SOSYAL	Yaşıtlarıyla arkadaş edinme, sürdürme ve oyun kurmada zorluk	2026-06-05 17:07:07.908729
3728a60a-362e-4fa8-99ba-7407719ca2ac	Beden Dili Okuma Zorluğu	SOSYAL	Başkalarının jest, mimik ve duruşlarını yanlış anlama	2026-06-05 17:07:07.908729
07dff37e-0733-4e59-b464-d37e1032a0bc	İsimle Seslenildiğinde Tepkisizlik	SOSYAL	Kendi ismine tutarlı bir şekilde yanıt vermeme	2026-06-05 17:07:07.908729
776c1b25-bf15-4072-b74f-907c4fd74269	Duyusal Hassasiyet	DUYUSAL	Duyusal uyaranlara aşırı tepki	2026-06-05 17:07:07.908729
dc5dfac6-44a0-4710-bdae-a535807ce9b3	Ses Hassasiyeti	DUYUSAL	Yüksek seslere veya belirli seslere aşırı tepki	2026-06-05 17:07:07.908729
e95272f3-9e15-4850-a60b-4eb3cb8f88dd	Doku Hassasiyeti	DUYUSAL	Belirli dokulara veya giysilere karşı hassasiyet	2026-06-05 17:07:07.908729
d7aa7b5e-5252-4950-8f31-04ce0aba964d	Işık Hassasiyeti	DUYUSAL	Parlak ışıklara karşı hassasiyet	2026-06-05 17:07:07.908729
5b02deba-6a6f-49a8-8f85-7389a2b2cc3c	Yeme Seçiciliği	DUYUSAL	Sınırlı yiyecek çeşidi ve yeme sorunları	2026-06-05 17:07:07.908729
6d58285a-dcb7-428a-bc5c-b9363fec22c9	Koku ve Tat Hassasiyeti	DUYUSAL	Belirli kokulara karşı aşırı tepki ve yiyecek dokularına seçicilik	2026-06-05 17:07:07.908729
c5845102-0b85-4910-a1d5-c237a11e4ee0	Ağrı Hassasiyeti	DUYUSAL	Acıya karşı aşırı tepki verme veya hiç tepki vermeme	2026-06-05 17:07:07.908729
ae624b05-d21d-4c84-8f3c-2c5c4eaea1be	Proprioseptif Arayış	DUYUSAL	Sıkıştırılma, ağır battaniye veya sertçe sarılma ihtiyacı	2026-06-05 17:07:07.908729
dabc2abe-575a-4246-aeea-3d93b857f814	Vestibüler İhtiyaç	DUYUSAL	Sürekli kendi etrafında dönme, sallanma veya zıplama ihtiyacı	2026-06-05 17:07:07.908729
d106bd32-25d9-4a3f-97f2-52c11471e237	Görsel Uyaran Arayışı	DUYUSAL	Dönen nesnelere, tekerleklere veya ışıklara uzun süre odaklanma	2026-06-05 17:07:07.908729
940d9d6c-89b1-4435-a6c1-9473519dbc39	Tekrarlayıcı Davranışlar	DAVRANIS	Stereotipik veya tekrarlayan hareketler	2026-06-05 17:07:07.908729
bbc7fd2e-9c01-42e6-b249-903e7cadfb47	Stereotipi	DAVRANIS	El çırpma, sallanma gibi tekrarlayan motor hareketler	2026-06-05 17:07:07.908729
e6e0fb9e-c936-409e-9f33-61937dab6f61	Rutin Bağımlılığı	DAVRANIS	Değişikliklere karşı direnme, rutinlere bağlı kalma	2026-06-05 17:07:07.908729
bbdb2b84-8221-4416-af9b-77c633a4906f	Özkontrol Zorluğu	DAVRANIS	Duygu ve davranış düzenleme güçlüğü	2026-06-05 17:07:07.908729
8c5b6fdf-21b3-4e33-ae9e-16ebf3eb4f07	Uyku Problemleri	DAVRANIS	Uykuya dalma veya uyku sürekliliğinde zorluk	2026-06-05 17:07:07.908729
d47065f7-123b-4675-a027-eeebeb1e4dae	Takıntı ve Özel İlgiler	DAVRANIS	Belirli konulara, nesnelere veya detaylara aşırı düzeyde odaklanma	2026-06-05 17:07:07.908729
1c527451-ce61-41f1-ab33-a6e2f202d1f3	Kendi Kendine Zarar Verme	DAVRANIS	Öfke, kriz veya duyusal yüklenme anında kendine vurma, ısırma	2026-06-05 17:07:07.908729
41ff8a5d-2d43-4fee-971a-d4cac7fa3f12	Meltdown / Duyusal Kriz	DAVRANIS	Aşırı duyusal veya duygusal yüklenme sonucu yaşanan patlama nöbetleri	2026-06-05 17:07:07.908729
8bd830eb-3bb1-457d-8330-4122183e2e31	Tehlike Algısı Eksikliği	DAVRANIS	Korku hissetmeme, yola atlama veya tehlikeli durumlara girme eğilimi	2026-06-05 17:07:07.908729
fd974388-61ee-4837-a7f2-b8a10a9081fc	Hiperaktivite	DAVRANIS	Aşırı hareketlilik, yerinde duramama ve odaklanma güçlüğü	2026-06-05 17:07:07.908729
f4daa759-a91a-484c-a1b0-b294c3b5763c	İnce Motor Zorluğu	MOTOR	Kalem tutma, düğme gibi ince motor becerilerde zorluk	2026-06-05 17:07:07.908729
6a04f71b-0e5f-4dcf-97c3-fa47fc797e5d	Kaba Motor Zorluğu	MOTOR	Koşma, zıplama gibi büyük kas hareketlerinde zorluk	2026-06-05 17:07:07.908729
c9fa1904-95bc-46c1-bfc2-5a48982a15d0	Koordinasyon	MOTOR	El-göz koordinasyonu ve denge problemleri	2026-06-05 17:07:07.908729
d5e92022-8c40-434d-a417-f1dd3e0aca4d	Motor Planlama Zorluğu	MOTOR	Yeni motor hareketleri tasarlama ve ardışık yapmada güçlük	2026-06-05 17:07:07.908729
ba6c956f-abba-4d4f-a570-7d00cf166b56	Parmak Ucunda Yürüme	MOTOR	Topukları yere tam basmadan uzun süreli yürüme eğilimi	2026-06-05 17:07:07.908729
8ab88eb1-702e-4cf4-a810-78b0d5a1afdd	Zayıf Kas Tonusu	MOTOR	Gevşek vücut duruşu ve çabuk yorulma	2026-06-05 17:07:07.908729
c83f141e-6901-4634-b6df-4d4b1841d280	El-Göz Koordinasyonu Zayıflığı	MOTOR	Top yakalama, fırlatma ve makas kullanma gibi becerilerde zorluk	2026-06-05 17:07:07.908729
3056ae5d-94f8-4bcb-adc7-c2acbf2b2af0	Özel Eğitim	EGITIM	Bireyselleştirilmiş eğitim programı	2026-06-05 17:07:07.908729
fc0bec37-4efb-436e-88bc-d2b318a47cdd	ABA Terapi	EGITIM	Uygulamalı Davranış Analizi terapisi	2026-06-05 17:07:07.908729
a779d889-313e-4735-8c15-bb9691b60642	Erişkin Yaşam Becerileri	EGITIM	Günlük yaşam ve öz bakım becerileri eğitimi	2026-06-05 17:07:07.908729
1456ed98-8caa-44e0-9f9a-6bf569ac9f52	Floortime Terapisi	EGITIM	Çocuğun liderliğini takip eden oyun ve etkileşim temelli terapi	2026-06-05 17:07:07.908729
90b66a5b-e76a-482a-853d-00ad8e5e01a9	Duyu Bütünleme Terapisi	EGITIM	Duyusal işlemleme zorluklarına yönelik ergoterapi temelli destek	2026-06-05 17:07:07.908729
26bee8d8-c7d7-4e6b-b8b1-3eff4ec5c791	Konuşma ve Dil Terapisi	EGITIM	İletişim, artikülasyon ve ifade edici dil becerileri desteği	2026-06-05 17:07:07.908729
606f7de6-2af2-4453-ae56-f229314e92d4	Ergoterapi	EGITIM	Günlük yaşam becerileri, bağımsızlık ve ince motor gelişimi	2026-06-05 17:07:07.908729
c3d016c6-edf9-4dcd-9c72-d541c2ab0b33	PECS	EGITIM	Resim Değiş Tokuşuna Dayalı İletişim Sistemi	2026-06-05 17:07:07.908729
\.


--
-- Data for Name: task_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_submissions (id, evidence_url, expert_feedback, expert_reviewed, parent_note, submitted_at, updated_at, parent_id, task_id) FROM stdin;
\.


--
-- Data for Name: treatment_states; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.treatment_states (id, child_id, custom_goals, game_feedback, game_sessions, goal_progress_history, sensory_profile, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, full_name, phone, role, is_verified, kvkk_consent, kvkk_consent_date, profile_image_url, created_at, updated_at, bio, city, expert_title, institution, is_active, latitude, license_number, license_verified, license_verified_at, longitude, matching_enabled, specializations) FROM stdin;
ce4efcc2-db86-4796-9e40-137346b815ad	admin@autism.com	$2a$10$7oVKh0rXBnfQoDNqR8lS2usp2f0HzgXfUjbiSdrcbCPgbCPLUi.w6	Platform Yöneticisi	\N	ADMIN	t	t	\N	\N	2026-06-05 17:08:20.119438	2026-06-05 17:08:20.119458	\N	\N	\N	\N	t	\N	\N	f	\N	\N	t	[]
676e0acf-93a3-40d4-b069-c71158cdd3a6	kullanici@autism.com	$2b$10$E/DJH5pBJIK5IO9zVMxR6eyi69OOIJCJuhSJthxvex3IbQSXzRfea	Test Kullanıcı	05001234567	PARENT	t	t	2026-06-07 22:38:29.688815	\N	2026-06-07 22:38:29.688815	2026-06-07 22:38:29.688815	\N	İstanbul	\N	\N	t	\N	\N	\N	\N	\N	t	[]
76efc5da-3781-477b-b5df-29754c221d23	uzman@autism.com	$2b$10$1mI0hRNXmSF1afzmIWS0qOUjmy4Hg2pMADdy.cpVd8VfSpyQ5duU6	Dr. Test Uzman	05009876543	EXPERT	t	t	2026-06-07 22:38:29.688815	\N	2026-06-07 22:38:29.688815	2026-06-07 22:38:29.688815	Otizm Spektrum Bozukluğu alanında 10 yıllık deneyim.	İstanbul	Çocuk Gelişim Uzmanı	İstanbul Üniversitesi	t	\N	LIC-2024-001	t	\N	\N	t	["Otizm", "Çocuk Gelişimi", "Davranış Terapisi"]
77518d62-792e-42a4-8dc8-844715a31a22	dr.kemal@autism.com	$2b$12$0qx2KTIjPc4BPiBO.ndOBO8IXuyWL897sQY1Gq.D1tXssrYV17.96	Dr. Kemal	\N	EXPERT	t	t	2026-06-08 00:35:20.507221	\N	2026-06-08 00:35:20.507221	2026-06-08 00:35:20.507221	\N	\N	Uzman	\N	\N	\N	\N	\N	\N	\N	\N	\N
02dfec8a-bf9d-4187-b252-0cee7975b279	superadmin@autism.com	$2b$12$0qx2KTIjPc4BPiBO.ndOBO8IXuyWL897sQY1Gq.D1tXssrYV17.96	Super Admin	\N	ADMIN	t	t	2026-06-08 00:35:38.402347	\N	2026-06-08 00:35:38.402347	2026-06-08 00:35:38.402347	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: venue_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venue_reviews (id, comments, created_at, crowd_level, light_level, noise_level, user_id, venue_id) FROM stdin;
\.


--
-- Data for Name: venues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venues (id, address, avg_crowd_level, avg_light_level, avg_noise_level, category, created_at, description, latitude, longitude, name, updated_at) FROM stdin;
\.


--
-- Data for Name: votes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.votes (id, user_id, target_type, target_id, vote_value, created_at) FROM stdin;
\.


--
-- Data for Name: wellbeing_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wellbeing_entries (id, answers, created_at, entry_date, notes, score, user_id) FROM stdin;
\.


--
-- Name: abc_entries abc_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abc_entries
    ADD CONSTRAINT abc_entries_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bep_reports bep_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bep_reports
    ADD CONSTRAINT bep_reports_pkey PRIMARY KEY (id);


--
-- Name: buddy_relationships buddy_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buddy_relationships
    ADD CONSTRAINT buddy_relationships_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: child_tags child_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_pkey PRIMARY KEY (child_id, tag_id);


--
-- Name: children children_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_pkey PRIMARY KEY (id);


--
-- Name: clinical_data_shares clinical_data_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_data_shares
    ADD CONSTRAINT clinical_data_shares_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversation_settings conversation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT conversation_settings_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: development_notes development_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.development_notes
    ADD CONSTRAINT development_notes_pkey PRIMARY KEY (id);


--
-- Name: diet_preferences diet_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diet_preferences
    ADD CONSTRAINT diet_preferences_pkey PRIMARY KEY (id);


--
-- Name: emergency_cards emergency_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_cards
    ADD CONSTRAINT emergency_cards_pkey PRIMARY KEY (id);


--
-- Name: expert_availabilities expert_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_availabilities
    ADD CONSTRAINT expert_availabilities_pkey PRIMARY KEY (id);


--
-- Name: expert_reviews expert_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_reviews
    ADD CONSTRAINT expert_reviews_pkey PRIMARY KEY (id);


--
-- Name: expert_tasks expert_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_tasks
    ADD CONSTRAINT expert_tasks_pkey PRIMARY KEY (id);


--
-- Name: family_meetings family_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_meetings
    ADD CONSTRAINT family_meetings_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: forum_comments forum_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_pkey PRIMARY KEY (id);


--
-- Name: forum_posts forum_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: knowledge_articles knowledge_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_pkey PRIMARY KEY (id);


--
-- Name: medication_logs medication_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_pkey PRIMARY KEY (id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: message_read_receipts message_read_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT message_read_receipts_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: mood_entries mood_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mood_entries
    ADD CONSTRAINT mood_entries_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nutrition_foods nutrition_foods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nutrition_foods
    ADD CONSTRAINT nutrition_foods_pkey PRIMARY KEY (id);


--
-- Name: nutrition_meals nutrition_meals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nutrition_meals
    ADD CONSTRAINT nutrition_meals_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: post_tags post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_pkey PRIMARY KEY (post_id, tag_id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: routine_items routine_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_items
    ADD CONSTRAINT routine_items_pkey PRIMARY KEY (id);


--
-- Name: routines routines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT routines_pkey PRIMARY KEY (id);


--
-- Name: school_diary_entries school_diary_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_diary_entries
    ADD CONSTRAINT school_diary_entries_pkey PRIMARY KEY (id);


--
-- Name: screening_results screening_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screening_results
    ADD CONSTRAINT screening_results_pkey PRIMARY KEY (id);


--
-- Name: sensory_profiles sensory_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensory_profiles
    ADD CONSTRAINT sensory_profiles_pkey PRIMARY KEY (id);


--
-- Name: shared_progress_notes shared_progress_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shared_progress_notes
    ADD CONSTRAINT shared_progress_notes_pkey PRIMARY KEY (id);


--
-- Name: sleep_entries sleep_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_entries
    ADD CONSTRAINT sleep_entries_pkey PRIMARY KEY (id);


--
-- Name: social_stories social_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_stories
    ADD CONSTRAINT social_stories_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: task_submissions task_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_pkey PRIMARY KEY (id);


--
-- Name: treatment_states treatment_states_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_states
    ADD CONSTRAINT treatment_states_pkey PRIMARY KEY (id);


--
-- Name: expert_reviews uk65kh9lr9nc9pj2gvkud79ga7d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_reviews
    ADD CONSTRAINT uk65kh9lr9nc9pj2gvkud79ga7d UNIQUE (expert_id, reviewer_id);


--
-- Name: push_subscriptions uk6vabkyu7g789ehysoff7cfumf; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT uk6vabkyu7g789ehysoff7cfumf UNIQUE (endpoint);


--
-- Name: password_reset_tokens uk71lqwbwtklmljk3qlsugr1mig; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT uk71lqwbwtklmljk3qlsugr1mig UNIQUE (token);


--
-- Name: message_reactions uk97x64hflnew8pcu67n1bky803; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT uk97x64hflnew8pcu67n1bky803 UNIQUE (message_id, user_id, emoji);


--
-- Name: treatment_states uk9sm8gt51clb3o8dhy5cjw84bu; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treatment_states
    ADD CONSTRAINT uk9sm8gt51clb3o8dhy5cjw84bu UNIQUE (child_id);


--
-- Name: votes uk9t1fbxvh0fd4jixg48gnr0xn4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT uk9t1fbxvh0fd4jixg48gnr0xn4 UNIQUE (user_id, target_type, target_id);


--
-- Name: message_read_receipts ukay3698x3rtxmbspw31cevy0xb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT ukay3698x3rtxmbspw31cevy0xb UNIQUE (message_id, user_id);


--
-- Name: conversation_settings ukgm3kjfyt2m64kc65rwlmo2el6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT ukgm3kjfyt2m64kc65rwlmo2el6 UNIQUE (conversation_id, user_id);


--
-- Name: emergency_cards ukj839xxuew25jqkpmw9gjnieyy; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_cards
    ADD CONSTRAINT ukj839xxuew25jqkpmw9gjnieyy UNIQUE (child_id);


--
-- Name: expert_availabilities ukjq5up0svtv2xbbkabditi48p7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_availabilities
    ADD CONSTRAINT ukjq5up0svtv2xbbkabditi48p7 UNIQUE (expert_id, day_of_week);


--
-- Name: diet_preferences ukn27amiefx6ds31lbfjjo57wqv; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diet_preferences
    ADD CONSTRAINT ukn27amiefx6ds31lbfjjo57wqv UNIQUE (child_id);


--
-- Name: sensory_profiles ukotnwos5s4rnbdfvuji4aghtgw; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensory_profiles
    ADD CONSTRAINT ukotnwos5s4rnbdfvuji4aghtgw UNIQUE (child_id);


--
-- Name: group_members ukp940p7g0r9yihubnf6rtaheog; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT ukp940p7g0r9yihubnf6rtaheog UNIQUE (group_id, user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: venue_reviews venue_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_reviews
    ADD CONSTRAINT venue_reviews_pkey PRIMARY KEY (id);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (id);


--
-- Name: votes votes_user_id_target_type_target_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_target_type_target_id_key UNIQUE (user_id, target_type, target_id);


--
-- Name: wellbeing_entries wellbeing_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wellbeing_entries
    ADD CONSTRAINT wellbeing_entries_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_appointments_child_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_child_date ON public.appointments USING btree (child_id, appointment_date);


--
-- Name: idx_appointments_expert_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_expert_date ON public.appointments USING btree (expert_id, appointment_date);


--
-- Name: idx_appointments_parent_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_parent_date ON public.appointments USING btree (parent_id, appointment_date);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_calendar_child_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_child_id ON public.calendar_events USING btree (child_id);


--
-- Name: idx_calendar_start_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_start_time ON public.calendar_events USING btree (start_time);


--
-- Name: idx_child_tags_child; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_child_tags_child ON public.child_tags USING btree (child_id);


--
-- Name: idx_child_tags_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_child_tags_tag ON public.child_tags USING btree (tag_id);


--
-- Name: idx_children_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_children_parent_id ON public.children USING btree (parent_id);


--
-- Name: idx_conv_participants_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conv_participants_user ON public.conversation_participants USING btree (user_id);


--
-- Name: idx_dev_notes_child_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_notes_child_id ON public.development_notes USING btree (child_id);


--
-- Name: idx_dev_notes_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_notes_date ON public.development_notes USING btree (note_date);


--
-- Name: idx_forum_comments_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_comments_post ON public.forum_comments USING btree (post_id);


--
-- Name: idx_forum_posts_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_posts_author ON public.forum_posts USING btree (author_id);


--
-- Name: idx_forum_posts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_posts_category ON public.forum_posts USING btree (category);


--
-- Name: idx_group_members_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_members_group ON public.group_members USING btree (group_id);


--
-- Name: idx_group_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_members_user ON public.group_members USING btree (user_id);


--
-- Name: idx_knowledge_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_category ON public.knowledge_articles USING btree (category);


--
-- Name: idx_med_logs_child_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_med_logs_child_date ON public.medication_logs USING btree (child_id, log_date);


--
-- Name: idx_medications_child; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medications_child ON public.medications USING btree (child_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, sent_at);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_milestones_child_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestones_child_id ON public.milestones USING btree (child_id);


--
-- Name: idx_mood_child_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mood_child_date ON public.mood_entries USING btree (child_id, entry_date);


--
-- Name: idx_post_tags_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_tags_post ON public.post_tags USING btree (post_id);


--
-- Name: idx_post_tags_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_tags_tag ON public.post_tags USING btree (tag_id);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_screening_child_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_screening_child_id ON public.screening_results USING btree (child_id);


--
-- Name: idx_sleep_child_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sleep_child_date ON public.sleep_entries USING btree (child_id, sleep_date);


--
-- Name: idx_stories_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stories_author ON public.social_stories USING btree (author_id);


--
-- Name: idx_stories_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stories_public ON public.social_stories USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_tags_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_category ON public.tags USING btree (category);


--
-- Name: idx_votes_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votes_target ON public.votes USING btree (target_type, target_id);


--
-- Name: idx_votes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votes_user ON public.votes USING btree (user_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: calendar_events calendar_events_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: child_tags child_tags_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: child_tags child_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: children children_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: development_notes development_notes_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.development_notes
    ADD CONSTRAINT development_notes_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: message_reactions fk1o714y33gam6b6741ci4ho041; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT fk1o714y33gam6b6741ci4ho041 FOREIGN KEY (message_id) REFERENCES public.messages(id);


--
-- Name: push_subscriptions fk1v577hpc7v9mdrm2uyk6kqgnl; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT fk1v577hpc7v9mdrm2uyk6kqgnl FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversation_muted_by fk29rjb0l63l3r7vwvfu8w9i9f7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_muted_by
    ADD CONSTRAINT fk29rjb0l63l3r7vwvfu8w9i9f7 FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: family_meetings fk30e45yha9aerosp1um8tff1q4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_meetings
    ADD CONSTRAINT fk30e45yha9aerosp1um8tff1q4 FOREIGN KEY (guest_parent_id) REFERENCES public.users(id);


--
-- Name: family_meetings fk35hd26tie5tlxeki21yt1u62c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_meetings
    ADD CONSTRAINT fk35hd26tie5tlxeki21yt1u62c FOREIGN KEY (host_parent_id) REFERENCES public.users(id);


--
-- Name: message_read_receipts fk37k9gws80wf2nbm7nmj2y0dab; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT fk37k9gws80wf2nbm7nmj2y0dab FOREIGN KEY (message_id) REFERENCES public.messages(id);


--
-- Name: wellbeing_entries fk3jtvoj9vqukbk008yrj4u5fdi; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wellbeing_entries
    ADD CONSTRAINT fk3jtvoj9vqukbk008yrj4u5fdi FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: appointments fk7vli681aquq42wxfa81bngw56; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT fk7vli681aquq42wxfa81bngw56 FOREIGN KEY (expert_id) REFERENCES public.users(id);


--
-- Name: bep_reports fk83kxwi0dj77f1c92lbaq4kihi; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bep_reports
    ADD CONSTRAINT fk83kxwi0dj77f1c92lbaq4kihi FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notifications fk9y21adhxn0ayjhfocscqox7bh; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk9y21adhxn0ayjhfocscqox7bh FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: task_submissions fkakdmr8myrvywo4tof2kykulu9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT fkakdmr8myrvywo4tof2kykulu9 FOREIGN KEY (task_id) REFERENCES public.expert_tasks(id);


--
-- Name: routine_items fkbuxe25dey1ma7sva6y8f0ka0w; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_items
    ADD CONSTRAINT fkbuxe25dey1ma7sva6y8f0ka0w FOREIGN KEY (routine_id) REFERENCES public.routines(id);


--
-- Name: reports fkd3qiw2om5d2oh5xb7fbdcq225; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fkd3qiw2om5d2oh5xb7fbdcq225 FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: expert_availability_blocked_slots fke91q6m5xql9gy2ode9ym6vx36; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_availability_blocked_slots
    ADD CONSTRAINT fke91q6m5xql9gy2ode9ym6vx36 FOREIGN KEY (availability_id) REFERENCES public.expert_availabilities(id);


--
-- Name: expert_tasks fkff0pa62komu43ah3r7hu9fila; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_tasks
    ADD CONSTRAINT fkff0pa62komu43ah3r7hu9fila FOREIGN KEY (expert_id) REFERENCES public.users(id);


--
-- Name: message_read_receipts fkfws1llgb2i066i1mebldx48d1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_read_receipts
    ADD CONSTRAINT fkfws1llgb2i066i1mebldx48d1 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages fkg23x99if9xk265onv7btb0cg9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fkg23x99if9xk265onv7btb0cg9 FOREIGN KEY (reply_to_id) REFERENCES public.messages(id);


--
-- Name: clinical_data_shares fkgddg1rx12be3xygg77as81q00; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_data_shares
    ADD CONSTRAINT fkgddg1rx12be3xygg77as81q00 FOREIGN KEY (expert_id) REFERENCES public.users(id);


--
-- Name: task_submissions fkhnb7tpcdyy3gt10f6qfq897nt; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT fkhnb7tpcdyy3gt10f6qfq897nt FOREIGN KEY (parent_id) REFERENCES public.users(id);


--
-- Name: expert_reviews fkif2ygrbmtokjwpyb3o3kr2vnd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_reviews
    ADD CONSTRAINT fkif2ygrbmtokjwpyb3o3kr2vnd FOREIGN KEY (expert_id) REFERENCES public.users(id);


--
-- Name: appointments fkj54gpyonyga01uqgy1megbeax; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT fkj54gpyonyga01uqgy1megbeax FOREIGN KEY (parent_id) REFERENCES public.users(id);


--
-- Name: password_reset_tokens fkk3ndxg5xp6v7wd4gjyusp15gq; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT fkk3ndxg5xp6v7wd4gjyusp15gq FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: expert_tasks fkl3h8kftolohpcqwby8d4b1c3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_tasks
    ADD CONSTRAINT fkl3h8kftolohpcqwby8d4b1c3 FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: clinical_data_shares fklc1pcn6sp4pk1kmbahloix1vq; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_data_shares
    ADD CONSTRAINT fklc1pcn6sp4pk1kmbahloix1vq FOREIGN KEY (parent_id) REFERENCES public.users(id);


--
-- Name: conversation_settings fkmp7a72rwde59ikyoq80tf5usl; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT fkmp7a72rwde59ikyoq80tf5usl FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: buddy_relationships fkmx0bx7ex3e5533y90u92daud; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buddy_relationships
    ADD CONSTRAINT fkmx0bx7ex3e5533y90u92daud FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: expert_tasks fkn8wikk54fkb1soq0xa72mp314; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_tasks
    ADD CONSTRAINT fkn8wikk54fkb1soq0xa72mp314 FOREIGN KEY (parent_id) REFERENCES public.users(id);


--
-- Name: abc_entries fkn9jj03xbg2ff02nukei9gimrq; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abc_entries
    ADD CONSTRAINT fkn9jj03xbg2ff02nukei9gimrq FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: clinical_data_shares fko7oytycvr8roor1htdup3q1ir; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_data_shares
    ADD CONSTRAINT fko7oytycvr8roor1htdup3q1ir FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: conversation_settings fkobhe8fdbs514dw1gd1eq2msh8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_settings
    ADD CONSTRAINT fkobhe8fdbs514dw1gd1eq2msh8 FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: conversation_archived_by fkogwxqb3uv8qgcey5ebpk5p3u3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_archived_by
    ADD CONSTRAINT fkogwxqb3uv8qgcey5ebpk5p3u3 FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: message_reactions fkoip2ttlg2py976foointttaew; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT fkoip2ttlg2py976foointttaew FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bep_reports fkojqp9r7brjgd5sj4ucr69rab; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bep_reports
    ADD CONSTRAINT fkojqp9r7brjgd5sj4ucr69rab FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: expert_availabilities fkp9uawqmwhxtwd4w5vlumlr51e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_availabilities
    ADD CONSTRAINT fkp9uawqmwhxtwd4w5vlumlr51e FOREIGN KEY (expert_id) REFERENCES public.users(id);


--
-- Name: routines fkpvfgoqj5ipt127na2bpd39egu; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT fkpvfgoqj5ipt127na2bpd39egu FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: expert_reviews fkqwux41isuly89xj4mt47jio13; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expert_reviews
    ADD CONSTRAINT fkqwux41isuly89xj4mt47jio13 FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: appointments fkqxyshvyqv9uivgsguf96lqggv; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT fkqxyshvyqv9uivgsguf96lqggv FOREIGN KEY (child_id) REFERENCES public.children(id);


--
-- Name: buddy_relationships fkt1gmtibkw4bvtrjxoywf07cie; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buddy_relationships
    ADD CONSTRAINT fkt1gmtibkw4bvtrjxoywf07cie FOREIGN KEY (requester_id) REFERENCES public.users(id);


--
-- Name: forum_comments forum_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: forum_comments forum_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.forum_comments(id);


--
-- Name: forum_comments forum_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- Name: forum_posts forum_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: knowledge_articles knowledge_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: medication_logs medication_logs_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: medication_logs medication_logs_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medication_logs
    ADD CONSTRAINT medication_logs_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: medications medications_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: milestones milestones_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: mood_entries mood_entries_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mood_entries
    ADD CONSTRAINT mood_entries_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: screening_results screening_results_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screening_results
    ADD CONSTRAINT screening_results_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: sleep_entries sleep_entries_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_entries
    ADD CONSTRAINT sleep_entries_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- Name: social_stories social_stories_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_stories
    ADD CONSTRAINT social_stories_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: social_stories social_stories_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_stories
    ADD CONSTRAINT social_stories_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE SET NULL;


--
-- Name: votes votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ouh5aeu3uPUQ7R5p06nrFJm4lkm6CZHOeIfuyVeX1sa9urZi8at2UJxvkBez7vA

