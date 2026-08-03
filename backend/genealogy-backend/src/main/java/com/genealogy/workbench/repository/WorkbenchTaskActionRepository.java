package com.genealogy.workbench.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.workbench.entity.WorkbenchTaskActionEntity;
import com.genealogy.workbench.repository.mybatis.WorkbenchTaskActionPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public class WorkbenchTaskActionRepository {

    private final WorkbenchTaskActionPersistenceMapper mapper;

    public WorkbenchTaskActionRepository(WorkbenchTaskActionPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public WorkbenchTaskActionEntity save(WorkbenchTaskActionEntity entity) {
        if (entity.getId() == null) {
            mapper.insert(entity);
        } else {
            mapper.updateById(entity);
        }
        return entity;
    }

    @Transactional
    public WorkbenchTaskActionEntity saveAndFlush(WorkbenchTaskActionEntity entity) {
        return save(entity);
    }

    public Optional<WorkbenchTaskActionEntity> findById(Long id) {
        return Optional.ofNullable(id == null ? null : mapper.selectById(id));
    }

    public Optional<WorkbenchTaskActionEntity> findByClanIdAndTaskKeyAndActionType(
            Long clanId,
            String taskKey,
            String actionType
    ) {
        return Optional.ofNullable(mapper.selectOne(Wrappers.<WorkbenchTaskActionEntity>lambdaQuery()
                .eq(WorkbenchTaskActionEntity::getClanId, clanId)
                .eq(WorkbenchTaskActionEntity::getTaskKey, taskKey)
                .eq(WorkbenchTaskActionEntity::getActionType, actionType)
                .last("limit 1")));
    }

    public List<WorkbenchTaskActionEntity> findByClanIdAndActionType(Long clanId, String actionType) {
        return mapper.selectList(Wrappers.<WorkbenchTaskActionEntity>lambdaQuery()
                .eq(WorkbenchTaskActionEntity::getClanId, clanId)
                .eq(WorkbenchTaskActionEntity::getActionType, actionType)
                .orderByAsc(WorkbenchTaskActionEntity::getId));
    }
}
