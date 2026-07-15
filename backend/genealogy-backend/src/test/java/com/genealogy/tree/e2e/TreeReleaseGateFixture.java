package com.genealogy.tree.e2e;

import com.genealogy.auth.entity.AppPermissionEntity;
import com.genealogy.auth.entity.AppRolePermissionEntity;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppPermissionRepository;
import com.genealogy.auth.repository.AppRolePermissionRepository;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.auth.security.PasswordHashUtil;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

final class TreeReleaseGateFixture {

    private static final String PASSWORD = "TreeGate!2026";
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_OFFICIAL = "official";

    private final AppUserRepository appUserRepository;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final ClanMembershipRepository membershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final RoleRepository roleRepository;
    private final AppPermissionRepository permissionRepository;
    private final AppRolePermissionRepository rolePermissionRepository;
    private final SourceRepository sourceRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;

    TreeReleaseGateFixture(
            AppUserRepository appUserRepository,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            ClanMembershipRepository membershipRepository,
            MemberRoleRepository memberRoleRepository,
            RoleRepository roleRepository,
            AppPermissionRepository permissionRepository,
            AppRolePermissionRepository rolePermissionRepository,
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository
    ) {
        this.appUserRepository = appUserRepository;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.membershipRepository = membershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.sourceRepository = sourceRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
    }

    Seed seed() {
        LocalDateTime now = LocalDateTime.now();
        AppUserEntity viewer = user("tree_viewer", "普通成员", now);
        AppUserEntity branchLead = user("tree_branch_lead", "支派负责人", now);
        AppUserEntity editor = user("tree_editor", "主编", now);

        ClanEntity clan = new ClanEntity();
        clan.setClanCode("TREE-GATE");
        clan.setClanName("准出宗族");
        clan.setSurname("测");
        clan.setStatus(STATUS_ACTIVE);
        clan.setCreatedBy(editor.getId());
        clan.setCreatedAt(now);
        clan.setUpdatedAt(now);
        clan = clanRepository.save(clan);

        BranchEntity branchA = branch(clan.getId(), null, "长房", "准出宗族/长房", 1, 1, now);
        BranchEntity branchAChild = branch(clan.getId(), branchA.getId(), "长房下支", "准出宗族/长房/下支", 2, 1, now);
        BranchEntity branchB = branch(clan.getId(), null, "二房", "准出宗族/二房", 1, 2, now);

        PersonEntity founder = person(clan.getId(), branchA.getId(), "准出始祖", 1, "启", "public", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity spouse = person(clan.getId(), branchA.getId(), "始祖配偶", 1, null, "clan_only", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity ritualParent = person(clan.getId(), branchAChild.getId(), "承嗣父", 1, "启", "clan_only", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity child = person(clan.getId(), branchA.getId(), "多父承嗣子", 2, "承", "clan_only", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity privatePerson = person(clan.getId(), branchA.getId(), "私密真名", 2, "承", "private", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity livingPerson = person(clan.getId(), branchA.getId(), "在世私密", 2, "承", "branch_only", STATUS_OFFICIAL, true, editor.getId(), now);
        PersonEntity relativesPerson = person(clan.getId(), branchA.getId(), "亲属可见真名", 2, "承", "relatives_only", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity sealedPerson = person(clan.getId(), branchA.getId(), "封存秘名", 2, "承", "sealed", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity draftPerson = person(clan.getId(), branchA.getId(), "编辑态人物", 2, "承", "clan_only", "draft", false, editor.getId(), now);
        person(clan.getId(), branchB.getId(), "二房人物", 2, "承", "clan_only", STATUS_OFFICIAL, false, editor.getId(), now);
        person(clan.getId(), branchA.getId(), "孤立人物", 8, null, "clan_only", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity cycleA = person(clan.getId(), branchA.getId(), "环甲", 5, "循", "clan_only", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity cycleB = person(clan.getId(), branchA.getId(), "环乙", 6, "循", "clan_only", STATUS_OFFICIAL, false, editor.getId(), now);
        PersonEntity cycleC = person(clan.getId(), branchA.getId(), "环丙", 7, "循", "clan_only", STATUS_OFFICIAL, false, editor.getId(), now);

        branchA.setFounderPersonId(founder.getId());
        branchRepository.save(branchA);
        clan.setAncestorPersonId(founder.getId());
        clanRepository.save(clan);

        List<PersonEntity> bulk = new ArrayList<>();
        for (int index = 1; index <= 130; index++) {
            bulk.add(person(
                    clan.getId(),
                    branchA.getId(),
                    String.format("准出人物%03d", index),
                    2,
                    "承",
                    "clan_only",
                    STATUS_OFFICIAL,
                    false,
                    editor.getId(),
                    now
            ));
        }

        List<RelationshipEntity> relationships = new ArrayList<>();
        relationships.add(relationship(clan.getId(), founder.getId(), spouse.getId(), "spouse", "配偶", "marriage", null, false, false, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), founder.getId(), child.getId(), "parent_child", "亲子", "blood", null, true, true, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), ritualParent.getId(), child.getId(), "successor", "承嗣", "ritual", "successor", true, false, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), founder.getId(), privatePerson.getId(), "parent_child", "亲子", "blood", null, true, true, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), founder.getId(), livingPerson.getId(), "parent_child", "亲子", "blood", null, true, true, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), founder.getId(), relativesPerson.getId(), "in_adoption", "入继", "ritual", "in_adoption", true, false, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), founder.getId(), sealedPerson.getId(), "out_adoption", "出嗣", "ritual", "out_adoption", true, false, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), founder.getId(), draftPerson.getId(), "dual_successor", "兼祧", "ritual", "dual_successor", true, false, true, "draft", editor.getId(), now));
        relationships.add(relationship(clan.getId(), cycleA.getId(), cycleB.getId(), "parent_child", "亲子", "blood", null, true, true, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), cycleB.getId(), cycleC.getId(), "parent_child", "亲子", "blood", null, true, true, true, STATUS_OFFICIAL, editor.getId(), now));
        relationships.add(relationship(clan.getId(), cycleC.getId(), cycleA.getId(), "parent_child", "亲子", "blood", null, true, true, true, STATUS_OFFICIAL, editor.getId(), now));
        for (PersonEntity person : bulk) {
            relationships.add(relationship(clan.getId(), founder.getId(), person.getId(), "parent_child", "亲子", "blood", null, true, true, true, STATUS_OFFICIAL, editor.getId(), now));
        }
        relationships.add(relationship(clan.getId(), founder.getId(), bulk.get(0).getId(), "parent_child", "亲子", "blood", null, true, true, true, STATUS_OFFICIAL, editor.getId(), now));
        relationshipRepository.saveAll(relationships);

        addEvidenceAndReview(clan.getId(), founder.getId(), editor.getId(), now);

        RoleEntity viewerRole = role(
                "tree_release_viewer",
                "准出普通成员",
                Set.of("clan.view", "branch.view", "person.view", "relationship.view"),
                now
        );
        RoleEntity branchRole = role(
                "tree_release_branch_lead",
                "准出支派负责人",
                Set.of("clan.view", "branch.view", "person.view", "relationship.view"),
                now
        );
        RoleEntity editorRole = role(
                "tree_release_editor",
                "准出主编",
                Set.of(
                        "clan.view",
                        "branch.view",
                        "person.view",
                        "relationship.view",
                        "person.update",
                        "relationship.update",
                        "source.view",
                        "review_task.view",
                        "workbench.view"
                ),
                now
        );
        grant(clan.getId(), viewer, viewerRole, MemberRoleScopeType.clan, clan.getId(), now);
        grant(clan.getId(), branchLead, branchRole, MemberRoleScopeType.branch_subtree, branchA.getId(), now);
        grant(clan.getId(), editor, editorRole, MemberRoleScopeType.clan, clan.getId(), now);

        return new Seed(
                clan.getId(),
                branchA.getId(),
                branchB.getId(),
                founder.getId(),
                child.getId(),
                cycleA.getId()
        );
    }

    private AppUserEntity user(String username, String displayName, LocalDateTime now) {
        AppUserEntity user = new AppUserEntity();
        user.setUsername(username);
        user.setPasswordHash(PasswordHashUtil.hash(PASSWORD));
        user.setDisplayName(displayName);
        user.setStatus(STATUS_ACTIVE);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return appUserRepository.save(user);
    }

    private BranchEntity branch(
            Long clanId,
            Long parentId,
            String name,
            String path,
            int level,
            int order,
            LocalDateTime now
    ) {
        BranchEntity branch = new BranchEntity();
        branch.setClanId(clanId);
        branch.setParentId(parentId);
        branch.setBranchName(name);
        branch.setBranchPath(path);
        branch.setLevel(level);
        branch.setSortOrder(order);
        branch.setStatus(STATUS_OFFICIAL);
        branch.setCreatedAt(now);
        branch.setUpdatedAt(now);
        return branchRepository.save(branch);
    }

    private PersonEntity person(
            Long clanId,
            Long branchId,
            String name,
            Integer generation,
            String word,
            String privacy,
            String status,
            boolean living,
            Long actorId,
            LocalDateTime now
    ) {
        PersonEntity person = new PersonEntity();
        person.setClanId(clanId);
        person.setBranchId(branchId);
        person.setName(name);
        person.setGenealogyName(name + "谱名");
        person.setGender("male");
        person.setGenerationNo(generation);
        person.setGenerationWord(word);
        person.setIsLiving(living);
        person.setHasDescendant(true);
        person.setLineageStatus("normal");
        person.setPrivacyLevel(privacy);
        person.setDataStatus(status);
        person.setCreatedBy(actorId);
        person.setCreatedAt(now);
        person.setUpdatedBy(actorId);
        person.setUpdatedAt(now);
        return personRepository.save(person);
    }

    private RelationshipEntity relationship(
            Long clanId,
            Long from,
            Long to,
            String type,
            String label,
            String category,
            String ritualType,
            boolean lineage,
            boolean biological,
            boolean primary,
            String status,
            Long actorId,
            LocalDateTime now
    ) {
        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setClanId(clanId);
        relationship.setFromPersonId(from);
        relationship.setToPersonId(to);
        relationship.setRelationType(type);
        relationship.setRelationLabel(label);
        relationship.setRelationCategory(category);
        relationship.setRitualRelationType(ritualType);
        relationship.setIsLineageRelation(lineage);
        relationship.setIsBiological(biological);
        relationship.setIsPrimary(primary);
        relationship.setConfidenceLevel("high");
        relationship.setDataStatus(status);
        relationship.setCreatedBy(actorId);
        relationship.setCreatedAt(now);
        relationship.setUpdatedAt(now);
        return relationship;
    }

    private void addEvidenceAndReview(Long clanId, Long founderId, Long editorId, LocalDateTime now) {
        SourceEntity source = new SourceEntity();
        source.setClanId(clanId);
        source.setSourceName("准出族谱卷一");
        source.setSourceType("genealogy_book");
        source.setVerificationStatus(STATUS_OFFICIAL);
        source.setConfidenceLevel("high");
        source.setPrivacyLevel("clan_only");
        source.setSensitiveLevel("normal");
        source.setCreatedBy(editorId);
        source.setCreatedAt(now);
        source.setUpdatedAt(now);
        source = sourceRepository.save(source);

        SourceBindingEntity binding = new SourceBindingEntity();
        binding.setClanId(clanId);
        binding.setSourceId(source.getId());
        binding.setTargetType("person");
        binding.setTargetId(founderId);
        binding.setBindingReason("准出证据");
        binding.setConfidenceLevel("high");
        binding.setBindingStatus(STATUS_OFFICIAL);
        binding.setCreatedBy(editorId);
        binding.setCreatedAt(now);
        binding.setUpdatedAt(now);
        sourceBindingRepository.save(binding);

        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(clanId);
        revision.setTargetType("person");
        revision.setTargetId(founderId);
        revision.setChangeType("update");
        revision.setSubmitterId(editorId);
        revision.setSubmitTime(now);
        revision.setStatus("pending");
        revision = revisionRepository.save(revision);

        ReviewTaskEntity reviewTask = new ReviewTaskEntity();
        reviewTask.setClanId(clanId);
        reviewTask.setRevisionId(revision.getId());
        reviewTask.setReviewLevel(1);
        reviewTask.setStatus("pending");
        reviewTask.setCreatedAt(now);
        reviewTaskRepository.save(reviewTask);
    }

    private RoleEntity role(String code, String name, Set<String> permissionCodes, LocalDateTime now) {
        RoleEntity role = new RoleEntity();
        role.setRoleCode(code);
        role.setRoleName(name);
        role.setDescription("Tree release gate synthetic role");
        role.setSystemRole(false);
        role.setCreatedAt(now);
        role.setUpdatedAt(now);
        role = roleRepository.save(role);

        for (String permissionCode : permissionCodes) {
            AppPermissionEntity permission = permissionRepository
                    .findByPermissionCodeAndStatus(permissionCode, STATUS_ACTIVE)
                    .orElseThrow(() -> new IllegalStateException("Missing active permission: " + permissionCode));
            AppRolePermissionEntity rolePermission = new AppRolePermissionEntity();
            rolePermission.setRoleId(role.getId());
            rolePermission.setPermissionId(permission.getId());
            rolePermission.setEffect("allow");
            rolePermission.setStatus(STATUS_ACTIVE);
            rolePermission.setCreatedAt(now);
            rolePermission.setUpdatedAt(now);
            rolePermissionRepository.save(rolePermission);
        }
        return role;
    }

    private void grant(
            Long clanId,
            AppUserEntity user,
            RoleEntity role,
            MemberRoleScopeType scopeType,
            Long scopeId,
            LocalDateTime now
    ) {
        ClanMembershipEntity membership = new ClanMembershipEntity();
        membership.setClanId(clanId);
        membership.setUserId(user.getId());
        membership.setJoinStatus("joined");
        membership.setMemberStatus(MemberStatus.active);
        membership.setJoinedAt(now);
        membership.setCreatedBy(user.getId());
        membership.setCreatedAt(now);
        membership.setUpdatedBy(user.getId());
        membership.setUpdatedAt(now);
        membership = membershipRepository.save(membership);

        MemberRoleEntity memberRole = new MemberRoleEntity();
        memberRole.setMembershipId(membership.getId());
        memberRole.setRoleId(role.getId());
        memberRole.setScopeType(scopeType);
        memberRole.setScopeId(scopeId);
        memberRole.setStatus(STATUS_ACTIVE);
        memberRole.setGrantedBy(user.getId());
        memberRole.setGrantedAt(now);
        memberRole.setCreatedBy(user.getId());
        memberRole.setCreatedAt(now);
        memberRole.setUpdatedBy(user.getId());
        memberRole.setUpdatedAt(now);
        memberRoleRepository.save(memberRole);
    }

    record Seed(
            Long clanId,
            Long branchAId,
            Long branchBId,
            Long founderId,
            Long multiParentChildId,
            Long cycleRootId
    ) {
    }
}
