const Base = require("./base.js");
const rp = require("request-promise");
module.exports = class extends Base {
  async loginByWeixinAction() {
    // const code = this.post('code');
    const fullUserInfo = this.post("info");
    const code = fullUserInfo.code;
    const userInfo = JSON.parse(fullUserInfo.rawData);
    console.log("userInfo");
    console.log(code);
    console.log(userInfo);
    console.log("userInfo");
    let currentTime = parseInt(new Date().getTime() / 1000);
    const clientIp = ""; // 暂时不记录 ip test git
    // 获取openid
    const options = {
      method: "GET",
      url: "https://api.weixin.qq.com/sns/jscode2session",
      qs: {
        grant_type: "authorization_code",
        js_code: code,
        secret: think.config("weixin.secret"),
        appid: think.config("weixin.appid"),
      },
    };
    try {
      
    let sessionData = await rp(options);
    sessionData = JSON.parse(sessionData);
    console.log(sessionData);
    if (!sessionData.openid) {
      return this.fail("登录失败1");
    }
    // 验证用户信息完整性
    const crypto = require("crypto");
    const sha1 = crypto
      .createHash("sha1")
      .update(fullUserInfo.rawData + sessionData.session_key)
      .digest("hex");
    if (fullUserInfo.signature !== sha1) {
      return this.fail("登录失败2");
    }
    // 解释用户数据
    const WeixinSerivce = this.service("weixin", "api");
    const weixinUserInfo = await WeixinSerivce.decryptUserInfoData(
      sessionData.session_key,
      fullUserInfo.encryptedData,
      fullUserInfo.iv
    );
    if (think.isEmpty(weixinUserInfo)) {
      return this.fail("登录失败3");
    }
    // 根据openid查找用户是否已经注册
    let userId = await this.model("user")
      .where({
        weixin_openid: sessionData.openid,
      })
      .getField("id", true);
    let is_new = 0;
    if (think.isEmpty(userId)) {
      // 注册
      const buffer = Buffer.from(userInfo.nickName);
      let nickname = buffer.toString("base64");
      userId = await this.model("user").add({
        username: "微信用户" + think.uuid(6),
        password: sessionData.openid,
        register_time: currentTime,
        register_ip: clientIp,
        last_login_time: currentTime,
        last_login_ip: clientIp,
        mobile: "",
        weixin_openid: sessionData.openid,
        avatar: userInfo.avatarUrl || "",
        gender: userInfo.gender || 1, // 性别 0：未知、1：男、2：女
        nickname: nickname,
        country: userInfo.country,
        province: userInfo.province,
        city: userInfo.city,
      });
      is_new = 1;
    }
    sessionData.user_id = userId;
    // 查询用户信息
    const newbuffer = Buffer.from(userInfo.nickName);
    let nickname = newbuffer.toString("base64");
    // 更新登录信息
    await this.model("user")
      .where({
        id: userId,
      })
      .update({
        last_login_time: currentTime,
        last_login_ip: clientIp,
        avatar: userInfo.avatarUrl,
        nickname: nickname,
        country: userInfo.country,
        province: userInfo.province,
        city: userInfo.city,
      });
    const newUserInfo = await this.model("user")
      .field("id,username,nickname,gender,avatar")
      .where({
        id: userId,
      })
      .find();
    newUserInfo.nickname = Buffer.from(
      newUserInfo.nickname,
      "base64"
    ).toString();
    const TokenSerivce = this.service("token", "api");
    const sessionKey = await TokenSerivce.create(sessionData);
    if (think.isEmpty(newUserInfo) || think.isEmpty(sessionKey)) {
      return this.fail("登录失败4");
    }
    return this.success({
      token: sessionKey,
      userInfo: newUserInfo,
      is_new: is_new,
    });
  } catch (error) {
      this.fail(error)
    }
  }
  async logoutAction() {
    return this.success();
  }
};
