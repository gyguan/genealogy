package com.genealogy.culture.dto;

import java.util.List;

public record CultureSitePageResponse(
        List<CultureSiteSummaryResponse> items,
        CulturePageMetadata page
) {}
