// 测试邮件发送功能
const cloud = require('wx-server-sdk');
const nodemailer = require('nodemailer');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  console.log('========== 开始测试邮件发送 ==========');

  try {
    // 创建邮件发送器
    const transporter = nodemailer.createTransport({
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
      }
    });

    console.log('邮件发送器创建成功');

    // 测试连接
    await transporter.verify();
    console.log('SMTP 连接测试成功');

    // 发送测试邮件
    const mailOptions = {
      from: '"课时管理系统" <15369581103@163.com>',
      to: event.testEmail || 'test@example.com',
      subject: '测试邮件',
      text: '这是一封测试邮件，如果收到说明邮件发送功能正常。',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">测试邮件</h2>
          <p>这是一封测试邮件，如果收到说明邮件发送功能正常。</p>
          <p style="color: #666; font-size: 12px;">发送时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `
    };

    console.log('正在发送测试邮件到:', mailOptions.to);

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ 测试邮件发送成功!');
    console.log('邮件ID:', info.messageId);

    return {
      success: true,
      message: '测试邮件发送成功',
      messageId: info.messageId,
      to: mailOptions.to
    };

  } catch (error) {
    console.error('❌ 测试邮件发送失败:', error);
    console.error('错误详情:', error.toString());
    console.error('错误堆栈:', error.stack);

    return {
      success: false,
      message: '测试邮件发送失败: ' + error.message,
      error: error.toString(),
      stack: error.stack
    };
  }
};
