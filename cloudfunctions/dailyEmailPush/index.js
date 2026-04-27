// 云函数入口文件 - 每天9点自动发送课时统计邮件
const cloud = require('wx-server-sdk');
const nodemailer = require('nodemailer');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 邮件发送器配置
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.163.com',
      port: 465,
      secure: true,
      auth: {
        user: '15369581103@163.com',
        pass: 'TBZ5cBHmWYihzFg8'
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1'
      },
      pool: true,
      maxConnections: 2,
      maxMessages: 10,
      connectionTimeout: 60000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    });
  }
  return transporter;
}

// 获取本周起始日期（周一）
function getWeekStart(date) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

// 获取本月起始日期
function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// 格式化日期
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 格式化时间为小时:分钟
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 生成邮件HTML内容
function generateEmailHTML(weeklyStats, monthlyStats, monthlyLessons, todayStr) {
  const weekRange = getWeekRangeStr();
  const monthRange = getMonthRangeStr();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, "Microsoft YaHei", sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #303133;
          margin: 0 0 20px 0;
          padding-bottom: 10px;
          border-bottom: 2px solid #667eea;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 30px;
        }
        .stats-card {
          padding: 20px;
          border-radius: 8px;
          color: #ffffff;
        }
        .weekly-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .monthly-card {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .stats-card-title {
          font-size: 16px;
          margin: 0 0 15px 0;
          opacity: 0.9;
        }
        .stats-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-size: 14px;
        }
        .stats-label {
          opacity: 0.8;
        }
        .stats-value {
          font-weight: bold;
          font-size: 18px;
        }
        .stats-total {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.3);
        }
        .period-info {
          background: #f5f7fa;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          color: #606266;
          font-size: 14px;
        }
        .lesson-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .lesson-table th {
          background-color: #f5f7fa;
          color: #606266;
          font-weight: bold;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #ebeef5;
        }
        .lesson-table td {
          padding: 12px;
          border-bottom: 1px solid #ebeef5;
          color: #303133;
        }
        .lesson-table tr:last-child td {
          border-bottom: none;
        }
        .tag {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .tag-green {
          background-color: #f0f9eb;
          color: #67c23a;
        }
        .tag-blue {
          background-color: #ecf5ff;
          color: #409eff;
        }
        .footer {
          background-color: #f5f7fa;
          padding: 20px;
          text-align: center;
          color: #909399;
          font-size: 12px;
        }
        .no-data {
          text-align: center;
          color: #909399;
          padding: 40px 20px;
        }
        .no-data-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>课时统计日报</h1>
          <p>${todayStr}</p>
        </div>
        <div class="content">
          <h2 class="section-title">课时统计</h2>
          
          <div class="period-info">
            📅 本周时间范围：${weekRange}<br>
            📆 本月时间范围：${monthRange}
          </div>
          
          <div class="stats-grid">
            <div class="stats-card weekly-card">
              <div class="stats-card-title">本周统计</div>
              <div class="stats-row stats-total">
                <span class="stats-label">总课时</span>
                <span class="stats-value">${weeklyStats.total}</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">一对一</span>
                <span class="stats-value">${weeklyStats.oneToOne}</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">班课</span>
                <span class="stats-value">${weeklyStats.class}</span>
              </div>
            </div>
            <div class="stats-card monthly-card">
              <div class="stats-card-title">本月统计</div>
              <div class="stats-row stats-total">
                <span class="stats-label">总课时</span>
                <span class="stats-value">${monthlyStats.total}</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">一对一</span>
                <span class="stats-value">${monthlyStats.oneToOne}</span>
              </div>
              <div class="stats-row">
                <span class="stats-label">班课</span>
                <span class="stats-value">${monthlyStats.class}</span>
              </div>
            </div>
          </div>

          <h2 class="section-title">当月课时明细</h2>
          ${monthlyLessons.length > 0 ? `
            <table class="lesson-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>类型</th>
                  <th>时间</th>
                  <th>学生/班级</th>
                  <th>课时</th>
                </tr>
              </thead>
              <tbody>
                ${monthlyLessons.map(lesson => `
                  <tr>
                    <td>${lesson.date}</td>
                    <td>
                      <span class="tag ${lesson.lesson_type === '一对一' ? 'tag-green' : 'tag-blue'}">
                        ${lesson.lesson_type}
                      </span>
                    </td>
                    <td>${lesson.start_time} - ${lesson.end_time}</td>
                    <td>${lesson.lesson_type === '一对一' ? lesson.student_name : lesson.student_count + '人'}</td>
                    <td>${lesson.duration}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="no-data">
              <div class="no-data-icon">📭</div>
              <p>暂无课时记录</p>
            </div>
          `}
        </div>
        <div class="footer">
          此邮件由系统自动发送，请勿回复。<br>
          发送时间：${formatTime(new Date())}
        </div>
      </div>
    </body>
    </html>
  `;
}

// 获取本周时间范围字符串
function getWeekRangeStr() {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const formatShortDate = (date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  return `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;
}

// 获取本月时间范围字符串
function getMonthRangeStr() {
  const now = new Date();
  const monthStart = getMonthStart(now);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const formatShortDate = (date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  return `${formatShortDate(monthStart)} - ${formatShortDate(monthEnd)}`;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const now = new Date();
  const todayStr = formatDate(now);
  
  console.log('========== 每日9点邮件自动推送任务 ==========');
  console.log('执行时间:', now.toISOString());
  console.log('今日日期:', todayStr);

  try {
    const weekStart = getWeekStart(new Date(now));
    const monthStart = getMonthStart(now);

    console.log('本周起始:', formatDate(weekStart));
    console.log('本月起始:', formatDate(monthStart));

    // 查询所有用户
    console.log('正在查询用户数据...');
    const usersResult = await db.collection('users').get();
    const users = usersResult.data;

    console.log(`找到 ${users.length} 个用户`);

    if (users.length === 0) {
      return {
        success: true,
        message: '没有用户',
        userCount: 0
      };
    }

    // 统计
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    // 为每个用户发送邮件
    for (const user of users) {
      try {
        if (!user.email) {
          console.log(`用户 ${user._id} 无邮箱，跳过`);
          skipCount++;
          continue;
        }

        console.log(`\n处理用户: ${user._id}, 邮箱: ${user.email}`);

        await sendEmailToUser(user, weekStart, monthStart, now, todayStr);

        console.log(`✅ 发送成功: ${user.email}`);
        successCount++;

        // 添加延迟，避免邮件发送过快
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (userError) {
        console.error(`❌ 用户 ${user._id} 发送失败:`, userError.message);
        failCount++;
      }
    }

    const result = {
      success: true,
      message: '推送完成',
      stats: {
        total: users.length,
        success: successCount,
        skip: skipCount,
        fail: failCount
      },
      time: todayStr
    };

    console.log('\n========== 任务完成 ==========');
    console.log('结果:', JSON.stringify(result));
    console.log('==============================');

    return result;

  } catch (error) {
    console.error('❌ 任务执行失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// 给单个用户发送邮件
async function sendEmailToUser(user, weekStart, monthStart, now, todayStr) {
  const userId = user._id;
  const userEmail = user.email;
  const userOpenid = user.openid || user._openid;

  console.log('用户ID:', userId, 'Openid:', userOpenid);

  // 查询本周数据
  let weekLessons = [];
  
  if (userOpenid) {
    try {
      const weekResult = await db.collection('lessons')
        .where({
          user_id: userOpenid,
          date: db.command.gte(formatDate(weekStart))
        })
        .get();
      weekLessons = weekResult.data || [];
      console.log(`使用openid查询本周: ${weekLessons.length}条`);
    } catch (err) {
      console.log('openid查询失败:', err.message);
    }
  }

  if (weekLessons.length === 0) {
    try {
      const weekResult = await db.collection('lessons')
        .where({
          user_id: userId,
          date: db.command.gte(formatDate(weekStart))
        })
        .get();
      weekLessons = weekResult.data || [];
      console.log(`使用userId查询本周: ${weekLessons.length}条`);
    } catch (err) {
      console.log('userId查询失败:', err.message);
    }
  }

  // 查询本月数据
  let monthLessons = [];
  
  if (userOpenid) {
    try {
      const monthResult = await db.collection('lessons')
        .where({
          user_id: userOpenid,
          date: db.command.gte(formatDate(monthStart))
        })
        .get();
      monthLessons = monthResult.data || [];
      console.log(`使用openid查询本月: ${monthLessons.length}条`);
    } catch (err) {
      console.log('openid查询本月失败:', err.message);
    }
  }

  if (monthLessons.length === 0) {
    try {
      const monthResult = await db.collection('lessons')
        .where({
          user_id: userId,
          date: db.command.gte(formatDate(monthStart))
        })
        .get();
      monthLessons = monthResult.data || [];
      console.log(`使用userId查询本月: ${monthLessons.length}条`);
    } catch (err) {
      console.log('userId查询本月失败:', err.message);
    }
  }

  // 统计本周
  let weeklyStats = { total: 0, oneToOne: 0, class: 0 };
  weekLessons.forEach(lesson => {
    if (lesson.lesson_type === '一对一') {
      weeklyStats.oneToOne += lesson.duration || 0;
    } else if (lesson.lesson_type === '班课') {
      weeklyStats.class += lesson.duration || 0;
    }
  });
  weeklyStats.total = weeklyStats.oneToOne + weeklyStats.class;

  // 统计本月
  let monthlyStats = { total: 0, oneToOne: 0, class: 0 };
  monthLessons.forEach(lesson => {
    if (lesson.lesson_type === '一对一') {
      monthlyStats.oneToOne += lesson.duration || 0;
    } else if (lesson.lesson_type === '班课') {
      monthlyStats.class += lesson.duration || 0;
    }
  });
  monthlyStats.total = monthlyStats.oneToOne + monthlyStats.class;

  // 排序
  const sortedLessons = monthLessons.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.start_time < b.start_time ? 1 : -1;
  });

  // 生成邮件
  const emailHTML = generateEmailHTML(weeklyStats, monthlyStats, sortedLessons, todayStr);

  // 发送
  const mailOptions = {
    from: '"课时管理系统" <15369581103@163.com>',
    to: userEmail,
    subject: `📊 课时统计日报 - ${todayStr}`,
    html: emailHTML
  };

  const mailTransporter = getTransporter();
  await mailTransporter.sendMail(mailOptions);
  
  console.log('邮件已发送到:', userEmail);
}
