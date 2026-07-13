package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AppUserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUserEntity, Long> {

    Optional<AppUserEntity> findByUsername(String username);

    Optional<AppUserEntity> findByUsernameAndDeletedAtIsNull(String username);

    boolean existsByUsername(String username);

    boolean existsByUsernameAndDeletedAtIsNull(String username);

    boolean existsByPhoneAndDeletedAtIsNull(String phone);

    boolean existsByEmailAndDeletedAtIsNull(String email);

    @Query("""
            select appUser
            from AppUserEntity appUser
            where appUser.deletedAt is null
              and (lower(appUser.username) = lower(:account)
                   or lower(coalesce(appUser.email, '')) = lower(:account)
                   or coalesce(appUser.phone, '') = :account)
            """)
    Optional<AppUserEntity> findRecoverableAccount(@Param("account") String account);

    @Query("""
            select appUser
            from AppUserEntity appUser
            where appUser.deletedAt is null
              and appUser.status = 'active'
              and (lower(appUser.username) like lower(concat('%', :keyword, '%'))
                   or lower(appUser.displayName) like lower(concat('%', :keyword, '%')))
            order by appUser.displayName asc, appUser.id asc
            """)
    Page<AppUserEntity> searchActiveCandidates(@Param("keyword") String keyword, Pageable pageable);
}
