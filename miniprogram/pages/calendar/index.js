// pages/calendar/index.js
const app = getApp();

Page({
  data: {
    currentDate: new Date(),
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    selectedDate: null,
    monthDays: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    selectedLessons: [],
    showDetail: false
  },

  onLoad() {
    this.initCalendar();
    this.loadMonthLessons();
  },

  onShow() {
    this.loadMonthLessons();
  },

  // 检查登录状态
  checkLoginStatus() {
    const userId = wx.getStorageSync('userId');
    const isLoggedIn = app.globalData.isLoggedIn;

    if (!userId || !isLoggedIn) {
      const { monthDays } = this.data;
      const clearedMonthDays = monthDays.map(day => ({
        ...day,
        lessons: []
      }));

      this.setData({
        monthDays: clearedMonthDays,
        selectedLessons: [],
        showDetail: false
      });
    }
  },

  // 初始化日历
  initCalendar() {
    const { currentYear, currentMonth } = this.data;
    const monthDays = this.generateMonthDays(currentYear, currentMonth);
    this.setData({ monthDays });
  },

  // 生成月份天数
  generateMonthDays(year, month) {
    const days = [];
    
    // 获取当月第一天是星期几 (0=周日, 1=周一, ..., 6=周六)
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    
    // 获取当月有多少天
    const lastDay = new Date(year, month, 0).getDate();
    
    // 获取今天的信息
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();
    
    // 计算需要填充的上月天数
    // firstDayOfWeek: 0=周日, 1=周一, ..., 6=周六
    // 周日列(索引0)应该显示当月所有周日
    // 如果1号是周日(firstDayOfWeek=0)，不需要填充
    // 如果1号是周一(firstDayOfWeek=1)，周日列需要显示上月最后一天
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    const prevDaysCount = firstDayOfWeek; // 0-6
    
    // 填充上月的日期（灰色显示）
    for (let i = prevDaysCount - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: false,
        lessons: [],
        dateStr: ''
      });
    }
    
    // 填充当月的日期
    for (let i = 1; i <= lastDay; i++) {
      const isToday = (todayYear === year && todayMonth === month && todayDate === i);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday,
        lessons: [],
        dateStr
      });
    }
    
    // 填充下月的日期，确保有42个格子（6行 x 7列）
    let nextMonthDay = 1;
    while (days.length < 42) {
      days.push({
        day: nextMonthDay,
        isCurrentMonth: false,
        isToday: false,
        lessons: [],
        dateStr: ''
      });
      nextMonthDay++;
    }
    
    console.log('[日历] 生成日历:', year, '年', month, '月, 共', lastDay, '天, 1号是周', this.data.weekDays[firstDayOfWeek]);
    
    return days;
  },

  // 加载当月课时
  async loadMonthLessons() {
    try {
      this.checkLoginStatus();

      if (!wx.cloud) {
        console.log('[日历] 云开发不可用，跳过课时加载');
        return;
      }

      const userId = wx.getStorageSync('userId');
      const userInfo = wx.getStorageSync('userInfo') || {};
      const isLoggedIn = app.globalData.isLoggedIn;

      if (!userId || !isLoggedIn) {
        console.log('[日历] 用户未登录，清空课时数据');
        return;
      }

      const { currentYear, currentMonth } = this.data;
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      // 获取当月最后一天
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      console.log('[日历] 查询范围:', startDate, '到', endDate);

      // 使用云函数查询，突破客户端20条限制
      const openid = userId;
      const _id = userInfo._id || '';

      try {
        const res = await wx.cloud.callFunction({
          name: 'queryLessons',
          data: {
            openid: openid,
            _id: _id,
            startDate: startDate,
            endDate: endDate
          }
        });

        if (res.result && res.result.success) {
          const allLessons = res.result.lessons || [];
          console.log('[日历] 云函数查询返回', res.result.count, '条课时');
          console.log('[日历] 查询到的日期:', res.result.dates);

          // 按日期分组课时
          const lessonsByDate = {};
          allLessons.forEach(lesson => {
            if (!lessonsByDate[lesson.date]) {
              lessonsByDate[lesson.date] = [];
            }
            lessonsByDate[lesson.date].push(lesson);
          });

          // 更新日历中的课时数据
          const monthDays = this.data.monthDays.map(day => {
            if (day.isCurrentMonth && day.dateStr) {
              const lessons = lessonsByDate[day.dateStr] || [];
              let dayColor = '';

              if (lessons.length > 0) {
                // 规则：只有一对一显示绿色，其他情况（包括班课或混合）都显示蓝色
                const hasOneToOne = lessons.some(l => l.lesson_type === '一对一');
                const hasClass = lessons.some(l => l.lesson_type === '班课');
                if (hasClass || (hasOneToOne && hasClass)) {
                  dayColor = 'blue';
                } else if (hasOneToOne) {
                  dayColor = 'green';
                }
              }

              return {
                ...day,
                lessons,
                dayColor
              };
            }
            return day;
          });

          this.setData({ monthDays });
          
          // 调试：打印当月所有周日
          const sundays = monthDays.filter((d, i) => i % 7 === 0 && d.isCurrentMonth);
          console.log('[日历] 周日列数据:', sundays.map(d => d.day + '日'));
        } else {
          console.error('[日历] 云函数查询失败:', res.result?.message);
        }
      } catch (error) {
        console.error('[日历] 加载课时失败:', error);
      }
    } catch (error) {
      console.error('[日历] 加载课时失败:', error);
    }
  },

  // 上个月
  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    
    this.setData({
      currentYear,
      currentMonth,
      selectedDate: null,
      selectedLessons: [],
      showDetail: false
    });
    
    this.initCalendar();
    this.loadMonthLessons();
  },

  // 下个月
  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    
    this.setData({
      currentYear,
      currentMonth,
      selectedDate: null,
      selectedLessons: [],
      showDetail: false
    });
    
    this.initCalendar();
    this.loadMonthLessons();
  },

  // 点击日期
  selectDate(e) {
    const { day, iscurrentmonth, datestr } = e.currentTarget.dataset;
    
    if (!iscurrentmonth) return;

    const lessons = this.data.monthDays.find(d => d.day === day && d.isCurrentMonth)?.lessons || [];

    this.setData({
      selectedDate: datestr,
      selectedLessons: lessons,
      showDetail: true
    });
  },

  // 跳转到添加页面
  goToAdd() {
    const dateStr = this.data.selectedDate;
    const url = dateStr ? `/pages/add/index?date=${dateStr}` : '/pages/add/index';
    wx.navigateTo({ url });
  },

  // 跳转到编辑页面
  goToEdit(e) {
    const lessonId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/edit/index?id=${lessonId}`
    });
  },

  // 导出数据
  exportData() {
    wx.showActionSheet({
      itemList: ['CSV文件（可分享）', '复制到剪贴板'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportToFile();
        } else if (res.tapIndex === 1) {
          this.exportToClipboard();
        }
      }
    });
  },

  // 导出到文件并分享
  exportToFile() {
    wx.showActionSheet({
      itemList: ['导出本月数据', '导出选中日期数据'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportMonthToFile();
        } else if (res.tapIndex === 1 && this.data.selectedDate) {
          this.exportSelectedToFile();
        } else if (res.tapIndex === 1 && !this.data.selectedDate) {
          wx.showToast({ title: '请先选择日期', icon: 'none' });
        }
      }
    });
  },

  // 导出本月数据到CSV文件
  async exportMonthToFile() {
    try {
      wx.showLoading({ title: '生成中...' });

      const userId = wx.getStorageSync('userId');
      const userInfo = wx.getStorageSync('userInfo') || {};
      const isLoggedIn = app.globalData.isLoggedIn;

      if (!userId || !isLoggedIn) {
        wx.hideLoading();
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      const { currentYear, currentMonth } = this.data;
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const openid = userId;
      const _id = userInfo._id || '';

      const res = await wx.cloud.callFunction({
        name: 'queryLessons',
        data: {
          openid: openid,
          _id: _id,
          startDate: startDate,
          endDate: endDate
        }
      });

      if (res.result && res.result.success) {
        const allLessons = res.result.lessons || [];
        const fileName = `${currentYear}年${currentMonth}月课时数据`;
        this.saveAndShareCSV(allLessons, fileName);
      } else {
        wx.hideLoading();
        wx.showToast({ title: '查询失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('导出失败:', error);
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  },

  // 导出选中日期到CSV文件
  exportSelectedToFile() {
    wx.showLoading({ title: '生成中...' });
    const lessons = this.data.selectedLessons;
    const fileName = `${this.data.selectedDate}课时数据`;
    this.saveAndShareCSV(lessons, fileName);
  },

  // 保存CSV并分享
  saveAndShareCSV(lessons, fileName) {
    const csvContent = this.formatToCSV(lessons);

    // 添加UTF-8 BOM以便Excel正确识别中文
    const bom = '\uFEFF';
    const fullContent = bom + csvContent;

    const fileManager = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}.csv`;

    fileManager.writeFile({
      filePath: filePath,
      data: fullContent,
      encoding: 'utf8',
      success: () => {
        wx.hideLoading();
        wx.showModal({
          title: '导出成功',
          content: `已生成${fileName}.csv\n\n点击确定可分享到聊天或用其他应用打开`,
          confirmText: '分享',
          cancelText: '关闭',
          success: (res) => {
            if (res.confirm) {
              // 使用 wx.shareFileMessage 分享文件（基础库 2.19.0+）
              if (wx.canIUse('shareFileMessage')) {
                wx.shareFileMessage({
                  filePath: filePath,
                  fileName: `${fileName}.csv`,
                  success: () => {
                    console.log('分享成功');
                  },
                  fail: (err) => {
                    console.error('分享失败', err);
                    // 回退到打开文件
                    this.openFile(filePath);
                  }
                });
              } else {
                // 旧版本使用 openDocument
                this.openFile(filePath);
              }
            }
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('保存文件失败', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  // 打开文件（可在聊天中分享）
  openFile(filePath) {
    wx.openDocument({
      filePath: filePath,
      fileType: 'csv',
      showMenu: true, // 显示分享菜单
      success: () => {
        console.log('打开文件成功');
      },
      fail: (err) => {
        console.error('打开文件失败', err);
        wx.showToast({ title: '打开失败', icon: 'none' });
      }
    });
  },

  // 复制到剪贴板（旧功能）
  exportToClipboard() {
    wx.showActionSheet({
      itemList: ['导出本月数据', '导出选中日期数据'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportMonthToClipboard();
        } else if (res.tapIndex === 1 && this.data.selectedDate) {
          this.exportSelectedToClipboard();
        } else if (res.tapIndex === 1 && !this.data.selectedDate) {
          wx.showToast({ title: '请先选择日期', icon: 'none' });
        }
      }
    });
  },

  // 导出本月到剪贴板
  async exportMonthToClipboard() {
    try {
      wx.showLoading({ title: '导出中...' });

      const userId = wx.getStorageSync('userId');
      const userInfo = wx.getStorageSync('userInfo') || {};
      const isLoggedIn = app.globalData.isLoggedIn;

      if (!userId || !isLoggedIn) {
        wx.hideLoading();
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      const { currentYear, currentMonth } = this.data;
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const res = await wx.cloud.callFunction({
        name: 'queryLessons',
        data: {
          openid: userId,
          _id: userInfo._id || '',
          startDate: startDate,
          endDate: endDate
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        const allLessons = res.result.lessons || [];
        const csvData = this.formatToCSV(allLessons);
        this.copyToClipboard(csvData);
      } else {
        wx.showToast({ title: '查询失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  },

  // 导出选中日期到剪贴板
  exportSelectedToClipboard() {
    const csvData = this.formatToCSV(this.data.selectedLessons);
    this.copyToClipboard(csvData);
  },

  // 格式化为CSV
  formatToCSV(lessons) {
    if (!lessons || lessons.length === 0) {
      return '日期,老师,类型,开始时间,结束时间,时长,学生信息\n';
    }

    let csv = '日期,老师,类型,开始时间,结束时间,时长,学生信息\n';
    lessons.forEach(lesson => {
      const studentInfo = lesson.lesson_type === '一对一'
        ? lesson.student_name || ''
        : `${lesson.student_count || 0}人`;
      // 转义逗号和引号
      const safeValue = (val) => {
        if (val && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val || '';
      };
      csv += `${lesson.date},${safeValue(lesson.teacher_name)},${lesson.lesson_type},${lesson.start_time},${lesson.end_time},${lesson.duration},${safeValue(studentInfo)}\n`;
    });

    return csv;
  },

  // 复制到剪贴板
  copyToClipboard(data) {
    wx.setClipboardData({
      data,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  }
});
