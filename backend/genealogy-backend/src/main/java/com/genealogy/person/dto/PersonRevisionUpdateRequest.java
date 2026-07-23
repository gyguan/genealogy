package com.genealogy.person.dto;

import com.genealogy.person.event.dto.ReplacePersonEventsRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record PersonRevisionUpdateRequest(
        @NotNull(message = "人物资料不能为空")
        @Valid
        PersonUpdateRequest person,

        @NotNull(message = "关键事件集合不能为空")
        @Valid
        ReplacePersonEventsRequest events
) {
}
