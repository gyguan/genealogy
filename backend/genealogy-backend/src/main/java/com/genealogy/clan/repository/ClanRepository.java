package com.genealogy.clan.repository;

import com.genealogy.clan.entity.ClanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ClanRepository extends JpaRepository<ClanEntity, Long> {

    boolean existsByClanCode(String clanCode);

    boolean existsByClanCodeAndIdNot(String clanCode, Long id);

    List<ClanEntity> findByIdInOrderByIdDesc(Collection<Long> ids);
}
