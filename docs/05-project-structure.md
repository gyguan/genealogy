# 05. 项目目录结构

## 仓库结构

```text
.
├── README.md
├── docs/
├── prototype/
├── backend/
├── frontend/
├── database/
├── scripts/
└── .github/workflows/
```

## 后端结构建议

```text
backend/
└── genealogy-backend/
    ├── pom.xml
    ├── src/main/java/com/genealogy/
    │   ├── common/
    │   ├── auth/
    │   ├── clan/
    │   ├── branch/
    │   ├── generation/
    │   ├── person/
    │   ├── relationship/
    │   ├── source/
    │   ├── review/
    │   ├── tree/
    │   ├── member/
    │   ├── importexport/
    │   └── operationlog/
    └── src/main/resources/
        ├── application.yml
        └── db/migration/
```

## 前端结构建议

```text
frontend/
└── genealogy-web/
    ├── src/
    │   ├── api/
    │   ├── router/
    │   ├── stores/
    │   ├── views/
    │   ├── components/
    │   └── utils/
    └── package.json
```

## 原型目录

```text
prototype/
├── README.md
└── index.html
```

## 数据库目录

```text
database/
├── README.md
└── schema-draft.sql
```

## 目录职责

| 目录 | 职责 |
|---|---|
| docs | 产品、需求、架构、接口、工程设计文档 |
| prototype | 可点击低保真/中保真原型 |
| backend | 后端工程代码 |
| frontend | 前端工程代码 |
| database | 数据库脚本、初始化数据、迁移草案 |
| scripts | 本地启动、构建、辅助脚本 |
| .github/workflows | CI 配置预留 |
