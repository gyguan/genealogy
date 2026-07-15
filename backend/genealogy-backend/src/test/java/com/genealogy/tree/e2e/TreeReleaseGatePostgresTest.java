package com.genealogy.tree.e2e;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthApplicationService;
import com.genealogy.auth.dto.LoginRequest;
import com.genealogy.auth.repository.AppPermissionRepository;
import com.genealogy.auth.repository.AppRolePermissionRepository;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("tree-e2e")
@EnabledIfEnvironmentVariable(named = "TREE_RELEASE_GATE", matches = "true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class TreeReleaseGatePostgresTest {

    private static final String PASSWORD = "TreeGate!2026";

    @LocalServerPort private int port;
    @Autowired private TestRestTemplate rest;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AuthApplicationService authApplicationService;
    @Autowired private AppUserRepository appUserRepository;
    @Autowired private ClanRepository clanRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private PersonRepository personRepository;
    @Autowired private RelationshipRepository relationshipRepository;
    @Autowired private ClanMembershipRepository membershipRepository;
    @Autowired private MemberRoleRepository memberRoleRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AppPermissionRepository permissionRepository;
    @Autowired private AppRolePermissionRepository rolePermissionRepository;
    @Autowired private SourceRepository sourceRepository;
    @Autowired private SourceBindingRepository sourceBindingRepository;
    @Autowired private RevisionRepository revisionRepository;
    @Autowired private ReviewTaskRepository reviewTaskRepository;

    private TreeReleaseGateFixture.Seed seed;
    private String viewerToken;
    private String branchLeadToken;
    private String editorToken;

    @BeforeAll
    void seedAndLogin() {
        seed = new TreeReleaseGateFixture(
                appUserRepository,
                clanRepository,
                branchRepository,
                personRepository,
                relationshipRepository,
                membershipRepository,
                memberRoleRepository,
                roleRepository,
                permissionRepository,
                rolePermissionRepository,
                sourceRepository,
                sourceBindingRepository,
                revisionRepository,
                reviewTaskRepository
        ).seed();
        viewerToken = login("tree_viewer");
        branchLeadToken = login("tree_branch_lead");
        editorToken = login("tree_editor");
    }

    @Test
    @Order(1)
    void appliesRoleBranchPrivacyAndEditingProjectionAgainstPostgres() throws Exception {
        JsonNode viewerGraph = data(get("/api/v1/tree/person/" + seed.founderId() + "?direction=both&maxDepth=3", viewerToken));
        assertEquals("official", viewerGraph.path("dataView").asText());
        assertFalse(viewerGraph.toString().contains("封存秘名"));
        assertFalse(viewerGraph.toString().contains("在世私密"));
        for (JsonNode node : viewerGraph.path("nodes")) {
            if ("masked".equals(node.path("visibility").asText())) {
                assertTrue(node.path("personId").isMissingNode() || node.path("personId").isNull());
                assertTrue(node.path("evidenceSummary").isMissingNode() || node.path("evidenceSummary").isNull());
                assertTrue(node.path("reviewSummary").isMissingNode() || node.path("reviewSummary").isNull());
                assertTrue(node.path("anomalySummary").isMissingNode() || node.path("anomalySummary").isNull());
            }
        }
        JsonNode viewerRoot = findNodeByPersonId(viewerGraph, seed.founderId());
        assertNotNull(viewerRoot);
        assertTrue(viewerRoot.path("evidenceSummary").isMissingNode() || viewerRoot.path("evidenceSummary").isNull());

        ResponseEntity<String> branchAllowed = getRaw(
                "/api/v1/tree/clans/" + seed.clanId() + "/branches/" + seed.branchAId() + "/lineage",
                branchLeadToken
        );
        assertEquals(200, branchAllowed.getStatusCode().value());
        ResponseEntity<String> branchDenied = getRaw(
                "/api/v1/tree/clans/" + seed.clanId() + "/branches/" + seed.branchBId() + "/lineage",
                branchLeadToken
        );
        assertTrue(Set.of(403, 404).contains(branchDenied.getStatusCode().value()));

        ResponseEntity<String> viewerEditing = getRaw(
                "/api/v1/tree/person/" + seed.founderId() + "?direction=both&dataView=editing",
                viewerToken
        );
        assertEquals(403, viewerEditing.getStatusCode().value());
        JsonNode editorEditing = data(get(
                "/api/v1/tree/person/" + seed.founderId() + "?direction=both&dataView=editing&maxDepth=2",
                editorToken
        ));
        assertTrue(editorEditing.toString().contains("编辑态人物"));
        JsonNode editorRoot = findNodeByPersonId(editorEditing, seed.founderId());
        assertNotNull(editorRoot);
        assertFalse(editorRoot.path("evidenceSummary").isMissingNode());
        assertFalse(editorRoot.path("reviewSummary").isMissingNode());
        assertFalse(editorRoot.path("anomalySummary").isMissingNode());
    }

    @Test
    @Order(2)
    void preservesDAGSemanticsCyclesDuplicatesAndCapacityMetadata() throws Exception {
        JsonNode childGraph = data(get(
                "/api/v1/tree/person/" + seed.multiParentChildId() + "?direction=ancestors&maxDepth=3",
                editorToken
        ));
        Set<String> incomingCategories = new HashSet<>();
        int childCount = 0;
        String childNodeId = null;
        for (JsonNode node : childGraph.path("nodes")) {
            if (node.path("personId").asLong(-1) == seed.multiParentChildId()) {
                childCount++;
                childNodeId = node.path("nodeId").asText();
            }
        }
        assertEquals(1, childCount);
        for (JsonNode edge : childGraph.path("edges")) {
            if (edge.path("toNodeId").asText().equals(childNodeId)) {
                incomingCategories.add(edge.path("relationCategory").asText());
            }
        }
        assertTrue(incomingCategories.contains("blood"));
        assertTrue(incomingCategories.contains("ritual"));

        JsonNode cycleGraph = data(get(
                "/api/v1/tree/person/" + seed.cycleRootId() + "?direction=descendants&maxDepth=8",
                editorToken
        ));
        assertTrue(cycleGraph.path("meta").path("cycleDetected").asBoolean()
                || containsWarning(cycleGraph, "cycle_detected"));
        assertEquals(cycleGraph.path("nodes").size(), uniqueValues(cycleGraph.path("nodes"), "nodeId").size());
        assertEquals(cycleGraph.path("edges").size(), uniqueValues(cycleGraph.path("edges"), "edgeId").size());

        JsonNode limited = data(get(
                "/api/v1/tree/clans/" + seed.clanId() + "/branches/" + seed.branchAId()
                        + "/lineage?maxDepth=8&maxNodes=25&maxEdges=30",
                editorToken
        ));
        assertTrue(limited.path("meta").path("truncated").asBoolean());
        assertTrue(limited.path("meta").path("nodeCount").asInt() <= 25);
        assertTrue(limited.path("meta").path("edgeCount").asInt() <= 30);
        assertFalse(limited.path("meta").path("truncationReasons").isEmpty());
    }

    @Test
    @Order(3)
    void searchesBeyondHistoricalPreloadLimitAndKeepsResponseBounded() throws Exception {
        PersonEntity target = personRepository.findByClanIdAndDeletedAtIsNull(seed.clanId()).stream()
                .filter(person -> "准出人物129".equals(person.getName()))
                .findFirst()
                .orElseThrow();
        target.setPersonCode("TREE-GATE-129");
        personRepository.saveAndFlush(target);

        JsonNode page = data(get(
                "/api/v1/persons/search?clanId=" + seed.clanId()
                        + "&keyword=TREE-GATE-129&pageNo=1&pageSize=20",
                viewerToken
        ));
        assertTrue(
                page.path("records").toString().contains("准出人物129"),
                () -> "Expected the 129th synthetic person in server-side search: " + page.toPrettyString()
        );
        assertTrue(page.path("pageSize").asInt() <= 20, page.toPrettyString());
    }

    private String login(String username) {
        return authApplicationService.loginSession(
                new LoginRequest(username, PASSWORD),
                "127.0.0.1",
                "tree-release-gate"
        ).sessionToken();
    }

    private ResponseEntity<String> getRaw(String path, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return rest.exchange(
                "http://127.0.0.1:" + port + path,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );
    }

    private String get(String path, String token) {
        ResponseEntity<String> response = getRaw(path, token);
        assertEquals(200, response.getStatusCode().value(), response.getBody());
        return response.getBody();
    }

    private JsonNode data(String body) throws Exception {
        JsonNode root = objectMapper.readTree(body);
        assertTrue(root.path("success").asBoolean(), body);
        return root.path("data");
    }

    private JsonNode findNodeByPersonId(JsonNode graph, Long personId) {
        for (JsonNode node : graph.path("nodes")) {
            if (node.path("personId").asLong(-1) == personId) return node;
        }
        return null;
    }

    private boolean containsWarning(JsonNode graph, String code) {
        for (JsonNode warning : graph.path("warnings")) {
            if (code.equals(warning.path("code").asText())) return true;
        }
        return false;
    }

    private Set<String> uniqueValues(JsonNode array, String field) {
        Set<String> values = new HashSet<>();
        array.forEach(item -> values.add(item.path(field).asText()));
        return values;
    }
}
