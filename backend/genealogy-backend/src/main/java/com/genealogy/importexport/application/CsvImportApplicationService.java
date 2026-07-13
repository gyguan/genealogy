package com.genealogy.importexport.application;

import com.genealogy.importexport.dto.CsvImportResultResponse;
import com.genealogy.importexport.dto.PersonImportOptions;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CsvImportApplicationService {

    private final PersonCsvApplicationService legacyCsvApplicationService;

    public CsvImportApplicationService(PersonCsvApplicationService legacyCsvApplicationService) {
        this.legacyCsvApplicationService = legacyCsvApplicationService;
    }

    public byte[] buildPersonTemplate() {
        return legacyCsvApplicationService.buildPersonTemplate();
    }

    public byte[] buildRelationTemplate() {
        return legacyCsvApplicationService.buildRelationTemplate();
    }

    public CsvImportResultResponse previewPersons(Long clanId, MultipartFile file, PersonImportOptions options) {
        return legacyCsvApplicationService.previewPersons(clanId, file, options);
    }

    public CsvImportResultResponse importPersons(Long clanId, MultipartFile file, Long actorId, PersonImportOptions options) {
        return legacyCsvApplicationService.importPersons(clanId, file, actorId, options);
    }

    public CsvImportResultResponse previewRelations(Long clanId, MultipartFile file) {
        return legacyCsvApplicationService.previewRelations(clanId, file);
    }

    public CsvImportResultResponse importRelations(Long clanId, MultipartFile file, Long actorId) {
        return legacyCsvApplicationService.importRelations(clanId, file, actorId);
    }
}
