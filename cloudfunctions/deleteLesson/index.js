// 云函数：删除课时
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { id } = event;
  
  try {
    // 先检查课时是否存在
    const lesson = await db.collection('lessons').doc(id).get();
    
    if (!lesson.data) {
      return {
        success: false,
        message: '课时记录不存在'
      };
    }

    // 删除课时
    await db.collection('lessons').doc(id).remove();

    return {
      success: true,
      data: { id }
    };
  } catch (error) {
    console.error('删除课时失败:', error);
    return {
      success: false,
      message: error.message || '删除课时失败'
    };
  }
};
