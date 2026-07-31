package com.genealogy.person.event.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.person.event.entity.PersonEventEntity;
import com.genealogy.person.event.repository.mybatis.PersonEventPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class PersonEventRepository {

    private final PersonEventPersistenceMapper mapper;

    public PersonEventRepository(PersonEventPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public PersonEventEntity save(PersonEventEntity entity) {
        if (entity.getId() == null) {
            mapper.insert(entity);
        } else {
            mapper.updateById(entity);
        }
        return entity;
    }

    @Transactional
    public List<PersonEventEntity> saveAll(Iterable<PersonEventEntity> entities) {
        List<PersonEventEntity> saved = new ArrayList<>();
        if (entities == null) {
            return saved;
        }
        for (PersonEventEntity entity : entities) {
            saved.add(save(entity));
        }
        return saved;
    }

    public Optional<PersonEventEntity> findById(Long id) {
        return Optional.ofNullable(id == null ? null : mapper.selectById(id));
    }

    @Transactional
    public void delete(PersonEventEntity entity) {
        if (entity != null && entity.getId() != null) {
            mapper.deleteById(entity.getId());
        }
    }

    public List<PersonEventEntity> findByPersonIdAndDeletedAtIsNullOrderBySortOrderAscEventDateAscIdAsc(Long personId) {
        return mapper.selectList(Wrappers.<PersonEventEntity>lambdaQuery()
                .eq(PersonEventEntity::getPersonId, personId)
                .isNull(PersonEventEntity::getDeletedAt)
                .orderByAsc(PersonEventEntity::getSortOrder)
                .orderByAsc(PersonEventEntity::getEventDate)
                .orderByAsc(PersonEventEntity::getId));
    }
}
