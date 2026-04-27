// pages/profile/index.js
const app = getApp();

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    email: '',
    darkMode: false,
    showEmailModal: false,
    showEditModal: false,
    tempEmail: '',
    loginEmail: '',
    loginCode: '',
    codeSending: false,
    countdown: 0
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const userId = wx.getStorageSync('userId');
    const userInfo = wx.getStorageSync('userInfo');
    const email = wx.getStorageSync('email') || '';

    this.setData({
      isLoggedIn: !!userId,
      userInfo: userInfo || { nickname: '微信用户', avatarUrl: '/images/avatar.png' },
      email: email
    });
  },

  // 微信登录 - 重写版本,不使用 getUserProfile
  onWechatLogin() {
    console.log('[DEBUG] 开始登录流程...');

    wx.showLoading({
      title: '登录中...'
    });

    // 从本地存储获取用户信息（如果有）
    const storedUserInfo = wx.getStorageSync('userInfo') || {};
    const userInfo = {
      nickname: storedUserInfo.nickname || '微信用户',
      avatarUrl: storedUserInfo.avatarUrl || '/images/avatar.png'
    };

    console.log('[DEBUG] 传递给云函数的 userInfo:', userInfo);

    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'login',
      data: {
        userInfo: userInfo
      }
    }).then(res => {
      console.log('[DEBUG] 云函数返回结果:', res);
      wx.hideLoading();

      // 修复数据解析路径：根据日志，云函数返回的是 { result: { success: true, data: { userId, userInfo: { openid: 'xxx' } } } }
      let openid = null;
      if (res.result && res.result.data && res.result.data.userInfo && res.result.data.userInfo.openid) {
        // 路径：{ result: { data: { userInfo: { openid: 'xxx' } } } }
        openid = res.result.data.userInfo.openid;
        console.log('[DEBUG] 从 res.result.data.userInfo.openid 获取到 openid:', openid);
      } else if (res.result && res.result.userInfo && res.result.userInfo.openid) {
        // 备用路径：{ result: { userInfo: { openid: 'xxx' } } }
        openid = res.result.userInfo.openid;
        console.log('[DEBUG] 从 res.result.userInfo.openid 获取到 openid:', openid);
      }

      if (openid) {
        // 从云函数返回结果中获取完整的用户信息
        let returnedUserInfo = res.result.data?.userInfo;

        // 调用 app 的 setUserInfo 方法，实现双重存储
        const userInfo = {
          openid: openid, // 保存 openid 到 userInfo 中
          nickname: returnedUserInfo?.nickname || '微信用户',
          avatarUrl: returnedUserInfo?.avatarUrl || '/images/avatar.png'
        };

        // 检查用户是否已验证邮箱
        const userEmail = returnedUserInfo?.email || '';
        const isEmailVerified = !!userEmail; // 如果邮箱不为空，说明已验证

        console.log('[DEBUG] 用户邮箱状态:', {
          email: userEmail,
          isEmailVerified: isEmailVerified
        });

        // 如果已验证邮箱，保存到本地存储
        if (isEmailVerified) {
          wx.setStorageSync('email', userEmail);
          console.log('[DEBUG] 用户已验证邮箱，已保存到本地存储');
        }

        // 使用 openid 作为 userId 存储
        app.setUserInfo(openid, userInfo);

        this.setData({
          isLoggedIn: true,
          userInfo: userInfo,
          email: userEmail // 直接设置邮箱状态
        });

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      } else {
        throw new Error('登录失败：未获取到 openid');
      }
    }).catch(err => {
      console.error('[DEBUG] 登录失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    });
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;

    wx.showLoading({
      title: '上传中...'
    });

    // 将临时头像上传到云存储
    const cloudPath = `avatars/${Date.now()}.jpg`;
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: avatarUrl,
      success: res => {
        const cloudAvatarUrl = res.fileID;
        console.log('[DEBUG] 头像上传成功:', cloudAvatarUrl);

        // 更新本地状态和存储
        const userInfo = this.data.userInfo || {};
        userInfo.avatarUrl = cloudAvatarUrl;
        this.setData({ userInfo });
        wx.setStorageSync('userInfo', userInfo);

        // 同步更新到数据库
        const openid = this.data.userInfo?.openid || wx.getStorageSync('userId');
        if (openid) {
          wx.cloud.callFunction({
            name: 'updateUserInfo',
            data: {
              openid: openid,
              avatarUrl: cloudAvatarUrl,
              nickname: userInfo.nickname
            }
          }).then(updateRes => {
            console.log('[DEBUG] 用户信息更新成功:', updateRes);
            wx.hideLoading();
            wx.showToast({
              title: '头像更新成功',
              icon: 'success'
            });
          }).catch(updateErr => {
            console.error('[DEBUG] 用户信息更新失败:', updateErr);
            wx.hideLoading();
            wx.showToast({
              title: '头像保存失败',
              icon: 'none'
            });
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          });
        }
      },
      fail: err => {
        console.error('[DEBUG] 头像上传失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '头像上传失败',
          icon: 'none'
        });
      }
    });
  },

  // 昵称失去焦点
  onNicknameBlur(e) {
    const nickname = e.detail.value;
    const userInfo = this.data.userInfo || {};
    userInfo.nickname = nickname;

    wx.setStorageSync('userInfo', userInfo);
    this.setData({ userInfo });

    // 同步更新到数据库
    const openid = this.data.userInfo?.openid || wx.getStorageSync('userId');
    if (openid) {
      wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          openid: openid,
          nickname: nickname,
          avatarUrl: userInfo.avatarUrl
        }
      }).then(res => {
        console.log('[DEBUG] 昵称更新成功:', res);
      }).catch(err => {
        console.error('[DEBUG] 昵称更新失败:', err);
      });
    }
  },

  // 显示邮箱验证弹窗
  showEmailVerify() {
    this.setData({ showEmailModal: true });
  },

  // 隐藏邮箱验证弹窗
  hideEmailModal() {
    this.setData({
      showEmailModal: false,
      loginEmail: '',
      loginCode: '',
      countdown: 0
    });
  },

  // 登录邮箱输入
  onLoginEmailInput(e) {
    this.setData({ loginEmail: e.detail.value });
  },

  // 登录验证码输入
  onLoginCodeInput(e) {
    this.setData({ loginCode: e.detail.value });
  },

  // 发送验证码
  sendCode() {
    const { loginEmail } = this.data;

    if (!loginEmail || !this.isValidEmail(loginEmail)) {
      wx.showToast({
        title: '请输入有效的邮箱地址',
        icon: 'none'
      });
      return;
    }

    this.setData({ codeSending: true });

    wx.cloud.callFunction({
      name: 'sendVerificationCode',
      data: { email: loginEmail }
    }).then(res => {
      console.log('[DEBUG] 验证码发送成功:', res);
      this.setData({ codeSending: false });

      // 开始倒计时
      let countdown = 60;
      const timer = setInterval(() => {
        countdown--;
        this.setData({ countdown });

        if (countdown <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      });
    }).catch(err => {
      console.error('[DEBUG] 验证码发送失败:', err);
      this.setData({ codeSending: false });
      wx.showToast({
        title: '验证码发送失败',
        icon: 'none'
      });
    });
  },

  // 验证邮箱
  verifyEmail() {
    const { loginEmail, loginCode } = this.data;
    const userId = wx.getStorageSync('userId'); // 获取存储的userId
    const openid = this.data.userInfo?.openid; // 从userInfo中获取openid

    if (!loginEmail || !loginCode) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 优先使用 userInfo 中的 openid，如果没有则使用 userId
    const finalOpenid = openid || userId;

    console.log('[DEBUG] 验证邮箱 - userId:', userId, 'openid:', openid, 'finalOpenid:', finalOpenid);

    wx.cloud.callFunction({
      name: 'verifyEmail',
      data: {
        email: loginEmail,
        code: loginCode,
        openid: finalOpenid
      }
    }).then(res => {
      console.log('[DEBUG] 邮箱验证返回结果:', res);

      // 检查云函数返回的 success 字段
      if (res.result && res.result.success) {
        console.log('[DEBUG] 邮箱验证成功');
        wx.setStorageSync('email', loginEmail);
        this.setData({
          email: loginEmail,
          showEmailModal: false
        });
        wx.showToast({
          title: '验证成功',
          icon: 'success'
        });
      } else {
        // 云函数返回成功，但业务逻辑失败
        console.error('[DEBUG] 邮箱验证失败:', res.result?.message);
        wx.showToast({
          title: res.result?.message || '验证失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('[DEBUG] 邮箱验证异常:', err);
      wx.showToast({
        title: '验证失败，请重试',
        icon: 'none'
      });
    });
  },

  // 显示修改邮箱弹窗
  showEditEmail() {
    this.setData({ showEditModal: true });
  },

  // 隐藏修改邮箱弹窗
  hideEditModal() {
    this.setData({
      showEditModal: false,
      tempEmail: '',
      loginCode: '',
      countdown: 0
    });
  },

  // 临时邮箱输入
  onEmailInput(e) {
    this.setData({ tempEmail: e.detail.value });
  },

  // 使用修改后的邮箱发送验证码
  sendCodeWithEmail() {
    const { tempEmail } = this.data;

    if (!tempEmail || !this.isValidEmail(tempEmail)) {
      wx.showToast({
        title: '请输入有效的邮箱地址',
        icon: 'none'
      });
      return;
    }

    this.setData({ codeSending: true });

    wx.cloud.callFunction({
      name: 'sendVerificationCode',
      data: { email: tempEmail }
    }).then(res => {
      console.log('[DEBUG] 验证码发送成功:', res);
      this.setData({ codeSending: false });

      // 开始倒计时
      let countdown = 60;
      const timer = setInterval(() => {
        countdown--;
        this.setData({ countdown });

        if (countdown <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      });
    }).catch(err => {
      console.error('[DEBUG] 验证码发送失败:', err);
      this.setData({ codeSending: false });
      wx.showToast({
        title: '验证码发送失败',
        icon: 'none'
      });
    });
  },

  // 保存新邮箱
  saveEmail() {
    const { tempEmail, loginCode } = this.data;
    const userId = wx.getStorageSync('userId'); // 获取存储的userId
    const openid = this.data.userInfo?.openid; // 从userInfo中获取openid

    if (!tempEmail || !loginCode) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 优先使用 userInfo 中的 openid，如果没有则使用 userId
    const finalOpenid = openid || userId;

    console.log('[DEBUG] 修改邮箱 - userId:', userId, 'openid:', openid, 'finalOpenid:', finalOpenid);

    wx.cloud.callFunction({
      name: 'verifyEmail',
      data: {
        email: tempEmail,
        code: loginCode,
        openid: finalOpenid
      }
    }).then(res => {
      console.log('[DEBUG] 邮箱修改返回结果:', res);

      // 检查云函数返回的 success 字段
      if (res.result && res.result.success) {
        console.log('[DEBUG] 邮箱修改成功');
        wx.setStorageSync('email', tempEmail);
        this.setData({
          email: tempEmail,
          showEditModal: false
        });
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        });
      } else {
        // 云函数返回成功，但业务逻辑失败
        console.error('[DEBUG] 邮箱修改失败:', res.result?.message);
        wx.showToast({
          title: res.result?.message || '修改失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('[DEBUG] 邮箱修改异常:', err);
      wx.showToast({
        title: '修改失败，请重试',
        icon: 'none'
      });
    });
  },

  // 切换深色模式
  toggleDarkMode(e) {
    const darkMode = e.detail.value;
    this.setData({ darkMode });
    wx.setStorageSync('darkMode', darkMode);
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('userId');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('email');

          // 调用 app 的 clearUserInfo 方法，清除全局数据
          app.clearUserInfo();

          this.setData({
            isLoggedIn: false,
            userInfo: null,
            email: '',
            darkMode: false
          });

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 验证邮箱格式
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 跳转到首页
  goToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 跳转到日历页面
  goToCalendar() {
    wx.switchTab({
      url: '/pages/calendar/index'
    });
  },

  // 跳转到帮助页面
  goToHelp() {
    wx.navigateTo({
      url: '/pages/help/index'
    });
  },

  // 手工推送报表
  manualSendReport() {
    const email = this.data.email;
    const openid = this.data.userInfo?.openid || wx.getStorageSync('userId');

    if (!email) {
      wx.showToast({
        title: '请先验证邮箱',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认推送',
      content: `将向您的邮箱 ${email} 发送今日课时统计报表，是否继续？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '发送中...'
          });

          wx.cloud.callFunction({
            name: 'dailyEmailReport',
            data: {
              targetUserOpenid: openid,  // 只推送给当前用户
              isManual: true  // 标记为手工推送
            }
          }).then(res => {
            console.log('[DEBUG] 手工推送成功:', res);
            wx.hideLoading();

            if (res.result && res.result.success) {
              wx.showModal({
                title: '推送成功',
                content: `报表已成功发送到 ${email}`,
                showCancel: false
              });
            } else {
              wx.showToast({
                title: '推送失败，请重试',
                icon: 'none'
              });
            }
          }).catch(err => {
            console.error('[DEBUG] 手工推送失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '推送失败，请查看日志',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  // 显示登录提示
  showLoginTip() {
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });
  },

  // 测试更新邮箱功能
  testUpdateEmail() {
    const openid = this.data.userInfo?.openid || wx.getStorageSync('userId');
    const email = 'test@example.com';

    if (!openid) {
      wx.showToast({
        title: '用户未登录',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '测试更新',
      content: `测试将邮箱更新为: ${email}\n\nopenid: ${openid}`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '测试中...'
          });

          wx.cloud.callFunction({
            name: 'testUpdateUser',
            data: {
              openid: openid,
              email: email
            }
          }).then(res => {
            console.log('[DEBUG] 测试更新结果:', res);
            wx.hideLoading();

            if (res.result && res.result.success) {
              wx.showModal({
                title: '测试成功',
                content: `${res.result.message}\n\n方法: ${res.result.method}\n用户ID: ${res.result.userId}`,
                showCancel: false
              });
            } else {
              wx.showModal({
                title: '测试失败',
                content: res.result?.message || '未知错误',
                showCancel: false
              });
            }
          }).catch(err => {
            console.error('[DEBUG] 测试更新失败:', err);
            wx.hideLoading();
            wx.showModal({
              title: '调用失败',
              content: JSON.stringify(err),
              showCancel: false
            });
          });
        }
      }
    });
  },

  // 调试课时数据
  debugLessonsData() {
    wx.showModal({
      title: '调试课时数据',
      content: '将查询课时数据的结构和关联关系',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '调试中...'
          });

          wx.cloud.callFunction({
            name: 'debugLessons'
          }).then(res => {
            console.log('[DEBUG] 调试结果:', res);
            wx.hideLoading();

            if (res.result && res.result.success) {
              const result = res.result;

              let content = `用户ID: ${result.userInfo._id}\n\n`;
              content += `课时数据字段: ${result.lessonStructure.join(', ')}\n\n`;
              content += '查询结果:\n';

              result.queryResults.forEach(q => {
                content += `\n${q.field}: ${q.success ? '✅' : '❌'} 找到 ${q.count} 条`;
                if (!q.success) {
                  content += `\n错误: ${q.error}`;
                }
              });

              wx.showModal({
                title: '调试成功',
                content: content,
                showCancel: false
              });
            } else {
              wx.showModal({
                title: '调试失败',
                content: res.result?.message || '未知错误',
                showCancel: false
              });
            }
          }).catch(err => {
            console.error('[DEBUG] 调试失败:', err);
            wx.hideLoading();
            wx.showModal({
              title: '调用失败',
              content: JSON.stringify(err),
              showCancel: false
            });
          });
        }
      }
    });
  }
});
