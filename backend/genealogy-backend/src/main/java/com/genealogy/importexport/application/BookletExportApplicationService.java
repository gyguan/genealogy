package com.genealogy.importexport.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookletExportApplicationService {

    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;

    public BookletExportApplicationService(
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository
    ) {
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
    }

    @Transactional(readOnly = true)
    public byte[] buildClanBooklet(Long clanId) {
        ClanEntity clan = clanRepository.findById(clanId).orElseThrow(() -> new BusinessException(ErrorCode.CLAN_NOT_FOUND));
        List<BranchEntity> branches = branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId);
        Set<Long> branchIds = branches.stream().map(BranchEntity::getId).collect(Collectors.toCollection(HashSet::new));
        List<PersonEntity> persons = personRepository.findByClanIdAndDeletedAtIsNull(clanId);
        List<RelationshipEntity> relations = relationshipRepository.findByClanIdAndDeletedAtIsNull(clanId);
        return renderBooklet(clan, null, branches, branchIds, persons, relations, "全宗族简版成册");
    }

    @Transactional(readOnly = true)
    public byte[] buildBranchBooklet(Long clanId, Long branchId) {
        ClanEntity clan = clanRepository.findById(clanId).orElseThrow(() -> new BusinessException(ErrorCode.CLAN_NOT_FOUND));
        BranchEntity rootBranch = branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
        List<BranchEntity> scopeBranches = branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).stream()
                .filter(branch -> branch.getId().equals(rootBranch.getId()) || isDescendant(rootBranch.getBranchPath(), branch.getBranchPath()))
                .toList();
        Set<Long> branchIds = scopeBranches.stream().map(BranchEntity::getId).collect(Collectors.toCollection(HashSet::new));
        List<PersonEntity> persons = personRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(person -> person.getBranchId() != null && branchIds.contains(person.getBranchId()))
                .toList();
        Set<Long> personIds = persons.stream().map(PersonEntity::getId).collect(Collectors.toCollection(HashSet::new));
        List<RelationshipEntity> relations = relationshipRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(relation -> personIds.contains(relation.getFromPersonId()) && personIds.contains(relation.getToPersonId()))
                .toList();
        return renderBooklet(clan, rootBranch, scopeBranches, branchIds, persons, relations, rootBranch.getBranchName() + "简版成册");
    }

    private byte[] renderBooklet(
            ClanEntity clan,
            BranchEntity rootBranch,
            List<BranchEntity> branches,
            Set<Long> branchIds,
            List<PersonEntity> rawPersons,
            List<RelationshipEntity> rawRelations,
            String bookletTitle
    ) {
        Map<Long, BranchEntity> branchMap = branches.stream().collect(Collectors.toMap(BranchEntity::getId, branch -> branch, (a, b) -> a));
        List<PersonEntity> persons = rawPersons.stream().sorted(personComparator(branchMap)).toList();
        Map<Long, PersonEntity> personMap = persons.stream().collect(Collectors.toMap(PersonEntity::getId, person -> person, (a, b) -> a));
        List<RelationshipEntity> relations = rawRelations.stream().sorted(relationComparator(personMap)).toList();
        Map<Long, List<RelationshipEntity>> outgoing = relations.stream().collect(Collectors.groupingBy(RelationshipEntity::getFromPersonId));
        Map<Long, List<RelationshipEntity>> incoming = relations.stream().collect(Collectors.groupingBy(RelationshipEntity::getToPersonId));
        Map<Long, Long> branchPersonCounts = persons.stream()
                .filter(person -> person.getBranchId() != null)
                .collect(Collectors.groupingBy(PersonEntity::getBranchId, Collectors.counting()));

        StringBuilder html = new StringBuilder();
        html.append("<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"UTF-8\" />");
        html.append("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />");
        html.append("<title>").append(escapeHtml(clan.getClanName())).append(" - ").append(escapeHtml(bookletTitle)).append("</title>");
        appendStyle(html);
        html.append("</head><body>");

        appendCover(html, clan, rootBranch, bookletTitle, persons.size(), relations.size(), branches.size());
        appendSummary(html, clan, rootBranch, branches, branchPersonCounts, persons.size(), relations.size());
        appendBranchDirectory(html, branches, branchPersonCounts);
        appendPersonChapters(html, branches, branchIds, branchMap, persons, outgoing, incoming);
        appendRelationshipChapter(html, relations, personMap);

        html.append("<section class=\"book-page end-page\"><h2>附记</h2><p>本册为系统自动生成的简版族谱成册，适合预览、评审、打印和初步传阅。正式刊印前建议继续补充来源证据、人物小传、照片、迁徙记录与审核结论。</p></section>");
        html.append("</body></html>");
        return html.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendCover(StringBuilder html, ClanEntity clan, BranchEntity rootBranch, String bookletTitle, int personCount, int relationCount, int branchCount) {
        html.append("<section class=\"book-cover\">");
        html.append("<div class=\"cover-kicker\">Genealogy Booklet</div>");
        html.append("<h1>").append(escapeHtml(clan.getClanName())).append("</h1>");
        html.append("<h2>").append(escapeHtml(bookletTitle)).append("</h2>");
        html.append("<div class=\"cover-seal\">").append(escapeHtml(firstChar(clan.getSurname()))).append("</div>");
        html.append("<div class=\"cover-meta\">");
        appendMeta(html, "姓氏", clan.getSurname());
        appendMeta(html, "堂号", clan.getHallName());
        appendMeta(html, "郡望", clan.getCommandery());
        appendMeta(html, "祖籍", clan.getOriginPlace());
        if (rootBranch != null) {
            appendMeta(html, "成册范围", rootBranch.getBranchName() + "及下级支派");
        } else {
            appendMeta(html, "成册范围", "全宗族");
        }
        appendMeta(html, "人物", personCount + " 位");
        appendMeta(html, "关系", relationCount + " 条");
        appendMeta(html, "支派", branchCount + " 个");
        appendMeta(html, "生成时间", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        html.append("</div>");
        html.append("</section>");
    }

    private void appendSummary(StringBuilder html, ClanEntity clan, BranchEntity rootBranch, List<BranchEntity> branches, Map<Long, Long> branchPersonCounts, int personCount, int relationCount) {
        html.append("<section class=\"book-page\"><h2>卷首概览</h2>");
        html.append("<div class=\"stats\">");
        html.append(stat("人物总数", String.valueOf(personCount)));
        html.append(stat("关系总数", String.valueOf(relationCount)));
        html.append(stat("支派数量", String.valueOf(branches.size())));
        html.append(stat("成册范围", rootBranch == null ? "全宗族" : rootBranch.getBranchName()));
        html.append("</div>");
        html.append("<div class=\"intro-card\"><h3>宗族简介</h3>");
        html.append("<p>").append(escapeHtml(defaultText(clan.getDescription(), "暂无宗族简介。"))).append("</p>");
        html.append("</div>");
        html.append("<div class=\"intro-card\"><h3>支派概况</h3><p>");
        if (branches.isEmpty()) {
            html.append("暂无支派信息。");
        } else {
            html.append("本册收录 ").append(branches.size()).append(" 个支派，其中人物最多的支派为 ");
            BranchEntity top = branches.stream().max(Comparator.comparingLong(branch -> branchPersonCounts.getOrDefault(branch.getId(), 0L))).orElse(null);
            html.append(top == null ? "-" : escapeHtml(top.getBranchName())).append("。");
        }
        html.append("</p></div></section>");
    }

    private void appendBranchDirectory(StringBuilder html, List<BranchEntity> branches, Map<Long, Long> branchPersonCounts) {
        html.append("<section class=\"book-page\"><h2>支派目录</h2>");
        if (branches.isEmpty()) {
            html.append("<p class=\"muted\">暂无支派目录。</p>");
        } else {
            html.append("<table><thead><tr><th>支派</th><th>层级</th><th>迁徙</th><th>人物数</th><th>简介</th></tr></thead><tbody>");
            for (BranchEntity branch : branches) {
                html.append("<tr><td>").append(indent(branch.getLevel())).append(escapeHtml(branch.getBranchName())).append("</td>");
                html.append("<td>").append(value(branch.getLevel())).append("</td>");
                html.append("<td>").append(escapeHtml(joinPlace(branch.getMigrationFrom(), branch.getMigrationTo()))).append("</td>");
                html.append("<td>").append(branchPersonCounts.getOrDefault(branch.getId(), 0L)).append("</td>");
                html.append("<td>").append(escapeHtml(defaultText(branch.getDescription(), "-"))).append("</td></tr>");
            }
            html.append("</tbody></table>");
        }
        html.append("</section>");
    }

    private void appendPersonChapters(
            StringBuilder html,
            List<BranchEntity> branches,
            Set<Long> branchIds,
            Map<Long, BranchEntity> branchMap,
            List<PersonEntity> persons,
            Map<Long, List<RelationshipEntity>> outgoing,
            Map<Long, List<RelationshipEntity>> incoming
    ) {
        html.append("<section class=\"book-page\"><h2>人物世录</h2><p class=\"muted\">按支派、代次和人物编号排序展示人物摘要。</p></section>");
        Set<Long> renderedBranchIds = new HashSet<>();
        for (BranchEntity branch : branches) {
            renderedBranchIds.add(branch.getId());
            List<PersonEntity> branchPersons = persons.stream().filter(person -> Objects.equals(person.getBranchId(), branch.getId())).toList();
            if (branchPersons.isEmpty()) {
                continue;
            }
            html.append("<section class=\"book-page branch-page\"><h2>").append(escapeHtml(branch.getBranchName())).append("</h2>");
            html.append("<p class=\"muted\">支派路径：").append(escapeHtml(defaultText(branch.getBranchPath(), "-"))).append("；收录人物 ").append(branchPersons.size()).append(" 位。</p>");
            for (PersonEntity person : branchPersons) {
                appendPersonCard(html, person, branchMap, outgoing.getOrDefault(person.getId(), List.of()), incoming.getOrDefault(person.getId(), List.of()));
            }
            html.append("</section>");
        }
        List<PersonEntity> unassigned = persons.stream()
                .filter(person -> person.getBranchId() == null || !branchIds.contains(person.getBranchId()) || !renderedBranchIds.contains(person.getBranchId()))
                .toList();
        if (!unassigned.isEmpty()) {
            html.append("<section class=\"book-page branch-page\"><h2>未分支派人物</h2>");
            for (PersonEntity person : unassigned) {
                appendPersonCard(html, person, branchMap, outgoing.getOrDefault(person.getId(), List.of()), incoming.getOrDefault(person.getId(), List.of()));
            }
            html.append("</section>");
        }
    }

    private void appendPersonCard(StringBuilder html, PersonEntity person, Map<Long, BranchEntity> branchMap, List<RelationshipEntity> outgoing, List<RelationshipEntity> incoming) {
        html.append("<article class=\"person-card\">");
        html.append("<div class=\"person-head\"><div><h3>").append(escapeHtml(personDisplayName(person))).append("</h3>");
        html.append("<p>").append(escapeHtml(personSubtitle(person, branchMap))).append("</p></div>");
        html.append("<span>").append(escapeHtml(defaultText(person.getDataStatus(), "draft"))).append("</span></div>");
        html.append("<div class=\"person-grid\">");
        appendField(html, "谱名", person.getGenealogyName());
        appendField(html, "字号", person.getCourtesyName());
        appendField(html, "别名", person.getAliasName());
        appendField(html, "排行", person.getRankInFamily());
        appendField(html, "生卒", lifeText(person));
        appendField(html, "出生地", person.getBirthPlace());
        appendField(html, "居住地", person.getResidencePlace());
        appendField(html, "职业", person.getOccupation());
        appendField(html, "教育", person.getEducation());
        appendField(html, "称号荣誉", person.getTitleOrHonor());
        appendField(html, "墓葬地", person.getTombPlace());
        appendField(html, "世系状态", person.getLineageStatus());
        html.append("</div>");
        if (hasText(person.getBiography())) {
            html.append("<p class=\"story\"><strong>传记：</strong>").append(escapeHtml(person.getBiography())).append("</p>");
        }
        if (hasText(person.getEpitaph())) {
            html.append("<p class=\"story\"><strong>墓志：</strong>").append(escapeHtml(person.getEpitaph())).append("</p>");
        }
        appendRelationBrief(html, outgoing, incoming);
        html.append("</article>");
    }

    private void appendRelationBrief(StringBuilder html, List<RelationshipEntity> outgoing, List<RelationshipEntity> incoming) {
        int count = outgoing.size() + incoming.size();
        if (count == 0) {
            return;
        }
        html.append("<div class=\"relation-brief\"><strong>关系摘要：</strong>");
        html.append("关联关系 ").append(count).append(" 条");
        long lineage = java.util.stream.Stream.concat(outgoing.stream(), incoming.stream()).filter(relation -> Boolean.TRUE.equals(relation.getIsLineageRelation())).count();
        if (lineage > 0) {
            html.append("，其中世系关系 ").append(lineage).append(" 条");
        }
        html.append("。</div>");
    }

    private void appendRelationshipChapter(StringBuilder html, List<RelationshipEntity> relations, Map<Long, PersonEntity> personMap) {
        html.append("<section class=\"book-page\"><h2>关系索引</h2>");
        if (relations.isEmpty()) {
            html.append("<p class=\"muted\">暂无关系数据。</p>");
        } else {
            html.append("<table><thead><tr><th>起点人物</th><th>终点人物</th><th>类型</th><th>标签</th><th>世系</th><th>说明</th></tr></thead><tbody>");
            for (RelationshipEntity relation : relations) {
                html.append("<tr><td>").append(escapeHtml(nameOf(personMap.get(relation.getFromPersonId()), relation.getFromPersonId()))).append("</td>");
                html.append("<td>").append(escapeHtml(nameOf(personMap.get(relation.getToPersonId()), relation.getToPersonId()))).append("</td>");
                html.append("<td>").append(escapeHtml(relationTypeText(relation.getRelationType()))).append("</td>");
                html.append("<td>").append(escapeHtml(labelText(relation.getRelationLabel()))).append("</td>");
                html.append("<td>").append(Boolean.TRUE.equals(relation.getIsLineageRelation()) ? "是" : "否").append("</td>");
                html.append("<td>").append(escapeHtml(defaultText(relation.getDescription(), "-"))).append("</td></tr>");
            }
            html.append("</tbody></table>");
        }
        html.append("</section>");
    }

    private Comparator<PersonEntity> personComparator(Map<Long, BranchEntity> branchMap) {
        return Comparator
                .comparing((PersonEntity person) -> branchOrder(branchMap.get(person.getBranchId())))
                .thenComparing(person -> person.getGenerationNo() == null ? Integer.MAX_VALUE : person.getGenerationNo())
                .thenComparing(person -> person.getPersonCode() == null ? "" : person.getPersonCode())
                .thenComparing(PersonEntity::getId);
    }

    private Comparator<RelationshipEntity> relationComparator(Map<Long, PersonEntity> personMap) {
        return Comparator
                .comparing((RelationshipEntity relation) -> personOrder(personMap.get(relation.getFromPersonId())))
                .thenComparing(relation -> personOrder(personMap.get(relation.getToPersonId())))
                .thenComparing(RelationshipEntity::getId);
    }

    private String branchOrder(BranchEntity branch) {
        if (branch == null) {
            return "zzzz";
        }
        return String.format("%04d-%04d-%010d", branch.getLevel() == null ? 9999 : branch.getLevel(), branch.getSortOrder() == null ? 9999 : branch.getSortOrder(), branch.getId());
    }

    private String personOrder(PersonEntity person) {
        if (person == null) {
            return "zzzz";
        }
        return String.format("%04d-%010d", person.getGenerationNo() == null ? 9999 : person.getGenerationNo(), person.getId());
    }

    private boolean isDescendant(String rootPath, String candidatePath) {
        return hasText(rootPath) && hasText(candidatePath) && (candidatePath.equals(rootPath) || candidatePath.startsWith(rootPath + "/"));
    }

    private void appendStyle(StringBuilder html) {
        html.append("<style>");
        html.append("@page{size:A4;margin:18mm 15mm;}body{margin:0;background:#f4efe7;color:#2b2118;font-family:'Noto Serif SC','Songti SC','SimSun',serif;line-height:1.72;}body:before{content:'';position:fixed;inset:0;background:radial-gradient(circle at 20% 10%,rgba(146,64,14,.08),transparent 30%),linear-gradient(90deg,rgba(120,53,15,.05) 1px,transparent 1px);background-size:auto,18px 18px;pointer-events:none;}h1,h2,h3{font-weight:700;letter-spacing:.08em;}table{width:100%;border-collapse:collapse;margin-top:14px;background:rgba(255,255,255,.72);}th,td{border:1px solid #dac7aa;padding:8px 10px;text-align:left;vertical-align:top;}th{background:#7c2d12;color:#fff;font-weight:600;}.book-cover,.book-page{box-sizing:border-box;min-height:297mm;margin:0 auto 18px;padding:32mm 22mm;background:#fffaf0;box-shadow:0 16px 40px rgba(64,32,12,.14);page-break-after:always;position:relative;}.book-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#7c2d12,#b45309 45%,#f8edd8);color:#fff;}.book-cover h1{font-size:52px;margin:18px 0 8px;}.book-cover h2{font-size:26px;margin:0 0 28px;}.cover-kicker{text-transform:uppercase;letter-spacing:.35em;opacity:.8;}.cover-seal{width:96px;height:96px;border:4px solid rgba(255,255,255,.75);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:44px;margin:16px 0;background:rgba(255,255,255,.12);}.cover-meta{display:grid;grid-template-columns:repeat(2,minmax(160px,1fr));gap:10px;max-width:620px;width:100%;margin-top:20px;text-align:left;}.cover-meta div,.stats div,.intro-card,.person-card{border:1px solid rgba(124,45,18,.22);background:rgba(255,255,255,.72);border-radius:14px;padding:12px 14px;}.cover-meta span,.stats span,.person-grid span{display:block;font-size:12px;color:#7c2d12;letter-spacing:.08em;}.cover-meta strong{color:#fff;font-size:15px;}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0;}.stats strong{font-size:26px;color:#7c2d12;}.intro-card{margin-top:14px;}.muted{color:#7a6b5b;}.branch-page h2{border-bottom:3px double #b45309;padding-bottom:8px;}.person-card{break-inside:avoid;margin:14px 0;background:#fffdf7;}.person-head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #eadcc7;margin-bottom:10px;padding-bottom:8px;}.person-head h3{margin:0;font-size:22px;color:#7c2d12;}.person-head p{margin:4px 0 0;color:#7a6b5b;}.person-head span{align-self:flex-start;background:#fef3c7;color:#92400e;border-radius:999px;padding:2px 10px;font-size:12px;}.person-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px;}.person-grid strong{font-weight:600;}.story{background:#fff8eb;border-left:4px solid #b45309;padding:10px 12px;margin:12px 0 0;}.relation-brief{margin-top:10px;color:#5c4030;font-size:13px;}.end-page{display:flex;flex-direction:column;justify-content:center;text-align:center;}@media print{body{background:#fff;}.book-cover,.book-page{box-shadow:none;margin:0;}} ");
        html.append("</style>");
    }

    private void appendMeta(StringBuilder html, String label, String value) {
        html.append("<div><span>").append(escapeHtml(label)).append("</span><strong>").append(escapeHtml(defaultText(value, "-"))).append("</strong></div>");
    }

    private String stat(String label, String value) {
        return "<div><span>" + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>";
    }

    private void appendField(StringBuilder html, String label, String value) {
        html.append("<div><span>").append(escapeHtml(label)).append("</span><strong>").append(escapeHtml(defaultText(value, "-"))).append("</strong></div>");
    }

    private String personDisplayName(PersonEntity person) {
        if (person == null) {
            return "-";
        }
        String code = hasText(person.getPersonCode()) ? " #" + person.getPersonCode() : "";
        return defaultText(person.getName(), "未命名") + code;
    }

    private String personSubtitle(PersonEntity person, Map<Long, BranchEntity> branchMap) {
        BranchEntity branch = branchMap.get(person.getBranchId());
        return defaultText(person.getGender(), "unknown") + " · "
                + (person.getGenerationNo() == null ? "世次未详" : person.getGenerationNo() + "世") + " · "
                + defaultText(person.getGenerationWord(), "无字辈") + " · "
                + (branch == null ? "未分支派" : branch.getBranchName());
    }

    private String lifeText(PersonEntity person) {
        String birth = value(person.getBirthDate());
        String death = value(person.getDeathDate());
        if (Boolean.TRUE.equals(person.getIsLiving()) && !hasText(death)) {
            death = "在世";
        }
        return defaultText(birth, "生年未详") + " - " + defaultText(death, "卒年未详");
    }

    private String nameOf(PersonEntity person, Long id) {
        return person == null ? "人物#" + id : personDisplayName(person);
    }

    private String relationTypeText(String type) {
        Map<String, String> dict = new HashMap<>();
        dict.put("parent_child", "亲子");
        dict.put("spouse", "配偶");
        dict.put("adoptive", "收养");
        dict.put("successor", "继嗣");
        dict.put("out_adoption", "出嗣");
        return dict.getOrDefault(type, defaultText(type, "-"));
    }

    private String labelText(String label) {
        Map<String, String> dict = new HashMap<>();
        dict.put("father", "父亲");
        dict.put("mother", "母亲");
        dict.put("spouse", "配偶");
        dict.put("adoptive_father", "养父");
        dict.put("adoptive_mother", "养母");
        dict.put("adoptive_parent", "养父母/收养");
        dict.put("heir_successor", "继嗣/承嗣");
        dict.put("out_adopted", "出嗣/出继");
        return dict.getOrDefault(label, defaultText(label, "-"));
    }

    private String joinPlace(String from, String to) {
        if (!hasText(from) && !hasText(to)) {
            return "-";
        }
        return defaultText(from, "-") + " → " + defaultText(to, "-");
    }

    private String indent(Integer level) {
        int depth = Math.max(0, (level == null ? 1 : level) - 1);
        return "　".repeat(depth);
    }

    private String firstChar(String value) {
        String text = defaultText(value, "谱");
        return text.substring(0, Math.min(text.length(), 1));
    }

    private String value(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String defaultText(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
