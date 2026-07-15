package com.genealogy.culture.governance;

import com.genealogy.common.exception.BusinessException;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CultureTargetGovernanceRegistry {

    private final Map<String, CultureTargetGovernanceAdapter> adapters;
    private final List<CultureTargetGovernanceAdapter> canonicalAdapters;

    public CultureTargetGovernanceRegistry(List<CultureTargetGovernanceAdapter> registeredAdapters) {
        Map<String, CultureTargetGovernanceAdapter> values = new LinkedHashMap<>();
        Map<String, CultureTargetGovernanceAdapter> canonical = new LinkedHashMap<>();
        for (CultureTargetGovernanceAdapter adapter : registeredAdapters) {
            String canonicalType = normalize(adapter.targetType());
            if (canonical.putIfAbsent(canonicalType, adapter) != null) {
                throw new IllegalStateException("duplicate culture target governance adapter: " + canonicalType);
            }
            for (String alias : adapter.aliases()) {
                String normalized = normalize(alias);
                CultureTargetGovernanceAdapter previous = values.putIfAbsent(normalized, adapter);
                if (previous != null && previous != adapter) {
                    throw new IllegalStateException("duplicate culture target governance adapter alias: " + normalized);
                }
            }
        }
        this.adapters = Map.copyOf(values);
        this.canonicalAdapters = List.copyOf(canonical.values());
    }

    public List<CultureTargetGovernanceAdapter> adapters() {
        return canonicalAdapters;
    }

    public boolean supports(String targetType) {
        return adapters.containsKey(normalize(targetType));
    }

    public Optional<CultureTargetGovernanceAdapter> find(String targetType) {
        return Optional.ofNullable(adapters.get(normalize(targetType)));
    }

    public CultureTargetGovernanceAdapter requireAdapter(String targetType) {
        return find(targetType).orElseThrow(() -> new BusinessException(
                "CULTURE_TARGET_TYPE_UNSUPPORTED",
                "不支持的宗族文化对象类型"
        ));
    }

    public CultureTargetContext requireExisting(Long clanId, String targetType, Long targetId) {
        CultureTargetContext context = requireAdapter(targetType).requireExisting(targetId);
        requireClan(clanId, context);
        return context;
    }

    public CultureTargetContext require(Long clanId, String targetType, Long targetId, Long actorId, CultureTargetAction action) {
        CultureTargetContext context = requireAdapter(targetType).require(targetId, actorId, action);
        requireClan(clanId, context);
        return context;
    }

    public String normalizeType(String targetType) {
        CultureTargetGovernanceAdapter adapter = adapters.get(normalize(targetType));
        return adapter == null ? normalize(targetType) : adapter.targetType();
    }

    private void requireClan(Long clanId, CultureTargetContext context) {
        if (clanId == null || context == null || !clanId.equals(context.clanId())) {
            throw new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "文化对象不属于当前宗族");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
