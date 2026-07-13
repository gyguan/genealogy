package com.genealogy.imports.domain;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class PersonImportTypeDefinition implements ImportTypeDefinition {

    public static final String TYPE = "person";

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
        return "PersonImportTemplateDefinition";
    }

    @Override
    public String parser() {
        return "ImportApplicationService#readImport";
    }

    @Override
    public String rowValidator() {
        return "ImportApplicationService#parsePersonRow";
    }

    @Override
    public String correctionSchema() {
        return "PersonImportRowRetryRequest";
    }

    @Override
    public String draftCreator() {
        return "ImportApplicationService#toPerson";
    }

    @Override
    public String reviewApplyHandler() {
        return "RevisionApplyService#import_job";
    }
}
