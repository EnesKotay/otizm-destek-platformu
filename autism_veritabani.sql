--
-- PostgreSQL database dump
--

\restrict zbGDp5IarFMltuJcOFnh5LBroE82AcMDcQD7B3P3iql7M7r4a76nkegS5d4mGCP

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-05-06 19:14:06

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 47876)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 233 (class 1259 OID 48203)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource_type character varying(100),
    resource_id uuid,
    ip_address character varying(45),
    details jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 47978)
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    child_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type character varying(50) NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    recurrence_rule character varying(255),
    reminder_enabled boolean DEFAULT true,
    color character varying(7) DEFAULT '#4F46E5'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.calendar_events OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 48279)
-- Name: child_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.child_tags (
    child_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.child_tags OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 47911)
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.children OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 48015)
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
-- TOC entry 225 (class 1259 OID 48004)
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying(20) DEFAULT 'DIRECT'::character varying NOT NULL,
    last_message_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 47933)
-- Name: development_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.development_notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    child_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    category character varying(50),
    mood character varying(30),
    note_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.development_notes OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 48246)
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
-- TOC entry 231 (class 1259 OID 48147)
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
    is_anonymous boolean DEFAULT false,
    is_expert_approved boolean DEFAULT false
);


ALTER TABLE public.forum_comments OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 48121)
-- Name: forum_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forum_posts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    author_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(100),
    is_pinned boolean DEFAULT false,
    like_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    post_type character varying(30) DEFAULT 'DENEYIM'::character varying NOT NULL,
    is_answered boolean DEFAULT false,
    accepted_answer_id uuid,
    privacy_settings jsonb DEFAULT '{"showChildAge": true, "showRealName": true, "showSymptoms": true, "allowMatching": true, "showDiagnosis": false}'::jsonb,
    is_anonymous boolean DEFAULT false
);


ALTER TABLE public.forum_posts OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 48065)
-- Name: group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'MEMBER'::character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.group_members OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 48039)
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    is_verified boolean DEFAULT false,
    avatar_url character varying(500),
    conversation_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 48222)
-- Name: knowledge_articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_articles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(100),
    author_id uuid,
    is_published boolean DEFAULT false,
    view_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.knowledge_articles OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 48092)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    message_type character varying(20) DEFAULT 'TEXT'::character varying NOT NULL,
    is_read boolean DEFAULT false,
    sent_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 47957)
-- Name: milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    child_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category character varying(50),
    achieved_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.milestones OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 48298)
-- Name: post_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_tags (
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.post_tags OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 48180)
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 48263)
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 47887)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    phone character varying(20),
    role character varying(20) DEFAULT 'PARENT'::character varying NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    kvkk_consent boolean DEFAULT false NOT NULL,
    kvkk_consent_date timestamp without time zone,
    profile_image_url character varying(500),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 48317)
-- Name: votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.votes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id uuid NOT NULL,
    vote_value integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.votes OWNER TO postgres;

--
-- TOC entry 5273 (class 0 OID 48203)
-- Dependencies: 233
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, resource_type, resource_id, ip_address, details, created_at) FROM stdin;
\.


--
-- TOC entry 5264 (class 0 OID 47978)
-- Dependencies: 224
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendar_events (id, child_id, title, description, event_type, start_time, end_time, recurrence_rule, reminder_enabled, color, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5277 (class 0 OID 48279)
-- Dependencies: 237
-- Data for Name: child_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.child_tags (child_id, tag_id) FROM stdin;
\.


--
-- TOC entry 5261 (class 0 OID 47911)
-- Dependencies: 221
-- Data for Name: children; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.children (id, parent_id, name, birth_date, diagnosis_info, education_program, therapies, privacy_settings, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5266 (class 0 OID 48015)
-- Dependencies: 226
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_participants (id, conversation_id, user_id, joined_at) FROM stdin;
\.


--
-- TOC entry 5265 (class 0 OID 48004)
-- Dependencies: 225
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, type, last_message_at, created_at) FROM stdin;
\.


--
-- TOC entry 5262 (class 0 OID 47933)
-- Dependencies: 222
-- Data for Name: development_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.development_notes (id, child_id, title, content, category, mood, note_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5275 (class 0 OID 48246)
-- Dependencies: 235
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	1	<< Flyway Baseline >>	BASELINE	<< Flyway Baseline >>	\N	postgres	2026-04-20 17:58:45.454127	0	t
\.


--
-- TOC entry 5271 (class 0 OID 48147)
-- Dependencies: 231
-- Data for Name: forum_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forum_comments (id, post_id, author_id, content, parent_comment_id, like_count, created_at, updated_at, vote_count, is_accepted) FROM stdin;
\.


--
-- TOC entry 5270 (class 0 OID 48121)
-- Dependencies: 230
-- Data for Name: forum_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forum_posts (id, author_id, title, content, category, is_pinned, like_count, comment_count, created_at, updated_at, post_type, is_answered, accepted_answer_id, privacy_settings) FROM stdin;
\.


--
-- TOC entry 5268 (class 0 OID 48065)
-- Dependencies: 228
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_members (id, group_id, user_id, role, joined_at) FROM stdin;
\.


--
-- TOC entry 5267 (class 0 OID 48039)
-- Dependencies: 227
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, name, description, category, is_verified, avatar_url, conversation_id, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5274 (class 0 OID 48222)
-- Dependencies: 234
-- Data for Name: knowledge_articles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_articles (id, title, content, category, author_id, is_published, view_count, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5269 (class 0 OID 48092)
-- Dependencies: 229
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, sender_id, content, message_type, is_read, sent_at) FROM stdin;
\.


--
-- TOC entry 5263 (class 0 OID 47957)
-- Dependencies: 223
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.milestones (id, child_id, title, description, category, achieved_date, created_at) FROM stdin;
\.


--
-- TOC entry 5278 (class 0 OID 48298)
-- Dependencies: 238
-- Data for Name: post_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_tags (post_id, tag_id) FROM stdin;
\.


--
-- TOC entry 5272 (class 0 OID 48180)
-- Dependencies: 232
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token, expires_at, created_at) FROM stdin;
152f7f97-a003-49a7-baa0-90357f7ac3ca	4060362a-c0b7-4f11-a31d-c1c09d5328c9	eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiI0MDYwMzYyYS1jMGI3LTRmMTEtYTMxZC1jMWMwOWQ1MzI4YzkiLCJpYXQiOjE3NzY2OTc3MzgsImV4cCI6MTc3NzMwMjUzOH0.ByelMotK1bFrpnhBhZzv6cRhy-Lol4DgAUs19lE74gbyBPo5V4g_Cee3cavUVZQd	2026-04-27 18:08:58.124353	2026-04-20 18:08:58.124353
34549aec-108a-4666-9429-de3f34780c84	4060362a-c0b7-4f11-a31d-c1c09d5328c9	eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiI0MDYwMzYyYS1jMGI3LTRmMTEtYTMxZC1jMWMwOWQ1MzI4YzkiLCJpYXQiOjE3NzY3MDAzMjksImV4cCI6MTc3NzMwNTEyOX0.wGNChmdAk25M_hYkQiALnAsCt57TyQ4h5Wpk0Hrur1Km5Q1dg61UfBWoEyHxpsmi	2026-04-27 18:52:09.065836	2026-04-20 18:52:09.065836
e751ddaf-95e7-4f92-bcfb-e3ad19921964	4060362a-c0b7-4f11-a31d-c1c09d5328c9	eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiI0MDYwMzYyYS1jMGI3LTRmMTEtYTMxZC1jMWMwOWQ1MzI4YzkiLCJpYXQiOjE3NzY3MDAzNTQsImV4cCI6MTc3NzMwNTE1NH0.B3hSh4dvfSHlqaKvE7oxr0EJAWWpRVWLdFAkYMOFPj1uDw-GyqaQhhGYNjwLuY6g	2026-04-27 18:52:34.106993	2026-04-20 18:52:34.106993
\.


--
-- TOC entry 5276 (class 0 OID 48263)
-- Dependencies: 236
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, name, category, description, created_at) FROM stdin;
75f210e3-d0b3-450b-a394-0c567efcb1c2	Konusma Gecikmesi	ILETISIM	Yasina gore beklenen konusma seviyesinin gerisinde kalma	2026-04-20 18:40:31.591709
ba98e7a5-4ae7-4a00-a1a1-8422318d3dae	Sozel Olmayan Iletisim	ILETISIM	Jest, mimik ve beden dili ile iletisim	2026-04-20 18:40:31.591709
18061a76-a2ed-4084-9adf-d0d1143de42d	Ekolali	ILETISIM	Duyulan sozcuk veya cumlelerin tekrari	2026-04-20 18:40:31.591709
ca2ccfbf-2ee1-4454-91dd-4efeeb2f254c	Dil Gerilemesi	ILETISIM	Onceden kazanilan dil becerilerinin kaybi	2026-04-20 18:40:31.591709
0db1035c-33ba-4120-bfed-a28d6854811b	Goz Temasi Zorlugu	SOSYAL	Goz temasi kurmada veya surdurmede zorluk	2026-04-20 18:40:31.591709
2fabdf89-2690-4805-8541-90638a86a5dd	Sosyal Izolasyon	SOSYAL	Akranlarla etkilesimden kacinma	2026-04-20 18:40:31.591709
e78216d0-2d6e-4239-a736-cb765cf1df9a	Oyun Becerileri	SOSYAL	Hayal gucu oyunu veya paylasimli oyun zorlugu	2026-04-20 18:40:31.591709
8efdb645-6bdb-4b65-932d-602fd36a9e18	Taklit Zorlugu	SOSYAL	Hareketleri veya sesleri taklit etmede zorluk	2026-04-20 18:40:31.591709
bb5eac3c-759b-4a39-bb09-b0cb11c71984	Duyusal Hassasiyet	DUYUSAL	Duyusal uyaranlara asiri tepki	2026-04-20 18:40:31.591709
88924e95-a4d7-40a0-8ea3-99b68dd9fd78	Ses Hassasiyeti	DUYUSAL	Yuksek seslere veya belirli seslere asiri tepki	2026-04-20 18:40:31.591709
bea2d646-aad9-4752-a552-f4659ba9d782	Doku Hassasiyeti	DUYUSAL	Belirli dokulara veya giysilere karsi hassasiyet	2026-04-20 18:40:31.591709
bed2b783-fc2f-4cad-8357-d9d1ebfc41c2	Isik Hassasiyeti	DUYUSAL	Parlak isiklara karsi hassasiyet	2026-04-20 18:40:31.591709
be6294a7-a724-4ae0-bef3-d6b40e0c3360	Tekrarlayici Davranislar	DAVRANIS	Stereotipik veya tekrarlayan hareketler	2026-04-20 18:40:31.591709
4bed1df3-a626-4f18-877b-8f5c740e378e	Stereotipi	DAVRANIS	El cirpma, sallanma gibi tekrarlayan motor hareketler	2026-04-20 18:40:31.591709
22b875a9-b192-45f3-9ab0-f7465a789b6d	Rutin Bagimliligi	DAVRANIS	Degisikliklere karsi direnme, rutinlere bagli kalma	2026-04-20 18:40:31.591709
1539e857-8d95-4245-ac2a-f813ba35bcb3	Ozkontrol Zorlugu	DAVRANIS	Duygu ve davranis duzenleme guclugu	2026-04-20 18:40:31.591709
b09880fb-9c2b-4f44-b780-2767e7b65d45	Ince Motor Zorlugu	MOTOR	Kalem tutma, dukme gibi ince motor becerilerde zorluk	2026-04-20 18:40:31.591709
1a65859e-a1b3-41e0-a7fd-1de3528f6904	Kaba Motor Zorlugu	MOTOR	Kosma, zipla gibi buyuk kas hareketlerinde zorluk	2026-04-20 18:40:31.591709
4f03cdb4-0fa7-4510-8cf4-bb27900bd11a	Koordinasyon	MOTOR	El-goz koordinasyonu ve denge problemleri	2026-04-20 18:40:31.591709
616665b7-346c-4719-aff2-dce47f03b6e3	Ozel Egitim	EGITIM	Bireysellestirilmis egitim programi	2026-04-20 18:40:31.591709
4600dfcc-71a2-4f74-ba19-1c58a1a5f5ae	ABA Terapi	EGITIM	Uygulamali Davranis Analizi terapisi	2026-04-20 18:40:31.591709
dd4e68e6-85e2-4390-b536-6ecd1f79dd7d	Eriskin Yasam Becerileri	EGITIM	Gunluk yasam ve oz bakim becerileri egitimi	2026-04-20 18:40:31.591709
3e2d87b0-afbc-4b9f-b0f5-95b6b2cde86a	Yeme Seciciligi	DUYUSAL	Sinirli yiyecek cesidi ve yeme sorunlari	2026-04-20 18:40:31.591709
87b4a9b3-4404-4d52-9eec-cb297db8309e	Uyku Problemleri	DAVRANIS	Uykuya dalma veya uyku surekliliginde zorluk	2026-04-20 18:40:31.591709
\.


--
-- TOC entry 5260 (class 0 OID 47887)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, full_name, phone, role, is_verified, kvkk_consent, kvkk_consent_date, profile_image_url, created_at, updated_at) FROM stdin;
4060362a-c0b7-4f11-a31d-c1c09d5328c9	yasingulsen28m@gmail.com	$2a$10$BLEXddE.ggpvmfBTSmJrzO1GanbVA8YoPKLU240ZK8tHecaAK.HyK	yasin gülşen	05352944741	PARENT	f	t	2026-04-20 18:08:57.884035	\N	2026-04-20 18:08:58.146185	2026-04-20 18:08:58.146185
\.


--
-- TOC entry 5279 (class 0 OID 48317)
-- Dependencies: 239
-- Data for Name: votes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.votes (id, user_id, target_type, target_id, vote_value, created_at) FROM stdin;
\.


--
-- TOC entry 5061 (class 2606 OID 48214)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5025 (class 2606 OID 47996)
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5076 (class 2606 OID 48285)
-- Name: child_tags child_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_pkey PRIMARY KEY (child_id, tag_id);


--
-- TOC entry 5015 (class 2606 OID 47926)
-- Name: children children_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_pkey PRIMARY KEY (id);


--
-- TOC entry 5031 (class 2606 OID 48027)
-- Name: conversation_participants conversation_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- TOC entry 5033 (class 2606 OID 48025)
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- TOC entry 5029 (class 2606 OID 48014)
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 5018 (class 2606 OID 47949)
-- Name: development_notes development_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.development_notes
    ADD CONSTRAINT development_notes_pkey PRIMARY KEY (id);


--
-- TOC entry 5068 (class 2606 OID 48261)
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- TOC entry 5052 (class 2606 OID 48163)
-- Name: forum_comments forum_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_pkey PRIMARY KEY (id);


--
-- TOC entry 5048 (class 2606 OID 48139)
-- Name: forum_posts forum_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_pkey PRIMARY KEY (id);


--
-- TOC entry 5038 (class 2606 OID 48079)
-- Name: group_members group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- TOC entry 5040 (class 2606 OID 48077)
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- TOC entry 5036 (class 2606 OID 48054)
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5066 (class 2606 OID 48238)
-- Name: knowledge_articles knowledge_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_pkey PRIMARY KEY (id);


--
-- TOC entry 5046 (class 2606 OID 48108)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5023 (class 2606 OID 47971)
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- TOC entry 5082 (class 2606 OID 48304)
-- Name: post_tags post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_pkey PRIMARY KEY (post_id, tag_id);


--
-- TOC entry 5057 (class 2606 OID 48193)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5059 (class 2606 OID 48195)
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- TOC entry 5072 (class 2606 OID 48277)
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- TOC entry 5074 (class 2606 OID 48275)
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- TOC entry 5011 (class 2606 OID 47910)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5013 (class 2606 OID 47908)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5086 (class 2606 OID 48330)
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (id);


--
-- TOC entry 5088 (class 2606 OID 48332)
-- Name: votes votes_user_id_target_type_target_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_target_type_target_id_key UNIQUE (user_id, target_type, target_id);


--
-- TOC entry 5069 (class 1259 OID 48262)
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- TOC entry 5062 (class 1259 OID 48221)
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at);


--
-- TOC entry 5063 (class 1259 OID 48220)
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- TOC entry 5026 (class 1259 OID 48002)
-- Name: idx_calendar_child_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_child_id ON public.calendar_events USING btree (child_id);


--
-- TOC entry 5027 (class 1259 OID 48003)
-- Name: idx_calendar_start_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_start_time ON public.calendar_events USING btree (start_time);


--
-- TOC entry 5077 (class 1259 OID 48296)
-- Name: idx_child_tags_child; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_child_tags_child ON public.child_tags USING btree (child_id);


--
-- TOC entry 5078 (class 1259 OID 48297)
-- Name: idx_child_tags_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_child_tags_tag ON public.child_tags USING btree (tag_id);


--
-- TOC entry 5016 (class 1259 OID 47932)
-- Name: idx_children_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_children_parent_id ON public.children USING btree (parent_id);


--
-- TOC entry 5034 (class 1259 OID 48038)
-- Name: idx_conv_participants_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conv_participants_user ON public.conversation_participants USING btree (user_id);


--
-- TOC entry 5019 (class 1259 OID 47955)
-- Name: idx_dev_notes_child_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_notes_child_id ON public.development_notes USING btree (child_id);


--
-- TOC entry 5020 (class 1259 OID 47956)
-- Name: idx_dev_notes_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_notes_date ON public.development_notes USING btree (note_date);


--
-- TOC entry 5053 (class 1259 OID 48179)
-- Name: idx_forum_comments_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_comments_post ON public.forum_comments USING btree (post_id);


--
-- TOC entry 5049 (class 1259 OID 48145)
-- Name: idx_forum_posts_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_posts_author ON public.forum_posts USING btree (author_id);


--
-- TOC entry 5050 (class 1259 OID 48146)
-- Name: idx_forum_posts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forum_posts_category ON public.forum_posts USING btree (category);


--
-- TOC entry 5041 (class 1259 OID 48091)
-- Name: idx_group_members_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_members_group ON public.group_members USING btree (group_id);


--
-- TOC entry 5042 (class 1259 OID 48090)
-- Name: idx_group_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_members_user ON public.group_members USING btree (user_id);


--
-- TOC entry 5064 (class 1259 OID 48244)
-- Name: idx_knowledge_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_category ON public.knowledge_articles USING btree (category);


--
-- TOC entry 5043 (class 1259 OID 48119)
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, sent_at);


--
-- TOC entry 5044 (class 1259 OID 48120)
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- TOC entry 5021 (class 1259 OID 47977)
-- Name: idx_milestones_child_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestones_child_id ON public.milestones USING btree (child_id);


--
-- TOC entry 5079 (class 1259 OID 48315)
-- Name: idx_post_tags_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_tags_post ON public.post_tags USING btree (post_id);


--
-- TOC entry 5080 (class 1259 OID 48316)
-- Name: idx_post_tags_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_tags_tag ON public.post_tags USING btree (tag_id);


--
-- TOC entry 5054 (class 1259 OID 48202)
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- TOC entry 5055 (class 1259 OID 48201)
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- TOC entry 5070 (class 1259 OID 48278)
-- Name: idx_tags_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_category ON public.tags USING btree (category);


--
-- TOC entry 5083 (class 1259 OID 48338)
-- Name: idx_votes_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votes_target ON public.votes USING btree (target_type, target_id);


--
-- TOC entry 5084 (class 1259 OID 48339)
-- Name: idx_votes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_votes_user ON public.votes USING btree (user_id);


--
-- TOC entry 5106 (class 2606 OID 48215)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5092 (class 2606 OID 47997)
-- Name: calendar_events calendar_events_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- TOC entry 5108 (class 2606 OID 48286)
-- Name: child_tags child_tags_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- TOC entry 5109 (class 2606 OID 48291)
-- Name: child_tags child_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.child_tags
    ADD CONSTRAINT child_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 5089 (class 2606 OID 47927)
-- Name: children children_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.children
    ADD CONSTRAINT children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5093 (class 2606 OID 48028)
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- TOC entry 5094 (class 2606 OID 48033)
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5090 (class 2606 OID 47950)
-- Name: development_notes development_notes_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.development_notes
    ADD CONSTRAINT development_notes_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- TOC entry 5102 (class 2606 OID 48169)
-- Name: forum_comments forum_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- TOC entry 5103 (class 2606 OID 48174)
-- Name: forum_comments forum_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.forum_comments(id);


--
-- TOC entry 5104 (class 2606 OID 48164)
-- Name: forum_comments forum_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- TOC entry 5101 (class 2606 OID 48140)
-- Name: forum_posts forum_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- TOC entry 5097 (class 2606 OID 48080)
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- TOC entry 5098 (class 2606 OID 48085)
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5095 (class 2606 OID 48055)
-- Name: groups groups_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- TOC entry 5096 (class 2606 OID 48060)
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5107 (class 2606 OID 48239)
-- Name: knowledge_articles knowledge_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- TOC entry 5099 (class 2606 OID 48109)
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- TOC entry 5100 (class 2606 OID 48114)
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- TOC entry 5091 (class 2606 OID 47972)
-- Name: milestones milestones_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;


--
-- TOC entry 5110 (class 2606 OID 48305)
-- Name: post_tags post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.forum_posts(id) ON DELETE CASCADE;


--
-- TOC entry 5111 (class 2606 OID 48310)
-- Name: post_tags post_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 5105 (class 2606 OID 48196)
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5112 (class 2606 OID 48333)
-- Name: votes votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-05-06 19:14:06

--
-- PostgreSQL database dump complete
--

\unrestrict zbGDp5IarFMltuJcOFnh5LBroE82AcMDcQD7B3P3iql7M7r4a76nkegS5d4mGCP

