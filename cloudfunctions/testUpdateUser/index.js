// 测试云函数：更新用户邮箱
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { openid, email } = event;

  console.log('测试更新用户 - openid:', openid, 'email:', email);

  try {
    // 方法1: 通过 openid 字段查询并更新
    console.log('尝试方法1: 通过 openid 字段查询');
    const userResult = await db.collection('users')
      .where({
        openid: openid
      })
      .get();

    console.log('查询结果:', JSON.stringify(userResult));

    if (userResult.data && userResult.data.length > 0) {
      const userId = userResult.data[0]._id;
      console.log('找到用户ID:', userId);

      const updateResult = await db.collection('users')
        .doc(userId)
        .update({
          data: {
            email: email,
            emailVerified: true,
            emailVerifiedTime: new Date().toISOString()
          }
        });

      console.log('更新结果:', JSON.stringify(updateResult));

      return {
        success: true,
        message: '更新成功（方法1）',
        method: 'openid字段查询',
        userId: userId
      };
    }

    // 方法2: 通过 _openid 字段查询并更新
    console.log('尝试方法2: 通过 _openid 字段查询');
    const userResult2 = await db.collection('users')
      .where({
        _openid: openid
      })
      .get();

    console.log('查询结果:', JSON.stringify(userResult2));

    if (userResult2.data && userResult2.data.length > 0) {
      const userId = userResult2.data[0]._id;
      console.log('找到用户ID:', userId);

      const updateResult = await db.collection('users')
        .doc(userId)
        .update({
          data: {
            email: email,
            emailVerified: true,
            emailVerifiedTime: new Date().toISOString()
          }
        });

      console.log('更新结果:', JSON.stringify(updateResult));

      return {
        success: true,
        message: '更新成功（方法2）',
        method: '_openid字段查询',
        userId: userId
      };
    }

    return {
      success: false,
      message: '未找到用户记录'
    };

  } catch (error) {
    console.error('测试更新失败:', error);
    return {
      success: false,
      message: '更新失败: ' + error.message,
      error: JSON.stringify(error)
    };
  }
};
