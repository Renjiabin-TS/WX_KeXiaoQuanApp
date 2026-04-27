Page({
  data: {
    expandedId: null,
    feedbackType: '功能建议',
    feedbackContent: '',
    faqList: [
      {
        id: 1,
        question: '如何添加课时记录？',
        answer: '在首页点击"+"按钮，填写课时信息（日期、时间、学生、类型等），点击保存即可添加课时记录。'
      },
      {
        id: 2,
        question: '如何修改或删除课时记录？',
        answer: '在首页或日历页面，点击已添加的课时记录，可以修改或删除该记录。'
      },
      {
        id: 3,
        question: '如何接收邮件推送？',
        answer: '在个人中心页面，先验证邮箱地址。验证成功后，系统会在每天早上7:30自动发送课时统计邮件，也可以手工点击推送按钮立即发送。'
      },
      {
        id: 4,
        question: '如何查看课时统计？',
        answer: '在首页可以查看本周和本月的课时统计，包括总课时、一对一课时、班课课时等详细数据。'
      },
      {
        id: 5,
        question: '忘记密码怎么办？',
        answer: '本系统使用微信一键登录，无需密码。如果遇到登录问题，请重新点击"微信一键登录"按钮。'
      },
      {
        id: 6,
        question: '如何更换邮箱？',
        answer: '在个人中心页面，点击"修改邮箱"，验证新邮箱后即可完成更换。'
      }
    ],
    guideList: [
      {
        icon: '📊',
        title: '课时管理',
        desc: '添加、编辑、删除课时记录，支持一对一和班课两种类型'
      },
      {
        icon: '📅',
        title: '日历视图',
        desc: '以日历形式查看课时安排，直观了解每日课程安排'
      },
      {
        icon: '📧',
        title: '邮件推送',
        desc: '定时推送每日课时统计报表，及时掌握教学进度'
      },
      {
        icon: '📈',
        title: '统计分析',
        desc: '自动统计本周和本月课时数据，生成详细报表'
      }
    ]
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '帮助与反馈'
    });
  },

  // 展开/收起常见问题
  toggleFaq(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedId: this.data.expandedId === id ? null : id
    });
  },

  // 选择反馈类型
  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      feedbackType: type
    });
  },

  // 输入反馈内容
  onFeedbackInput(e) {
    this.setData({
      feedbackContent: e.detail.value
    });
  },

  // 提交反馈
  submitFeedback() {
    const { feedbackType, feedbackContent } = this.data;

    if (!feedbackContent.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...'
    });

    // 模拟提交反馈
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '感谢您的反馈',
        icon: 'success'
      });

      // 清空表单
      this.setData({
        feedbackContent: '',
        feedbackType: '功能建议'
      });
    }, 1000);
  }
});
