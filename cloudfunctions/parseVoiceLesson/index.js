// 云函数入口文件 - 解析语音文本为课时数据
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 混元大模型 API 配置
const HUNYUAN_API_KEY = process.env.HUNYUAN_API_KEY || 'sk-qzbgm05iu9hWfo3RlRaWozgy6ezenGIQRVBznwgKaCAILJr5';

// 腾讯云 ASR 配置
const ASR_SECRET_ID = process.env.TENCENT_SECRET_ID || 'AKIDFI7fy1nJYXFhsnSqyqzwgBQP9dswoTtL';
const ASR_SECRET_KEY = process.env.TENCENT_SECRET_KEY || 'HI4bsW2JK5aqrb5KM8ekbDj4B3h6GBsK';

// AI 解析 Prompt
const PARSE_PROMPT = `你是一个课时信息提取助手。请从用户语音文本中提取课时信息，转换为标准 JSON 格式。

提取规则：
1. date（授课日期）：识别"今天/明天/后天/周几"等，格式：YYYY-MM-DD
2. start_time（开始时间）：格式 HH:MM
3. end_time（结束时间）：格式 HH:MM
4. lesson_type（课程类型）：一对一 或 班课
5. teacher_name（老师姓名）
6. student_name（学生姓名，一对一时使用）
7. student_count（学生数量，班课时使用）
8. duration（课时数）

返回格式：
{
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "lesson_type": "一对一"或"班课",
  "teacher_name": "老师名",
  "student_name": "学生名或null",
  "student_count": 数字或null,
  "duration": 数字,
  "raw_text": "原始语音文本"
}

请直接返回 JSON。`;

// 发送 HTTPS 请求
function httpsRequest(options, data) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// 解析日期相对表达
function parseRelativeDate(dateStr, currentDate) {
  const today = new Date(currentDate || new Date().toISOString());
  const todayStr = today.toISOString().split('T')[0];
  
  if (dateStr === '今天') return todayStr;
  if (dateStr === '明天') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  if (dateStr === '后天') {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  }
  
  return todayStr;
}

// 腾讯云 ASR 语音识别
async function recognizeSpeech(fileId) {
  if (!ASR_SECRET_ID || !ASR_SECRET_KEY) {
    console.log('ASR 配置不完整');
    return null;
  }
  
  try {
    console.log('========== ASR 语音识别 ==========');
    console.log('FileID:', fileId);
    
    // 获取云存储的临时链接
    let audioUrl = fileId;
    
    if (fileId.startsWith('cloud://')) {
      const tempUrlResult = await cloud.getTempFileURL({
        fileList: [fileId]
      });
      if (tempUrlResult.fileList && tempUrlResult.fileList[0].tempFileURL) {
        audioUrl = tempUrlResult.fileList[0].tempFileURL;
        console.log('音频链接:', audioUrl);
      }
    }
    
    // 加载 SDK
    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const Client = tencentcloud.asr.v20190614.Client;
    
    // 创建客户端
    const client = new Client({
      credential: {
        secretId: ASR_SECRET_ID,
        secretKey: ASR_SECRET_KEY
      },
      region: 'ap-guangzhou'
    });
    
    console.log('创建识别任务...');
    
    // 创建识别任务 - 添加所有必需参数
    const createResult = await client.CreateRecTask({
      Url: audioUrl,
      EngineModelType: '16k_zh',
      ChannelNum: 1,
      Channel: 1,
      SampleRate: 16000,
      SecretKeyProcInterval: 0,
      ConvertNumMode: 1,
      FilterModal: 0,
      FilterPunc: 0,
      FilterSpace: 0,
      HotwordId: '',
      CustomizationId: '',
      Revision: ''
    });
    
    console.log('创建结果:', JSON.stringify(createResult));
    
    if (!createResult.RecognitionTaskId) {
      console.log('创建任务失败');
      return null;
    }
    
    const taskId = createResult.RecognitionTaskId;
    console.log('任务ID:', taskId);
    
    // 轮询查询结果
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`查询 (${i + 1}/10)...`);
      
      const queryResult = await client.DescribeRecognitionTask({
        RecognitionTaskId: taskId
      });
      
      console.log('状态:', queryResult.Status);
      
      if (queryResult.Status === 2) {
        console.log('识别结果:', queryResult.Result);
        return queryResult.Result || null;
      } else if (queryResult.Status === 4) {
        console.error('识别失败');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('ASR 异常:', error.message);
    return null;
  }
}

// 调用混元大模型解析文本
async function parseWithAI(text, currentDate) {
  if (!HUNYUAN_API_KEY) {
    console.log('未配置 API KEY');
    return null;
  }
  
  try {
    const payload = {
      model: "hunyuan-standard",
      stream: false,
      messages: [{
        role: "user",
        content: `${PARSE_PROMPT}\n\n用户语音：${text}`
      }]
    };
    
    const options = {
      hostname: 'hunyuan.cloud.tencent.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUNYUAN_API_KEY}`
      }
    };
    
    console.log('调用混元 API...');
    const result = await httpsRequest(options, payload);
    console.log('混元返回:', JSON.stringify(result).substring(0, 200));
    
    if (result.choices && result.choices[0]?.message?.content) {
      const content = result.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.date && !data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          data.date = parseRelativeDate(data.date, currentDate);
        }
        return { success: true, source: 'ai', ...data };
      }
    }
    
    return null;
  } catch (error) {
    console.error('AI 解析异常:', error);
    return null;
  }
}

// 规则解析
function parseWithRules(text, currentDate) {
  const today = new Date(currentDate || new Date().toISOString());
  const result = {
    date: today.toISOString().split('T')[0],
    start_time: '09:30',
    end_time: '11:30',
    lesson_type: '一对一',
    teacher_name: '',
    student_name: null,
    student_count: null,
    duration: 2,
    raw_text: text
  };

  if (text.includes('今天')) result.date = today.toISOString().split('T')[0];
  if (text.includes('明天')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.date = tomorrow.toISOString().split('T')[0];
  }
  if (text.includes('班课') || text.includes('小班') || text.includes('大班')) {
    result.lesson_type = '班课';
  }

  const timeMatch = text.match(/(\d{1,2})[点时:](\d{0,2})?\s*[到\-~]\s*(\d{1,2})[点时:](\d{0,2})?/);
  if (timeMatch) {
    result.start_time = `${String(parseInt(timeMatch[1])).padStart(2, '0')}:${String(timeMatch[2] || 0).padStart(2, '0')}`;
    result.end_time = `${String(parseInt(timeMatch[3])).padStart(2, '0')}:${String(timeMatch[4] || 0).padStart(2, '0')}`;
  }

  const studentMatch = text.match(/学生[是为叫]?\s*([^\s,，。]+)/);
  if (studentMatch) result.student_name = studentMatch[1];

  return { success: true, source: 'rules', ...result };
}

// 云函数入口
exports.main = async (event, context) => {
  const { fileID, voiceText, currentDate } = event;
  
  console.log('========== 解析开始 ==========');
  console.log('fileID:', fileID);
  console.log('voiceText:', voiceText);

  try {
    let textToParse = voiceText;
    
    // 如果传入的是 fileID，进行语音识别
    if (fileID && !voiceText) {
      const recognizedText = await recognizeSpeech(fileID);
      if (recognizedText) {
        textToParse = recognizedText;
        console.log('ASR 结果:', recognizedText);
      } else {
        return { success: false, message: '语音识别失败' };
      }
    }
    
    if (textToParse) {
      // 优先 AI 解析
      const aiResult = await parseWithAI(textToParse, currentDate);
      if (aiResult) return aiResult;
      
      // 备用规则解析
      return parseWithRules(textToParse, currentDate);
    }
    
    return { success: false, message: '请提供语音或文本' };
    
  } catch (error) {
    console.error('解析异常:', error);
    return { success: false, message: error.message };
  }
};
