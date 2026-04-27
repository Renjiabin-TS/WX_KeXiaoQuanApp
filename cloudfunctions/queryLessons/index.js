// 云函数入口文件 - 查询用户课时数据
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { openid, startDate, endDate } = event;
  
  console.log('========== 查询课时数据 ==========');
  console.log('openid:', openid);
  console.log('查询范围:', startDate, '到', endDate);

  try {
    let allLessons = [];

    // 查询1：使用 openid 查询
    try {
      const result1 = await db.collection('lessons')
        .where({
          user_id: openid,
          date: db.command.gte(startDate)
        })
        .limit(300) // 云函数端可设置更高限制
        .get();
      
      console.log('openid查询返回', result1.data.length, '条');
      
      // 按结束日期过滤
      const filtered = result1.data.filter(l => l.date <= endDate);
      allLessons = filtered;
      console.log('过滤后保留', filtered.length, '条');
    } catch (e) {
      console.log('openid查询失败:', e.message);
    }

    // 查询2：如果传入了 _id，用 _id 查询
    if (event._id && event._id !== openid) {
      try {
        const result2 = await db.collection('lessons')
          .where({
            user_id: event._id,
            date: db.command.gte(startDate)
          })
          .limit(300)
          .get();
        
        // 合并去重
        result2.data.forEach(lesson => {
          if (lesson.date <= endDate && !allLessons.find(l => l._id === lesson._id)) {
            allLessons.push(lesson);
          }
        });
        console.log('_id查询合并后共', allLessons.length, '条');
      } catch (e) {
        console.log('_id查询失败:', e.message);
      }
    }

    // 按日期和时间排序
    allLessons.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.start_time < b.start_time ? 1 : -1;
    });

    console.log('最终返回', allLessons.length, '条课时');

    return {
      success: true,
      lessons: allLessons,
      count: allLessons.length,
      dates: [...new Set(allLessons.map(l => l.date))].sort()
    };

  } catch (error) {
    console.error('查询失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
