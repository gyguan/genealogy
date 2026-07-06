package com.genealogy.person.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "genealogy.person-code")
public class PersonCodeRuleProperties {

    /**
     * Supported placeholders: {clanCode}, {branchCode}, {generationNo}, {rank}, {seq}.
     */
    private String pattern = "{clanCode}-{branchCode}-G{generationNo}-R{rank}-{seq}";

    private int branchWidth = 3;
    private int generationWidth = 2;
    private int sequenceWidth = 4;
    private String unknownGeneration = "00";
    private String unknownRank = "00";

    public String getPattern() {
        return pattern;
    }

    public void setPattern(String pattern) {
        this.pattern = pattern;
    }

    public int getBranchWidth() {
        return branchWidth;
    }

    public void setBranchWidth(int branchWidth) {
        this.branchWidth = branchWidth;
    }

    public int getGenerationWidth() {
        return generationWidth;
    }

    public void setGenerationWidth(int generationWidth) {
        this.generationWidth = generationWidth;
    }

    public int getSequenceWidth() {
        return sequenceWidth;
    }

    public void setSequenceWidth(int sequenceWidth) {
        this.sequenceWidth = sequenceWidth;
    }

    public String getUnknownGeneration() {
        return unknownGeneration;
    }

    public void setUnknownGeneration(String unknownGeneration) {
        this.unknownGeneration = unknownGeneration;
    }

    public String getUnknownRank() {
        return unknownRank;
    }

    public void setUnknownRank(String unknownRank) {
        this.unknownRank = unknownRank;
    }
}
