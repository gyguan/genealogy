package com.genealogy.culture.dto;

import java.util.List;

public record CultureItemPageResponse(
        List<CultureItemSummaryResponse> items,
        CulturePageMetadata page
) {
    public CultureItemPageResponse {
        items = items == null ? List.of() : List.copyOf(items);
    }
}
