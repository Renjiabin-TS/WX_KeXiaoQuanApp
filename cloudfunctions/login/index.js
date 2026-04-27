// 云函数：用户登录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  // 验证输入参数
  if (!event) {
    throw new Error('缺少必要参数 event');
  }

  const { userInfo } = event;

  console.log('登录云函数被调用');

  try {
    // 直接从 context 中获取 openid (不需要 code2Session)
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    console.log('获取 openid 成功:', openid);

    if (!openid) {
      throw new Error('无法获取用户 openid');
    }

    // 2. 查询用户是否已存在
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    console.log('用户查询结果:', userResult.data.length);

    let userId;
    let userData;

    if (userResult.data.length === 0) {
      // 新用户，创建用户记录
      const createTime = new Date().toISOString();
      const createResult = await db.collection('users').add({
        data: {
          openid: openid,
          nickname: userInfo?.nickName || '微信用户',
          avatarUrl: userInfo?.avatarUrl || '',
          email: '',
          created_at: createTime,
          updated_at: createTime
        }
      });

      userId = createResult._id;
      // 构造返回的用户数据（新用户）
      userData = {
        _id: userId,
        openid: openid,
        nickname: userInfo?.nickName || '微信用户',
        avatarUrl: userInfo?.avatarUrl || '',
        email: ''
      };

      console.log('新用户创建成功, userId:', userId);
    } else {
      // 已存在用户，更新用户信息
      userId = userResult.data[0]._id;
      userData = { ...userResult.data[0] };

      // 仅在提供了新的用户信息时才更新
      if (userInfo) {
        const updateData = {
          updated_at: new Date().toISOString()
        };

        if (userInfo.nickName) {
          updateData.nickname = userInfo.nickName;
        }
        if (userInfo.avatarUrl) {
          updateData.avatarUrl = userInfo.avatarUrl;
        }

        await db.collection('users').doc(userId).update({
          data: updateData
        });

        // 同步更新返回的 userData
        userData.nickname = updateData.nickname || userData.nickname;
        userData.avatarUrl = updateData.avatarUrl || userData.avatarUrl;
      }

      console.log('已存在用户更新成功, userId:', userId);
    }

    return {
      success: true,
      data: {
        userId,
        userInfo: userData
      }
    };
  } catch (error) {
    console.error('登录云函数执行失败:', {
      message: error.message,
      stack: error.stack,
      openid: openid || 'unknown'
    });
    return {
      success: false,
      message: error.message || '登录失败'
    };
  }
};
