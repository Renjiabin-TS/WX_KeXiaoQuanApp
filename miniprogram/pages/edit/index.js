// pages/edit/index.js
const app = getApp();

Page({
  data: {
    lessonId: '',
    date: '',
    startTime: '',
    endTime: '',
    lessonType: '一对一',
    teacherName: '',
    studentName: '',
    studentCount: '',
    duration: 0
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ lessonId: options.id });
      this.loadLessonDetail();
    }
  },

  // 加载课时详情
  async loadLessonDetail() {
    try {
      const db = wx.cloud.database();
      const result = await db.collection('lessons')
        .doc(this.data.lessonId)
        .get();

      if (result.data) {
        const lesson = result.data;
        this.setData({
          date: lesson.date,
          startTime: lesson.start_time,
          endTime: lesson.end_time,
          lessonType: lesson.lesson_type,
          teacherName: lesson.teacher_name,
          studentName: lesson.student_name || '',
          studentCount: lesson.student_count || '',
          duration: lesson.duration
        });
      }
    } catch (error) {
      console.error('加载课时详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 格式化日期（从add页面复制）
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 格式化时间（从add页面复制）
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ date: e.detail.value });
    this.checkTimeConflict();
  },

  // 开始时间选择
  onStartTimeChange(e) {
    this.setData({ startTime: e.detail.value });
    this.calculateDuration();
    this.checkTimeConflict();
  },

  // 结束时间选择
  onEndTimeChange(e) {
    this.setData({ endTime: e.detail.value });
    this.calculateDuration();
    this.checkTimeConflict();
  },

  // 课程类型选择
  onTypeChange(e) {
    const types = ['一对一', '班课'];
    this.setData({
      lessonType: types[e.detail.value]
    });
  },

  // 输入老师姓名
  onTeacherNameInput(e) {
    this.setData({ teacherName: e.detail.value });
  },

  // 输入学生姓名
  onStudentNameInput(e) {
    this.setData({ studentName: e.detail.value });
  },

  // 输入学生数量
  onStudentCountInput(e) {
    this.setData({ studentCount: e.detail.value });
  },

  // 计算课时（从add页面复制）
  calculateDuration() {
    const { startTime, endTime } = this.data;
    
    if (!startTime || !endTime) return;

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    let durationMinutes = endTotalMinutes - startTotalMinutes;

    if (durationMinutes <= 0) {
      durationMinutes = 0;
    }

    // 四舍五入保留1位小数
    const durationHours = Math.round((durationMinutes / 60) * 10) / 10;

    this.setData({ duration: durationHours });
  },

  // 检查时间冲突（从add页面复制）
  async checkTimeConflict() {
    const { date, startTime, endTime, lessonId } = this.data;
    
    if (!date || !startTime || !endTime) return;

    try {
      const db = wx.cloud.database();
      const userId = app.globalData.userId;
      
      if (!userId) return;

      const result = await db.collection('lessons')
        .where({
          user_id: userId,
          date,
          start_time: db.command.lt(endTime),
          end_time: db.command.gt(startTime)
        })
        .get();

      // 排除自己
      const conflicts = result.data.filter(lesson => lesson._id !== lessonId);

      if (conflicts.length > 0) {
        wx.showModal({
          title: '时间冲突',
          content: `该时间段已有其他课时记录，是否继续保存？`,
          confirmText: '继续',
          confirmColor: '#1989FA',
          cancelText: '取消'
        });
      }
    } catch (error) {
      console.error('检查时间冲突失败:', error);
    }
  },

  // 验证表单
  validateForm() {
    const { date, startTime, endTime, lessonType, teacherName, duration } = this.data;

    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return false;
    }

    if (!startTime || !endTime) {
      wx.showToast({ title: '请选择时间', icon: 'none' });
      return false;
    }

    if (startTime >= endTime) {
      wx.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' });
      return false;
    }

    if (!teacherName.trim()) {
      wx.showToast({ title: '请输入老师姓名', icon: 'none' });
      return false;
    }

    // 学生姓名和学生人数改为非必填
    // if (lessonType === '一对一' && !this.data.studentName.trim()) {
    //   wx.showToast({ title: '请输入学生姓名', icon: 'none' });
    //   return false;
    // }

    // if (lessonType === '班课' && !this.data.studentCount) {
    //   wx.showToast({ title: '请输入学生数量', icon: 'none' });
    //   return false;
    // }

    if (duration <= 0) {
      wx.showToast({ title: '课时必须大于0', icon: 'none' });
      return false;
    }

    return true;
  },

  // 保存修改
  async saveLesson() {
    if (!this.validateForm()) return;

    try {
      wx.showLoading({ title: '保存中...' });

      const { 
        lessonId,
        date, 
        startTime, 
        endTime, 
        lessonType, 
        teacherName, 
        studentName, 
        studentCount, 
        duration 
      } = this.data;

      const lessonData = {
        id: lessonId,
        teacher_name: teacherName,
        date,
        start_time: startTime,
        end_time: endTime,
        duration,
        lesson_type: lessonType,
        student_count: lessonType === '班课' ? parseInt(studentCount) : null,
        student_name: lessonType === '一对一' ? studentName : null
      };

      const result = await wx.cloud.callFunction({
        name: 'updateLesson',
        data: lessonData
      });

      wx.hideLoading();

      if (result.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(result.result.message || '保存失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存课时失败:', error);
      
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});
