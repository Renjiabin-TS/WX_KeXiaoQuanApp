// 云函数：添加课时
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { 
    user_id, 
    teacher_name, 
    date, 
    start_time, 
    end_time, 
    duration, 
    lesson_type, 
    student_count, 
    student_name 
  } = event;
  
  try {
    const createTime = new Date().toISOString();
    
    const result = await db.collection('lessons').add({
      data: {
        user_id,
        teacher_name,
        date,
        start_time,
        end_time,
        duration,
        lesson_type,
        student_count: lesson_type === '班课' ? student_count : null,
        student_name: lesson_type === '一对一' ? student_name : null,
        created_at: createTime
      }
    });

    return {
      success: true,
      data: {
        id: result._id
      }
    };
  } catch (error) {
    console.error('添加课时失败:', error);
    return {
      success: false,
      message: error.message || '添加课时失败'
    };
  }
};
