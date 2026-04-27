// 云函数入口文件 - 验证邮箱
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { email, code, openid } = event;

  console.log('验证邮箱 - 邮箱:', email, '验证码:', code, 'openid:', openid);

  if (!email || !code) {
    return {
      success: false,
      message: '邮箱和验证码不能为空'
    };
  }

  if (!openid) {
    return {
      success: false,
      message: '用户未登录'
    };
  }

  try {
    // 查询最新的未使用且未过期的验证码
    const result = await db.collection('verificationCodes')
      .where({
        email: email,
        status: 'pending'
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get();

    if (!result.data || result.data.length === 0) {
      return {
        success: false,
        message: '验证码不存在或已失效，请重新发送'
      };
    }

    const verificationData = result.data[0];

    // 检查验证码是否匹配
    if (verificationData.code !== code) {
      return {
        success: false,
        message: '验证码错误'
      };
    }

    // 检查验证码是否过期
    const expireTime = new Date(verificationData.expireTime);
    const now = new Date();

    if (now > expireTime) {
      // 更新验证码状态为已过期
      await db.collection('verificationCodes')
        .doc(verificationData._id)
        .update({
          data: {
            status: 'expired'
          }
        });

      return {
        success: false,
        message: '验证码已过期，请重新发送'
      };
    }

    // 验证成功，更新验证码状态为已使用
    await db.collection('verificationCodes')
      .doc(verificationData._id)
      .update({
        data: {
          status: 'used',
          useTime: now.toISOString()
        }
      });

    // 更新用户信息，添加邮箱
    console.log('更新用户信息 - openid/userId:', openid, 'email:', email);

    // 先尝试通过 openid 字段查询（登录云函数使用的字段）
    let userResult = await db.collection('users')
      .where({
        openid: openid
      })
      .get();

    console.log('通过 openid 查询用户结果:', JSON.stringify(userResult));

    // 如果通过 openid 查不到，尝试通过 _openid 字段查询（云数据库自动生成的字段）
    if (!userResult.data || userResult.data.length === 0) {
      console.log('openid 查询无结果，尝试通过 _openid 查询');
      userResult = await db.collection('users')
        .where({
          _openid: openid
        })
        .get();

      console.log('通过 _openid 查询用户结果:', JSON.stringify(userResult));
    }

    // 如果还是查不到，尝试通过文档 ID 查询（假设传入的是 userId）
    if (!userResult.data || userResult.data.length === 0) {
      console.log('_openid 查询无结果，尝试通过文档 ID 查询');
      try {
        const docResult = await db.collection('users').doc(openid).get();
        console.log('通过文档 ID 查询结果:', JSON.stringify(docResult));

        if (docResult.data) {
          userResult.data = [docResult.data];
        }
      } catch (err) {
        console.log('文档 ID 查询失败，继续其他方式:', err);
      }
    }

    if (userResult.data && userResult.data.length > 0) {
      // 用户记录存在，更新邮箱信息
      console.log('用户记录存在，准备更新');
      const userId = userResult.data[0]._id;
      console.log('用户ID:', userId);

      try {
        await db.collection('users')
          .doc(userId)
          .update({
            data: {
              email: email,
              emailVerified: true,
              emailVerifiedTime: now.toISOString()
            }
          });

        console.log('用户信息更新成功');
      } catch (updateError) {
        console.error('更新用户信息失败:', updateError);
        return {
          success: false,
          message: '更新用户信息失败: ' + updateError.message
        };
      }
    } else {
      console.log('用户记录不存在，无法更新邮箱，openid:', openid);
      return {
        success: false,
        message: '用户不存在，请先登录'
      };
    }

    console.log('邮箱验证成功 - openid:', openid, 'email:', email);

    return {
      success: true,
      message: '邮箱验证成功'
    };

  } catch (error) {
    console.error('验证邮箱失败:', error);

    // 如果是集合不存在错误，先更新用户信息
    if (error.errCode === -502001 || error.errCode === -502005) {
      try {
        await db.collection('users')
          .where({
            _openid: openid
          })
          .update({
            data: {
              email: email,
              emailVerified: true,
              emailVerifiedTime: new Date().toISOString()
            }
          });

        return {
          success: true,
          message: '邮箱验证成功'
        };
      } catch (updateError) {
        console.error('更新用户信息失败:', updateError);
        return {
          success: false,
          message: '验证失败，请稍后重试'
        };
      }
    }

    return {
      success: false,
      message: '验证失败，请稍后重试'
    };
  }
};
