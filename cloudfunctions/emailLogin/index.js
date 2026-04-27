// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { email, code } = event;

  if (!email || !code) {
    return {
      success: false,
      message: '邮箱和验证码不能为空'
    };
  }

  try {
    // 查询最新的有效验证码
    const currentTime = new Date().toISOString();
    const verifyResult = await db.collection('verificationCodes')
      .where({
        email: email,
        code: code,
        status: 'pending'
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get();

    if (verifyResult.data.length === 0) {
      return {
        success: false,
        message: '验证码错误或已失效'
      };
    }

    const verifyData = verifyResult.data[0];

    // 检查验证码是否过期
    if (new Date(verifyData.expireTime) < new Date()) {
      // 标记为已过期
      await db.collection('verificationCodes').doc(verifyData._id).update({
        data: {
          status: 'expired'
        }
      });
      return {
        success: false,
        message: '验证码已过期'
      };
    }

    // 标记验证码为已使用
    await db.collection('verificationCodes').doc(verifyData._id).update({
      data: {
        status: 'used',
        usedTime: new Date().toISOString()
      }
    });

    // 查询用户是否已存在
    const userResult = await db.collection('users')
      .where({
        email: email
      })
      .get();

    let userId;
    let userData;

    if (userResult.data.length === 0) {
      // 新用户，创建用户记录
      const createTime = new Date().toISOString();
      const createResult = await db.collection('users').add({
        data: {
          email,
          nickname: email.split('@')[0],
          avatarUrl: '',
          created_at: createTime,
          updated_at: createTime
        }
      });

      userId = createResult._id;
      userData = {
        _id: createResult._id,
        email,
        nickname: email.split('@')[0],
        avatarUrl: ''
      };
    } else {
      // 已存在用户
      userId = userResult.data[0]._id;
      userData = userResult.data[0];

      // 更新登录时间
      await db.collection('users').doc(userId).update({
        data: {
          updated_at: new Date().toISOString()
        }
      });
    }

    return {
      success: true,
      userId,
      userData
    };
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      message: '登录失败：' + error.message
    };
  }
};
