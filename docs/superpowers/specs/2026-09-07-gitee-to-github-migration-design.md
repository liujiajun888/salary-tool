# Gitee → GitHub 仓库迁移设计

日期：2026-09-07
状态：设计已获用户批准（方案 A）

## 目标

将 Gitee 账号 `ljjqwq` 名下的 14 个自有公开仓库迁移到 GitHub 账号 `liujiajun888`，完整保留提交历史、全部分支与 tags。Gitee 侧不做任何改动（不删除、不修改），纯单向迁移。

## 范围

### 迁移清单（14 个，全部 public）

deep-sdf、isaac_sim、rag、stl_learn、agent_learn、ai_infra_learn、ansys_sim_ai、cudnn_learn、deepsdf-docker、jq、problem_handle、pytorch_learn、quant_learn、test_xunzhen

### 排除项及原因

- `gpt_model_learn`、`flash_attention_with_triton`：GitHub 已存在（后者名为 `triton-flash-attention`），main 分支 SHA 已核对一致（fa91628 / e000cdc），用户决定跳过不动
- `umdk`：他人项目的 fork
- `my_resume`、`lpy_career`：简历/职业类仓库，含个人信息
- `lipanyueljj/deep-sdf_-intranet_-validation`、`markyuan4ta2/kernel-patch`：非本人所有（仅为成员参与），不迁移

## 方案

选定方案 A：本地 mirror 克隆 + `gh repo create` + `git push --mirror`。

- 已否决方案 B（GitHub Importer 网页手动导入）：无法自动化、无法批量验证
- 已否决方案 C（GitHub Migrations API）：权限配置繁琐，对这批小仓库过重

前提条件（已确认）：`gh` 已以 liujiajun888 登录（repo 权限，https 协议）；Gitee 14 个仓库全部公开，匿名可克隆；目标名称与 GitHub 现有仓库无冲突。

## 执行步骤（每仓库）

1. `git clone --mirror https://gitee.com/ljjqwq/<name>.git` 到临时目录 `/tmp/gitee-migration/`
2. `gh repo create liujiajun888/<name> --public --description "<Gitee 原描述>"`（描述为空则省略该参数）
3. `git push --mirror https://github.com/liujiajun888/<name>.git`
4. 验证：`git ls-remote` 对比 GitHub 与 Gitee 的全部分支 + tags 的 SHA，完全一致才算成功

## 异常处理

- 单个仓库失败（网络超时等）重试 2 次，仍失败则记录并跳过、继续下一个仓库，最后统一汇报
- 克隆后发现仓库体积 >1GB 或含 Git LFS 指针：暂停并询问用户，不硬推
- 名称冲突：已预检无冲突；若执行中出现（如重名仓库被他人抢占），跳过并汇报

## 验收标准

- 14 个 GitHub 仓库全部创建成功，可见性 public，可正常访问
- 每仓库 `git ls-remote` 的分支与 tag 集合（名称 + SHA）双侧完全一致
- 输出 14 仓库迁移对照表；临时目录 `/tmp/gitee-migration/` 清理完毕
