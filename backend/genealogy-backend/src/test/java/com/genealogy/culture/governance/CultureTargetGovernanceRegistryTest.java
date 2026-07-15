package com.genealogy.culture.governance;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CultureTargetGovernanceRegistryTest {

    @Test
    void resolvesCanonicalTypeAndPluralAlias() {
        CultureTargetGovernanceAdapter adapter = adapter("culture_item");
        CultureTargetGovernanceRegistry registry = new CultureTargetGovernanceRegistry(List.of(adapter));

        assertThat(registry.supports("culture_item")).isTrue();
        assertThat(registry.supports("culture_items")).isTrue();
        assertThat(registry.normalizeType("culture_items")).isEqualTo("culture_item");
        assertThat(registry.adapters()).containsExactly(adapter);
    }

    @Test
    void rejectsUnknownTypeWithStableErrorCode() {
        CultureTargetGovernanceRegistry registry = new CultureTargetGovernanceRegistry(List.of(adapter("culture_item")));

        assertThatThrownBy(() -> registry.requireAdapter("unknown"))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("CULTURE_TARGET_TYPE_UNSUPPORTED"));
    }

    @Test
    void rejectsDuplicateAliasAtStartup() {
        CultureTargetGovernanceAdapter first = adapter("culture_item");
        CultureTargetGovernanceAdapter duplicate = new StubAdapter("legacy_item", Set.of("culture_items"));

        assertThatThrownBy(() -> new CultureTargetGovernanceRegistry(List.of(first, duplicate)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("duplicate culture target governance adapter alias");
    }

    private CultureTargetGovernanceAdapter adapter(String type) {
        return new StubAdapter(type, Set.of(type, type + "s"));
    }

    private record StubAdapter(String targetType, Set<String> aliases) implements CultureTargetGovernanceAdapter {
        @Override public String viewPermission() { return targetType + ".view"; }
        @Override public String sensitiveViewPermission() { return targetType + ".view_sensitive"; }
        @Override public String restrictedLogSummary() { return "restricted"; }
        @Override public CultureTargetContext requireExisting(Long targetId) { return context(targetId); }
        @Override public CultureTargetContext require(Long targetId, Long actorId, CultureTargetAction action) { return context(targetId); }
        private CultureTargetContext context(Long targetId) {
            return new CultureTargetContext(1L, null, targetType, targetId, targetType, "draft",
                    "clan_only", "normal", 2L, sensitiveViewPermission(), restrictedLogSummary());
        }
    }
}
