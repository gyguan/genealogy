package com.genealogy.common.exception;

public class BusinessException extends RuntimeException {

    private final String code;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.message());
        this.code = errorCode.code();
    }

    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
