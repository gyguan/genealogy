package com.genealogy.culture.repository.mybatis;

import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.repository.query.CultureSiteSearchRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CultureSiteQueryMapper {
    List<CultureSiteEntity> search(@Param("criteria") CultureSiteSearchRow criteria, @Param("offset") long offset, @Param("limit") int limit);
    long count(@Param("criteria") CultureSiteSearchRow criteria);
}
