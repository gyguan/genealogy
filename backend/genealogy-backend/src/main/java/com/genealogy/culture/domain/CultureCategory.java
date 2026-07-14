package com.genealogy.culture.domain;

public enum CultureCategory implements CultureValue {
    SURNAME_ORIGIN("surname_origin"),
    HALL_NAME("hall_name"),
    COMMANDERY("commandery"),
    FAMILY_INSTRUCTION("family_instruction"),
    ANCESTOR_INSTRUCTION("ancestor_instruction"),
    CLAN_RULE("clan_rule"),
    GENEALOGY_PREFACE("genealogy_preface"),
    GENEALOGY_RULE("genealogy_rule"),
    PERSON_STORY("person_story"),
    CUSTOM_TRADITION("custom_tradition"),
    OTHER("other");

    private final String value;

    CultureCategory(String value) {
        this.value = value;
    }

    @Override
    public String value() {
        return value;
    }

    public static CultureCategory fromValue(String value) {
        return CultureValue.fromValue(CultureCategory.class, value);
    }
}
