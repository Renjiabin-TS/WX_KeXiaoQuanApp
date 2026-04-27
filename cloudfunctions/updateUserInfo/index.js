// 云函数：更新用户信息
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, openid, email, avatarUrl, nickname } = event;

  console.log('更新用户信息云函数被调用:', event);

  try {
    const updateTime = new Date().toISOString();
    const updateData = {
      updated_at: updateTime
    };

    // 只更新提供的字段
    if (email) updateData.email = email;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (nickname) updateData.nickname = nickname;

    // 优先使用 openid 查询，如果没有则使用 userId
    let docId;
    if (openid) {
      const userResult = await db.collection('users').where({
        openid: openid
      }).get();

      if (userResult.data.length > 0) {
        docId = userResult.data[0]._id;
        console.log('通过 openid 找到用户:', docId);
      }
    } else if (userId) {
      docId = userId;
      console.log('使用 userId:', docId);
    }

    if (!docId) {
      throw new Error('用户不存在');
    }

    await db.collection('users').doc(docId).update({
      data: updateData
    });

    console.log('用户信息更新成功:', updateData);

    return {
      success: true,
      data: { userId: docId, ...updateData }
    };
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      success: false,
      message: error.message || '更新用户信息失败'
    };
  }
};
