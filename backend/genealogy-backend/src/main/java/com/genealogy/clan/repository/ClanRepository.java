package com.genealogy.clan.repository;

import com.genealogy.clan.entity.ClanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClanRepository extends JpaRepository<ClanEntity, Long> {
}
