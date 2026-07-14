# Backend closure diagnostic

Exit status: 1

## Maven errors
[ERROR] Tests run: 2, Failures: 1, Errors: 0, Skipped: 0, Time elapsed: 0.079 s <<< FAILURE! -- in com.genealogy.importexport.controller.CsvImportControllerNamingTest
[ERROR] com.genealogy.importexport.controller.CsvImportControllerNamingTest.personImportRoutesHaveSingleOwners -- Time elapsed: 0.016 s <<< FAILURE!
[ERROR] Tests run: 1, Failures: 1, Errors: 0, Skipped: 0, Time elapsed: 0.003 s <<< FAILURE! -- in com.genealogy.importexport.controller.CsvImportControllerMappingTest
[ERROR] com.genealogy.importexport.controller.CsvImportControllerMappingTest.personImportMappingsDoNotOverlapWithImportJobController -- Time elapsed: 0.003 s <<< FAILURE!
[ERROR] Failures: 
[ERROR]   CsvImportControllerMappingTest.personImportMappingsDoNotOverlapWithImportJobController:29 
[ERROR]   CsvImportControllerNamingTest.personImportRoutesHaveSingleOwners:48 
[ERROR] Tests run: 140, Failures: 2, Errors: 0, Skipped: 1
[ERROR] Failed to execute goal org.apache.maven.plugins:maven-surefire-plugin:3.2.5:test (default-test) on project genealogy-backend: There are test failures.
[ERROR] 
[ERROR] Please refer to /home/runner/work/genealogy/genealogy/backend/genealogy-backend/target/surefire-reports for the individual test results.
[ERROR] Please refer to dump files (if any exist) [date].dump, [date]-jvmRun[N].dump and [date].dumpstream.
[ERROR] -> [Help 1]
[ERROR] 
[ERROR] To see the full stack trace of the errors, re-run Maven with the -e switch.
[ERROR] Re-run Maven using the -X switch to enable full debug logging.
[ERROR] 
[ERROR] For more information about the errors and possible solutions, please read the following articles:
[ERROR] [Help 1] http://cwiki.apache.org/confluence/display/MAVEN/MojoFailureException

## Surefire failures
FAILURE_COUNT=2
FAILURE=com.genealogy.importexport.controller.CsvImportControllerMappingTest#personImportMappingsDoNotOverlapWithImportJobController::
Expecting
  ["/clans/{clanId}/imports/relations/preview",
    "/clans/{clanId}/imports/relations.csv/preview",
    "/clans/{clanId}/imports/relationships",
    "/clans/{clanId}/imports/relationships/preview",
    "/clans/{clanId}/imports/relations",
    "/clans/{clanId}/imports/relations.csv",
    "/clans/{clanId}/imports/persons"]
not to contain
  ["/clans/{clanId}/imports/relationships",
    "/clans/{clanId}/imports/relationships/preview",
    "/clans/{clanId}/imports/persons.csv",
    "/clans/{clanId}/imports/{jobId}/rows/{rowId}/relationship-retry",
    "/clans/{clanId}/imports/{jobId}/rows/{rowId}/retry",
    "/clans/{clanId}/imports/persons/preview",
    "/clans/{clanId}/imports/{jobId}/submit-review"]
but found
  ["/clans/{clanId}/imports/relationships",
    "/clans/{clanId}/imports/relationships/preview"]

FAILURE=com.genealogy.importexport.controller.CsvImportControllerNamingTest#personImportRoutesHaveSingleOwners::
Expecting
  ["/clans/{clanId}/imports/relationships",
    "/clans/{clanId}/imports/relationships/preview",
    "/clans/{clanId}/imports/persons.csv",
    "/clans/{clanId}/imports/{jobId}/rows/{rowId}/relationship-retry",
    "/clans/{clanId}/imports/{jobId}/rows/{rowId}/retry",
    "/clans/{clanId}/imports/persons/preview",
    "/clans/{clanId}/imports/{jobId}/submit-review"]
not to contain
  ["/clans/{clanId}/imports/relations/preview",
    "/clans/{clanId}/imports/relations.csv/preview",
    "/clans/{clanId}/imports/relationships",
    "/clans/{clanId}/imports/relationships/preview",
    "/clans/{clanId}/imports/relations",
    "/clans/{clanId}/imports/relations.csv",
    "/clans/{clanId}/imports/persons"]
but found
  ["/clans/{clanId}/imports/relationships",
    "/clans/{clanId}/imports/relationships/preview"]

