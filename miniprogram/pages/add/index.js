const app = getApp();

Page({
  data: {
    isEditing: false,
    editingId: null,
    lessonTypes: ['一对一', '班课'],
    lessonTypeIndex: 0,
    formData: {
      date: '',
      start_time: '09:30',
      end_time: '11:30',
      duration: 2,
      lesson_type: '一对一',
      teacher_name: '',
      student_name: ''
    }
  },

  onLoad(options) {
    // 设置默认日期为今天
    const today = this.formatDate(new Date());
    this.setData({
      'formData.date': today
    });

    // 如果有 editingId 参数，说明是编辑模式
    if (options.id) {
      this.setData({
        isEditing: true,
        editingId: options.id
      });
      wx.setNavigationBarTitle({ title: '编辑课时' });
      this.loadLesson(options.id);
    }
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 根据时间计算课时数
  calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 2;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) return 1;

    // 每30分钟算0.5课时
    const duration = Math.round(diffMinutes / 30) * 0.5;
    return Math.max(0.5, duration);
  },

  // 加载课时数据（编辑模式）
  loadLesson(id) {
    const db = wx.cloud.database();
    db.collection('lessons').doc(id).get({
      success: res => {
        if (res.data) {
          const lessonTypeIndex = this.data.lessonTypes.indexOf(res.data.lesson_type || '一对一');
          this.setData({
            formData: {
              date: res.data.date || '',
              start_time: res.data.start_time || '09:30',
              end_time: res.data.end_time || '11:30',
              duration: res.data.duration || 2,
              lesson_type: res.data.lesson_type || '一对一',
              teacher_name: res.data.teacher_name || '',
              student_name: res.data.student_name || ''
            },
            lessonTypeIndex: lessonTypeIndex >= 0 ? lessonTypeIndex : 0
          });
        }
      },
      fail: err => {
        console.error('加载课时失败', err);
      }
    });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.date': e.detail.value
    });
  },

  // 开始时间选择
  onStartTimeChange(e) {
    const startTime = e.detail.value;
    const endTime = this.data.formData.end_time || '11:30';
    const duration = this.calculateDuration(startTime, endTime);
    this.setData({
      'formData.start_time': startTime,
      'formData.duration': duration
    });
  },

  // 结束时间选择
  onEndTimeChange(e) {
    const endTime = e.detail.value;
    const startTime = this.data.formData.start_time || '09:30';
    const duration = this.calculateDuration(startTime, endTime);
    this.setData({
      'formData.end_time': endTime,
      'formData.duration': duration
    });
  },

  // 课程类型选择
  onLessonTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      lessonTypeIndex: index,
      'formData.lesson_type': this.data.lessonTypes[index]
    });
  },

  // 老师姓名输入
  onTeacherNameInput(e) {
    this.setData({
      'formData.teacher_name': e.detail.value
    });
  },

  // 学生姓名输入
  onStudentNameInput(e) {
    this.setData({
      'formData.student_name': e.detail.value
    });
  },

  // 保存课时
  saveLesson() {
    const { formData, isEditing, editingId } = this.data;

    // 验证必填项
    if (!formData.date) {
      wx.showToast({ title: '请选择授课日期', icon: 'none' });
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      wx.showToast({ title: '请选择授课时间', icon: 'none' });
      return;
    }
    if (!formData.duration || formData.duration <= 0) {
      wx.showToast({ title: '请输入有效的课时数', icon: 'none' });
      return;
    }
    if (!formData.teacher_name) {
      wx.showToast({ title: '请输入老师姓名', icon: 'none' });
      return;
    }

    // 检查登录状态
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 检查时段冲突
    wx.showLoading({ title: '检查中...' });
    this.checkTimeConflict(userId, formData.date, formData.start_time, formData.end_time, isEditing ? editingId : null)
      .then(hasConflict => {
        if (hasConflict) {
          wx.hideLoading();
          wx.showModal({
            title: '时段冲突',
            content: '该时段已有其他课时安排，请选择其他时间',
            showCancel: false
          });
          return;
        }
        this.doSaveLesson(userId, formData, isEditing, editingId);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('检查冲突失败', err);
        // 检查失败时仍然允许保存
        this.doSaveLesson(userId, formData, isEditing, editingId);
      });
  },

  // 检查时段冲突
  checkTimeConflict(userId, date, startTime, endTime, excludeId) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      const [newStartH, newStartM] = startTime.split(':').map(Number);
      const [newEndH, newEndM] = endTime.split(':').map(Number);
      const newStartMinutes = newStartH * 60 + newStartM;
      const newEndMinutes = newEndH * 60 + newEndM;

      db.collection('lessons').where({
        user_id: userId,
        date: date
      }).get({
        success: res => {
          const lessons = res.data || [];
          // 过滤掉当前编辑的课时
          const otherLessons = excludeId ? lessons.filter(l => l._id !== excludeId) : lessons;

          // 检查是否有时段重叠
          for (const lesson of otherLessons) {
            const [existStartH, existStartM] = lesson.start_time.split(':').map(Number);
            const [existEndH, existEndM] = lesson.end_time.split(':').map(Number);
            const existStartMinutes = existStartH * 60 + existStartM;
            const existEndMinutes = existEndH * 60 + existEndM;

            // 时段重叠条件：新开始时间 < 已有结束时间 且 新结束时间 > 已有开始时间
            if (newStartMinutes < existEndMinutes && newEndMinutes > existStartMinutes) {
              resolve(true);
              return;
            }
          }
          resolve(false);
        },
        fail: err => {
          reject(err);
        }
      });
    });
  },

  // 执行保存
  doSaveLesson(userId, formData, isEditing, editingId) {
    wx.showLoading({ title: '保存中...' });

    const db = wx.cloud.database();
    const lessonData = {
      ...formData,
      user_id: userId, // 添加用户ID关联
      updatedAt: db.serverDate()
    };

    // 转换空字符串为 null
    if (lessonData.student_name === '') lessonData.student_name = null;

    const savePromise = isEditing
      ? db.collection('lessons').doc(editingId).update({ data: lessonData })
      : db.collection('lessons').add({ data: { ...lessonData, createdAt: db.serverDate() } });

    savePromise
      .then(res => {
        wx.hideLoading();
        wx.showToast({
          title: isEditing ? '修改成功' : '添加成功',
          icon: 'success'
        });

        // 触发全局数据更新
        app.updateLessons();

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('保存失败', err);
        wx.showToast({ title: '保存失败', icon: 'error' });
      });
  }
});
