package com.genealogy.common.persistence.mybatis;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;
import org.postgresql.util.PGobject;

import java.sql.*;
import java.util.Map;

@MappedTypes(Map.class)
@MappedJdbcTypes(JdbcType.OTHER)
public final class JsonMapTypeHandler extends BaseTypeHandler<Map<String, Object>> {
    private static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();
    private static final TypeReference<Map<String, Object>> TYPE = new TypeReference<>() {};
    @Override public void setNonNullParameter(PreparedStatement ps, int i, Map<String,Object> parameter, JdbcType jdbcType) throws SQLException {
        try { PGobject json = new PGobject(); json.setType("jsonb"); json.setValue(MAPPER.writeValueAsString(parameter)); ps.setObject(i, json); }
        catch (Exception e) { throw new SQLException("Failed to serialize JSON map", e); }
    }
    @Override public Map<String,Object> getNullableResult(ResultSet rs, String columnName) throws SQLException { return read(rs.getString(columnName)); }
    @Override public Map<String,Object> getNullableResult(ResultSet rs, int columnIndex) throws SQLException { return read(rs.getString(columnIndex)); }
    @Override public Map<String,Object> getNullableResult(CallableStatement cs, int columnIndex) throws SQLException { return read(cs.getString(columnIndex)); }
    private Map<String,Object> read(String value) throws SQLException { if (value == null) return null; try { return MAPPER.readValue(value, TYPE); } catch (Exception e) { throw new SQLException("Failed to deserialize JSON map", e); } }
}
