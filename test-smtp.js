const nodemailer = require('nodemailer');

// 网易163邮箱SMTP配置
const transporter = nodemailer.createTransport({
  host: 'smtp.163.com',
  port: 465,
  secure: true,  // 使用SSL
  auth: {
    user: '15369581103@163.com',
    pass: 'TBZ5cBHmWYihzFg8'
  },
  tls: {
    rejectUnauthorized: false  // 允许自签名证书（生产环境不建议使用）
  }
});

// 测试邮件内容
const mailOptions = {
  from: '"课时管理系统" <15369581103@163.com>',
  to: '15369581103@163.com',  // 发送给自己的邮箱
  subject: 'SMTP测试邮件',
  html: `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h2>SMTP测试</h2>
      <p>如果您收到这封邮件，说明SMTP配置正确！</p>
      <p>测试时间：${new Date().toLocaleString('zh-CN')}</p>
    </div>
  `
};

console.log('开始测试SMTP连接...');
console.log('SMTP服务器: smtp.163.com:465');
console.log('发件人: 15369581103@163.com');

// 先验证连接配置
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP配置验证失败:');
    console.error(error);
  } else {
    console.log('SMTP配置验证成功！');

    // 发送测试邮件
    console.log('正在发送测试邮件...');
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('发送邮件失败:');
        console.error(error);
      } else {
        console.log('✓ 邮件发送成功！');
        console.log('消息ID:', info.messageId);
        console.log('响应:', info.response);
      }
      // 关闭连接
      transporter.close();
    });
  }
});
