package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.mybatis.AppUserPersistenceMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class AppUserRepository {
    private final AppUserPersistenceMapper mapper;

    public AppUserRepository(AppUserPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public AppUserEntity save(AppUserEntity entity) {
        Objects.requireNonNull(entity, "entity");
        LocalDateTime now = LocalDateTime.now();
        if (entity.getId() == null) {
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(now);
            }
            if (entity.getUpdatedAt() == null) {
                entity.setUpdatedAt(now);
            }
            mapper.insert(entity);
        } else {
            entity.setUpdatedAt(now);
            if (mapper.updateAllById(entity) != 1) {
                throw new IllegalStateException(
                        "User update failed for id " + entity.getId()
                );
            }
        }
        return entity;
    }

    @Transactional
    public AppUserEntity saveAndFlush(AppUserEntity entity) {
        return save(entity);
    }

    @Transactional
    public List<AppUserEntity> saveAll(Collection<AppUserEntity> entities) {
        return entities.stream().map(this::save).toList();
    }

    public Optional<AppUserEntity> findById(Long id) {
        return Optional.ofNullable(id == null ? null : mapper.selectById(id));
    }

    public List<AppUserEntity> findAll() {
        return mapper.findAll();
    }

    public List<AppUserEntity> findAllById(Iterable<Long> ids) {
        List<Long> values = toList(ids);
        return values.isEmpty() ? List.of() : mapper.findAllByIds(values);
    }

    public Optional<AppUserEntity> findByUsername(String username) {
        return Optional.ofNullable(mapper.findByUsername(username, false));
    }

    public Optional<AppUserEntity> findByUsernameAndDeletedAtIsNull(
            String username
    ) {
        return Optional.ofNullable(mapper.findByUsername(username, true));
    }

    public boolean existsByUsername(String username) {
        return mapper.existsUsername(username, false);
    }

    public boolean existsByUsernameAndDeletedAtIsNull(String username) {
        return mapper.existsUsername(username, true);
    }

    public boolean existsByPhoneAndDeletedAtIsNull(String phone) {
        return mapper.existsPhone(phone);
    }

    public boolean existsByEmailAndDeletedAtIsNull(String email) {
        return mapper.existsEmail(email);
    }

    public Optional<AppUserEntity> findRecoverableAccount(String account) {
        return Optional.ofNullable(mapper.findRecoverableAccount(account));
    }

    public Page<AppUserEntity> searchActiveCandidates(
            String keyword,
            Pageable pageable
    ) {
        long total = mapper.countActiveCandidates(keyword);
        List<AppUserEntity> content = total == 0
                ? List.of()
                : mapper.searchActiveCandidates(
                        keyword,
                        pageable.getOffset(),
                        pageable.getPageSize()
                );
        return new PageImpl<>(content, pageable, total);
    }

    public boolean existsById(Long id) {
        return id != null && mapper.selectById(id) != null;
    }

    private List<Long> toList(Iterable<Long> ids) {
        if (ids == null) {
            return List.of();
        }
        List<Long> values = new ArrayList<>();
        ids.forEach(values::add);
        return values;
    }
}
