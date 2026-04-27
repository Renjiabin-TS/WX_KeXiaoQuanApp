// pages/index/index.js
const app = getApp();

Page({
  data: {
    stats: {
      weeklyTotal: 0,
      weeklyOneToOne: 0,
      weeklyClass: 0,
      monthlyTotal: 0,
      monthlyOneToOne: 0,
      monthlyClass: 0
    },
    lessons: [],
    loading: true,
    verifyNumbers: [],
    verifyLessonId: null,
    slideProgress: 0,
    isSliding: false,
    startX: 0,
    containerWidth: 520,
    showDisclaimerModal: false,  // 免责弹窗
    disclaimerChecked: false    // 复选框状态
  },

  onLoad() {
    this.checkDisclaimer();
    this.loadStats();
    this.loadLessons();
  },

  onShow() {
    // 每次进入页面时重新加载数据
    this.checkDisclaimer();
    this.loadStats();
    this.loadLessons();
  },
  
  // 检查免责状态
  checkDisclaimer() {
    const userId = wx.getStorageSync('userId');
    const disclaimerConfirmed = wx.getStorageSync('disclaimerConfirmed') || false;
    
    // 如果未登录且未确认，显示免责弹窗
    if (!userId && !disclaimerConfirmed) {
      this.setData({ showDisclaimerModal: true });
    }
  },
  
  // 切换免责复选框
  toggleDisclaimer() {
    this.setData({ disclaimerChecked: !this.data.disclaimerChecked });
  },
  
  // 确认免责声明
  confirmDisclaimer() {
    app.confirmDisclaimer();
    this.setData({ showDisclaimerModal: false });
    wx.showToast({
      title: '已确认',
      icon: 'success'
    });
  },
  
  // 拒绝免责
  rejectDisclaimer() {
    wx.showModal({
      title: '提示',
      content: '您需要同意免责声明才能使用本程序，是否继续？',
      confirmText: '同意',
      cancelText: '退出',
      success: (res) => {
        if (res.confirm) {
          this.confirmDisclaimer();
        } else {
          // 退出小程序
          wx.showToast({
            title: '已退出',
            icon: 'none',
            duration: 1500,
            complete: () => {
              wx.navigateBack({
                fail: () => {
                  wx.switchTab({
                    url: '/pages/index/index'
                  });
                }
              });
            }
          });
        }
      }
    });
  },

  // 检查登录状态
  checkLoginStatus() {
    const userId = wx.getStorageSync('userId');
    const isLoggedIn = app.globalData.isLoggedIn;

    console.log('首页检查登录状态:', { userId, isLoggedIn });

    // 如果未登录，清空数据
    if (!userId || !isLoggedIn) {
      this.setData({
        lessons: [],
        stats: {
          weeklyTotal: 0,
          weeklyOneToOne: 0,
          weeklyClass: 0,
          monthlyTotal: 0,
          monthlyOneToOne: 0,
          monthlyClass: 0
        },
        loading: false
      });
    }
  },

  // 跳转到添加页面
  goToAdd() {
    wx.navigateTo({
      url: '/pages/add/index'
    });
  },

  // 跳转到编辑页面
  goToEdit(e) {
    const lesson = e.currentTarget.dataset.lesson;
    wx.navigateTo({
      url: `/pages/edit/index?id=${lesson._id}`
    });
  },

  // 加载统计数据
  async loadStats() {
    try {
      // 首先检查登录状态
      this.checkLoginStatus();

      // 检查云开发是否可用
      if (!wx.cloud) {
        console.log('云开发不可用，跳过统计数据加载');
        this.setData({ loading: false });
        return;
      }

      const db = wx.cloud.database();
      const _ = db.command;
      const $ = db.command.aggregate;

      const userId = wx.getStorageSync('userId');
      const isLoggedIn = app.globalData.isLoggedIn;

      if (!userId || !isLoggedIn) {
        console.log('用户未登录，清空统计数据');
        this.setData({
          stats: {
            weeklyTotal: 0,
            weeklyOneToOne: 0,
            weeklyClass: 0,
            monthlyTotal: 0,
            monthlyOneToOne: 0,
            monthlyClass: 0
          },
          loading: false
        });
        return;
      }

      // 获取当前日期
      const now = new Date();
      const weekStart = this.getWeekStart(now);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // 查询本周数据
      const weekResult = await db.collection('lessons')
        .aggregate()
        .match({
          user_id: userId,
          date: _.gte(this.formatDate(weekStart))
        })
        .group({
          _id: '$lesson_type',
          totalDuration: $.sum('$duration')
        })
        .end();

      // 查询本月数据
      const monthResult = await db.collection('lessons')
        .aggregate()
        .match({
          user_id: userId,
          date: _.gte(this.formatDate(monthStart))
        })
        .group({
          _id: '$lesson_type',
          totalDuration: $.sum('$duration')
        })
        .end();

      // 处理本周数据
      let weeklyTotal = 0;
      let weeklyOneToOne = 0;
      let weeklyClass = 0;

      if (weekResult.list && weekResult.list.length > 0) {
        weekResult.list.forEach(item => {
          weeklyTotal += item.totalDuration;
          if (item._id === '一对一') {
            weeklyOneToOne = item.totalDuration;
          } else if (item._id === '班课') {
            weeklyClass = item.totalDuration;
          }
        });
      }

      // 处理本月数据
      let monthlyTotal = 0;
      let monthlyOneToOne = 0;
      let monthlyClass = 0;

      if (monthResult.list && monthResult.list.length > 0) {
        monthResult.list.forEach(item => {
          monthlyTotal += item.totalDuration;
          if (item._id === '一对一') {
            monthlyOneToOne = item.totalDuration;
          } else if (item._id === '班课') {
            monthlyClass = item.totalDuration;
          }
        });
      }

      this.setData({
        stats: {
          weeklyTotal,
          weeklyOneToOne,
          weeklyClass,
          monthlyTotal,
          monthlyOneToOne,
          monthlyClass
        }
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 加载课时列表
  async loadLessons() {
    try {
      // 首先检查登录状态
      this.checkLoginStatus();

      // 检查云开发是否可用
      if (!wx.cloud) {
        console.log('云开发不可用，跳过课时列表加载');
        this.setData({ loading: false });
        return;
      }

      const db = wx.cloud.database();
      const userId = wx.getStorageSync('userId');
      const isLoggedIn = app.globalData.isLoggedIn;

      console.log('加载课时列表 - 用户ID:', userId, '登录状态:', isLoggedIn);

      if (!userId || !isLoggedIn) {
        console.log('用户未登录，清空课时列表');
        this.setData({
          lessons: [],
          loading: false
        });
        return;
      }

      // 查询当前用户的课时
      const result = await db.collection('lessons')
        .where({
          user_id: userId
        })
        .orderBy('date', 'desc')
        .orderBy('start_time', 'desc')
        .limit(20)
        .get();

      console.log('查询到的课时数量:', result.data.length);
      console.log('课时数据:', result.data);

      this.setData({
        lessons: result.data || [],
        loading: false
      });
    } catch (error) {
      console.error('加载课时列表失败:', error);
      this.setData({ loading: false });
    }
  },

  // 获取本周起始日期（周一）
  getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date);  // 创建日期副本，避免修改原始对象
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 删除课时
  deleteLesson(e) {
    const lesson = e.currentTarget.dataset.lesson;

    // 先显示弹窗
    this.setData({
      verifyNumbers: [1, 2, 3, 4],
      verifyLessonId: lesson._id,
      slideProgress: 0,
      isSliding: false,
      startX: 0
    });

    // 等待弹窗渲染完成后获取容器宽度
    setTimeout(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select('.slide-container').boundingClientRect();
      query.exec((res) => {
        if (res && res[0] && res[0].width > 0) {
          this.setData({
            containerWidth: res[0].width
          });
        }
      });
    }, 50);
  },

  // 滑动开始
  slideStart(e) {
    this.setData({
      isSliding: true,
      startX: e.touches[0].clientX
    });

    const query = wx.createSelectorQuery().in(this);
    query.select('.slide-container').boundingClientRect();
    query.exec((res) => {
      if (res && res[0] && res[0].width > 0) {
        this.setData({
          containerWidth: res[0].width
        });
      }
    });
  },

  // 滑动移动（使用节流提升性能）
  slideMove(e) {
    if (!this.data.isSliding) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - this.data.startX;
    const containerWidth = this.data.containerWidth || 520;
    const progress = Math.min(100, Math.max(0, (diff / containerWidth) * 100));

    this.setData({
      slideProgress: progress
    });
  },

  // 滑动结束
  slideEnd(e) {
    if (!this.data.isSliding) return;

    if (this.data.slideProgress >= 90) {
      // 滑动成功，执行删除
      this.setData({
        slideProgress: 100,
        isSliding: false
      });

      setTimeout(() => {
        this.confirmDelete(this.data.verifyLessonId);
        this.setData({
          verifyNumbers: [],
          verifyLessonId: null,
          slideProgress: 0
        });
      }, 300);
    } else {
      // 滑动失败，回弹
      this.setData({
        slideProgress: 0,
        isSliding: false
      });
    }
  },

  // 取消验证
  cancelVerify() {
    this.setData({
      verifyNumbers: [],
      verifyLessonId: null,
      slideProgress: 0,
      isSliding: false
    });
  },

  // 确认删除
  async confirmDelete(id) {
    try {
      await wx.cloud.callFunction({
        name: 'deleteLesson',
        data: { id }
      });

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      this.loadStats();
      this.loadLessons();
    } catch (error) {
      console.error('删除失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  }
});
