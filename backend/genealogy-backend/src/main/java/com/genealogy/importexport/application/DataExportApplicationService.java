package com.genealogy.importexport.application;

import org.springframework.stereotype.Service;

@Service
public class DataExportApplicationService {

    private final PersonCsvApplicationService legacyCsvApplicationService;

    public DataExportApplicationService(PersonCsvApplicationService legacyCsvApplicationService) {
        this.legacyCsvApplicationService = legacyCsvApplicationService;
    }

    public byte[] exportPersons(Long clanId) {
        return legacyCsvApplicationService.exportPersons(clanId);
    }

    public byte[] exportPersonsByBranch(Long clanId, Long branchId) {
        return legacyCsvApplicationService.exportPersonsByBranch(clanId, branchId);
    }

    public byte[] exportRelations(Long clanId) {
        return legacyCsvApplicationService.exportRelations(clanId);
    }

    public byte[] exportRelationsByBranch(Long clanId, Long branchId) {
        return legacyCsvApplicationService.exportRelationsByBranch(clanId, branchId);
    }
}
