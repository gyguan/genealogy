package com.genealogy.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(
        packages = "com.genealogy",
        importOptions = ImportOption.DoNotIncludeTests.class
)
class BackendArchitectureTest {

    @ArchTest
    static final ArchRule controllers_must_not_access_repositories = noClasses()
            .that().resideInAnyPackage("..controller..")
            .should().dependOnClassesThat().resideInAnyPackage("..repository..")
            .because("controllers must delegate to application services instead of bypassing use-case boundaries");

    @ArchTest
    static final ArchRule repositories_must_not_depend_on_application = noClasses()
            .that().resideInAnyPackage("..repository..")
            .should().dependOnClassesThat().resideInAnyPackage("..application..")
            .because("data access must not depend on orchestration logic");

    @ArchTest
    static final ArchRule application_must_not_depend_on_controllers = noClasses()
            .that().resideInAnyPackage("..application..")
            .should().dependOnClassesThat().resideInAnyPackage("..controller..")
            .because("application services must remain independent of HTTP adapters");

    @ArchTest
    static final ArchRule domain_must_not_depend_on_web_or_persistence_adapters = noClasses()
            .that().resideInAnyPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage("..controller..", "..repository..")
            .because("domain rules must not depend on delivery or persistence adapters");
}
