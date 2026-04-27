// pages/test/index.js
Page({
  data: {
    message: '小程序正常运行'
  },

  onLoad() {
    console.log('测试页面加载成功');
  },

  /**
   * 显示 Bar 提示
   */
  showBarTip() {
    console.log('点击了显示 Bar 提示按钮');
    const barTip = this.selectComponent('#barTip');
    console.log('barTip 组件:', barTip);
    if (barTip) {
      console.log('调用 showTip 方法');
      barTip.showTip();
    } else {
      console.error('未找到 barTip 组件');
    }
  },

  /**
   * 重置提示（用于测试）
   */
  resetTip() {
    wx.removeStorageSync('barTipShown');
    wx.showToast({
      title: '已重置，刷新页面后自动显示',
      icon: 'success'
    });
  }
});
