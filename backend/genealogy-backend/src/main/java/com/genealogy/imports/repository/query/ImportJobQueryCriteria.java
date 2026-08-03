package com.genealogy.imports.repository.query;
public record ImportJobQueryCriteria(Long clanId, Long branchId, String status, String importType, String fileFormat) {}
