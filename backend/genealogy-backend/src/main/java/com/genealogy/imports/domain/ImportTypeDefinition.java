package com.genealogy.imports.domain;

import java.util.Set;

/**
 * Metadata contract for one import business type.
 *
 * <p>The named extension points document which parser, validator, correction schema,
 * draft creator and review apply handler own the type. New import types must register
 * one definition instead of adding type branches across controllers and pages.</p>
 */
public interface ImportTypeDefinition {

    String importType();

    Set<String> supportedFormats();

    String templateDefinition();

    String parser();

    String rowValidator();

    String correctionSchema();

    String draftCreator();

    String reviewApplyHandler();

    default boolean supports(String fileFormat) {
        return supportedFormats().contains(fileFormat);
    }
}
