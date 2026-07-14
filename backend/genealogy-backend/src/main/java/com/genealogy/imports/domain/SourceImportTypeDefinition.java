package com.genealogy.imports.domain;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class SourceImportTypeDefinition implements ImportTypeDefinition {

    public static final String TYPE = "source";

    @Override
    public String importType() {
        return TYPE;
    }

    @Override
    public Set<String> supportedFormats() {
        return Set.of(ImportJobDescriptor.FORMAT_CSV, ImportJobDescriptor.FORMAT_XLSX);
    }

    @Override
    public String templateDefinition() {
        return "SourceImportTemplateDefinition";
    }

    @Override
    public String parser() {
        return "SourceImportApplicationService#readImport";
    }

    @Override
    public String rowValidator() {
        return "SourceImportApplicationService#validateRow";
    }

    @Override
    public String correctionSchema() {
        return "SourceImportRowRetryRequest";
    }

    @Override
    public String draftCreator() {
        return "SourceImportApplicationService#createDraftSource";
    }

    @Override
    public String reviewApplyHandler() {
        return "RevisionApplyService#import_job:source";
    }
}
