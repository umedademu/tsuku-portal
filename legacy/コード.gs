/**
 * @fileoverview
 * 株式会社相模建設ツクルンジャー 認知変容エンジン
 * PHOENIX v5.1 (ABSOLUTE_OPTIMIZATION_FIXED)
 */
const SYSTEM_VERSION = 'PHOENIX_v5.1_ABSOLUTE_OPTIMIZATION_FIXED';

// --- ▼▼▼ PHOENIX v5.1 設定 ▼▼▼ ---

// 【T304: IRIS】問い合わせ発生時の通知先メールアドレス
const NOTIFICATION_EMAIL = 'info@tukurunja.jp'; // ←★★★要変更★★★

// 【T204: CHRONOS】1日の無料診断受付上限数
const DAILY_DIAGNOSIS_LIMIT = 15;

// 【T404: ARIADNE'S THREAD】AI応答末尾に付与する連絡先情報
const CONTACT_INFO_BLOCK = `
---
【ご不明な点、専門家への直接のご相談はこちら】
365日24時間 受付
✉️ メール: info@tukurunja.jp
📞 社長直通: 050-8883-9720

平日 9:00〜16:30 受付
📞 会社代表: 042-704-9413
`;

// --- ▲▲▲ PHOENIX v5.1 設定 ▲▲▲ ---

// --- ▼▼▼ Google認証情報 ▼▼▼ ---
const GOOGLE_SITE_VERIFICATION_FILE_NAME = 'google56c6df0fddf6bb74.html';

// --- ▼▼▼ 設定項目（ID設定） ▼▼▼ ---
// 1. [AIプロンプト管理シート]
const PROMPTS_SPREADSHEET_ID = '1tPFIHDe6Gk0pFKKk8usyjSzgu5yub1ST8fWHe_R2iT0';
// 2. [問い合わせ管理シート]
const INQUIRY_SPREADSHEET_ID = '1iVqp8GWzxzW2eZeuHba4wZ9YKS02pzMtgTIGLNu7pbE';
// 3. [添付ファイル保存用フォルダ]
const INQUIRY_FOLDER_ID = '16k0gEAgufCvgP5Z0GcJR5Wb21O2HdN6R';
// 4. [SEOページ管理シート]
const SEO_PAGES_SPREADSHEET_ID = '1uRTf7wSZ14RDdIBkm61Tw4xd0GgWJ0d85NoVqA4JzDw';
// 5. [施工事例保存用フォルダ]
const CASE_STUDY_FOLDER_ID = '1sTuM0l6o3TB0nJIrnis2HHKF6pLMV7kA';

// --- ▼▼▼ API設定 ▼▼▼ ---
const GEMINI_API_KEY = 'AIzaSyBsnJM5RkSYbzsQ6W3kKEw51AKhiFI6uqQ';
const GEMINI_MODEL = 'gemini-2.5-pro';

// 【T303: MERCURY】キャッシュ期間
const CACHE_DURATION = 3600;

// --- ▼▼▼ シート名固定設定 ▼▼▼ ---
const PROMPTS_SHEET_NAME = 'ai_prompts';
const INQUIRY_SHEET_NAME = 'inquiries';
const SEO_PAGES_SHEET_NAME = 'seo_pages';

// --- ▼▼▼ ビジネス情報（構造化データ・MEO用） ▼▼▼ ---
const BUSINESS_INFO = {
  name: "株式会社相模建設ツクルンジャー",
  description: "建設・土木・リフォームのあらゆる不安を解消します。AIによる無料診断実施中。",
  logoUrl: "",
  defaultOgpImageUrl: "",
  telephone: "042-704-9413",
  address: {
    streetAddress: "相模原市中央区千代田1-3-13-2",
    addressLocality: "相模原市",
    addressRegion: "神奈川県",
    postalCode: "252-0237"
  },
  geo: {
    latitude: "35.5781",
    longitude: "139.3736"
  },
  openingHours: [
    { dayOfWeek: "Monday", opens: "09:00", closes: "18:00" },
    { dayOfWeek: "Tuesday", opens: "09:00", closes: "18:00" },
    { dayOfWeek: "Wednesday", opens: "09:00", closes: "18:00" },
    { dayOfWeek: "Thursday", opens: "09:00", closes: "18:00" },
    { dayOfWeek: "Friday", opens: "09:00", closes: "18:00" }
  ],
  areaServed: ["神奈川県", "東京都", "千葉県", "埼玉県"]
};


// =============================================================================
// PHOENIX v5.1: コアロジック (v5.0から変更なし)
// =============================================================================

/**
 * ヘルパー関数：文字列を超高精度に正規化する
 */
function normalizeString(str) {
  if (typeof str !== 'string') {
    return '';
  }
  // eslint-disable-next-line no-control-regex
  let normalized = str.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, '');
  normalized = normalized.trim();
  normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  const hankaku = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝﾞﾟ";
  const zenkaku = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンヴ゜";
  for (let i = 0; i < hankaku.length; i++) {
    const regex = new RegExp(hankaku[i], 'g');
    normalized = normalized.replace(regex, zenkaku[i]);
  }
  return normalized;
}

/**
 * ウェブアプリケーションのメインハンドラ (GETリクエスト)
 */
function doGet(e) {
  // Logger.log('doGet Start. System Version: ' + SYSTEM_VERSION);

  try {
    const pageId = e && e.parameter ? e.parameter.page : null;
    const path = e && e.pathInfo ? e.pathInfo : null;
    const baseUrl = ScriptApp.getService().getUrl();

    // Google Site Verification
    if (path === GOOGLE_SITE_VERIFICATION_FILE_NAME || (pageId === GOOGLE_SITE_VERIFICATION_FILE_NAME)) {
      return ContentService.createTextOutput(`google-site-verification: ${GOOGLE_SITE_VERIFICATION_FILE_NAME}`).setMimeType(ContentService.MimeType.HTML);
    }

    // サイトマップ
    if (path === 'sitemap.xml' || (pageId === 'sitemap.xml')) {
      return generateSitemapXml(baseUrl);
    }

    const tmp = HtmlService.createTemplateFromFile('index');
    tmp.pageId = pageId;
    tmp.baseUrl = baseUrl;
    tmp.businessInfo = BUSINESS_INFO;

    // データ取得
    const aiPromptsData = getAiPrompts();
    const caseStudiesData = getCaseStudiesFromFolder();
    const seoPagesData = getSeoPagesData();
    // 【T204: Cialdini/FOMO】カウンター情報取得
    const usageStats = getUsageStatistics();

    tmp.aiPrompts = JSON.stringify(aiPromptsData);
    tmp.caseStudies = JSON.stringify(caseStudiesData);
    tmp.seoPages = JSON.stringify(seoPagesData);
    tmp.usageStats = JSON.stringify(usageStats);

    // 診断情報オブジェクトの生成
    const diagnosticInfo = {
      version: SYSTEM_VERSION,
      timestamp: new Date().toISOString(),
      aiPromptsDiagnostic: aiPromptsData._diagnostic_result || 'N/A',
      apiMode: GEMINI_API_KEY ? 'Production (Gemini API)' : 'Demo'
    };
    tmp.diagnosticInfo = JSON.stringify(diagnosticInfo);


    // ルーティング用のデータ準備
    const caseStudiesList = Array.isArray(caseStudiesData) ? caseStudiesData : [];
    const seoPagesList = (seoPagesData && !seoPagesData.error && Array.isArray(seoPagesData)) ? seoPagesData : [];

    // デフォルトメタ情報
    let title = '【他社の見積もり・図面をAIが無料診断】株式会社相模建設ツクルンジャー';
    let description = BUSINESS_INFO.description;
    let ogImageUrl = BUSINESS_INFO.defaultOgpImageUrl || BUSINESS_INFO.logoUrl || null;


    // ルーティング処理 (変更なし)
    if (pageId && pageId.startsWith('case_')) {
      const docId = pageId.substring(5);
      const caseStudy = caseStudiesList.find(c => c.id === docId);
      if (caseStudy) {
        title = `${caseStudy.title}｜株式会社相模建設ツクルンジャー`;
        description = caseStudy.description || description;
        if (caseStudy.thumbnailUrl) {
          ogImageUrl = caseStudy.thumbnailUrl;
        }
      } else {
        tmp.pageId = 'notfound';
      }
    } else if (pageId && pageId.startsWith('seo_')) {
      const seoId = pageId.substring(4);
      const seoPage = seoPagesList.find(s => s.id === seoId);
      if (seoPage) {
        title = seoPage.pageTitle;
        description = seoPage.metaDescription;
      } else {
        tmp.pageId = 'notfound';
      }
    } else if (pageId === 'list') {
      title = '施工事例一覧｜株式会社相模建設ツクルンジャー';
    }

    tmp.pageTitle = title;
    tmp.metaDescription = description;
    tmp.ogImageUrl = ogImageUrl;

    const htmlOutput = tmp.evaluate().setTitle(title);
    htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return htmlOutput;

  } catch (error) {
    Logger.log('【致命的エラー】doGet失敗: ' + error.stack);
    return HtmlService.createHtmlOutput(`<h1>システムエラー (${SYSTEM_VERSION})</h1><p>現在、サービスを利用できません。詳細: ${error.message}</p>`);
  }
}

// =============================================================================
// PHOENIX v5.1: AI関連機能 (v5.0から変更なし)
// =============================================================================

function getAiPrompts() {
  // (R38から変更なし)
  const cache = CacheService.getScriptCache();
  const cached = cache.get('aiPrompts');
  if (cached) {
    return JSON.parse(cached);
  }

  const createResult = (diagnosticCode, data = {}) => {
    data._diagnostic_result = diagnosticCode;
    return data;
  };

  if (!PROMPTS_SPREADSHEET_ID) return createResult('ID_MISSING');

  try {
    const ss = SpreadsheetApp.openById(PROMPTS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PROMPTS_SHEET_NAME);

    if (!sheet) return createResult('SHEET_NAME_ERROR');

    const data = sheet.getDataRange().getValues();
    const prompts = {};

    if (data.length < 2) return createResult('SHEET_EMPTY');

    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rawMode = row[0]; // A列

      const normalizedMode = normalizeString(rawMode);

      if (normalizedMode !== '') {
        prompts[normalizedMode] = {
          name: row[1] || 'AI専門家',
          greeting: row[2] || '診断を開始します。',
          systemPrompt: row[3] || ''
        };
        count++;
      }
    }

    let diagnosticCode = 'SUCCESS';
    if (count === 0) diagnosticCode = 'NO_VALID_ROWS';

    const finalResult = createResult(diagnosticCode, prompts);
    cache.put('aiPrompts', JSON.stringify(finalResult), CACHE_DURATION);
    return finalResult;

  } catch (e) {
    Logger.log('【重要】プロンプトシート読込エラー: ' + e.stack);
    return createResult('PERMISSION_OR_ID_ERROR');
  }
}

/**
 * 【T403: SOCRATES】【T404: ARIADNE'S THREAD】チャットメッセージ処理
 */
function processChatMessage(jsonData) {
  if (jsonData === undefined || jsonData === null || typeof jsonData !== 'string' || !jsonData.trim().startsWith('{')) {
    return { status: 'error', message: 'サーバーへのデータ送信形式が不正です。(E3001)' };
  }

  let data;
  try {
    data = JSON.parse(jsonData);
  } catch (e) {
    return { status: 'error', message: 'サーバーでのデータ解析に失敗しました。(E3002)' };
  }

  const allPrompts = getAiPrompts();

  // 【T403: SOCRATES】モード名と応答レベル（L1/L2/L3）を結合してプロンプトを特定
  const normalizedMode = normalizeString(data.mode);
  const responseLevel = data.responseLevel || 'L1'; // デフォルトはL1
  const dynamicModeKey = `${normalizedMode}_${responseLevel}`;

  let personaConfig = allPrompts[dynamicModeKey];

  // 動的キーで見つからない場合、レベル指定なしのフォールバック（旧バージョン互換用）
  if (!personaConfig) {
    personaConfig = allPrompts[normalizedMode];
  }

  if (!personaConfig) {
    // 最終的なエラーメッセージでは、試行したキー名を表示する
    return { status: 'error', message: `指定されたAIモード「${data.mode}」の設定が見つかりません。試行キー: ${dynamicModeKey} または ${normalizedMode}。ai_promptsシートA列を確認してください。` };
  }

  const history = data.history || [];
  const isFirstTurn = history.length === 0;

  // 【T204: Cialdini/FOMO】診断実行時にカウンターを増加
  incrementUsageCounter();


  // --- デモモードのロジック (APIキー未設定時) ---
  if (!GEMINI_API_KEY) {
    Utilities.sleep(1500);
    let demoResponse = `【${personaConfig.name}の応答（デモモード）】\n（応答レベル: ${responseLevel}）\n`;

    if (isFirstTurn) {
      demoResponse += "最初のメッセージとファイルを確認しました。（デモ）分析を実行します...";
    } else {
      demoResponse += "追加の質問を確認しました。（デモ）回答します...";
    }
    // 【T404: ARIADNE'S THREAD】連絡先情報を付与
    demoResponse += CONTACT_INFO_BLOCK;
    return { status: 'success', responseMessage: demoResponse };
  }


  // --- 本番AI (Gemini API) のロジック ---
  try {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    // コンテンツ（会話履歴＋新規メッセージ）の構築 (変更なし)
    const contents = [];
    history.forEach(item => {
      contents.push({
        role: item.role,
        parts: [{ text: item.text }]
      });
    });

    const newUserParts = [];
    if (isFirstTurn && data.fileData && data.fileData.includes(',')) {
      const base64Data = data.fileData.split(',')[1];
      newUserParts.push({
        inlineData: {
          mimeType: data.fileMimeType,
          data: base64Data
        }
      });
    }

    const userText = data.message || (isFirstTurn ? '添付資料を確認し、診断を実行してください。' : '続けてください。');
    newUserParts.push({ text: userText });

    contents.push({
      role: 'user',
      parts: newUserParts
    });


    // リクエストボディの構築 (変更なし)
    const requestBody = {
      systemInstruction: isFirstTurn ? {
        parts: [{text: personaConfig.systemPrompt}]
      } : undefined,
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000, // トークン数を増加
      }
    };

    if (!requestBody.systemInstruction) {
      delete requestBody.systemInstruction;
    }

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    };

    // API呼び出し実行
    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());

    // 成功判定
    if (responseCode === 200 && responseBody.candidates && responseBody.candidates.length > 0) {

      let aiResponseText = '';
      try {
        aiResponseText = responseBody.candidates[0].content.parts[0].text;
      } catch (e) {
        return { status: 'error', message: 'AIによる解析が完了しませんでした。内容がポリシーに違反している可能性があります。(Safety/Filter)' };
      }

      // 【T404: ARIADNE'S THREAD】AI応答の末尾に連絡先情報を付与
      aiResponseText += CONTACT_INFO_BLOCK;

      return { status: 'success', responseMessage: aiResponseText };

    } else {
      // APIエラー処理 (変更なし)
      Logger.log('Gemini API Error: Code ' + responseCode + ' Body: ' + JSON.stringify(responseBody));
      let errorMessage = 'AI解析中にエラーが発生しました。(E500)';

      if (responseBody.error) {
        const apiErrorMessage = responseBody.error.message;
        if (responseCode === 400) {
          errorMessage = '【設定エラー】APIキーが無効、またはリクエストが不正です。';
        } else if (responseCode === 429) {
          errorMessage = 'AIの利用制限（レートリミット）を超過しました。';
        } else {
          errorMessage = `AIエラー詳細: ${apiErrorMessage} (Code: ${responseCode})`;
        }
      }
      return { status: 'error', message: errorMessage };
    }

  } catch (e) {
    Logger.log('processChatMessage 致命的エラー: ' + e.stack);
    return { status: 'error', message: 'サーバー側で予期せぬエラーが発生しました。(E501)' };
  }
}

// =============================================================================
// PHOENIX v5.1: 問い合わせ・リード管理機能 (v5.0から変更なし)
// =============================================================================

/**
 * 【T302: Hydra】【T304: IRIS】問い合わせ送信処理
 */
function submitInquiry(jsonData) {
  if (jsonData === undefined || jsonData === null || typeof jsonData !== 'string' || !jsonData.trim().startsWith('{')) {
    return { status: 'error', message: 'クライアントからのデータ形式が不正です。' };
  }

  let data;
  try {
    data = JSON.parse(jsonData);
  } catch (e) {
    return { status: 'error', message: 'サーバーでのデータ解析に失敗しました。(E_INVALID_JSON)' };
  }

  if (!INQUIRY_SPREADSHEET_ID || !INQUIRY_FOLDER_ID) {
    return { status: 'error', message: 'サーバー設定エラー：問い合わせ管理IDまたはフォルダIDが未設定です。' };
  }

  try {
    const ss = SpreadsheetApp.openById(INQUIRY_SPREADSHEET_ID);
    let sheet = ss.getSheetByName(INQUIRY_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(INQUIRY_SHEET_NAME);
    }

    let fileUrl = 'ファイルなし';
    let folder = null;

    try {
      folder = DriveApp.getFolderById(INQUIRY_FOLDER_ID);
    } catch (folderError) {
      // フォルダアクセスエラー
    }

    // 添付ファイルの処理 (変更なし)
    if (data.fileData && data.fileData.includes(',') && folder) {
      try {
        const fileBlob = Utilities.newBlob(
          Utilities.base64Decode(data.fileData.split(',')[1]),
          data.fileMimeType,
          data.fileName
        );
        fileUrl = folder.createFile(fileBlob).getUrl();
      } catch (e) {
        fileUrl = 'ファイル保存失敗: ' + e.message;
      }
    } else if (data.fileName) {
      fileUrl = data.fileName + (folder ? '' : ' (保存フォルダ不明)');
    }

    // 【T302: Hydra】ヘッダー行の定義（顧客経路、チャット往復回数、所要時間を追加）
    const headers = ['タイムスタンプ', 'お名前', 'メールアドレス', '電話番号', 'AIチャット履歴', '顧客からの要望（未使用）', '添付ファイルURL', 'AIモード', '顧客経路(B2B/B2C)', 'チャット往復回数', 'セッション所要時間(秒)'];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    // 【T302: Hydra】データをシートに追加
    const timestamp = new Date();
    sheet.appendRow([
      timestamp,
      data.name,
      data.email,
      data.phone || '', // 電話番号は任意項目
      data.aiSummary,
      '', // 顧客からの要望（未使用）
      fileUrl,
      data.aiMode,
      data.funnelType || '不明', // 顧客経路(B2B/B2C)
      data.chatTurns || 0, // チャット往復回数
      data.sessionDuration || 0 // セッション所要時間(秒)
    ]);

    // 【T304: IRIS】即時メール通知
    sendNotificationEmail(data, fileUrl, timestamp);

    return { status: 'success', message: 'お問い合わせを受け付けました。担当者よりご連絡いたします。' };

  } catch (error) {
    Logger.log('問い合わせ送信 致命的エラー: ' + error.stack);
    return { status: 'error', message: 'サーバー側で送信処理に失敗しました。IDまたは権限を確認してください。' };
  }
}

/**
 * 【T304: IRIS】通知メール送信関数
 */
function sendNotificationEmail(data, fileUrl, timestamp) {
  if (!NOTIFICATION_EMAIL || NOTIFICATION_EMAIL === 'YOUR_COMPANY_EMAIL@example.com') {
    Logger.log('【注意】通知先メールアドレスが設定されていません。');
    return;
  }

  try {
    const subject = `【PHOENIX】新規リード獲得通知 (${data.funnelType || '不明'}) - ${data.name}様`;
    const body = `
PHOENIXシステムより、新規リード獲得を通知します。

■顧客情報
経路: ${data.funnelType || '不明'}
お名前: ${data.name}
メールアドレス: ${data.email}
電話番号: ${data.phone || '未入力'}
獲得時刻: ${timestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

■診断情報
AIモード: ${data.aiMode}
チャット往復回数: ${data.chatTurns || 0}
セッション所要時間: ${data.sessionDuration || 0}秒
添付ファイル: ${fileUrl}

■AIチャット履歴のサマリー
${data.aiSummary.substring(0, 1500)}...

詳細は問い合わせ管理スプレッドシートを確認してください。
${SpreadsheetApp.openById(INQUIRY_SPREADSHEET_ID).getUrl()}
`;

    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (e) {
    Logger.log('【警告】メール通知失敗: ' + e.stack);
  }
}

// =============================================================================
// PHOENIX v5.1: 利用統計・カウンター機能 (v5.0から変更なし)
// =============================================================================

/**
 * 【T204: Cialdini/FOMO】利用統計情報を取得する
 */
function getUsageStatistics() {
  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  // 月間利用者数
  const monthlyCountKey = `usage_count_${thisMonth}`;
  const monthlyCount = parseInt(props.getProperty(monthlyCountKey) || '0');

  // 本日の利用者数
  const dailyCountKey = `usage_count_${today}`;
  const dailyCount = parseInt(props.getProperty(dailyCountKey) || '0');

  // 本日の残り受付枠
  const remainingToday = Math.max(0, DAILY_DIAGNOSIS_LIMIT - dailyCount);

  return {
    monthlyUsers: monthlyCount,
    remainingToday: remainingToday
  };
}

/**
 * 【T204: Cialdini/FOMO】利用カウンターを増加させる
 */
function incrementUsageCounter() {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  // 同時実行を防ぐためにロックを取得（最大10秒待機）
  try {
    if (lock.tryLock(10000)) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = today.substring(0, 7);

        // 月間カウンター
        const monthlyCountKey = `usage_count_${thisMonth}`;
        const monthlyCount = parseInt(props.getProperty(monthlyCountKey) || '0');
        props.setProperty(monthlyCountKey, String(monthlyCount + 1));

        // 日次カウンター
        const dailyCountKey = `usage_count_${today}`;
        const dailyCount = parseInt(props.getProperty(dailyCountKey) || '0');
        props.setProperty(dailyCountKey, String(dailyCount + 1));

      } finally {
        lock.releaseLock();
      }
    } else {
      Logger.log('【警告】カウンターロック取得失敗（タイムアウト）');
    }
  } catch (e) {
    Logger.log('【警告】カウンター増加処理中のエラー: ' + e.message);
  }
}


// =============================================================================
// 既存機能（施工事例、SEOページ、サイトマップ）
// ※v5.0の内容をそのまま継承します。
// =============================================================================

/**
 * 動的サイトマップ(XML)を生成する
 */
function generateSitemapXml(baseUrl) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  const today = new Date().toISOString().split('T')[0];

  // トップページ
  xml += '  <url>\n';
  xml += `    <loc>${baseUrl}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';

  // 施工事例一覧ページ
  xml += '  <url>\n';
  xml += `    <loc>${baseUrl}?page=list</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '    <priority>0.8</priority>\n';
  xml += '  </url>\n';

  // 施工事例詳細ページ
  const caseStudiesData = getCaseStudiesFromFolder();
  const caseStudiesList = Array.isArray(caseStudiesData) ? caseStudiesData : [];
  caseStudiesList.forEach(item => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}?page=case_${item.id}</loc>\n`;
    xml += `    <lastmod>${item.date}</lastmod>\n`;
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
  });

  // SEOページ
  const seoPagesData = getSeoPagesData();
  const seoPagesList = (seoPagesData && !seoPagesData.error && Array.isArray(seoPagesData)) ? seoPagesData : [];
  seoPagesList.forEach(item => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}?page=seo_${item.id}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  // XML形式で出力
  return ContentService.createTextOutput(xml).setMimeType(ContentService.MimeType.XML);
}


function getCaseStudiesFromFolder() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('caseStudies');
  if (cached && !JSON.parse(cached).error) {
    return JSON.parse(cached);
  }

  if (!CASE_STUDY_FOLDER_ID) {
    return [];
  }

  const caseStudies = [];

  try {
    const folder = DriveApp.getFolderById(CASE_STUDY_FOLDER_ID);
    const files = folder.getFilesByType(MimeType.GOOGLE_DOCS);

    while (files.hasNext()) {
      const file = files.next();

      try {
        const doc = DocumentApp.openById(file.getId());
        if (!doc) continue;
        const body = doc.getBody();
        if (!body) continue;

        let numChildren = 0;
        try { numChildren = body.getNumChildren(); } catch (e) { continue; }
        if (numChildren === 0) continue;

        const { html, title, firstImageUrl, description } = parseDocBody(body, file.getName());

        const metaMatch = file.getName().match(/^(\d{4}-\d{2}-\d{2})_(.+?)_(.+)/);
        let date = file.getLastUpdated().toISOString().split('T')[0];
        let region = '全国';
        let keywords = '建設工事';

        if (metaMatch) {
          date = metaMatch[1];
          region = metaMatch[2];
          keywords = metaMatch[3].replace(/_/g, ', ');
        }

        caseStudies.push({
          id: file.getId(),
          title, date, region, keywords, description,
          thumbnailUrl: firstImageUrl,
          content: html,
          lastUpdated: file.getLastUpdated().toISOString()
        });

      } catch (docError) {
        // ドキュメント処理エラーはスキップ
      }
    }

    caseStudies.sort((a, b) => new Date(b.date) - new Date(a.date));

    cache.put('caseStudies', JSON.stringify(caseStudies), CACHE_DURATION);
    return caseStudies;

  } catch (error) {
    const errorMessage = `【重要】施工事例フォルダ読込エラー (ID: ${CASE_STUDY_FOLDER_ID}): IDが間違っているか、権限がありません。`;
    Logger.log(errorMessage + ' 詳細: ' + error.stack);
    return { error: true, message: errorMessage };
  }
}

function parseDocBody(body, defaultTitle) {
  let html = '';
  let title = defaultTitle;
  let firstImageUrl = null;
  let description = '';

  if (!body) return { html: '', title, firstImageUrl, description };

  let numElements = 0;
  try { numElements = body.getNumChildren(); } catch (e) { return { html: '', title, firstImageUrl, description }; }

  for (let i = 0; i < numElements; i++) {
    let element;
    try { element = body.getChild(i); } catch (e) { continue; }

    if (!element) continue;
    const type = element.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH) {
      const paragraph = element.asParagraph();

      // 画像の処理
      if (paragraph.getNumChildren() > 0 && paragraph.getChild(0) && paragraph.getChild(0).getType() == DocumentApp.ElementType.INLINE_IMAGE) {
        const image = paragraph.getChild(0).asInlineImage();
        try {
          const blob = image.getBlob();
          if (blob) {
            const base64Data = Utilities.base64Encode(blob.getBytes());
            const mimeType = blob.getContentType();
            // 【T303: MERCURY】DataURIをそのまま使用
            const imageUrl = `data:${mimeType};base64,${base64Data}`;

            if (!firstImageUrl) firstImageUrl = imageUrl;
            html += `<img class="doc-img" src="${imageUrl}" alt="施工事例の画像" loading="lazy">`;
          }
        } catch (e) {
          // 画像処理失敗時はスキップ
        }

      } else {
        // テキストの処理
        const text = paragraph.getText();
        if (!text || text.trim() === '') continue;

        const heading = paragraph.getHeading();

        // 最初のH1またはTitleをページのタイトルとする
        if (title === defaultTitle && (heading === DocumentApp.ParagraphHeading.TITLE || heading === DocumentApp.ParagraphHeading.HEADING1)) {
          title = text;
          continue; // タイトルは本文に含めない
        }

        // 最初の段落を説明文として使用
        if (description === '' && heading === DocumentApp.ParagraphHeading.NORMAL) {
          description = text.substring(0, 120) + (text.length > 120 ? '...' : '');
        }

        switch (heading) {
          case DocumentApp.ParagraphHeading.HEADING2:
            html += `<h2 class="doc-h2">${text}</h2>`;
            break;
          case DocumentApp.ParagraphHeading.HEADING3:
            html += `<h3 class="doc-h3">${text}</h3>`;
            break;
          default:
            html += `<p class="doc-p">${text}</p>`;
        }
      }
    } else if (type === DocumentApp.ElementType.LIST_ITEM) {
      html += `<li class="doc-li">${element.asListItem().getText()}</li>`;
    }
  }
  return { html, title, firstImageUrl, description };
}


function getSeoPagesData() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('seoPages');
  if (cached) {
    const cachedData = JSON.parse(cached);
    return cachedData;
  }

  if (!SEO_PAGES_SPREADSHEET_ID) {
    return [];
  }
  try {
    const ss = SpreadsheetApp.openById(SEO_PAGES_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SEO_PAGES_SHEET_NAME);

    if (!sheet) {
      const result = { error: true, message: `SEOシート「${SEO_PAGES_SHEET_NAME}」が見つかりません。`, diagnosticCode: 'SHEET_NAME_ERROR'};
      cache.put('seoPages', JSON.stringify(result), CACHE_DURATION);
      return result;
    }
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      const result = { error: true, message: `SEOシート「${SEO_PAGES_SHEET_NAME}」にデータがありません。`, diagnosticCode: 'SHEET_EMPTY'};
      cache.put('seoPages', JSON.stringify(result), CACHE_DURATION);
      return result;
    }

    const seoPages = [];
    let publishedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = row[0]; // A列
      const status = row[1]; // B列

      // StatusがpublishedでIDがある場合のみ処理
      if (status === 'published' && id) {
        seoPages.push({
          id: id,
          targetKeyword: row[2] || '',
          pageTitle: row[3] || 'タイトル未設定',
          metaDescription: row[4] || '',
          h1: row[5] || 'H1未設定',
          mainContent: String(row[6] || '').replace(/\n/g, '<br>'),
          MEO_strengthener: row[7] || '',
          relatedCaseStudyId: row[8] || ''
        });
        publishedCount++;
      }
    }

    if (publishedCount === 0) {
      const result = { error: true, message: `SEOシートに「published」状態の行がありません。`, diagnosticCode: 'NO_PUBLISHED_ROWS'};
      cache.put('seoPages', JSON.stringify(result), CACHE_DURATION);
      return result;
    }

    cache.put('seoPages', JSON.stringify(seoPages), CACHE_DURATION);
    return seoPages;
  } catch (e) {
    Logger.log('SEOスプレッドシート読込エラー: ' + e.stack);
    const result = { error: true, message: `SEOスプレッドシートの読み込み中にエラーが発生しました。`, diagnosticCode: 'PERMISSION_OR_ID_ERROR'};
    return result;
  }
}

// =============================================================================
// 権限承認用ダミー関数
// =============================================================================
function forceEnableAllApis() {
  try { SpreadsheetApp.openById('dummy-id'); } catch (e) {}
  try { DriveApp.getFolderById('dummy-id'); } catch (e) {}
  try { DocumentApp.openById('dummy-id'); } catch (e) {}
  try { Utilities.base64Encode('dummy'); } catch (e) {}
  try { CacheService.getScriptCache().get('dummy-key'); } catch (e) {}
  try { UrlFetchApp.fetch('https://www.google.com'); } catch (e) {}
  // 【T304: IRIS】MailApp権限を追加
  try { MailApp.sendEmail('dummy@example.com', 'dummy', 'dummy'); } catch (e) {}
  // 【T204】PropertiesService, LockService権限を追加
  try { PropertiesService.getScriptProperties().getProperty('dummy'); } catch (e) {}
  try { LockService.getScriptLock().hasLock(); } catch (e) {}
  Logger.log('全てのAPIサービスの有効化を試行しました。（権限承認用）');
}