// 云函数入口文件
const cloud = require('wx-server-sdk');
const nodemailer = require('nodemailer');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 延迟创建邮件发送器（避免云函数初始化时就连接SMTP）
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.163.com',  // 网易163邮箱SMTP服务器
      port: 465,  // SSL端口
      secure: true,  // 使用SSL
      auth: {
        user: '15369581103@163.com',  // 发件人邮箱
        pass: 'TBZ5cBHmWYihzFg8'   // 网易163邮箱授权码
      },
      tls: {
        rejectUnauthorized: false  // 允许自签名证书
      },
      pool: true,
      maxConnections: 1,
      connectionTimeout: 30000,  // 30秒连接超时
      greetingTimeout: 10000,     // 10秒握手超时
      socketTimeout: 10000        // 10秒socket超时
    });
  }
  return transporter;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { email } = event;

  if (!email) {
    return {
      success: false,
      message: '邮箱地址不能为空'
    };
  }

  // 邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: '邮箱格式不正确'
    };
  }

  try {
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 计算过期时间（5分钟）
    const expireTime = new Date(Date.now() + 5 * 60 * 1000);

    // 保存验证码到数据库（使用try-catch处理集合不存在的情况）
    try {
      await db.collection('verificationCodes').add({
        data: {
          email: email,
          code: code,
          createTime: new Date().toISOString(),
          expireTime: expireTime.toISOString(),
          status: 'pending' // pending: 未使用, used: 已使用, expired: 已过期
        }
      });
    } catch (dbError) {
      // 如果集合不存在，先创建集合再添加
      if (dbError.errCode === -502001 || dbError.errCode === -502005) {
        // 先尝试在集合中添加一个临时记录来创建集合
        try {
          await db.collection('verificationCodes').add({
            data: {
              email: email,
              code: code,
              createTime: new Date().toISOString(),
              expireTime: expireTime.toISOString(),
              status: 'pending'
            }
          });
        } catch (retryError) {
          console.error('创建集合失败:', retryError);
          throw new Error('数据库初始化失败，请手动创建 verificationCodes 集合');
        }
      } else {
        throw dbError;
      }
    }

    // 发送邮件
    const mailOptions = {
      from: '"课时管理系统" <15369581103@163.com>',
      to: email,
      subject: '验证码 - 课时管理系统',
      html: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>验证码</h2>
          <p>您好，</p>
          <p>您的验证码是：<strong style="font-size: 24px; color: #007AFF;">${code}</strong></p>
          <p>验证码有效期为 <strong>5分钟</strong>，请尽快使用。</p>
          <p>如果这不是您的操作，请忽略此邮件。</p>
          <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `
    };

    console.log('开始发送邮件到:', email);
    const mailTransporter = getTransporter();
    const mailResult = await mailTransporter.sendMail(mailOptions);
    console.log('邮件发送结果:', mailResult);

    return {
      success: true,
      message: '验证码发送成功'
    };
  } catch (error) {
    console.error('发送验证码失败:', error);
    console.error('错误详情:', JSON.stringify(error, null, 2));
    return {
      success: false,
      message: '发送失败：' + error.message,
      error: error.toString()
    };
  }
};
