// components/bar-tip/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 提示文本
    text: {
      type: String,
      value: '点击添加至我的小程序 便于以后找到我'
    },
    // 显示时长（毫秒），默认 3000ms
    duration: {
      type: Number,
      value: 3000
    },
    // 是否自动显示（页面加载后自动显示）
    autoShow: {
      type: Boolean,
      value: false
    },
    // 延迟显示时间（毫秒）
    delay: {
      type: Number,
      value: 1000
    },
    // 页面标识（用于区分不同页面的显示状态）
    pageId: {
      type: String,
      value: 'default'
    },
    // 是否使用云函数生成励志语句
    useMotivation: {
      type: Boolean,
      value: false
    },
    // 是否每次都显示（不记录显示状态）
    alwaysShow: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    show: false,
    timer: null,
    canShowTip: false,
    currentText: ''
  },

  lifetimes: {
    attached() {
      // 先清空文本，等待加载
      this.setData({
        currentText: '加载中...'
      });

      // 如果启用了励志语句，则加载
      if (this.properties.useMotivation) {
        this.loadMotivation().then(() => {
          // 励志语句加载完成后，检查是否需要显示
          this.checkAndShow();
        });
      } else {
        // 不使用励志语句，直接使用默认文本
        this.setData({
          currentText: this.properties.text
        });
        this.checkAndShow();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 检查并显示提示
     */
    checkAndShow() {
      // 检查是否需要显示提示
      const alwaysShow = this.properties.alwaysShow;
      const storageKey = `barTipShown_${this.properties.pageId}`;
      const hasShown = wx.getStorageSync(storageKey);

      if (alwaysShow || !hasShown) {
        this.setData({ canShowTip: true });

        // 如果设置了自动显示
        if (this.properties.autoShow) {
          setTimeout(() => {
            this.showTip();
          }, this.properties.delay);
        }
      }
    },

    /**
     * 加载励志语句
     */
    loadMotivation() {
      return new Promise((resolve) => {
        // 先尝试从缓存读取（缓存改为5分钟，更频繁更新）
        const cacheKey = 'motivation_text';
        const cacheData = wx.getStorageSync(cacheKey);
        const cacheTime = wx.getStorageSync(`${cacheKey}_time`);

        // 缓存有效期为5分钟
        const now = new Date().getTime();
        const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

        if (cacheData && cacheTime && (now - cacheTime < CACHE_DURATION)) {
          console.log('使用缓存的励志语句:', cacheData);
          this.setData({
            currentText: cacheData
          });
          resolve();
          return;
        }

        // 调用云函数生成励志语句
        console.log('调用云函数生成励志语句...');
        wx.cloud.callFunction({
          name: 'generateMotivation',
          data: {}
        }).then(res => {
          console.log('励志语句生成结果:', res);
          if (res.result && res.result.success && res.result.data) {
            const motivation = res.result.data.motivation;
            console.log('获取到的励志语句:', motivation);
            this.setData({
              currentText: motivation
            });

            // 缓存结果
            wx.setStorageSync(cacheKey, motivation);
            wx.setStorageSync(`${cacheKey}_time`, now);
          }
          resolve();
        }).catch(err => {
          console.error('调用云函数失败:', err);
          // 失败时使用备用语录
          const fallbackQuotes = [
            "每个清晨都是新的起点，坚持就是胜利！",
            "工作虽累，但每一份努力都在为未来铺路",
            "今天的汗水，是明天的基石，加油打工人！"
          ];
          const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
          this.setData({
            currentText: randomQuote
          });
          resolve();
        });
      });
    },

    /**
     * 显示提示
     */
    showTip() {
      if (!this.data.canShowTip) return;

      // 清除之前的定时器
      if (this.data.timer) {
        clearTimeout(this.data.timer);
      }

      // 显示提示
      this.setData({
        show: true
      });

      // 如果不是每次都显示，则记录已显示
      if (!this.properties.alwaysShow) {
        const storageKey = `barTipShown_${this.properties.pageId}`;
        wx.setStorageSync(storageKey, true);
      }

      // 设置自动隐藏
      const timer = setTimeout(() => {
        this.hideTip();
      }, this.properties.duration);

      this.setData({ timer });
    },

    /**
     * 隐藏提示
     */
    hideTip() {
      this.setData({
        show: false
      });

      // 清除定时器
      if (this.data.timer) {
        clearTimeout(this.data.timer);
        this.setData({ timer: null });
      }
    },

    /**
     * 点击关闭按钮
     */
    onClose() {
      this.hideTip();
    },

    /**
     * 点击提示条
     */
    onTap() {
      // 如果是励志语句，点击后更新为新的
      if (this.properties.useMotivation) {
        this.loadMotivation();
      }

      // 可以在这里添加引导用户添加小程序的逻辑
      wx.showModal({
        title: '添加到我的小程序',
        content: '点击右上角「···」按钮，选择「添加到我的小程序」，即可快速访问本应用',
        showCancel: false,
        confirmText: '知道了'
      });
      this.hideTip();
    }
  }
});
