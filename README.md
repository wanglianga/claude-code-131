# 悦享月子中心 · 产妇护理计划与家属探访平台

月子中心业务协同平台：**产妇入住档案 → 护理计划与执行 → 宝宝黄疸/体重观察 → 月子餐忌口 → 产康排班 → 月嫂请假调班 → 家属探访与消毒 → 异常事件跨角色协同 → 费用结算 → 提前退所/退所争议 → 出所归档与母婴随访 → 复购转介绍**，并支持**家属端授权查看护理摘要/预约探访/费用明细/满意度反馈（反馈影响护理师排班与口碑）**。

- 技术栈：Next.js 14（App Router + Server Actions）+ TypeScript + MySQL/MariaDB（mysql2）
- 数据库：`db/schema.sql`（23 张表）、`db/seed.sql`（演示数据）
- 测试：`scripts/e2e.mjs`（57 项端到端断言）

## 一、本地启动

### 1. 准备 MySQL/MariaDB（任一方式）

- 已有 MySQL/MariaDB：创建库与账号
  ```sql
  CREATE DATABASE yuezi_center CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'yuezi'@'%' IDENTIFIED BY 'yuezi123';
  GRANT ALL PRIVILEGES ON yuezi_center.* TO 'yuezi'@'%';
  FLUSH PRIVILEGES;
  ```
- Docker：`docker run -d --name yz-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=yuezi_center -e MYSQL_USER=yuezi -e MYSQL_PASSWORD=yuezi123 mariadb:10.11`
- 无 root 的 Linux 环境（本仓库验证环境即此方式）：用 `apt-get download` 拉取 `mariadb-server-core` 等 deb 包，`dpkg-deb -x` 解压到用户目录后 `mysql_install_db` + `mariadbd` 以普通用户启动（详见本仓库 git 历史/会话记录）。

### 2. 初始化数据并启动应用

```bash
npm install          # 安装依赖
npm run db:init      # 建表 + 写入演示数据（可重复执行，会重置数据）
npm run dev          # 开发模式  http://localhost:3000
# 或生产模式：
npm run build && npm start
```

数据库连接默认 `127.0.0.1:3306 / yuezi / yuezi123 / yuezi_center`，可用环境变量 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` 覆盖（见 `.env.example`）。

## 二、测试账号

| 角色 | 账号 | 密码 | 说明 |
|---|---|---|---|
| 中心管理者 | `admin` | `admin123` | 房间总览、全量数据 |
| 护理主管 | `director` | `dir123` | 排班、调班、异常升级 |
| 护士长 | `headnurse` | `hn123` | 护理计划、退所争议牵头 |
| 护理师 | `nurse` / `nurse2` | `nurse123` | 护理记录、宝宝观察、托管 |
| 儿科医生 | `ped` | `ped123` | 巡诊记录、黄疸评估 |
| 营养师 | `diet` | `diet123` | 月子餐排餐、忌口异常 |
| 产康师 | `rehab` | `rehab123` | 产康课程、延期改期 |
| 月嫂 | `nanny` | `nanny123` | 夜间照护、请假登记 |
| 前台 | `front` | `front123` | 探访审批、消毒登记、线索 |
| 财务 | `finance` | `fin123` | 费用开单/收款/退费 |
| 家属（A301 林晚丈夫） | `family1` | `fam123` | 授权级别：完整 |
| 家属（A302 苏晴丈夫） | `family2` | `fam123` | 授权级别：摘要 |

## 三、业务验证方式（页面路径）

1. **房间总览** `/rooms`：管理者按房间看护理动作、家属沟通、费用变化、未结异常（含高危标记）。
2. **房间台账** `/rooms/1`：入住档案（分娩方式/产后天数/过敏史/哺乳方式/餐食禁忌/探访权限/医生建议/套餐赠品）、宝宝黄疸体重、护理计划与执行记录、医生巡诊、月子餐、产康排班、托管日志、探访与消毒、费用明细、家属沟通与反馈、退所办理。
3. **异常协同** `/incidents` → `/incidents/:id`：黄疸升高、乳腺堵塞、临时探访、月嫂请假、餐食忌口、产康延期、套餐/房间升级、提前退所、质疑护理记录、退所争议，按类型自动流转牵头角色（儿科/护士长/营养/前台/财务/主管），处置动作形成协同时间线；退所争议自动标记“已同步护士长”。
4. **排班与口碑** `/schedule`：产康师/月嫂排班、请假、家属反馈→评分变化→排班处置闭环。
5. **费用结算** `/finance`：待收/已收/已退汇总、开单、收款、出所结算单。
6. **家属端** `/family`：护理摘要（按授权级别）、宝宝观察、探访预约（含临时增加）、费用明细、与中心沟通、满意度反馈、质疑护理记录。
7. **出所与随访** `/discharge`：出所归档（护理计划/异常/结算/回访建议）、14/42 天母婴随访、复购与转介绍线索。

## 四、自动化验证

```bash
npm run db:init && (npm run build && npm start &) && sleep 8 && node scripts/e2e.mjs
```

`scripts/e2e.mjs` 通过真实 HTTP 请求（登录→页面→Server Action 提交→数据库断言）验证 15 组场景、57 项断言，包括：黄疸 high 自动生成异常并流转儿科、家属临时探访流转前台并审批、家属反馈使护理师评分下降并登记排班影响、月嫂请假自动生成异常、产康延期自动生成异常、财务开单后家属端费用同步、提前退所归档+争议同步护士长+自动生成 14/42 天随访、随访完成、转介绍线索流转、家属质疑直达护士长等。

## 五、实际验证结论（本仓库交付前已执行）

- `npm run build`：Next.js 14 生产构建通过，TypeScript 严格模式 0 错误，12 个路由全部生成。
- `npm run db:init`：schema + 种子数据在 MariaDB 10.11 执行成功（23 张表）。
- `node scripts/e2e.mjs`（针对 `npm start` 生产实例 + 真实 MariaDB）：**57 项断言全部通过**（最后一次完整运行结果：`结果：57 通过 / 0 失败`）。
- 验证后已执行 `npm run db:init` 将数据库重置为干净的演示数据。

## 六、目录结构

```
app/            页面（login/rooms/tasks/incidents/schedule/finance/family/discharge）
components/     Nav、房间台账各业务区块
lib/            db（连接池）、auth（会话/角色）、queries（查询）、actions（Server Actions）、labels
db/             schema.sql、seed.sql
scripts/        db-init.mjs（初始化）、e2e.mjs（端到端测试）
```
