package com.genealogy.operationlog.repository.query;
import java.time.LocalDateTime; import java.util.*;
public record OperationLogMemberAuditCriteria(Long clanId,Long actorId,String actionType,LocalDateTime startTime,LocalDateTime endTime,Long membershipId,List<Long> grantIds,boolean includeMembershipLogs,boolean unrestricted){public OperationLogMemberAuditCriteria{grantIds=grantIds==null?List.of():List.copyOf(grantIds);}}
