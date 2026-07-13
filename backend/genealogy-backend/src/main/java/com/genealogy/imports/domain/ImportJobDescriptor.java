package com.genealogy.imports.domain;

import java.util.Locale;

/**
 * Normalizes the import business type and physical file format.
 *
 * <p>During the compatibility window, legacy combined values such as
 * {@code person_csv} and {@code person_xlsx} are accepted and split.</p>
 */
public record ImportJobDescriptor(String importType, String fileFormat) {

    public static final String FORMAT_CSV = "csv";
    public static final String FORMAT_XLSX = "xlsx";

    public ImportJobDescriptor {
        importType = normalizeBusinessType(importType);
        fileFormat = normalizeFormat(fileFormat);
    }

    public static ImportJobDescriptor resolve(String importType, String fileFormat, String filename) {
        String normalizedType = normalize(importType);
        String normalizedFormat = normalize(fileFormat);

        if (normalizedType.endsWith("_csv")) {
            normalizedType = normalizedType.substring(0, normalizedType.length() - 4);
            if (normalizedFormat.isBlank()) {
                normalizedFormat = FORMAT_CSV;
            }
        } else if (normalizedType.endsWith("_xlsx")) {
            normalizedType = normalizedType.substring(0, normalizedType.length() - 5);
            if (normalizedFormat.isBlank()) {
                normalizedFormat = FORMAT_XLSX;
            }
        }

        if (normalizedType.isBlank()) {
            normalizedType = "person";
        }
        if (normalizedFormat.isBlank()) {
            normalizedFormat = inferFormat(filename);
        }
        return new ImportJobDescriptor(normalizedType, normalizedFormat);
    }

    public static ImportJobDescriptor fromFilter(String importType, String fileFormat) {
        if (isBlank(importType) && isBlank(fileFormat)) {
            return new ImportJobDescriptor("", "");
        }
        return resolve(importType, fileFormat, null);
    }

    public String legacyImportType() {
        if (importType.isBlank() || fileFormat.isBlank()) {
            return null;
        }
        return importType + "_" + fileFormat;
    }

    public boolean hasImportType() {
        return !importType.isBlank();
    }

    public boolean hasFileFormat() {
        return !fileFormat.isBlank();
    }

    private static String normalizeBusinessType(String value) {
        return normalize(value);
    }

    private static String normalizeFormat(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return normalized;
        }
        if (!FORMAT_CSV.equals(normalized) && !FORMAT_XLSX.equals(normalized)) {
            throw new IllegalArgumentException("unsupported import file format: " + value);
        }
        return normalized;
    }

    private static String inferFormat(String filename) {
        String normalized = normalize(filename);
        return normalized.endsWith(".xlsx") ? FORMAT_XLSX : FORMAT_CSV;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
