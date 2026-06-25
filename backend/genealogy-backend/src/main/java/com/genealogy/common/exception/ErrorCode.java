package com.genealogy.common.exception;

public enum ErrorCode {

    COMMON_BAD_REQUEST("COMMON_BAD_REQUEST", "请求参数不正确"),
    COMMON_NOT_FOUND("COMMON_NOT_FOUND", "资源不存在"),
    COMMON_NO_PERMISSION("COMMON_NO_PERMISSION", "无操作权限"),
    COMMON_SYSTEM_ERROR("COMMON_SYSTEM_ERROR", "系统异常"),

    CLAN_NOT_FOUND("CLAN_NOT_FOUND", "宗族不存在"),
    BRANCH_NOT_FOUND("BRANCH_NOT_FOUND", "支派不存在"),
    PERSON_NOT_FOUND("PERSON_NOT_FOUND", "人物不存在"),
    RELATIONSHIP_NOT_FOUND("RELATIONSHIP_NOT_FOUND", "人物关系不存在"),
    REVIEW_TASK_NOT_FOUND("REVIEW_TASK_NOT_FOUND", "审核任务不存在"),

    SELF_RELATION_NOT_ALLOWED("SELF_RELATION_NOT_ALLOWED", "不能与自己建立关系"),
    RELATIONSHIP_CYCLE_DETECTED("RELATIONSHIP_CYCLE_DETECTED", "检测到循环关系");

    private final String code;
    private final String message;

    ErrorCode(String code, String message) {
        this.code = code;
        this.message = message;
    }

    public String code() {
        return code;
    }

    public String message() {
        return message;
    }
}
