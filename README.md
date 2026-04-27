# 课时管理小程序

基于微信云开发的课时管理小程序，支持课时统计、日历查看、数据导出等功能。

## 功能特性

### 核心功能
- ✅ **用户管理**：微信快速登录、用户信息管理、邮箱设置
- ✅ **课时管理**：添加、编辑、删除课时记录
- ✅ **课时统计**：本周/本月课时统计，按类型分类统计
- ✅ **日历视图**：月历查看课时分布，点击日期查看详情
- ✅ **数据导出**：支持导出 CSV 格式，方便 Excel 处理
- ✅ **安全保护**：删除课时需通过顺序验证码确认

### 技术特点
- 🚀 基于微信云开发，无需自建服务器
- 🔐 数据存储在云数据库，安全可靠
- 📱 原生小程序开发，性能优秀
- 💾 本地缓存 + 云端同步双重保障

## 项目结构

```
miniprogram-1/
├── cloudfunctions/          # 云函数目录
│   ├── login/              # 用户登录
│   ├── addLesson/          # 添加课时
│   ├── updateLesson/       # 更新课时
│   ├── deleteLesson/       # 删除课时
│   └── updateUserInfo/     # 更新用户信息
├── miniprogram/            # 小程序前端代码
│   ├── pages/              # 页面目录
│   │   ├── index/          # 统计首页
│   │   ├── calendar/       # 日历页
│   │   ├── profile/        # 个人中心
│   │   ├── add/            # 添加课时
│   │   └── edit/           # 编辑课时
│   ├── components/         # 组件目录
│   ├── images/             # 图片资源
│   ├── utils/              # 工具函数
│   ├── app.js              # 应用配置
│   ├── app.json            # 应用配置文件
│   └── app.wxss            # 全局样式
└── project.config.json     # 项目配置
```

## 快速开始

### 环境要求
- 微信开发者工具 最新版本
- 微信小程序账号

### 配置步骤

1. **打开项目**
   - 使用微信开发者工具打开 `miniprogram-1` 目录

2. **配置云开发环境**
   - 点击微信开发者工具顶部的「云开发」按钮
   - 开通云开发服务
   - 在 `app.js` 中填写云环境 ID：
   ```javascript
   env: "your-env-id"  // 替换为你的云环境ID
   ```

3. **创建数据库集合**
   在云开发控制台创建以下数据库集合：
   - `users`：用户信息
   - `lessons`：课时记录

4. **上传云函数**
   - 右键点击 `cloudfunctions` 目录
   - 选择「上传并部署：云端安装依赖」

5. **配置图标**
   在 `miniprogram/images/` 目录下放置 tab 图标：
   - tab-home.png / tab-home-active.png
   - tab-calendar.png / tab-calendar-active.png
   - tab-profile.png / tab-profile-active.png

### 运行项目

1. 在微信开发者工具中点击「编译」
2. 扫描二维码在真机上预览
3. 授予小程序必要权限（用户信息、存储等）

## 数据结构

### 用户表 (users)
```javascript
{
  _id: String,           // 用户ID
  openid: String,        // 微信OpenID
  nickname: String,      // 昵称
  avatarUrl: String,     // 头像URL
  email: String,         // 邮箱（可选）
  created_at: String,    // 创建时间
  updated_at: String     // 更新时间
}
```

### 课时表 (lessons)
```javascript
{
  _id: String,           // 课时ID
  user_id: String,       // 关联用户ID
  teacher_name: String,  // 老师姓名
  date: String,          // 日期 YYYY-MM-DD
  start_time: String,    // 开始时间 HH:mm
  end_time: String,      // 结束时间 HH:mm
  duration: Number,      // 课时时长（小时）
  lesson_type: String,   // 课程类型：'一对一' | '班课'
  student_count: Number, // 学生数量（班课）
  student_name: String,  // 学生姓名（一对一）
  created_at: String,    // 创建时间
  updated_at: String     // 更新时间
}
```

## 页面说明

### 统计首页 (pages/index)
- 展示本周/本月课时统计
- 显示最近课时列表
- 支持下拉刷新

### 日历页 (pages/calendar)
- 月历视图展示课时分布
- 点击日期查看课时详情
- 支持导出 CSV 数据

### 个人中心 (pages/profile)
- 微信登录/退出
- 用户信息展示
- 邮箱设置

### 添加课时 (pages/add)
- 选择日期、时间、课程类型
- 自动计算课时时长
- 时间冲突检测

### 编辑课时 (pages/edit)
- 修改课时信息
- 删除课时（需验证码确认）

## 云函数说明

### login
用户登录，支持新用户注册和已有用户登录。

### addLesson
添加新的课时记录。

### updateLesson
更新已有课时信息。

### deleteLesson
删除课时记录。

### updateUserInfo
更新用户信息（邮箱等）。

### sendVerificationCode
发送邮箱验证码，用于邮箱验证。

### dailyEmailReport
定时发送每日课时统计邮件（每天23:00自动执行）。
- 统计本周课时（总课时、一对一、班课）
- 统计本月课时（总课时、一对一、班课）
- 发送当月明细信息
- 邮件发送到用户注册时的邮箱地址

## 注意事项

1. **云环境ID**：务必在 `app.js` 中配置正确的云环境ID
2. **数据库权限**：确保数据库集合权限设置正确
3. **图标资源**：tab 图标需要手动添加到 `images` 目录
4. **云函数部署**：首次使用需要上传并部署云函数
5. **用户信息**：已根据需求移除手机号，仅保留邮箱信息

## 优化建议

1. 性能优化
   - 添加数据缓存机制
   - 优化数据库查询
   - 使用分页加载

2. 功能增强
   - 添加课时模板功能
   - 支持批量导入
   - 增加数据统计图表
   - 添加提醒通知功能

3. 体验优化
   - 添加加载动画
   - 优化错误提示
   - 增加引导页面

## 许可证

MIT License
