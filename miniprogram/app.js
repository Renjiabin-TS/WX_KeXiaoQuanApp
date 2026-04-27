// app.js
App({
  globalData: {
    userInfo: null,
    userId: null,
    isLoggedIn: false,
    disclaimerConfirmed: false,  // 免责声明确认状态
    showDisclaimerModal: false   // 是否显示免责弹窗
  },

  onLaunch: function () {
    console.log('App 启动');

    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        // env: 'miniprogram-1', // 请替换为你的实际云环境 ID，例如：'env-123456'
        traceUser: true
      });
      console.log('云开发初始化成功');
    } else {
      console.log('当前微信版本不支持云开发');
    }

    // 检查登录状态
    this.checkLoginStatus();
    
    // 检查免责声明确认状态
    const disclaimerConfirmed = wx.getStorageSync('disclaimerConfirmed');
    this.globalData.disclaimerConfirmed = disclaimerConfirmed || false;
    
    // 如果未登录且未确认免责，显示免责弹窗
    const userId = wx.getStorageSync('userId');
    if (!userId && !disclaimerConfirmed) {
      this.globalData.showDisclaimerModal = true;
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userId = wx.getStorageSync('userId');
    const userInfo = wx.getStorageSync('userInfo');

    console.log('检查登录状态 - userId:', userId, 'userInfo:', userInfo);

    if (userId && userInfo) {
      this.globalData.userId = userId;
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
      console.log('已登录用户:', userInfo);
    }
  },

  // 设置用户信息（带双重存储）
  setUserInfo(userId, userInfo) {
    this.globalData.userId = userId;
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;

    wx.setStorageSync('userId', userId);
    wx.setStorageSync('userInfo', userInfo);

    console.log('用户信息已双重存储 - userId:', userId, 'userInfo:', userInfo);
  },

  // 清除用户信息（带双重清除）
  clearUserInfo() {
    this.globalData.userId = null;
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;

    wx.removeStorageSync('userId');
    wx.removeStorageSync('userInfo');

    console.log('用户信息已双重清除');
  },
  
  // 确认免责声明
  confirmDisclaimer() {
    this.globalData.disclaimerConfirmed = true;
    this.globalData.showDisclaimerModal = false;
    wx.setStorageSync('disclaimerConfirmed', true);
    console.log('用户已确认免责声明');
    
    // 跳转到登录页面（profile页面）
    wx.switchTab({
      url: '/pages/profile/index'
    });
  },

  // 更新课时数据（保存后触发列表刷新）
  updateLessons() {
    // 通过事件总线通知页面刷新
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.onShow) {
      // 如果当前页面有 onShow 方法，触发数据刷新
      console.log('通知页面刷新课时数据');
    }
  }
});
