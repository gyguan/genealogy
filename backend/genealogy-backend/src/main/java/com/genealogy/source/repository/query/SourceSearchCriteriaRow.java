package com.genealogy.source.repository.query;
public record SourceSearchCriteriaRow(Long clanId,String keyword,String sourceType,String verificationStatus,String privacyLevel,String targetType,Boolean hasAttachment,Boolean hasBinding,String sortKey) {}
