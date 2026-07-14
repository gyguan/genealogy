package com.genealogy.imports.domain;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class RelationshipImportTypeDefinition implements ImportTypeDefinition {

    public static final String TYPE = "relationship";

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
        return "RelationshipImportTemplateDefinition";
    }

    @Override
    public String parser() {
        return "RelationshipImportApplicationService#readImport";
    }

    @Override
    public String rowValidator() {
        return "RelationshipImportApplicationService#validateRow";
    }

    @Override
    public String correctionSchema() {
        return "RelationshipImportRowRetryRequest";
    }

    @Override
    public String draftCreator() {
        return "RelationshipImportApplicationService#createDraftRelationship";
    }

    @Override
    public String reviewApplyHandler() {
        return "RevisionApplyService#import_job:relationship";
    }
}
