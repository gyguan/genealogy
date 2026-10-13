--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg13+2)

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
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_account_invite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_account_invite (
    id bigint NOT NULL,
    token_hash character varying(255) NOT NULL,
    clan_id bigint NOT NULL,
    email character varying(120),
    role_code character varying(64) NOT NULL,
    scope_type character varying(32) NOT NULL,
    scope_id bigint NOT NULL,
    invited_by bigint NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    accepted_at timestamp without time zone,
    accepted_user_id bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: app_account_invite_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_account_invite_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_account_invite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_account_invite_id_seq OWNED BY public.app_account_invite.id;


--
-- Name: app_auth_security_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_auth_security_event (
    id bigint NOT NULL,
    user_id bigint,
    event_type character varying(64) NOT NULL,
    result_code character varying(64) NOT NULL,
    risk_level character varying(32) NOT NULL,
    ip_masked character varying(80),
    user_agent character varying(500),
    request_id character varying(100),
    detail character varying(1000),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: app_auth_security_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_auth_security_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_auth_security_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_auth_security_event_id_seq OWNED BY public.app_auth_security_event.id;


--
-- Name: app_auth_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_auth_session (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token_hash character varying(255) NOT NULL,
    issued_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    client_ip character varying(64),
    user_agent character varying(500),
    csrf_token_hash character varying(255),
    last_access_at timestamp without time zone,
    device_name character varying(160),
    remember_me boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE app_auth_session; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_auth_session IS '认证会话表，记录登录令牌、过期和撤销状态';


--
-- Name: COLUMN app_auth_session.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_auth_session.id IS '会话主键ID';


--
-- Name: COLUMN app_auth_session.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_auth_session.user_id IS '用户ID';


--
-- Name: COLUMN app_auth_session.token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_auth_session.token_hash IS '令牌哈希';


--
-- Name: COLUMN app_auth_session.issued_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_auth_session.issued_at IS '签发时间';


--
-- Name: COLUMN app_auth_session.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_auth_session.expires_at IS '过期时间';


--
-- Name: COLUMN app_auth_session.revoked_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_auth_session.revoked_at IS '撤销时间，空表示未撤销';


--
-- Name: COLUMN app_auth_session.client_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_auth_session.client_ip IS '客户端IP';


--
-- Name: COLUMN app_auth_session.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_auth_session.user_agent IS '客户端User-Agent';


--
-- Name: app_auth_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_auth_session_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_auth_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_auth_session_id_seq OWNED BY public.app_auth_session.id;


--
-- Name: app_login_attempt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_login_attempt (
    id bigint NOT NULL,
    account_hash character varying(255) NOT NULL,
    ip_hash character varying(255) NOT NULL,
    user_id bigint,
    success boolean NOT NULL,
    result_code character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: app_login_attempt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_login_attempt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_login_attempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_login_attempt_id_seq OWNED BY public.app_login_attempt.id;


--
-- Name: app_password_reset_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_password_reset_token (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    requested_ip_hash character varying(255)
);


--
-- Name: app_password_reset_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_password_reset_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_password_reset_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_password_reset_token_id_seq OWNED BY public.app_password_reset_token.id;


--
-- Name: app_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_permission (
    id bigint NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_name character varying(100) NOT NULL,
    permission_type character varying(50),
    resource_type character varying(100),
    action_type character varying(100),
    description text,
    system_permission boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    resource_code character varying(100),
    action_code character varying(100),
    module_code character varying(100),
    permission_category character varying(50),
    enabled boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    module_name character varying(100),
    status character varying(32) DEFAULT 'active'::character varying,
    created_by bigint,
    updated_by bigint
);


--
-- Name: TABLE app_permission; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_permission IS '权限点定义表：定义系统可管控的业务动作。';


--
-- Name: COLUMN app_permission.permission_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.permission_code IS '权限编码，采用资源.动作格式。';


--
-- Name: COLUMN app_permission.permission_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.permission_name IS '权限中文名称。';


--
-- Name: COLUMN app_permission.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.description IS '权限点说明。';


--
-- Name: COLUMN app_permission.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.created_at IS '创建时间。';


--
-- Name: COLUMN app_permission.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.updated_at IS '最后更新时间。';


--
-- Name: COLUMN app_permission.resource_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.resource_code IS '权限作用资源编码。';


--
-- Name: COLUMN app_permission.action_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.action_code IS '权限动作编码。';


--
-- Name: COLUMN app_permission.module_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.module_code IS '权限所属模块编码。';


--
-- Name: COLUMN app_permission.module_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.module_name IS '权限所属模块名称。';


--
-- Name: COLUMN app_permission.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.created_by IS '创建人用户ID。';


--
-- Name: COLUMN app_permission.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_permission.updated_by IS '最后更新人用户ID。';


--
-- Name: app_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_permission_id_seq OWNED BY public.app_permission.id;


--
-- Name: app_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_role (
    id bigint NOT NULL,
    role_code character varying(64) NOT NULL,
    role_name character varying(100) NOT NULL,
    description text,
    system_role boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE app_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_role IS '系统角色表，记录宗族管理员、支派管理员、编辑、审核员、查看者等角色';


--
-- Name: COLUMN app_role.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role.id IS '系统角色主键ID';


--
-- Name: COLUMN app_role.role_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role.role_code IS '角色编码，全局唯一';


--
-- Name: COLUMN app_role.role_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role.role_name IS '角色名称';


--
-- Name: COLUMN app_role.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role.description IS '角色描述';


--
-- Name: COLUMN app_role.system_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role.system_role IS '是否系统内置角色';


--
-- Name: COLUMN app_role.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role.created_at IS '创建时间';


--
-- Name: COLUMN app_role.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role.updated_at IS '更新时间';


--
-- Name: app_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_role_id_seq OWNED BY public.app_role.id;


--
-- Name: app_role_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_role_permission (
    id bigint NOT NULL,
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    effect character varying(16) DEFAULT 'allow'::character varying,
    status character varying(32) DEFAULT 'active'::character varying,
    created_by bigint,
    updated_by bigint,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE app_role_permission; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_role_permission IS '角色权限关系表。';


--
-- Name: COLUMN app_role_permission.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role_permission.role_id IS '角色ID。';


--
-- Name: COLUMN app_role_permission.permission_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role_permission.permission_id IS '权限点ID。';


--
-- Name: COLUMN app_role_permission.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role_permission.created_at IS '创建时间。';


--
-- Name: COLUMN app_role_permission.effect; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role_permission.effect IS '授权效果。';


--
-- Name: COLUMN app_role_permission.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role_permission.created_by IS '创建人用户ID。';


--
-- Name: COLUMN app_role_permission.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role_permission.updated_by IS '最后更新人用户ID。';


--
-- Name: COLUMN app_role_permission.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_role_permission.updated_at IS '最后更新时间。';


--
-- Name: app_role_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_role_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_role_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_role_permission_id_seq OWNED BY public.app_role_permission.id;


--
-- Name: app_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_user (
    id bigint NOT NULL,
    username character varying(100) NOT NULL,
    phone character varying(50),
    email character varying(100),
    password_hash character varying(255) NOT NULL,
    display_name character varying(100) NOT NULL,
    avatar_url character varying(500),
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


--
-- Name: TABLE app_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_user IS '用户账号表，支持登录认证、展示身份和账号状态管理';


--
-- Name: COLUMN app_user.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.id IS '用户主键ID';


--
-- Name: COLUMN app_user.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.username IS '登录用户名，全局唯一';


--
-- Name: COLUMN app_user.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.phone IS '手机号';


--
-- Name: COLUMN app_user.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.email IS '邮箱';


--
-- Name: COLUMN app_user.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.password_hash IS '密码哈希';


--
-- Name: COLUMN app_user.display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.display_name IS '用户展示名称';


--
-- Name: COLUMN app_user.avatar_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.avatar_url IS '头像URL';


--
-- Name: COLUMN app_user.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.status IS '账号状态，例如active、disabled';


--
-- Name: COLUMN app_user.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.last_login_at IS '最近登录时间';


--
-- Name: COLUMN app_user.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.created_at IS '创建时间';


--
-- Name: COLUMN app_user.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.updated_at IS '更新时间';


--
-- Name: COLUMN app_user.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_user.deleted_at IS '软删除时间，空表示未删除';


--
-- Name: app_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_user_id_seq OWNED BY public.app_user.id;


--
-- Name: attachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachment (
    id bigint NOT NULL,
    clan_id bigint,
    source_id bigint,
    file_name character varying(255),
    file_type character varying(120),
    file_size bigint,
    storage_path character varying(1000),
    thumbnail_path character varying(1000),
    checksum character varying(128),
    uploaded_by bigint,
    uploaded_at timestamp without time zone,
    access_level character varying(32)
);


--
-- Name: attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attachment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attachment_id_seq OWNED BY public.attachment.id;


--
-- Name: branch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    parent_id bigint,
    branch_name character varying(200) NOT NULL,
    branch_path character varying(500),
    level integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    founder_person_id bigint,
    migration_from character varying(255),
    migration_to character varying(255),
    manager_member_id bigint,
    description text,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_branch_status_lifecycle CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: TABLE branch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.branch IS '支派表，记录宗族下的房支、迁徙和管理范围';


--
-- Name: COLUMN branch.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.id IS '支派主键ID';


--
-- Name: COLUMN branch.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.clan_id IS '所属宗族ID';


--
-- Name: COLUMN branch.parent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.parent_id IS '父级支派ID，顶级支派为空';


--
-- Name: COLUMN branch.branch_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.branch_name IS '支派名称';


--
-- Name: COLUMN branch.branch_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.branch_path IS '支派层级路径，用于快速判断上下级关系';


--
-- Name: COLUMN branch.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.level IS '支派层级，顶级为1';


--
-- Name: COLUMN branch.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.sort_order IS '排序号';


--
-- Name: COLUMN branch.founder_person_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.founder_person_id IS '本支派始迁祖或开派人物ID';


--
-- Name: COLUMN branch.migration_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.migration_from IS '迁出地';


--
-- Name: COLUMN branch.migration_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.migration_to IS '迁入地';


--
-- Name: COLUMN branch.manager_member_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.manager_member_id IS '支派负责人授权ID，关联 member_role.id。';


--
-- Name: COLUMN branch.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.description IS '支派简介、迁徙故事和范围说明';


--
-- Name: COLUMN branch.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.status IS '支派状态，例如active、inactive';


--
-- Name: COLUMN branch.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.created_at IS '创建时间';


--
-- Name: COLUMN branch.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branch.updated_at IS '更新时间';


--
-- Name: branch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.branch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: branch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.branch_id_seq OWNED BY public.branch.id;


--
-- Name: clan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clan (
    id bigint NOT NULL,
    clan_code character varying(64) NOT NULL,
    clan_name character varying(200) NOT NULL,
    surname character varying(50) NOT NULL,
    hall_name character varying(100),
    commandery character varying(100),
    ancestor_person_id bigint,
    origin_place character varying(255),
    current_places jsonb,
    description text,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE clan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.clan IS '宗族主表，记录一个姓氏宗族空间的基础资料、源流信息和状态';


--
-- Name: COLUMN clan.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.id IS '宗族主键ID';


--
-- Name: COLUMN clan.clan_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.clan_code IS '宗族编码，用于系统内唯一识别宗族';


--
-- Name: COLUMN clan.clan_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.clan_name IS '宗族名称，例如淮阳张氏宗族';


--
-- Name: COLUMN clan.surname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.surname IS '姓氏';


--
-- Name: COLUMN clan.hall_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.hall_name IS '堂号';


--
-- Name: COLUMN clan.commandery; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.commandery IS '郡望';


--
-- Name: COLUMN clan.ancestor_person_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.ancestor_person_id IS '始祖或中心祖人物ID';


--
-- Name: COLUMN clan.origin_place; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.origin_place IS '祖籍或发源地';


--
-- Name: COLUMN clan.current_places; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.current_places IS '当前主要分布地，JSON数组';


--
-- Name: COLUMN clan.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.description IS '宗族简介、家训家风、源流说明等';


--
-- Name: COLUMN clan.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.status IS '宗族状态，例如draft、active、archived';


--
-- Name: COLUMN clan.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.created_by IS '创建人用户ID';


--
-- Name: COLUMN clan.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.created_at IS '创建时间';


--
-- Name: COLUMN clan.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan.updated_at IS '更新时间';


--
-- Name: clan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clan_id_seq OWNED BY public.clan.id;


--
-- Name: clan_membership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clan_membership (
    id bigint NOT NULL,
    clan_id bigint,
    user_id bigint,
    person_id bigint,
    join_status character varying(32) DEFAULT 'invited'::character varying,
    member_status character varying(32) DEFAULT 'active'::character varying,
    invited_by bigint,
    joined_at timestamp without time zone,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now(),
    updated_by bigint,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE clan_membership; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.clan_membership IS '宗族成员身份表。';


--
-- Name: COLUMN clan_membership.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan_membership.created_by IS '创建人用户ID。';


--
-- Name: COLUMN clan_membership.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan_membership.created_at IS '创建时间。';


--
-- Name: COLUMN clan_membership.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan_membership.updated_by IS '最后更新人用户ID。';


--
-- Name: COLUMN clan_membership.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clan_membership.updated_at IS '最后更新时间。';


--
-- Name: clan_membership_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clan_membership_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clan_membership_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clan_membership_id_seq OWNED BY public.clan_membership.id;


--
-- Name: culture_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.culture_item (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    branch_id bigint,
    category character varying(40) NOT NULL,
    title character varying(200) NOT NULL,
    summary character varying(1000),
    content text,
    historical_period character varying(200),
    location_text character varying(500),
    confidence_level character varying(20) DEFAULT 'unknown'::character varying NOT NULL,
    privacy_level character varying(32) DEFAULT 'clan_only'::character varying NOT NULL,
    sensitive_level character varying(32) DEFAULT 'normal'::character varying NOT NULL,
    data_status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    is_featured_on_home boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    version bigint DEFAULT 0 NOT NULL,
    CONSTRAINT ck_culture_item__category CHECK (((category)::text = ANY ((ARRAY['surname_origin'::character varying, 'hall_name'::character varying, 'commandery'::character varying, 'family_instruction'::character varying, 'ancestor_instruction'::character varying, 'clan_rule'::character varying, 'genealogy_preface'::character varying, 'genealogy_rule'::character varying, 'person_story'::character varying, 'custom_tradition'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT ck_culture_item__confidence CHECK (((confidence_level)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT ck_culture_item__privacy CHECK (((privacy_level)::text = ANY ((ARRAY['public'::character varying, 'clan_only'::character varying, 'branch_only'::character varying, 'relatives_only'::character varying, 'private'::character varying, 'sealed'::character varying])::text[]))),
    CONSTRAINT ck_culture_item__sensitive CHECK (((sensitive_level)::text = ANY ((ARRAY['normal'::character varying, 'sensitive'::character varying, 'highly_sensitive'::character varying])::text[]))),
    CONSTRAINT ck_culture_item__sort_order CHECK ((sort_order >= 0)),
    CONSTRAINT ck_culture_item__status CHECK (((data_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT ck_culture_item__title_not_blank CHECK ((length(btrim((title)::text)) > 0))
);


--
-- Name: TABLE culture_item; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.culture_item IS '宗族或支派级文本型文化档案';


--
-- Name: COLUMN culture_item.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.culture_item.content IS '文化正文，列表接口默认不返回';


--
-- Name: COLUMN culture_item.is_featured_on_home; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.culture_item.is_featured_on_home IS 'Whether an official culture item is selected for clan home-page display.';


--
-- Name: culture_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.culture_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: culture_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.culture_item_id_seq OWNED BY public.culture_item.id;


--
-- Name: culture_revision_payload; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.culture_revision_payload (
    revision_id bigint NOT NULL,
    payload_json text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: culture_site; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.culture_site (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    branch_id bigint,
    site_type character varying(40) NOT NULL,
    site_name character varying(200) NOT NULL,
    address_text character varying(500),
    founded_period character varying(200),
    current_status character varying(100),
    summary character varying(1000),
    description text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    confidence_level character varying(20) DEFAULT 'unknown'::character varying NOT NULL,
    privacy_level character varying(32) DEFAULT 'clan_only'::character varying NOT NULL,
    sensitive_level character varying(32) DEFAULT 'normal'::character varying NOT NULL,
    data_status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    is_featured_on_home boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    version bigint DEFAULT 0 NOT NULL,
    related_person_id bigint,
    CONSTRAINT ck_culture_site__confidence CHECK (((confidence_level)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT ck_culture_site__coordinate_pair CHECK ((((latitude IS NULL) AND (longitude IS NULL)) OR ((latitude IS NOT NULL) AND (longitude IS NOT NULL)))),
    CONSTRAINT ck_culture_site__latitude CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))),
    CONSTRAINT ck_culture_site__longitude CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))),
    CONSTRAINT ck_culture_site__name_not_blank CHECK ((length(btrim((site_name)::text)) > 0)),
    CONSTRAINT ck_culture_site__privacy CHECK (((privacy_level)::text = ANY ((ARRAY['public'::character varying, 'clan_only'::character varying, 'branch_only'::character varying, 'relatives_only'::character varying, 'private'::character varying, 'sealed'::character varying])::text[]))),
    CONSTRAINT ck_culture_site__sensitive CHECK (((sensitive_level)::text = ANY ((ARRAY['normal'::character varying, 'sensitive'::character varying, 'highly_sensitive'::character varying])::text[]))),
    CONSTRAINT ck_culture_site__sort_order CHECK ((sort_order >= 0)),
    CONSTRAINT ck_culture_site__status CHECK (((data_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT ck_culture_site__type CHECK (((site_type)::text = ANY ((ARRAY['ancestral_hall'::character varying, 'ancestral_home'::character varying, 'cemetery'::character varying, 'memorial'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: TABLE culture_site; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.culture_site IS '祠堂、祖居、墓园和纪念设施等文化场所';


--
-- Name: COLUMN culture_site.current_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.culture_site.current_status IS '场所现实状态，不等同于资料审核 data_status';


--
-- Name: COLUMN culture_site.latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.culture_site.latitude IS '可选纬度；接口必须按隐私级别最小披露';


--
-- Name: COLUMN culture_site.longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.culture_site.longitude IS '可选经度；接口必须按隐私级别最小披露';


--
-- Name: COLUMN culture_site.is_featured_on_home; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.culture_site.is_featured_on_home IS 'Whether an official culture site is selected for clan home-page display.';


--
-- Name: culture_site_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.culture_site_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: culture_site_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.culture_site_id_seq OWNED BY public.culture_site.id;


--
-- Name: generation_scheme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_scheme (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    branch_id bigint,
    scheme_name character varying(200) NOT NULL,
    poem_text text,
    start_generation integer,
    is_default boolean DEFAULT false NOT NULL,
    validation_enabled boolean DEFAULT true NOT NULL,
    strict_mode boolean DEFAULT false NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_generation_scheme_status_lifecycle CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: TABLE generation_scheme; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.generation_scheme IS '字辈方案表，记录宗族或支派使用的字辈诗和校验规则';


--
-- Name: COLUMN generation_scheme.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.id IS '字辈方案主键ID';


--
-- Name: COLUMN generation_scheme.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.clan_id IS '所属宗族ID';


--
-- Name: COLUMN generation_scheme.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.branch_id IS '适用支派ID，空表示宗族通用';


--
-- Name: COLUMN generation_scheme.scheme_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.scheme_name IS '字辈方案名称';


--
-- Name: COLUMN generation_scheme.poem_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.poem_text IS '字辈诗全文';


--
-- Name: COLUMN generation_scheme.start_generation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.start_generation IS '字辈起始世次';


--
-- Name: COLUMN generation_scheme.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.is_default IS '是否默认方案';


--
-- Name: COLUMN generation_scheme.validation_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.validation_enabled IS '是否启用字辈校验';


--
-- Name: COLUMN generation_scheme.strict_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.strict_mode IS '是否严格校验字辈';


--
-- Name: COLUMN generation_scheme.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.status IS '方案状态';


--
-- Name: COLUMN generation_scheme.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_scheme.created_at IS '创建时间';


--
-- Name: generation_scheme_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.generation_scheme_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: generation_scheme_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.generation_scheme_id_seq OWNED BY public.generation_scheme.id;


--
-- Name: generation_word; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_word (
    id bigint NOT NULL,
    scheme_id bigint NOT NULL,
    generation_no integer NOT NULL,
    word character varying(20) NOT NULL,
    description character varying(255),
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE generation_word; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.generation_word IS '字辈明细表，记录每一代对应的字辈用字';


--
-- Name: COLUMN generation_word.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_word.id IS '字辈明细主键ID';


--
-- Name: COLUMN generation_word.scheme_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_word.scheme_id IS '所属字辈方案ID';


--
-- Name: COLUMN generation_word.generation_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_word.generation_no IS '世次或代数';


--
-- Name: COLUMN generation_word.word; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_word.word IS '该世次对应的字辈字';


--
-- Name: COLUMN generation_word.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_word.description IS '字辈说明';


--
-- Name: COLUMN generation_word.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.generation_word.sort_order IS '排序号';


--
-- Name: generation_word_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.generation_word_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: generation_word_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.generation_word_id_seq OWNED BY public.generation_word.id;


--
-- Name: import_file_fingerprint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_file_fingerprint (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    branch_id bigint NOT NULL,
    import_type character varying(32) NOT NULL,
    file_hash character varying(64) NOT NULL,
    job_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: import_file_fingerprint_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_file_fingerprint_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_file_fingerprint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_file_fingerprint_id_seq OWNED BY public.import_file_fingerprint.id;


--
-- Name: import_job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_job (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    branch_id bigint,
    import_type character varying(50) DEFAULT 'person_csv'::character varying NOT NULL,
    original_filename character varying(255),
    total_count integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'completed'::character varying NOT NULL,
    error_summary text,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    file_format character varying(16) DEFAULT 'csv'::character varying NOT NULL,
    processing_status character varying(32) DEFAULT 'processing'::character varying NOT NULL,
    review_status character varying(32) DEFAULT 'not_submitted'::character varying NOT NULL,
    review_round integer DEFAULT 0 NOT NULL,
    latest_review_task_id bigint,
    parent_job_id bigint,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    execution_mode character varying(16) DEFAULT 'sync'::character varying NOT NULL,
    execution_status character varying(24) DEFAULT 'completed'::character varying NOT NULL,
    execution_stage character varying(32) DEFAULT 'completed'::character varying NOT NULL,
    cursor_row_no integer DEFAULT 0 NOT NULL,
    processed_count integer DEFAULT 0 NOT NULL,
    published_count integer DEFAULT 0 NOT NULL,
    chunk_size integer DEFAULT 200 NOT NULL,
    execution_retry_count integer DEFAULT 0 NOT NULL,
    execution_max_retries integer DEFAULT 3 NOT NULL,
    requested_action character varying(16),
    failure_stage character varying(32),
    last_error_code character varying(64),
    lease_owner character varying(128),
    lease_expires_at timestamp without time zone,
    next_retry_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    heartbeat_at timestamp without time zone,
    manual_intervention_required boolean DEFAULT false NOT NULL,
    idempotency_key character varying(96),
    skipped_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT chk_import_job_execution_counts CHECK (((cursor_row_no >= 0) AND (processed_count >= 0) AND (published_count >= 0) AND (chunk_size > 0) AND (execution_retry_count >= 0) AND (execution_max_retries > 0))),
    CONSTRAINT chk_import_job_execution_mode CHECK (((execution_mode)::text = ANY ((ARRAY['sync'::character varying, 'async'::character varying])::text[]))),
    CONSTRAINT chk_import_job_execution_stage CHECK (((execution_stage)::text = ANY ((ARRAY['queued'::character varying, 'parsing'::character varying, 'drafting'::character varying, 'ready_for_review'::character varying, 'publishing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT chk_import_job_execution_status CHECK (((execution_status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying, 'paused'::character varying, 'retry_wait'::character varying, 'completed'::character varying, 'partial_failed'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'partial_cancelled'::character varying, 'dead_letter'::character varying])::text[]))),
    CONSTRAINT chk_import_job_file_format CHECK (((file_format)::text = ANY ((ARRAY['csv'::character varying, 'xlsx'::character varying])::text[]))),
    CONSTRAINT chk_import_job_processing_status CHECK (((processing_status)::text = ANY ((ARRAY['processing'::character varying, 'correction_required'::character varying, 'ready_for_review'::character varying])::text[]))),
    CONSTRAINT chk_import_job_requested_action CHECK (((requested_action IS NULL) OR ((requested_action)::text = ANY ((ARRAY['pause'::character varying, 'cancel'::character varying])::text[])))),
    CONSTRAINT chk_import_job_review_status CHECK (((review_status)::text = ANY ((ARRAY['not_submitted'::character varying, 'pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE import_job; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.import_job IS '导入任务表，记录人物或关系导入批次、统计和执行状态';


--
-- Name: COLUMN import_job.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.id IS '导入任务主键ID';


--
-- Name: COLUMN import_job.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.clan_id IS '所属宗族ID';


--
-- Name: COLUMN import_job.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.branch_id IS '导入目标支派ID';


--
-- Name: COLUMN import_job.import_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.import_type IS '导入类型，例如person_csv、relationship_csv';


--
-- Name: COLUMN import_job.original_filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.original_filename IS '原始导入文件名';


--
-- Name: COLUMN import_job.total_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.total_count IS '总记录数';


--
-- Name: COLUMN import_job.success_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.success_count IS '成功记录数';


--
-- Name: COLUMN import_job.failure_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.failure_count IS '失败记录数';


--
-- Name: COLUMN import_job.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.status IS '导入状态，例如previewed、completed、failed';


--
-- Name: COLUMN import_job.error_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.error_summary IS '错误摘要';


--
-- Name: COLUMN import_job.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.created_by IS '创建人用户ID';


--
-- Name: COLUMN import_job.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.created_at IS '创建时间';


--
-- Name: COLUMN import_job.idempotency_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.idempotency_key IS 'SHA-256 request/file identity scoped by clan and branch';


--
-- Name: COLUMN import_job.skipped_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job.skipped_count IS 'Rows skipped because an idempotent checkpoint already completed them';


--
-- Name: import_job_chunk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_job_chunk (
    id bigint NOT NULL,
    job_id bigint NOT NULL,
    stage character varying(32) NOT NULL,
    chunk_no integer NOT NULL,
    from_row_no integer NOT NULL,
    to_row_no integer NOT NULL,
    idempotency_key character varying(160) NOT NULL,
    status character varying(24) NOT NULL,
    attempt_count integer DEFAULT 1 NOT NULL,
    error_summary text,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    version bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_import_job_chunk_range CHECK (((chunk_no >= 0) AND (from_row_no > 0) AND (to_row_no >= from_row_no) AND (attempt_count > 0))),
    CONSTRAINT chk_import_job_chunk_stage CHECK (((stage)::text = ANY ((ARRAY['drafting'::character varying, 'publishing'::character varying])::text[]))),
    CONSTRAINT chk_import_job_chunk_status CHECK (((status)::text = ANY ((ARRAY['running'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: import_job_chunk_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_job_chunk_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_job_chunk_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_job_chunk_id_seq OWNED BY public.import_job_chunk.id;


--
-- Name: import_job_error; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_job_error (
    id bigint NOT NULL,
    job_id bigint NOT NULL,
    row_no integer,
    error_message text,
    raw_data text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE import_job_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.import_job_error IS '导入错误明细表，记录导入任务中每行失败原因和原始数据';


--
-- Name: COLUMN import_job_error.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job_error.id IS '导入错误主键ID';


--
-- Name: COLUMN import_job_error.job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job_error.job_id IS '导入任务ID';


--
-- Name: COLUMN import_job_error.row_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job_error.row_no IS '错误行号';


--
-- Name: COLUMN import_job_error.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job_error.error_message IS '错误信息';


--
-- Name: COLUMN import_job_error.raw_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job_error.raw_data IS '原始行数据';


--
-- Name: COLUMN import_job_error.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_job_error.created_at IS '错误记录创建时间';


--
-- Name: import_job_error_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_job_error_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_job_error_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_job_error_id_seq OWNED BY public.import_job_error.id;


--
-- Name: import_job_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_job_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_job_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_job_id_seq OWNED BY public.import_job.id;


--
-- Name: import_job_payload; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_job_payload (
    job_id bigint NOT NULL,
    original_filename character varying(512) NOT NULL,
    content_type character varying(255),
    file_content bytea NOT NULL,
    confirm_duplicates boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: import_job_row; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_job_row (
    id bigint NOT NULL,
    job_id bigint NOT NULL,
    row_no integer NOT NULL,
    raw_data text NOT NULL,
    normalized_data jsonb,
    corrected_data jsonb,
    row_status character varying(32) NOT NULL,
    error_code character varying(64),
    error_message text,
    draft_person_id bigint,
    retry_count integer DEFAULT 0 NOT NULL,
    corrected_by bigint,
    corrected_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    draft_target_type character varying(32),
    draft_target_id bigint,
    published_at timestamp without time zone,
    excluded_reason text,
    excluded_by bigint,
    excluded_at timestamp without time zone,
    CONSTRAINT chk_import_job_row_retry_count CHECK ((retry_count >= 0)),
    CONSTRAINT chk_import_job_row_status CHECK (((row_status)::text = ANY ((ARRAY['invalid'::character varying, 'draft_created'::character varying, 'retry_failed'::character varying, 'excluded'::character varying])::text[])))
);


--
-- Name: import_job_row_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_job_row_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_job_row_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_job_row_id_seq OWNED BY public.import_job_row.id;


--
-- Name: member_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_role (
    id bigint NOT NULL,
    member_id bigint,
    role_id bigint,
    scope_type character varying(32) DEFAULT 'clan'::character varying,
    scope_id bigint,
    created_at timestamp without time zone DEFAULT now(),
    membership_id bigint,
    status character varying(32) DEFAULT 'active'::character varying,
    granted_by bigint,
    granted_at timestamp without time zone DEFAULT now(),
    revoked_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE member_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.member_role IS '成员角色授权表。';


--
-- Name: COLUMN member_role.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.member_role.created_at IS '创建时间。';


--
-- Name: COLUMN member_role.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.member_role.created_by IS '创建人用户ID。';


--
-- Name: COLUMN member_role.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.member_role.updated_by IS '最后更新人用户ID。';


--
-- Name: COLUMN member_role.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.member_role.updated_at IS '最后更新时间。';


--
-- Name: member_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: member_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_role_id_seq OWNED BY public.member_role.id;


--
-- Name: migration_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_event (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    branch_id bigint NOT NULL,
    sequence_no integer NOT NULL,
    from_location character varying(500),
    to_location character varying(500),
    migration_time_text character varying(200),
    founder_person_id bigint,
    reason character varying(1000),
    description text,
    confidence_level character varying(20) DEFAULT 'unknown'::character varying NOT NULL,
    privacy_level character varying(32) DEFAULT 'clan_only'::character varying NOT NULL,
    sensitive_level character varying(32) DEFAULT 'normal'::character varying NOT NULL,
    data_status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    version bigint DEFAULT 0 NOT NULL,
    CONSTRAINT ck_migration_event__confidence CHECK (((confidence_level)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT ck_migration_event__from_required CHECK ((length(btrim((COALESCE(from_location, ''::character varying))::text)) > 0)),
    CONSTRAINT ck_migration_event__not_self_move CHECK ((lower(regexp_replace(btrim((from_location)::text), '\\s+'::text, ''::text, 'g'::text)) <> lower(regexp_replace(btrim((to_location)::text), '\\s+'::text, ''::text, 'g'::text)))),
    CONSTRAINT ck_migration_event__privacy CHECK (((privacy_level)::text = ANY ((ARRAY['public'::character varying, 'clan_only'::character varying, 'branch_only'::character varying, 'relatives_only'::character varying, 'private'::character varying, 'sealed'::character varying])::text[]))),
    CONSTRAINT ck_migration_event__sensitive CHECK (((sensitive_level)::text = ANY ((ARRAY['normal'::character varying, 'sensitive'::character varying, 'highly_sensitive'::character varying])::text[]))),
    CONSTRAINT ck_migration_event__sequence CHECK ((sequence_no > 0)),
    CONSTRAINT ck_migration_event__sequence_upper_bound CHECK ((sequence_no <= 100000)),
    CONSTRAINT ck_migration_event__status CHECK (((data_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT ck_migration_event__to_required CHECK ((length(btrim((COALESCE(to_location, ''::character varying))::text)) > 0))
);


--
-- Name: TABLE migration_event; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.migration_event IS '支派结构化迁徙事件，按 sequence_no 表达顺序';


--
-- Name: COLUMN migration_event.migration_time_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migration_event.migration_time_text IS '朝代、年号或模糊年代等历史时期文本';


--
-- Name: migration_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migration_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migration_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migration_event_id_seq OWNED BY public.migration_event.id;


--
-- Name: operation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_log (
    id bigint NOT NULL,
    clan_id bigint,
    actor_id bigint,
    action_type character varying(100) NOT NULL,
    target_type character varying(50),
    target_id bigint,
    summary character varying(500),
    detail text,
    request_id character varying(100),
    client_ip character varying(64),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    trace_id uuid,
    revision_id bigint,
    review_task_id bigint,
    business_target_type character varying(50),
    business_target_id bigint,
    event_result character varying(32),
    risk_level character varying(16),
    risk_event_type character varying(64),
    disposition_status character varying(32),
    branch_id bigint,
    CONSTRAINT ck_operation_log__disposition_status CHECK (((disposition_status IS NULL) OR ((disposition_status)::text = ANY ((ARRAY['open'::character varying, 'reviewing'::character varying, 'resolved'::character varying, 'accepted'::character varying])::text[])))),
    CONSTRAINT ck_operation_log__risk_event_type CHECK (((risk_event_type IS NULL) OR ((risk_event_type)::text = ANY ((ARRAY['permission_change'::character varying, 'sensitive_access'::character varying, 'bulk_export'::character varying, 'formal_data_change'::character varying, 'review_anomaly'::character varying, 'access_denied'::character varying])::text[])))),
    CONSTRAINT ck_operation_log__risk_level CHECK (((risk_level IS NULL) OR ((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))))
);


--
-- Name: TABLE operation_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.operation_log IS '操作日志表，记录用户操作、审核动作、导入导出和审计追踪信息';


--
-- Name: COLUMN operation_log.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.id IS '日志主键ID';


--
-- Name: COLUMN operation_log.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.clan_id IS '所属宗族ID';


--
-- Name: COLUMN operation_log.actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.actor_id IS '操作者用户ID';


--
-- Name: COLUMN operation_log.action_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.action_type IS '动作类型，例如person_create、review_approve、person_import';


--
-- Name: COLUMN operation_log.target_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.target_type IS '操作对象类型';


--
-- Name: COLUMN operation_log.target_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.target_id IS '操作对象ID';


--
-- Name: COLUMN operation_log.summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.summary IS '操作摘要';


--
-- Name: COLUMN operation_log.detail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.detail IS '操作详情，通常为JSON或文本描述';


--
-- Name: COLUMN operation_log.request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.request_id IS '请求ID，用于链路追踪';


--
-- Name: COLUMN operation_log.client_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.client_ip IS '客户端IP';


--
-- Name: COLUMN operation_log.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.created_at IS '操作时间';


--
-- Name: COLUMN operation_log.trace_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.trace_id IS 'Optional stable lifecycle correlation id.';


--
-- Name: COLUMN operation_log.event_result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_log.event_result IS 'submitted, approved, rejected, applied or failed lifecycle result.';


--
-- Name: operation_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operation_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operation_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operation_log_id_seq OWNED BY public.operation_log.id;


--
-- Name: person; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    branch_id bigint,
    person_code character varying(64),
    name character varying(100) NOT NULL,
    genealogy_name character varying(100),
    courtesy_name character varying(100),
    alias_name character varying(200),
    gender character varying(20) DEFAULT 'unknown'::character varying NOT NULL,
    generation_no integer,
    generation_word character varying(20),
    rank_in_family character varying(50),
    birth_date date,
    birth_date_precision character varying(20),
    death_date date,
    death_date_precision character varying(20),
    is_living boolean,
    birth_place character varying(255),
    residence_place character varying(255),
    occupation character varying(100),
    education character varying(100),
    title_or_honor character varying(200),
    biography text,
    tomb_place character varying(255),
    epitaph text,
    has_descendant boolean,
    lineage_status character varying(50) DEFAULT 'normal'::character varying NOT NULL,
    privacy_level character varying(32) DEFAULT 'clan_only'::character varying NOT NULL,
    data_status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by bigint,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    CONSTRAINT chk_person_data_status_lifecycle CHECK (((data_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: TABLE person; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.person IS '人物档案表，记录族谱成员的身份、世次、生卒、履历、隐私和入谱状态';


--
-- Name: COLUMN person.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.id IS '人物主键ID';


--
-- Name: COLUMN person.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.clan_id IS '所属宗族ID';


--
-- Name: COLUMN person.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.branch_id IS '所属支派ID';


--
-- Name: COLUMN person.person_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.person_code IS '人物编码，用于导入导出和外部识别';


--
-- Name: COLUMN person.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.name IS '常用姓名';


--
-- Name: COLUMN person.genealogy_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.genealogy_name IS '谱名或族谱记载姓名';


--
-- Name: COLUMN person.courtesy_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.courtesy_name IS '字、号等称谓';


--
-- Name: COLUMN person.alias_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.alias_name IS '别名、曾用名、乳名等';


--
-- Name: COLUMN person.gender; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.gender IS '性别，例如male、female、unknown';


--
-- Name: COLUMN person.generation_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.generation_no IS '世次或代数';


--
-- Name: COLUMN person.generation_word; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.generation_word IS '字辈用字';


--
-- Name: COLUMN person.rank_in_family; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.rank_in_family IS '排行或房内序位';


--
-- Name: COLUMN person.birth_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.birth_date IS '出生日期';


--
-- Name: COLUMN person.birth_date_precision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.birth_date_precision IS '出生日期精度，例如day、month、year、unknown';


--
-- Name: COLUMN person.death_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.death_date IS '逝世日期';


--
-- Name: COLUMN person.death_date_precision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.death_date_precision IS '逝世日期精度，例如day、month、year、unknown';


--
-- Name: COLUMN person.is_living; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.is_living IS '是否在世';


--
-- Name: COLUMN person.birth_place; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.birth_place IS '出生地';


--
-- Name: COLUMN person.residence_place; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.residence_place IS '居住地或主要活动地';


--
-- Name: COLUMN person.occupation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.occupation IS '职业';


--
-- Name: COLUMN person.education; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.education IS '教育经历或最高学历';


--
-- Name: COLUMN person.title_or_honor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.title_or_honor IS '职衔、功名、荣誉或族内称号';


--
-- Name: COLUMN person.biography; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.biography IS '人物传记、履历和补充说明';


--
-- Name: COLUMN person.tomb_place; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.tomb_place IS '墓葬地';


--
-- Name: COLUMN person.epitaph; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.epitaph IS '墓志铭或碑文摘要';


--
-- Name: COLUMN person.has_descendant; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.has_descendant IS '是否有后裔';


--
-- Name: COLUMN person.lineage_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.lineage_status IS '世系状态，例如normal、adopted、out_adopted、unknown';


--
-- Name: COLUMN person.privacy_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.privacy_level IS '隐私级别，例如public、clan_only、branch_only、private';


--
-- Name: COLUMN person.data_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.data_status IS '资料状态，例如draft、pending、official、rejected';


--
-- Name: COLUMN person.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.created_by IS '创建人用户ID';


--
-- Name: COLUMN person.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.created_at IS '创建时间';


--
-- Name: COLUMN person.updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.updated_by IS '最近更新人用户ID';


--
-- Name: COLUMN person.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.updated_at IS '更新时间';


--
-- Name: COLUMN person.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person.deleted_at IS '软删除时间，空表示未删除';


--
-- Name: person_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.person_event (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    person_id bigint NOT NULL,
    event_type character varying(50) NOT NULL,
    event_title character varying(200) NOT NULL,
    event_date date,
    event_date_precision character varying(20) DEFAULT 'day'::character varying NOT NULL,
    event_place character varying(255),
    event_description text,
    source_type character varying(50),
    source_id bigint,
    sort_order integer DEFAULT 0 NOT NULL,
    data_status character varying(32) DEFAULT 'official'::character varying NOT NULL,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


--
-- Name: TABLE person_event; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.person_event IS '人物事件表，记录出生、婚配、子女出生、迁徙、逝世等时间线事件';


--
-- Name: COLUMN person_event.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.id IS '人物事件主键ID';


--
-- Name: COLUMN person_event.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.clan_id IS '所属宗族ID';


--
-- Name: COLUMN person_event.person_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.person_id IS '人物ID';


--
-- Name: COLUMN person_event.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.event_type IS '事件类型，例如birth、marriage、child_birth、death';


--
-- Name: COLUMN person_event.event_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.event_title IS '事件标题';


--
-- Name: COLUMN person_event.event_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.event_date IS '事件日期';


--
-- Name: COLUMN person_event.event_date_precision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.event_date_precision IS '事件日期精度，例如day、month、year、unknown';


--
-- Name: COLUMN person_event.event_place; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.event_place IS '事件地点';


--
-- Name: COLUMN person_event.event_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.event_description IS '事件描述';


--
-- Name: COLUMN person_event.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.source_type IS '事件来源类型，例如source、relationship、manual';


--
-- Name: COLUMN person_event.source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.source_id IS '事件来源对象ID';


--
-- Name: COLUMN person_event.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.sort_order IS '排序号';


--
-- Name: COLUMN person_event.data_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.data_status IS '资料状态';


--
-- Name: COLUMN person_event.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.created_by IS '创建人用户ID';


--
-- Name: COLUMN person_event.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.created_at IS '创建时间';


--
-- Name: COLUMN person_event.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.updated_at IS '更新时间';


--
-- Name: COLUMN person_event.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.person_event.deleted_at IS '软删除时间，空表示未删除';


--
-- Name: person_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.person_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: person_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.person_event_id_seq OWNED BY public.person_event.id;


--
-- Name: person_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.person_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.person_id_seq OWNED BY public.person.id;


--
-- Name: relationship; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relationship (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    from_person_id bigint NOT NULL,
    to_person_id bigint NOT NULL,
    relation_type character varying(50) NOT NULL,
    relation_label character varying(100),
    is_lineage_relation boolean DEFAULT false NOT NULL,
    is_biological boolean DEFAULT false NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    description text,
    confidence_level character varying(32) DEFAULT 'medium'::character varying NOT NULL,
    data_status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    relation_category character varying(32) DEFAULT 'blood'::character varying NOT NULL,
    ritual_relation_type character varying(64),
    succession_reason text,
    successor_branch_id bigint,
    CONSTRAINT chk_relationship_data_status_lifecycle CHECK (((data_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT chk_relationship_not_self CHECK (((from_person_id <> to_person_id) OR ((relation_type)::text = 'no_descendant'::text))),
    CONSTRAINT ck_relationship_relation_category CHECK (((relation_category)::text = ANY ((ARRAY['blood'::character varying, 'ritual'::character varying, 'marriage'::character varying, 'status'::character varying])::text[]))),
    CONSTRAINT ck_relationship_type_category CHECK (((((relation_type)::text = 'parent_child'::text) AND ((relation_category)::text = 'blood'::text)) OR (((relation_type)::text = 'spouse'::text) AND ((relation_category)::text = 'marriage'::text)) OR (((relation_type)::text = ANY ((ARRAY['adoptive'::character varying, 'successor'::character varying, 'out_adoption'::character varying, 'in_adoption'::character varying, 'dual_successor'::character varying, 'heir_son'::character varying])::text[])) AND ((relation_category)::text = 'ritual'::text)) OR (((relation_type)::text = 'no_descendant'::text) AND ((relation_category)::text = 'status'::text)) OR (((relation_type)::text <> ALL ((ARRAY['parent_child'::character varying, 'spouse'::character varying, 'adoptive'::character varying, 'successor'::character varying, 'out_adoption'::character varying, 'in_adoption'::character varying, 'dual_successor'::character varying, 'heir_son'::character varying, 'no_descendant'::character varying])::text[])) AND ((relation_category)::text = 'blood'::text))))
);


--
-- Name: TABLE relationship; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.relationship IS '人物关系表，记录亲子、配偶、继嗣、出嗣等中国式族谱关系';


--
-- Name: COLUMN relationship.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.id IS '关系主键ID';


--
-- Name: COLUMN relationship.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.clan_id IS '所属宗族ID';


--
-- Name: COLUMN relationship.from_person_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.from_person_id IS '关系发起方人物ID';


--
-- Name: COLUMN relationship.to_person_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.to_person_id IS '关系指向方人物ID';


--
-- Name: COLUMN relationship.relation_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.relation_type IS '关系类型，例如parent_child、spouse、adoptive、successor';


--
-- Name: COLUMN relationship.relation_label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.relation_label IS '关系标签，例如father、mother、spouse、heir_successor';


--
-- Name: COLUMN relationship.is_lineage_relation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.is_lineage_relation IS '是否计入主世系';


--
-- Name: COLUMN relationship.is_biological; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.is_biological IS '是否血缘关系';


--
-- Name: COLUMN relationship.is_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.is_primary IS '是否主关系';


--
-- Name: COLUMN relationship.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.description IS '关系说明和证据摘要';


--
-- Name: COLUMN relationship.confidence_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.confidence_level IS '可信度，例如low、medium、high';


--
-- Name: COLUMN relationship.data_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.data_status IS '资料状态，例如draft、pending、official、rejected';


--
-- Name: COLUMN relationship.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.created_by IS '创建人用户ID';


--
-- Name: COLUMN relationship.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.created_at IS '创建时间';


--
-- Name: COLUMN relationship.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.updated_at IS '更新时间';


--
-- Name: COLUMN relationship.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relationship.deleted_at IS '软删除时间，空表示未删除';


--
-- Name: relationship_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.relationship_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: relationship_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.relationship_id_seq OWNED BY public.relationship.id;


--
-- Name: review_quality_check; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_quality_check (
    id uuid NOT NULL,
    clan_id bigint NOT NULL,
    scope_type character varying(32) NOT NULL,
    mode character varying(32) NOT NULL,
    status character varying(32) NOT NULL,
    scope_fingerprint character varying(128) NOT NULL,
    task_ids_json text NOT NULL,
    query_json text,
    rule_codes_json text,
    summary_json text,
    rules_json text,
    review_blocked boolean DEFAULT false NOT NULL,
    triggered_by bigint NOT NULL,
    queued_at timestamp without time zone NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    failure_code character varying(80),
    failure_message character varying(500),
    CONSTRAINT ck_review_quality_mode CHECK (((mode)::text = ANY ((ARRAY['INCREMENTAL'::character varying, 'FULL'::character varying, 'REVIEW_GATE'::character varying])::text[]))),
    CONSTRAINT ck_review_quality_scope_type CHECK (((scope_type)::text = ANY ((ARRAY['TASK_IDS'::character varying, 'REVIEW_TASK'::character varying, 'WORKBENCH_SESSION'::character varying, 'DRAFT_IDS'::character varying, 'QUERY'::character varying])::text[]))),
    CONSTRAINT ck_review_quality_status CHECK (((status)::text = ANY ((ARRAY['QUEUED'::character varying, 'RUNNING'::character varying, 'PASSED'::character varying, 'ISSUES_FOUND'::character varying, 'FAILED'::character varying])::text[])))
);


--
-- Name: review_task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_task (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    revision_id bigint NOT NULL,
    review_level integer DEFAULT 1 NOT NULL,
    reviewer_id bigint,
    reviewer_role character varying(50),
    branch_id bigint,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    review_comment text,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    trace_id uuid
);


--
-- Name: TABLE review_task; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.review_task IS '审核任务表，记录修订记录的审核层级、审核人、状态和意见';


--
-- Name: COLUMN review_task.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.id IS '审核任务主键ID';


--
-- Name: COLUMN review_task.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.clan_id IS '所属宗族ID';


--
-- Name: COLUMN review_task.revision_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.revision_id IS '关联修订记录ID';


--
-- Name: COLUMN review_task.review_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.review_level IS '审核层级';


--
-- Name: COLUMN review_task.reviewer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.reviewer_id IS '审核人用户ID';


--
-- Name: COLUMN review_task.reviewer_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.reviewer_role IS '审核角色';


--
-- Name: COLUMN review_task.branch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.branch_id IS '审核关联支派ID';


--
-- Name: COLUMN review_task.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.status IS '审核状态，例如pending、approved、rejected';


--
-- Name: COLUMN review_task.review_comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.review_comment IS '审核意见';


--
-- Name: COLUMN review_task.reviewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.reviewed_at IS '审核处理时间';


--
-- Name: COLUMN review_task.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.created_at IS '任务创建时间';


--
-- Name: COLUMN review_task.trace_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_task.trace_id IS 'Copied from revision.trace_id; not an authorization credential.';


--
-- Name: review_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.review_task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: review_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.review_task_id_seq OWNED BY public.review_task.id;


--
-- Name: revision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revision (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id bigint NOT NULL,
    change_type character varying(32) NOT NULL,
    before_data text,
    after_data text,
    diff_summary text,
    submitter_id bigint,
    submit_time timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    approved_at timestamp without time zone,
    rejected_reason text,
    trace_id uuid
);


--
-- Name: TABLE revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.revision IS '修订记录表，记录待审核变更的前后数据和Diff摘要';


--
-- Name: COLUMN revision.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.id IS '修订主键ID';


--
-- Name: COLUMN revision.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.clan_id IS '所属宗族ID';


--
-- Name: COLUMN revision.target_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.target_type IS '变更对象类型';


--
-- Name: COLUMN revision.target_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.target_id IS '变更对象ID';


--
-- Name: COLUMN revision.change_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.change_type IS '变更类型，例如created、modified、deleted';


--
-- Name: COLUMN revision.before_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.before_data IS '变更前数据快照，JSON格式';


--
-- Name: COLUMN revision.after_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.after_data IS '变更后数据快照，JSON格式';


--
-- Name: COLUMN revision.diff_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.diff_summary IS '差异摘要';


--
-- Name: COLUMN revision.submitter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.submitter_id IS '提交人用户ID';


--
-- Name: COLUMN revision.submit_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.submit_time IS '提交时间';


--
-- Name: COLUMN revision.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.status IS '修订状态，例如draft、pending、approved、rejected';


--
-- Name: COLUMN revision.approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.approved_at IS '审核通过时间';


--
-- Name: COLUMN revision.rejected_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.rejected_reason IS '驳回原因';


--
-- Name: COLUMN revision.trace_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.revision.trace_id IS 'Stable id for one revision lifecycle. Historical unknown rows remain null.';


--
-- Name: revision_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.revision_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: revision_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.revision_id_seq OWNED BY public.revision.id;


--
-- Name: source; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    source_name character varying(200) NOT NULL,
    source_type character varying(50) NOT NULL,
    provider_name character varying(100),
    book_title character varying(200),
    volume_no character varying(100),
    page_no character varying(100),
    excerpt text,
    verification_status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    description text,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_date character varying(100),
    confidence_level character varying(32) DEFAULT 'unknown'::character varying NOT NULL,
    privacy_level character varying(32) DEFAULT 'clan_only'::character varying NOT NULL,
    sensitive_level character varying(32) DEFAULT 'normal'::character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_source_confidence_level CHECK (((confidence_level)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT chk_source_privacy_level CHECK (((privacy_level)::text = ANY ((ARRAY['public'::character varying, 'clan_only'::character varying, 'branch_only'::character varying, 'relatives_only'::character varying, 'private'::character varying, 'sealed'::character varying])::text[]))),
    CONSTRAINT chk_source_sensitive_level CHECK (((sensitive_level)::text = ANY ((ARRAY['normal'::character varying, 'sensitive'::character varying, 'highly_sensitive'::character varying])::text[]))),
    CONSTRAINT chk_source_verification_status CHECK (((verification_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT chk_source_verification_status_lifecycle CHECK (((verification_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: TABLE source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.source IS '来源资料表，记录族谱原文、地方志、口述访谈、图片等证据来源';


--
-- Name: COLUMN source.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.id IS '来源主键ID';


--
-- Name: COLUMN source.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.clan_id IS '所属宗族ID';


--
-- Name: COLUMN source.source_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.source_name IS '来源名称';


--
-- Name: COLUMN source.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.source_type IS '来源类型，例如genealogy_book、local_chronicle、oral_record、photo';


--
-- Name: COLUMN source.provider_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.provider_name IS '提供人或提供机构';


--
-- Name: COLUMN source.book_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.book_title IS '书名、资料集名称或档案标题';


--
-- Name: COLUMN source.volume_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.volume_no IS '卷册号';


--
-- Name: COLUMN source.page_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.page_no IS '页码或位置编号';


--
-- Name: COLUMN source.excerpt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.excerpt IS '原文摘录';


--
-- Name: COLUMN source.verification_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.verification_status IS '复核状态，例如unverified、verified、rejected';


--
-- Name: COLUMN source.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.description IS '来源说明';


--
-- Name: COLUMN source.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.created_by IS '创建人用户ID';


--
-- Name: COLUMN source.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source.created_at IS '创建时间';


--
-- Name: source_attachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_attachment (
    id bigint NOT NULL,
    source_id bigint NOT NULL,
    clan_id bigint NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    content_type character varying(120),
    file_size bigint DEFAULT 0 NOT NULL,
    storage_path character varying(1000) NOT NULL,
    checksum character varying(128),
    upload_status character varying(32) DEFAULT 'uploaded'::character varying NOT NULL,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    privacy_level character varying(32) DEFAULT 'clan_only'::character varying NOT NULL,
    sensitive_level character varying(32) DEFAULT 'normal'::character varying NOT NULL,
    CONSTRAINT chk_source_attachment_privacy_level CHECK (((privacy_level)::text = ANY ((ARRAY['public'::character varying, 'clan_only'::character varying, 'branch_only'::character varying, 'relatives_only'::character varying, 'private'::character varying, 'sealed'::character varying])::text[]))),
    CONSTRAINT chk_source_attachment_sensitive_level CHECK (((sensitive_level)::text = ANY ((ARRAY['normal'::character varying, 'sensitive'::character varying, 'highly_sensitive'::character varying])::text[])))
);


--
-- Name: TABLE source_attachment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.source_attachment IS '来源附件表，记录来源资料关联的上传文件元数据';


--
-- Name: COLUMN source_attachment.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.id IS '来源附件主键ID';


--
-- Name: COLUMN source_attachment.source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.source_id IS '来源资料ID';


--
-- Name: COLUMN source_attachment.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.clan_id IS '所属宗族ID';


--
-- Name: COLUMN source_attachment.original_filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.original_filename IS '原始文件名';


--
-- Name: COLUMN source_attachment.stored_filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.stored_filename IS '存储文件名';


--
-- Name: COLUMN source_attachment.content_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.content_type IS '文件MIME类型';


--
-- Name: COLUMN source_attachment.file_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.file_size IS '文件大小，单位字节';


--
-- Name: COLUMN source_attachment.storage_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.storage_path IS '文件存储路径';


--
-- Name: COLUMN source_attachment.checksum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.checksum IS '文件校验和';


--
-- Name: COLUMN source_attachment.upload_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.upload_status IS '上传状态，例如uploaded、metadata_only、failed';


--
-- Name: COLUMN source_attachment.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.created_by IS '上传人用户ID';


--
-- Name: COLUMN source_attachment.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.created_at IS '上传记录创建时间';


--
-- Name: COLUMN source_attachment.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_attachment.deleted_at IS '软删除时间，空表示未删除';


--
-- Name: source_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.source_attachment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.source_attachment_id_seq OWNED BY public.source_attachment.id;


--
-- Name: source_binding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_binding (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    source_id bigint NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id bigint NOT NULL,
    binding_reason character varying(255),
    excerpt text,
    created_by bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    confidence_level character varying(32) DEFAULT 'unknown'::character varying NOT NULL,
    binding_status character varying(32) DEFAULT 'official'::character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_source_binding_confidence_level CHECK (((confidence_level)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT chk_source_binding_status CHECK (((binding_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'official'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT chk_source_binding_target_type CHECK (((target_type)::text = ANY ((ARRAY['person'::character varying, 'relationship'::character varying, 'branch'::character varying, 'clan'::character varying, 'generation_word'::character varying])::text[])))
);


--
-- Name: TABLE source_binding; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.source_binding IS '来源绑定表，记录来源资料与人物、关系、支派、字辈等对象的证据关系';


--
-- Name: COLUMN source_binding.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.id IS '绑定主键ID';


--
-- Name: COLUMN source_binding.clan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.clan_id IS '所属宗族ID';


--
-- Name: COLUMN source_binding.source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.source_id IS '来源资料ID';


--
-- Name: COLUMN source_binding.target_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.target_type IS '绑定对象类型，例如person、relationship、branch、clan、generation_word';


--
-- Name: COLUMN source_binding.target_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.target_id IS '绑定对象ID';


--
-- Name: COLUMN source_binding.binding_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.binding_reason IS '绑定原因';


--
-- Name: COLUMN source_binding.excerpt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.excerpt IS '与该对象相关的来源摘录';


--
-- Name: COLUMN source_binding.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.created_by IS '创建人用户ID';


--
-- Name: COLUMN source_binding.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.source_binding.created_at IS '创建时间';


--
-- Name: source_binding_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.source_binding_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_binding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.source_binding_id_seq OWNED BY public.source_binding.id;


--
-- Name: source_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.source_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.source_id_seq OWNED BY public.source.id;


--
-- Name: user_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_account (
    id bigint NOT NULL,
    username character varying(100),
    phone character varying(50),
    email character varying(100),
    display_name character varying(100),
    password_hash character varying(255),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    last_login_at timestamp without time zone
);


--
-- Name: user_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_account_id_seq OWNED BY public.user_account.id;


--
-- Name: workbench_task_action; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workbench_task_action (
    id bigint NOT NULL,
    clan_id bigint NOT NULL,
    task_key character varying(255) NOT NULL,
    action_type character varying(32) NOT NULL,
    comment_text character varying(500),
    actor_id bigint NOT NULL,
    expected_updated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: workbench_task_action_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workbench_task_action_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workbench_task_action_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workbench_task_action_id_seq OWNED BY public.workbench_task_action.id;


--
-- Name: app_account_invite id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_account_invite ALTER COLUMN id SET DEFAULT nextval('public.app_account_invite_id_seq'::regclass);


--
-- Name: app_auth_security_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_auth_security_event ALTER COLUMN id SET DEFAULT nextval('public.app_auth_security_event_id_seq'::regclass);


--
-- Name: app_auth_session id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_auth_session ALTER COLUMN id SET DEFAULT nextval('public.app_auth_session_id_seq'::regclass);


--
-- Name: app_login_attempt id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_login_attempt ALTER COLUMN id SET DEFAULT nextval('public.app_login_attempt_id_seq'::regclass);


--
-- Name: app_password_reset_token id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_password_reset_token ALTER COLUMN id SET DEFAULT nextval('public.app_password_reset_token_id_seq'::regclass);


--
-- Name: app_permission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_permission ALTER COLUMN id SET DEFAULT nextval('public.app_permission_id_seq'::regclass);


--
-- Name: app_role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role ALTER COLUMN id SET DEFAULT nextval('public.app_role_id_seq'::regclass);


--
-- Name: app_role_permission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role_permission ALTER COLUMN id SET DEFAULT nextval('public.app_role_permission_id_seq'::regclass);


--
-- Name: app_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user ALTER COLUMN id SET DEFAULT nextval('public.app_user_id_seq'::regclass);


--
-- Name: attachment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment ALTER COLUMN id SET DEFAULT nextval('public.attachment_id_seq'::regclass);


--
-- Name: branch id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch ALTER COLUMN id SET DEFAULT nextval('public.branch_id_seq'::regclass);


--
-- Name: clan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan ALTER COLUMN id SET DEFAULT nextval('public.clan_id_seq'::regclass);


--
-- Name: clan_membership id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_membership ALTER COLUMN id SET DEFAULT nextval('public.clan_membership_id_seq'::regclass);


--
-- Name: culture_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_item ALTER COLUMN id SET DEFAULT nextval('public.culture_item_id_seq'::regclass);


--
-- Name: culture_site id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_site ALTER COLUMN id SET DEFAULT nextval('public.culture_site_id_seq'::regclass);


--
-- Name: generation_scheme id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_scheme ALTER COLUMN id SET DEFAULT nextval('public.generation_scheme_id_seq'::regclass);


--
-- Name: generation_word id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_word ALTER COLUMN id SET DEFAULT nextval('public.generation_word_id_seq'::regclass);


--
-- Name: import_file_fingerprint id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_file_fingerprint ALTER COLUMN id SET DEFAULT nextval('public.import_file_fingerprint_id_seq'::regclass);


--
-- Name: import_job id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job ALTER COLUMN id SET DEFAULT nextval('public.import_job_id_seq'::regclass);


--
-- Name: import_job_chunk id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_chunk ALTER COLUMN id SET DEFAULT nextval('public.import_job_chunk_id_seq'::regclass);


--
-- Name: import_job_error id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_error ALTER COLUMN id SET DEFAULT nextval('public.import_job_error_id_seq'::regclass);


--
-- Name: import_job_row id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_row ALTER COLUMN id SET DEFAULT nextval('public.import_job_row_id_seq'::regclass);


--
-- Name: member_role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role ALTER COLUMN id SET DEFAULT nextval('public.member_role_id_seq'::regclass);


--
-- Name: migration_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_event ALTER COLUMN id SET DEFAULT nextval('public.migration_event_id_seq'::regclass);


--
-- Name: operation_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_log ALTER COLUMN id SET DEFAULT nextval('public.operation_log_id_seq'::regclass);


--
-- Name: person id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person ALTER COLUMN id SET DEFAULT nextval('public.person_id_seq'::regclass);


--
-- Name: person_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_event ALTER COLUMN id SET DEFAULT nextval('public.person_event_id_seq'::regclass);


--
-- Name: relationship id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship ALTER COLUMN id SET DEFAULT nextval('public.relationship_id_seq'::regclass);


--
-- Name: review_task id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_task ALTER COLUMN id SET DEFAULT nextval('public.review_task_id_seq'::regclass);


--
-- Name: revision id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision ALTER COLUMN id SET DEFAULT nextval('public.revision_id_seq'::regclass);


--
-- Name: source id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source ALTER COLUMN id SET DEFAULT nextval('public.source_id_seq'::regclass);


--
-- Name: source_attachment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_attachment ALTER COLUMN id SET DEFAULT nextval('public.source_attachment_id_seq'::regclass);


--
-- Name: source_binding id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_binding ALTER COLUMN id SET DEFAULT nextval('public.source_binding_id_seq'::regclass);


--
-- Name: user_account id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_account ALTER COLUMN id SET DEFAULT nextval('public.user_account_id_seq'::regclass);


--
-- Name: workbench_task_action id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbench_task_action ALTER COLUMN id SET DEFAULT nextval('public.workbench_task_action_id_seq'::regclass);


--
-- Name: app_account_invite app_account_invite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_account_invite
    ADD CONSTRAINT app_account_invite_pkey PRIMARY KEY (id);


--
-- Name: app_auth_security_event app_auth_security_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_auth_security_event
    ADD CONSTRAINT app_auth_security_event_pkey PRIMARY KEY (id);


--
-- Name: app_auth_session app_auth_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_auth_session
    ADD CONSTRAINT app_auth_session_pkey PRIMARY KEY (id);


--
-- Name: app_login_attempt app_login_attempt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_login_attempt
    ADD CONSTRAINT app_login_attempt_pkey PRIMARY KEY (id);


--
-- Name: app_password_reset_token app_password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_password_reset_token
    ADD CONSTRAINT app_password_reset_token_pkey PRIMARY KEY (id);


--
-- Name: app_permission app_permission_permission_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_permission
    ADD CONSTRAINT app_permission_permission_code_key UNIQUE (permission_code);


--
-- Name: app_permission app_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_permission
    ADD CONSTRAINT app_permission_pkey PRIMARY KEY (id);


--
-- Name: app_role_permission app_role_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role_permission
    ADD CONSTRAINT app_role_permission_pkey PRIMARY KEY (id);


--
-- Name: app_role_permission app_role_permission_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role_permission
    ADD CONSTRAINT app_role_permission_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: app_role app_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role
    ADD CONSTRAINT app_role_pkey PRIMARY KEY (id);


--
-- Name: app_role app_role_role_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role
    ADD CONSTRAINT app_role_role_code_key UNIQUE (role_code);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- Name: app_user app_user_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_username_key UNIQUE (username);


--
-- Name: attachment attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment
    ADD CONSTRAINT attachment_pkey PRIMARY KEY (id);


--
-- Name: branch branch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch
    ADD CONSTRAINT branch_pkey PRIMARY KEY (id);


--
-- Name: clan clan_clan_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan
    ADD CONSTRAINT clan_clan_code_key UNIQUE (clan_code);


--
-- Name: clan_membership clan_membership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_membership
    ADD CONSTRAINT clan_membership_pkey PRIMARY KEY (id);


--
-- Name: clan clan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan
    ADD CONSTRAINT clan_pkey PRIMARY KEY (id);


--
-- Name: culture_revision_payload culture_revision_payload_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_revision_payload
    ADD CONSTRAINT culture_revision_payload_pkey PRIMARY KEY (revision_id);


--
-- Name: generation_scheme generation_scheme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_scheme
    ADD CONSTRAINT generation_scheme_pkey PRIMARY KEY (id);


--
-- Name: generation_word generation_word_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_word
    ADD CONSTRAINT generation_word_pkey PRIMARY KEY (id);


--
-- Name: generation_word generation_word_scheme_id_generation_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_word
    ADD CONSTRAINT generation_word_scheme_id_generation_no_key UNIQUE (scheme_id, generation_no);


--
-- Name: import_file_fingerprint import_file_fingerprint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_file_fingerprint
    ADD CONSTRAINT import_file_fingerprint_pkey PRIMARY KEY (id);


--
-- Name: import_job_chunk import_job_chunk_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_chunk
    ADD CONSTRAINT import_job_chunk_pkey PRIMARY KEY (id);


--
-- Name: import_job_error import_job_error_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_error
    ADD CONSTRAINT import_job_error_pkey PRIMARY KEY (id);


--
-- Name: import_job_payload import_job_payload_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_payload
    ADD CONSTRAINT import_job_payload_pkey PRIMARY KEY (job_id);


--
-- Name: import_job import_job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job
    ADD CONSTRAINT import_job_pkey PRIMARY KEY (id);


--
-- Name: import_job_row import_job_row_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_row
    ADD CONSTRAINT import_job_row_pkey PRIMARY KEY (id);


--
-- Name: member_role member_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_pkey PRIMARY KEY (id);


--
-- Name: operation_log operation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_log
    ADD CONSTRAINT operation_log_pkey PRIMARY KEY (id);


--
-- Name: person person_clan_id_person_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_clan_id_person_code_key UNIQUE (clan_id, person_code);


--
-- Name: person_event person_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_event
    ADD CONSTRAINT person_event_pkey PRIMARY KEY (id);


--
-- Name: person person_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_pkey PRIMARY KEY (id);


--
-- Name: culture_item pk_culture_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_item
    ADD CONSTRAINT pk_culture_item PRIMARY KEY (id);


--
-- Name: culture_site pk_culture_site; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_site
    ADD CONSTRAINT pk_culture_site PRIMARY KEY (id);


--
-- Name: migration_event pk_migration_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_event
    ADD CONSTRAINT pk_migration_event PRIMARY KEY (id);


--
-- Name: relationship relationship_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_pkey PRIMARY KEY (id);


--
-- Name: review_quality_check review_quality_check_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_quality_check
    ADD CONSTRAINT review_quality_check_pkey PRIMARY KEY (id);


--
-- Name: review_task review_task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_task
    ADD CONSTRAINT review_task_pkey PRIMARY KEY (id);


--
-- Name: revision revision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision
    ADD CONSTRAINT revision_pkey PRIMARY KEY (id);


--
-- Name: source_attachment source_attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_attachment
    ADD CONSTRAINT source_attachment_pkey PRIMARY KEY (id);


--
-- Name: source_binding source_binding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_binding
    ADD CONSTRAINT source_binding_pkey PRIMARY KEY (id);


--
-- Name: source source_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_pkey PRIMARY KEY (id);


--
-- Name: import_file_fingerprint uk_import_file_fingerprint_job; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_file_fingerprint
    ADD CONSTRAINT uk_import_file_fingerprint_job UNIQUE (job_id);


--
-- Name: import_file_fingerprint uk_import_file_fingerprint_scope; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_file_fingerprint
    ADD CONSTRAINT uk_import_file_fingerprint_scope UNIQUE (clan_id, branch_id, import_type, file_hash);


--
-- Name: import_job_chunk uk_import_job_chunk_idempotency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_chunk
    ADD CONSTRAINT uk_import_job_chunk_idempotency UNIQUE (idempotency_key);


--
-- Name: import_job_chunk uk_import_job_chunk_stage_no; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_chunk
    ADD CONSTRAINT uk_import_job_chunk_stage_no UNIQUE (job_id, stage, chunk_no);


--
-- Name: import_job_row uk_import_job_row_job_row; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_row
    ADD CONSTRAINT uk_import_job_row_job_row UNIQUE (job_id, row_no);


--
-- Name: workbench_task_action uk_workbench_task_action; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbench_task_action
    ADD CONSTRAINT uk_workbench_task_action UNIQUE (clan_id, task_key, action_type);


--
-- Name: user_account user_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (id);


--
-- Name: workbench_task_action workbench_task_action_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workbench_task_action
    ADD CONSTRAINT workbench_task_action_pkey PRIMARY KEY (id);


--
-- Name: idx_app_account_invite_clan_status_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_account_invite_clan_status_expiry ON public.app_account_invite USING btree (clan_id, status, expires_at);


--
-- Name: idx_app_auth_security_event_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_auth_security_event_type_time ON public.app_auth_security_event USING btree (event_type, created_at DESC);


--
-- Name: idx_app_auth_security_event_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_auth_security_event_user_time ON public.app_auth_security_event USING btree (user_id, created_at DESC);


--
-- Name: idx_app_auth_session_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_auth_session_user ON public.app_auth_session USING btree (user_id);


--
-- Name: idx_app_auth_session_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_auth_session_user_active ON public.app_auth_session USING btree (user_id, expires_at DESC) WHERE (revoked_at IS NULL);


--
-- Name: idx_app_login_attempt_account_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_login_attempt_account_window ON public.app_login_attempt USING btree (account_hash, created_at DESC) WHERE (success = false);


--
-- Name: idx_app_login_attempt_ip_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_login_attempt_ip_window ON public.app_login_attempt USING btree (ip_hash, created_at DESC) WHERE (success = false);


--
-- Name: idx_app_password_reset_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_password_reset_user_active ON public.app_password_reset_token USING btree (user_id, expires_at DESC) WHERE ((used_at IS NULL) AND (revoked_at IS NULL));


--
-- Name: idx_app_permission_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_permission_code ON public.app_permission USING btree (permission_code);


--
-- Name: idx_app_permission_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_permission_enabled ON public.app_permission USING btree (enabled);


--
-- Name: idx_app_permission_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_permission_module ON public.app_permission USING btree (module_code);


--
-- Name: idx_app_permission_module_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_permission_module_code ON public.app_permission USING btree (module_code);


--
-- Name: idx_app_permission_resource_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_permission_resource_action ON public.app_permission USING btree (resource_type, action_type);


--
-- Name: idx_app_permission_resource_code_action_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_permission_resource_code_action_code ON public.app_permission USING btree (resource_code, action_code);


--
-- Name: idx_app_role_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_role_code ON public.app_role USING btree (role_code);


--
-- Name: idx_app_role_permission_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_role_permission_permission ON public.app_role_permission USING btree (permission_id);


--
-- Name: idx_app_role_permission_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_role_permission_role ON public.app_role_permission USING btree (role_id);


--
-- Name: idx_app_user_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_user_username ON public.app_user USING btree (username);


--
-- Name: idx_attachment_clan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachment_clan ON public.attachment USING btree (clan_id);


--
-- Name: idx_attachment_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachment_source ON public.attachment USING btree (source_id);


--
-- Name: idx_branch_clan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_clan ON public.branch USING btree (clan_id);


--
-- Name: idx_branch_clan_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_clan_parent ON public.branch USING btree (clan_id, parent_id);


--
-- Name: idx_branch_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_parent ON public.branch USING btree (parent_id);


--
-- Name: idx_branch_tree_subtree; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_tree_subtree ON public.branch USING btree (clan_id, parent_id, id);


--
-- Name: idx_clan_membership_clan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clan_membership_clan ON public.clan_membership USING btree (clan_id);


--
-- Name: idx_clan_membership_clan_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clan_membership_clan_status_id ON public.clan_membership USING btree (clan_id, member_status, id);


--
-- Name: idx_clan_membership_clan_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clan_membership_clan_user ON public.clan_membership USING btree (clan_id, user_id);


--
-- Name: idx_culture_item__clan_branch_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item__clan_branch_category ON public.culture_item USING btree (clan_id, branch_id, category) WHERE (deleted_at IS NULL);


--
-- Name: idx_culture_item__clan_status_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item__clan_status_updated ON public.culture_item USING btree (clan_id, data_status, updated_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_culture_item__content_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item__content_trgm ON public.culture_item USING gin (lower(content) public.gin_trgm_ops) WHERE ((deleted_at IS NULL) AND (content IS NOT NULL));


--
-- Name: idx_culture_item__featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item__featured ON public.culture_item USING btree (clan_id, sort_order, updated_at DESC) WHERE ((deleted_at IS NULL) AND ((data_status)::text = 'official'::text) AND (is_featured_on_home = true));


--
-- Name: idx_culture_item__historical_period_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item__historical_period_trgm ON public.culture_item USING gin (lower((historical_period)::text) public.gin_trgm_ops) WHERE ((deleted_at IS NULL) AND (historical_period IS NOT NULL));


--
-- Name: idx_culture_item__location_text_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item__location_text_trgm ON public.culture_item USING gin (lower((location_text)::text) public.gin_trgm_ops) WHERE ((deleted_at IS NULL) AND (location_text IS NOT NULL));


--
-- Name: idx_culture_item__summary_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item__summary_trgm ON public.culture_item USING gin (lower((summary)::text) public.gin_trgm_ops) WHERE ((deleted_at IS NULL) AND (summary IS NOT NULL));


--
-- Name: idx_culture_item__title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item__title_trgm ON public.culture_item USING gin (lower((title)::text) public.gin_trgm_ops) WHERE (deleted_at IS NULL);


--
-- Name: idx_culture_item_featured_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_item_featured_home ON public.culture_item USING btree (clan_id, sort_order, id) WHERE ((deleted_at IS NULL) AND (is_featured_on_home = true) AND ((data_status)::text = 'official'::text));


--
-- Name: idx_culture_site__clan_branch_status_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_site__clan_branch_status_type ON public.culture_site USING btree (clan_id, branch_id, data_status, site_type, sort_order, id) WHERE (deleted_at IS NULL);


--
-- Name: idx_culture_site__clan_branch_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_site__clan_branch_type ON public.culture_site USING btree (clan_id, branch_id, site_type) WHERE (deleted_at IS NULL);


--
-- Name: idx_culture_site__clan_location_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_site__clan_location_period ON public.culture_site USING btree (clan_id, address_text, founded_period, current_status) WHERE (deleted_at IS NULL);


--
-- Name: idx_culture_site__clan_status_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_site__clan_status_updated ON public.culture_site USING btree (clan_id, data_status, updated_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_culture_site__featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_site__featured ON public.culture_site USING btree (clan_id, sort_order, updated_at DESC) WHERE ((deleted_at IS NULL) AND ((data_status)::text = 'official'::text) AND (is_featured_on_home = true));


--
-- Name: idx_culture_site__related_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_site__related_person ON public.culture_site USING btree (related_person_id) WHERE ((deleted_at IS NULL) AND (related_person_id IS NOT NULL));


--
-- Name: idx_culture_site_featured_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_culture_site_featured_home ON public.culture_site USING btree (clan_id, sort_order, id) WHERE ((deleted_at IS NULL) AND (is_featured_on_home = true) AND ((data_status)::text = 'official'::text));


--
-- Name: idx_generation_scheme_clan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_scheme_clan ON public.generation_scheme USING btree (clan_id);


--
-- Name: idx_generation_word_scheme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_word_scheme ON public.generation_word USING btree (scheme_id);


--
-- Name: idx_import_file_fingerprint_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_file_fingerprint_job ON public.import_file_fingerprint USING btree (job_id);


--
-- Name: idx_import_job_chunk_job_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_chunk_job_stage ON public.import_job_chunk USING btree (job_id, stage, chunk_no);


--
-- Name: idx_import_job_clan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_clan ON public.import_job USING btree (clan_id);


--
-- Name: idx_import_job_execution_claim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_execution_claim ON public.import_job USING btree (execution_status, next_retry_at, lease_expires_at, created_at, id) WHERE (((execution_mode)::text = 'async'::text) AND ((execution_status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying, 'retry_wait'::character varying])::text[])));


--
-- Name: idx_import_job_processing_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_processing_review ON public.import_job USING btree (clan_id, processing_status, review_status, created_at DESC);


--
-- Name: idx_import_job_recovery_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_recovery_queue ON public.import_job USING btree (execution_status, next_retry_at, lease_expires_at, created_at, id) WHERE ((execution_mode)::text = 'async'::text);


--
-- Name: idx_import_job_row_draft_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_row_draft_person ON public.import_job_row USING btree (draft_person_id) WHERE (draft_person_id IS NOT NULL);


--
-- Name: idx_import_job_row_draft_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_row_draft_target ON public.import_job_row USING btree (draft_target_type, draft_target_id) WHERE (draft_target_id IS NOT NULL);


--
-- Name: idx_import_job_row_failed_selection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_row_failed_selection ON public.import_job_row USING btree (job_id, row_status, row_no) WHERE ((row_status)::text = ANY ((ARRAY['invalid'::character varying, 'retry_failed'::character varying])::text[]));


--
-- Name: idx_import_job_row_job_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_row_job_status ON public.import_job_row USING btree (job_id, row_status, row_no);


--
-- Name: idx_import_job_row_unpublished; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_row_unpublished ON public.import_job_row USING btree (job_id, row_no) WHERE (((row_status)::text = 'draft_created'::text) AND (published_at IS NULL));


--
-- Name: idx_import_job_type_format; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_job_type_format ON public.import_job USING btree (clan_id, import_type, file_format, created_at DESC);


--
-- Name: idx_member_role_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_role_member ON public.member_role USING btree (member_id);


--
-- Name: idx_member_role_membership; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_role_membership ON public.member_role USING btree (membership_id);


--
-- Name: idx_member_role_membership_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_role_membership_status ON public.member_role USING btree (membership_id, status);


--
-- Name: idx_member_role_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_role_role ON public.member_role USING btree (role_id);


--
-- Name: idx_member_role_role_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_role_role_status ON public.member_role USING btree (role_id, status);


--
-- Name: idx_member_role_scope_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_role_scope_status ON public.member_role USING btree (scope_type, scope_id, status);


--
-- Name: idx_migration_event__branch_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_event__branch_sequence ON public.migration_event USING btree (branch_id, sequence_no) WHERE (deleted_at IS NULL);


--
-- Name: idx_migration_event__clan_branch_status_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_event__clan_branch_status_sequence ON public.migration_event USING btree (clan_id, branch_id, data_status, sequence_no, id) WHERE (deleted_at IS NULL);


--
-- Name: idx_migration_event__clan_locations; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_event__clan_locations ON public.migration_event USING btree (clan_id, from_location, to_location) WHERE (deleted_at IS NULL);


--
-- Name: idx_migration_event__clan_status_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_event__clan_status_updated ON public.migration_event USING btree (clan_id, data_status, updated_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_migration_event__clan_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_event__clan_time ON public.migration_event USING btree (clan_id, migration_time_text, sequence_no) WHERE (deleted_at IS NULL);


--
-- Name: idx_migration_event__founder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_event__founder ON public.migration_event USING btree (founder_person_id) WHERE ((deleted_at IS NULL) AND (founder_person_id IS NOT NULL));


--
-- Name: idx_operation_log__risk_branch_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log__risk_branch_recent ON public.operation_log USING btree (clan_id, branch_id, created_at DESC, id DESC) WHERE ((risk_event_type IS NOT NULL) AND (branch_id IS NOT NULL));


--
-- Name: idx_operation_log__risk_level_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log__risk_level_recent ON public.operation_log USING btree (clan_id, risk_level, created_at DESC, id DESC) WHERE (risk_event_type IS NOT NULL);


--
-- Name: idx_operation_log__risk_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log__risk_recent ON public.operation_log USING btree (clan_id, created_at DESC, id DESC) WHERE (risk_event_type IS NOT NULL);


--
-- Name: idx_operation_log__risk_type_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log__risk_type_recent ON public.operation_log USING btree (clan_id, risk_event_type, created_at DESC, id DESC) WHERE (risk_event_type IS NOT NULL);


--
-- Name: idx_operation_log_business_target_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log_business_target_created ON public.operation_log USING btree (clan_id, business_target_type, business_target_id, created_at DESC, id DESC) WHERE ((business_target_type IS NOT NULL) AND (business_target_id IS NOT NULL));


--
-- Name: idx_operation_log_clan_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log_clan_created ON public.operation_log USING btree (clan_id, created_at DESC);


--
-- Name: idx_operation_log_review_task_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log_review_task_created ON public.operation_log USING btree (review_task_id, created_at, id) WHERE (review_task_id IS NOT NULL);


--
-- Name: idx_operation_log_revision_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log_revision_created ON public.operation_log USING btree (revision_id, created_at, id) WHERE (revision_id IS NOT NULL);


--
-- Name: idx_operation_log_trace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_log_trace_created ON public.operation_log USING btree (trace_id, created_at, id) WHERE (trace_id IS NOT NULL);


--
-- Name: idx_person_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_person_branch ON public.person USING btree (branch_id);


--
-- Name: idx_person_clan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_person_clan ON public.person USING btree (clan_id);


--
-- Name: idx_person_event_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_person_event_person ON public.person_event USING btree (person_id, event_date);


--
-- Name: idx_person_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_person_status ON public.person USING btree (clan_id, data_status);


--
-- Name: idx_person_tree_by_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_person_tree_by_branch ON public.person USING btree (clan_id, branch_id, data_status, generation_no, person_code, id) WHERE (deleted_at IS NULL);


--
-- Name: idx_person_tree_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_person_tree_by_id ON public.person USING btree (clan_id, id, data_status) WHERE (deleted_at IS NULL);


--
-- Name: idx_relationship_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_category ON public.relationship USING btree (clan_id, relation_category);


--
-- Name: idx_relationship_clan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_clan ON public.relationship USING btree (clan_id);


--
-- Name: idx_relationship_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_from ON public.relationship USING btree (from_person_id);


--
-- Name: idx_relationship_ritual_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_ritual_type ON public.relationship USING btree (clan_id, ritual_relation_type);


--
-- Name: idx_relationship_successor_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_successor_branch ON public.relationship USING btree (clan_id, successor_branch_id);


--
-- Name: idx_relationship_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_to ON public.relationship USING btree (to_person_id);


--
-- Name: idx_relationship_tree_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_tree_category ON public.relationship USING btree (clan_id, relation_category, data_status) WHERE (deleted_at IS NULL);


--
-- Name: idx_relationship_tree_incoming; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_tree_incoming ON public.relationship USING btree (clan_id, to_person_id, data_status, relation_category, id) WHERE (deleted_at IS NULL);


--
-- Name: idx_relationship_tree_outgoing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_tree_outgoing ON public.relationship USING btree (clan_id, from_person_id, data_status, relation_category, id) WHERE (deleted_at IS NULL);


--
-- Name: idx_relationship_tree_within_people; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relationship_tree_within_people ON public.relationship USING btree (clan_id, data_status, relation_category, from_person_id, to_person_id, id) WHERE (deleted_at IS NULL);


--
-- Name: idx_review_quality_check_clan_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_quality_check_clan_time ON public.review_quality_check USING btree (clan_id, queued_at DESC);


--
-- Name: idx_review_task__culture_pending_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_task__culture_pending_scope ON public.review_task USING btree (clan_id, branch_id, status, created_at DESC) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_review_task_clan_branch_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_task_clan_branch_status_created ON public.review_task USING btree (clan_id, branch_id, status, created_at DESC, id DESC);


--
-- Name: idx_review_task_clan_reviewer_reviewed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_task_clan_reviewer_reviewed ON public.review_task USING btree (clan_id, reviewer_id, reviewed_at DESC, id DESC) WHERE (reviewed_at IS NOT NULL);


--
-- Name: idx_review_task_clan_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_task_clan_status_created ON public.review_task USING btree (clan_id, status, created_at DESC, id DESC);


--
-- Name: idx_review_task_reviewer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_task_reviewer_status ON public.review_task USING btree (reviewer_id, status);


--
-- Name: idx_review_task_revision_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_task_revision_id ON public.review_task USING btree (revision_id);


--
-- Name: idx_review_task_revision_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_task_revision_status ON public.review_task USING btree (revision_id, status);


--
-- Name: idx_review_task_trace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_task_trace_created ON public.review_task USING btree (trace_id, created_at, id) WHERE (trace_id IS NOT NULL);


--
-- Name: idx_revision__culture_item_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision__culture_item_history ON public.revision USING btree (clan_id, target_type, target_id, submit_time DESC) WHERE ((target_type)::text = 'culture_item'::text);


--
-- Name: idx_revision__culture_site_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision__culture_site_history ON public.revision USING btree (clan_id, target_type, target_id, submit_time DESC) WHERE ((target_type)::text = 'culture_site'::text);


--
-- Name: idx_revision__migration_event_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision__migration_event_history ON public.revision USING btree (clan_id, target_type, target_id, submit_time DESC) WHERE ((target_type)::text = 'migration_event'::text);


--
-- Name: idx_revision_clan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_clan_status ON public.revision USING btree (clan_id, status);


--
-- Name: idx_revision_clan_submitter_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_clan_submitter_time ON public.revision USING btree (clan_id, submitter_id, submit_time DESC, id DESC);


--
-- Name: idx_revision_clan_target_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_clan_target_time ON public.revision USING btree (clan_id, target_type, target_id, submit_time DESC, id DESC);


--
-- Name: idx_revision_source_binding_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revision_source_binding_pending ON public.revision USING btree (target_type, target_id, status) WHERE ((target_type)::text = 'source_binding'::text);


--
-- Name: idx_source_attachment_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_attachment_source ON public.source_attachment USING btree (source_id);


--
-- Name: idx_source_attachment_source_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_attachment_source_created ON public.source_attachment USING btree (source_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_source_binding__culture_target_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_binding__culture_target_active ON public.source_binding USING btree (clan_id, target_type, target_id, source_id) WHERE ((binding_status)::text <> 'archived'::text);


--
-- Name: idx_source_binding_active_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_binding_active_target ON public.source_binding USING btree (source_id, target_type, target_id, binding_status);


--
-- Name: idx_source_binding_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_binding_target ON public.source_binding USING btree (target_type, target_id);


--
-- Name: idx_source_clan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_clan ON public.source USING btree (clan_id);


--
-- Name: idx_source_clan_privacy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_clan_privacy ON public.source USING btree (clan_id, privacy_level);


--
-- Name: idx_source_clan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_clan_status ON public.source USING btree (clan_id, verification_status);


--
-- Name: idx_user_account_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_account_username ON public.user_account USING btree (username);


--
-- Name: idx_workbench_task_action_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workbench_task_action_actor ON public.workbench_task_action USING btree (actor_id, created_at DESC);


--
-- Name: idx_workbench_task_action_clan_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workbench_task_action_clan_created ON public.workbench_task_action USING btree (clan_id, created_at DESC);


--
-- Name: uk_app_account_invite_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_app_account_invite_token_hash ON public.app_account_invite USING btree (token_hash);


--
-- Name: uk_app_auth_session_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_app_auth_session_token_hash ON public.app_auth_session USING btree (token_hash);


--
-- Name: uk_app_password_reset_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_app_password_reset_token_hash ON public.app_password_reset_token USING btree (token_hash);


--
-- Name: uk_import_job_clan_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_import_job_clan_idempotency ON public.import_job USING btree (clan_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: uk_migration_event__branch_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_migration_event__branch_sequence ON public.migration_event USING btree (clan_id, branch_id, sequence_no) WHERE (deleted_at IS NULL);


--
-- Name: uk_review_quality_check_active_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_review_quality_check_active_scope ON public.review_quality_check USING btree (clan_id, scope_fingerprint) WHERE ((status)::text = ANY ((ARRAY['QUEUED'::character varying, 'RUNNING'::character varying])::text[]));


--
-- Name: uk_source_binding_target; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_source_binding_target ON public.source_binding USING btree (source_id, target_type, target_id);


--
-- Name: uq_revision_trace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_revision_trace_id ON public.revision USING btree (trace_id) WHERE (trace_id IS NOT NULL);


--
-- Name: ux_app_permission_permission_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_app_permission_permission_code ON public.app_permission USING btree (permission_code);


--
-- Name: ux_app_permission_resource_action; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_app_permission_resource_action ON public.app_permission USING btree (resource_code, action_code);


--
-- Name: ux_app_role_permission_role_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_app_role_permission_role_permission ON public.app_role_permission USING btree (role_id, permission_id);


--
-- Name: ux_clan_membership_clan_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_clan_membership_clan_user ON public.clan_membership USING btree (clan_id, user_id);


--
-- Name: ux_member_role_membership_role_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_member_role_membership_role_scope ON public.member_role USING btree (membership_id, role_id, scope_type, scope_id);


--
-- Name: app_account_invite app_account_invite_accepted_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_account_invite
    ADD CONSTRAINT app_account_invite_accepted_user_id_fkey FOREIGN KEY (accepted_user_id) REFERENCES public.app_user(id);


--
-- Name: app_account_invite app_account_invite_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_account_invite
    ADD CONSTRAINT app_account_invite_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: app_account_invite app_account_invite_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_account_invite
    ADD CONSTRAINT app_account_invite_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.app_user(id);


--
-- Name: app_auth_security_event app_auth_security_event_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_auth_security_event
    ADD CONSTRAINT app_auth_security_event_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id);


--
-- Name: app_auth_session app_auth_session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_auth_session
    ADD CONSTRAINT app_auth_session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id);


--
-- Name: app_login_attempt app_login_attempt_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_login_attempt
    ADD CONSTRAINT app_login_attempt_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id);


--
-- Name: app_password_reset_token app_password_reset_token_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_password_reset_token
    ADD CONSTRAINT app_password_reset_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id);


--
-- Name: app_permission app_permission_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_permission
    ADD CONSTRAINT app_permission_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: app_permission app_permission_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_permission
    ADD CONSTRAINT app_permission_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.app_user(id);


--
-- Name: app_role_permission app_role_permission_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role_permission
    ADD CONSTRAINT app_role_permission_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: app_role_permission app_role_permission_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role_permission
    ADD CONSTRAINT app_role_permission_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.app_permission(id);


--
-- Name: app_role_permission app_role_permission_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role_permission
    ADD CONSTRAINT app_role_permission_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.app_role(id);


--
-- Name: app_role_permission app_role_permission_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_role_permission
    ADD CONSTRAINT app_role_permission_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.app_user(id);


--
-- Name: branch branch_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch
    ADD CONSTRAINT branch_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: branch branch_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch
    ADD CONSTRAINT branch_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.branch(id);


--
-- Name: clan clan_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan
    ADD CONSTRAINT clan_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: clan_membership clan_membership_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_membership
    ADD CONSTRAINT clan_membership_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: clan_membership clan_membership_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_membership
    ADD CONSTRAINT clan_membership_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: clan_membership clan_membership_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_membership
    ADD CONSTRAINT clan_membership_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.app_user(id);


--
-- Name: clan_membership clan_membership_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_membership
    ADD CONSTRAINT clan_membership_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(id);


--
-- Name: clan_membership clan_membership_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_membership
    ADD CONSTRAINT clan_membership_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.app_user(id);


--
-- Name: clan_membership clan_membership_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_membership
    ADD CONSTRAINT clan_membership_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(id);


--
-- Name: culture_revision_payload culture_revision_payload_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_revision_payload
    ADD CONSTRAINT culture_revision_payload_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES public.revision(id) ON DELETE CASCADE;


--
-- Name: branch fk_branch_founder_person; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch
    ADD CONSTRAINT fk_branch_founder_person FOREIGN KEY (founder_person_id) REFERENCES public.person(id);


--
-- Name: branch fk_branch_manager_member_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch
    ADD CONSTRAINT fk_branch_manager_member_role FOREIGN KEY (manager_member_id) REFERENCES public.member_role(id);


--
-- Name: clan fk_clan_ancestor_person; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan
    ADD CONSTRAINT fk_clan_ancestor_person FOREIGN KEY (ancestor_person_id) REFERENCES public.person(id);


--
-- Name: culture_item fk_culture_item__branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_item
    ADD CONSTRAINT fk_culture_item__branch FOREIGN KEY (branch_id) REFERENCES public.branch(id);


--
-- Name: culture_item fk_culture_item__clan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_item
    ADD CONSTRAINT fk_culture_item__clan FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: culture_item fk_culture_item__created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_item
    ADD CONSTRAINT fk_culture_item__created_by FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: culture_site fk_culture_site__branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_site
    ADD CONSTRAINT fk_culture_site__branch FOREIGN KEY (branch_id) REFERENCES public.branch(id);


--
-- Name: culture_site fk_culture_site__clan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_site
    ADD CONSTRAINT fk_culture_site__clan FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: culture_site fk_culture_site__created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_site
    ADD CONSTRAINT fk_culture_site__created_by FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: culture_site fk_culture_site__related_person; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.culture_site
    ADD CONSTRAINT fk_culture_site__related_person FOREIGN KEY (related_person_id) REFERENCES public.person(id);


--
-- Name: import_file_fingerprint fk_import_file_fingerprint_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_file_fingerprint
    ADD CONSTRAINT fk_import_file_fingerprint_job FOREIGN KEY (job_id) REFERENCES public.import_job(id);


--
-- Name: import_job_chunk fk_import_job_chunk_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_chunk
    ADD CONSTRAINT fk_import_job_chunk_job FOREIGN KEY (job_id) REFERENCES public.import_job(id) ON DELETE CASCADE;


--
-- Name: import_job fk_import_job_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job
    ADD CONSTRAINT fk_import_job_parent FOREIGN KEY (parent_job_id) REFERENCES public.import_job(id);


--
-- Name: import_job_payload fk_import_job_payload_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_payload
    ADD CONSTRAINT fk_import_job_payload_job FOREIGN KEY (job_id) REFERENCES public.import_job(id) ON DELETE CASCADE;


--
-- Name: import_job_row fk_import_job_row_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_row
    ADD CONSTRAINT fk_import_job_row_job FOREIGN KEY (job_id) REFERENCES public.import_job(id) ON DELETE CASCADE;


--
-- Name: import_job_row fk_import_job_row_person; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_row
    ADD CONSTRAINT fk_import_job_row_person FOREIGN KEY (draft_person_id) REFERENCES public.person(id);


--
-- Name: migration_event fk_migration_event__branch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_event
    ADD CONSTRAINT fk_migration_event__branch FOREIGN KEY (branch_id) REFERENCES public.branch(id);


--
-- Name: migration_event fk_migration_event__clan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_event
    ADD CONSTRAINT fk_migration_event__clan FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: migration_event fk_migration_event__created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_event
    ADD CONSTRAINT fk_migration_event__created_by FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: migration_event fk_migration_event__founder; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_event
    ADD CONSTRAINT fk_migration_event__founder FOREIGN KEY (founder_person_id) REFERENCES public.person(id);


--
-- Name: generation_scheme generation_scheme_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_scheme
    ADD CONSTRAINT generation_scheme_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(id);


--
-- Name: generation_scheme generation_scheme_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_scheme
    ADD CONSTRAINT generation_scheme_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: generation_word generation_word_scheme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_word
    ADD CONSTRAINT generation_word_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES public.generation_scheme(id);


--
-- Name: import_job import_job_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job
    ADD CONSTRAINT import_job_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(id);


--
-- Name: import_job import_job_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job
    ADD CONSTRAINT import_job_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: import_job import_job_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job
    ADD CONSTRAINT import_job_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: import_job_error import_job_error_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_job_error
    ADD CONSTRAINT import_job_error_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.import_job(id);


--
-- Name: member_role member_role_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: member_role member_role_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.app_user(id);


--
-- Name: member_role member_role_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.clan_membership(id);


--
-- Name: member_role member_role_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.app_user(id);


--
-- Name: operation_log operation_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_log
    ADD CONSTRAINT operation_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.app_user(id);


--
-- Name: operation_log operation_log_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_log
    ADD CONSTRAINT operation_log_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: person person_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(id);


--
-- Name: person person_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: person person_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: person_event person_event_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_event
    ADD CONSTRAINT person_event_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: person_event person_event_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_event
    ADD CONSTRAINT person_event_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: person_event person_event_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person_event
    ADD CONSTRAINT person_event_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(id);


--
-- Name: person person_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.app_user(id);


--
-- Name: relationship relationship_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: relationship relationship_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: relationship relationship_from_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_from_person_id_fkey FOREIGN KEY (from_person_id) REFERENCES public.person(id);


--
-- Name: relationship relationship_to_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship
    ADD CONSTRAINT relationship_to_person_id_fkey FOREIGN KEY (to_person_id) REFERENCES public.person(id);


--
-- Name: review_task review_task_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_task
    ADD CONSTRAINT review_task_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(id);


--
-- Name: review_task review_task_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_task
    ADD CONSTRAINT review_task_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: review_task review_task_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_task
    ADD CONSTRAINT review_task_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.app_user(id);


--
-- Name: review_task review_task_revision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_task
    ADD CONSTRAINT review_task_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES public.revision(id);


--
-- Name: revision revision_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision
    ADD CONSTRAINT revision_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: revision revision_submitter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revision
    ADD CONSTRAINT revision_submitter_id_fkey FOREIGN KEY (submitter_id) REFERENCES public.app_user(id);


--
-- Name: source_attachment source_attachment_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_attachment
    ADD CONSTRAINT source_attachment_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: source_attachment source_attachment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_attachment
    ADD CONSTRAINT source_attachment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: source_attachment source_attachment_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_attachment
    ADD CONSTRAINT source_attachment_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(id);


--
-- Name: source_binding source_binding_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_binding
    ADD CONSTRAINT source_binding_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: source_binding source_binding_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_binding
    ADD CONSTRAINT source_binding_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- Name: source_binding source_binding_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_binding
    ADD CONSTRAINT source_binding_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(id);


--
-- Name: source source_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clan(id);


--
-- Name: source source_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_user(id);


--
-- PostgreSQL database dump complete
--


