// 调试课时数据结构
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('========== 开始调试课时数据 ==========');

  try {
    // 获取所有用户
    const usersResult = await db.collection('users').get();
    console.log(`找到 ${usersResult.data.length} 个用户`);

    if (usersResult.data.length === 0) {
      return {
        success: false,
        message: '没有用户数据'
      };
    }

    const user = usersResult.data[0];
    console.log('用户信息:', {
      _id: user._id,
      openid: user.openid,
      _openid: user._openid,
      email: user.email
    });

    const userId = user._id;

    // 查询所有课时数据（限制前5条）
    console.log('查询所有课时数据...');
    const allLessonsResult = await db.collection('lessons')
      .limit(5)
      .get();

    console.log(`找到 ${allLessonsResult.data.length} 条课时记录`);

    if (allLessonsResult.data.length === 0) {
      return {
        success: false,
        message: '没有课时数据',
        userId: userId
      };
    }

    // 打印课时数据的字段结构
    console.log('课时数据结构（第一条记录）:');
    console.log(JSON.stringify(allLessonsResult.data[0], null, 2));

    // 分析字段
    const lessonFields = Object.keys(allLessonsResult.data[0]);
    console.log('课时数据字段:', lessonFields);

    // 尝试不同的查询方式
    const queries = [
      { name: 'user_id', value: userId },
      { name: 'openid', value: user.openid },
      { name: '_openid', value: user._openid }
    ];

    const queryResults = [];

    for (const query of queries) {
      try {
        console.log(`\n尝试使用 ${query.name} 查询...`);
        const result = await db.collection('lessons')
          .where({
            [query.name]: query.value
          })
          .get();

        console.log(`${query.name} 查询结果: 找到 ${result.data.length} 条记录`);

        if (result.data.length > 0) {
          console.log('第一条记录:', JSON.stringify(result.data[0], null, 2));
        }

        queryResults.push({
          field: query.name,
          value: query.value,
          count: result.data.length,
          success: true
        });
      } catch (err) {
        console.log(`${query.name} 查询失败:`, err.message);
        queryResults.push({
          field: query.name,
          value: query.value,
          count: 0,
          success: false,
          error: err.message
        });
      }
    }

    return {
      success: true,
      userInfo: {
        _id: user._id,
        openid: user.openid,
        _openid: user._openid
      },
      lessonStructure: lessonFields,
      sampleLesson: allLessonsResult.data[0],
      queryResults: queryResults
    };

  } catch (error) {
    console.error('调试失败:', error);
    return {
      success: false,
      message: '调试失败: ' + error.message,
      error: error.toString()
    };
  }
};
