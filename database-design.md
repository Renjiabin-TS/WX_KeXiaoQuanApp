# 课时管理小程序数据库设计文档

## 概述

本系统使用微信云开发（CloudBase）数据库，基于 MongoDB。数据库包含两个核心集合：`users`（用户表）和 `lessons`（课时表）。

---

## 集合 1：users（用户表）

### 功能说明
存储用户基本信息，用于用户登录认证和身份识别。

### 文档结构

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| `_id` | String | MongoDB 自动生成的文档 ID | 是 |
| `openid` | String | 微信用户的 OpenID，用于关联课时数据 | 是 |
| `nickname` | String | 用户昵称 | 是 |
| `avatarUrl` | String | 用户头像 URL | 否 |
| `email` | String | 用户邮箱地址，用于接收课时统计邮件 | 否 |
| `created_at` | String | 创建时间（ISO 8601 格式） | 是 |
| `updated_at` | String | 更新时间（ISO 8601 格式） | 是 |

### 示例文档

```json
{
  "_id": "xxxxxxxxxxxxx",
  "openid": "oxxxxxxxx",
  "nickname": "张三",
  "avatarUrl": "https://example.com/avatar.jpg",
  "email": "zhangsan@example.com",
  "created_at": "2024-01-15T08:30:00.000Z",
  "updated_at": "2024-01-15T10:20:00.000Z"
}
```

### 索引说明

| 索引字段 | 类型 | 唯一 | 说明 |
|----------|------|------|------|
| `openid` | String | 是 | 每个用户唯一对应一个 openid |

---

## 集合 2：lessons（课时表）

### 功能说明
存储用户的课时记录信息，包括授课日期、时间、类型等。

### 文档结构

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| `_id` | String | MongoDB 自动生成的文档 ID | 是 |
| `user_id` | String | 关联的用户 openid | 是 |
| `date` | String | 授课日期（格式：YYYY-MM-DD） | 是 |
| `start_time` | String | 开始时间（格式：HH:mm） | 是 |
| `end_time` | String | 结束时间（格式：HH:mm） | 是 |
| `duration` | Number | 课时数（单位：课时） | 是 |
| `lesson_type` | String | 课程类型：`一对一` 或 `班课` | 是 |
| `teacher_name` | String | 老师姓名 | 是 |
| `student_name` | String | 学生姓名（一对一课程使用） | 否 |
| `student_count` | Number | 班级人数（班课使用） | 否 |
| `created_at` | String | 创建时间（ISO 8601 格式） | 是 |
| `updated_at` | String | 更新时间（ISO 8601 格式） | 否 |

### 示例文档

```json
{
  "_id": "yyyyyyyyyyyyy",
  "user_id": "oxxxxxxxx",
  "date": "2024-01-15",
  "start_time": "09:30",
  "end_time": "11:30",
  "duration": 2,
  "lesson_type": "一对一",
  "teacher_name": "李老师",
  "student_name": "王小明",
  "student_count": null,
  "created_at": "2024-01-15T08:30:00.000Z",
  "updated_at": "2024-01-15T09:00:00.000Z"
}
```

### 索引说明

| 索引字段 | 类型 | 说明 |
|----------|------|------|
| `user_id` | String | 用于按用户查询课时 |
| `date` | String | 用于按日期范围查询课时 |

### 业务规则

1. **课时计算**：根据 `start_time` 和 `end_time` 自动计算课时数，每30分钟为0.5课时
2. **时段冲突检测**：同一用户同一天不能有重叠时段的课时
3. **课程类型区分**：
   - 一对一课程：记录 `student_name`
   - 班课：记录 `student_count`

---

## 数据库关系图

```
┌─────────────┐       1:N        ┌─────────────┐
│    users    │ ─────────────── │   lessons   │
├─────────────┤                 ├─────────────┤
│ _id         │                 │ _id         │
│ openid (FK) │ ──────────────> │ user_id     │
│ nickname    │                 │ date        │
│ email       │                 │ start_time  │
│ avatarUrl   │                 │ end_time    │
│ created_at  │                 │ duration    │
│ updated_at  │                 │ lesson_type │
└─────────────┘                 │ teacher_name│
                                │ student_name│
                                │ student_count│
                                │ created_at  │
                                │ updated_at  │
                                └─────────────┘
```

---

## 云函数列表

| 云函数名 | 功能说明 | 操作的集合 |
|----------|----------|------------|
| `login` | 用户登录，创建/更新用户信息 | `users` |
| `updateUserInfo` | 更新用户信息（邮箱等） | `users` |
| `queryLessons` | 查询指定日期范围的课时 | `lessons` |
| `addLesson` | 添加新课时 | `lessons` |
| `updateLesson` | 修改课时信息 | `lessons` |
| `deleteLesson` | 删除课时 | `lessons` |
| `dailyEmailPush` | 每日9点自动发送课时统计邮件 | `users`, `lessons` |
| `dailyEmailReport` | 定时/手动发送课时统计邮件 | `users`, `lessons` |

---

## 数据备份建议

1. 定期通过微信云开发控制台导出数据
2. 可使用 CSV 格式导出课时数据（日历页面支持）
3. 用户数据建议单独备份
