package com.genealogy.importexport.dto;

public class PersonImportOptions {

    private Boolean autoMapping = true;
    private Integer nameIndex;
    private Integer genderIndex;
    private Integer generationNoIndex;
    private Integer generationWordIndex;
    private Integer branchIdIndex;
    private Integer birthDateIndex;
    private Integer isLivingIndex;
    private Long branchId;
    private Boolean confirmDuplicates = false;

    public Boolean getAutoMapping() {
        return autoMapping;
    }

    public void setAutoMapping(Boolean autoMapping) {
        this.autoMapping = autoMapping;
    }

    public Integer getNameIndex() {
        return nameIndex;
    }

    public void setNameIndex(Integer nameIndex) {
        this.nameIndex = nameIndex;
    }

    public Integer getGenderIndex() {
        return genderIndex;
    }

    public void setGenderIndex(Integer genderIndex) {
        this.genderIndex = genderIndex;
    }

    public Integer getGenerationNoIndex() {
        return generationNoIndex;
    }

    public void setGenerationNoIndex(Integer generationNoIndex) {
        this.generationNoIndex = generationNoIndex;
    }

    public Integer getGenerationWordIndex() {
        return generationWordIndex;
    }

    public void setGenerationWordIndex(Integer generationWordIndex) {
        this.generationWordIndex = generationWordIndex;
    }

    public Integer getBranchIdIndex() {
        return branchIdIndex;
    }

    public void setBranchIdIndex(Integer branchIdIndex) {
        this.branchIdIndex = branchIdIndex;
    }

    public Integer getBirthDateIndex() {
        return birthDateIndex;
    }

    public void setBirthDateIndex(Integer birthDateIndex) {
        this.birthDateIndex = birthDateIndex;
    }

    public Integer getIsLivingIndex() {
        return isLivingIndex;
    }

    public void setIsLivingIndex(Integer isLivingIndex) {
        this.isLivingIndex = isLivingIndex;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Boolean getConfirmDuplicates() {
        return confirmDuplicates;
    }

    public void setConfirmDuplicates(Boolean confirmDuplicates) {
        this.confirmDuplicates = confirmDuplicates;
    }

    public boolean autoMappingEnabled() {
        return !Boolean.FALSE.equals(autoMapping);
    }

    public boolean confirmDuplicatesEnabled() {
        return Boolean.TRUE.equals(confirmDuplicates);
    }
}
