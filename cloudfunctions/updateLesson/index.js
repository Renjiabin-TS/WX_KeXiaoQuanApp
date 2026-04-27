// 云函数：更新课时
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { 
    id,
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
    const updateTime = new Date().toISOString();
    
    await db.collection('lessons').doc(id).update({
      data: {
        teacher_name,
        date,
        start_time,
        end_time,
        duration,
        lesson_type,
        student_count: lesson_type === '班课' ? student_count : null,
        student_name: lesson_type === '一对一' ? student_name : null,
        updated_at: updateTime
      }
    });

    return {
      success: true,
      data: { id }
    };
  } catch (error) {
    console.error('更新课时失败:', error);
    return {
      success: false,
      message: error.message || '更新课时失败'
    };
  }
};
