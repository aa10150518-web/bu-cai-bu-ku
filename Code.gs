const SHEET_NAME = "orders";

function pickValue(data, keys) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      return data[key];
    }
  }
  return "";
}

function normalizeItems(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(/\n|、|,/).map(item => item.trim()).filter(Boolean);
  }
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function normalizeIncomingOrder(body) {
  const items = normalizeItems(
    pickValue(body, ["items", "items_text", "itemsText", "item", "itemName"]),
    pickValue(body, ["itemsList", "selectedItems", "selected"])
  );

  return {
    createdAt: pickValue(body, ["createdAt", "created_at", "timestamp"]) || new Date(),
    orderId: pickValue(body, ["orderId", "orderNo", "order_id", "order_no"]),
    name: pickValue(body, ["name", "studentName", "student_name", "customerName", "fullName", "contactName"]),
    phone: pickValue(body, ["phone", "contactPhone", "mobile"]),
    lineId: pickValue(body, ["lineId", "lineID", "line_id", "line"]),
    email: pickValue(body, ["email", "studentEmail", "student_email"]),
    gender: pickValue(body, ["gender"]),
    lunarBirth: pickValue(body, ["lunarBirth", "lunar_birth", "birth"]),
    lunarBirthTime: pickValue(body, ["lunarBirthTime", "lunar_birth_time", "birthTime"]),
    zodiac: pickValue(body, ["zodiac"]),
    items,
    total: Number(pickValue(body, ["total", "amount", "totalAmount", "total_amount", "price"]) || 0),
    paymentMethod: pickValue(body, ["paymentMethod", "payment_method", "payment"]),
    address: pickValue(body, ["address", "shippingAddress", "shipping_address", "homeAddress", "home_address"]),
    company: pickValue(body, ["company"]),
    companyAddress: pickValue(body, ["companyAddress", "company_address"]),
    note: pickValue(body, ["note"])
  };
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || "{}");

  if (body.events) {
    return handleLineWebhook(body);
  }

  if (body.type !== "order") {
    return jsonResponse({ ok: false, message: "Unknown request" });
  }

  const order = normalizeIncomingOrder(body);
  const sheet = getOrderSheet();
  sheet.appendRow([
    order.createdAt,
    order.orderId,
    order.name,
    order.phone,
    order.lineId,
    order.email,
    order.gender,
    order.lunarBirth,
    order.zodiac,
    order.items.join("、"),
    order.total,
    order.paymentMethod,
    order.address,
    order.company,
    order.companyAddress,
    order.note
  ]);

  pushOwnerMessage(body.message || formatOrderMessage(order));
  return jsonResponse({ ok: true, orderId: order.orderId });
}

function getOrderSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "建立時間",
      "訂單編號",
      "姓名",
      "電話",
      "LINE",
      "Email",
      "性別",
      "農曆生日",
      "生肖",
      "項目",
      "合計",
      "付款方式",
      "住家地址",
      "公司行號",
      "公司地址",
      "備註"
    ]);
  }

  return sheet;
}

function formatOrderMessage(order) {
  return [
    "🛒 昌久貹｜新訂單通知",
    "━━━━━━━━━━━━",
    `📋 訂單編號：${order.orderId || ""}`,
    `👤 姓名：${order.name || ""}`,
    `📞 電話：${order.phone || ""}`,
    `💬 LINE：${order.lineId || ""}`,
    `📧 Email：${order.email || ""}`,
    `📍 地址：${order.address || ""}`,
    "━━━━━━━━━━━━",
    "📦 項目：",
    ...order.items.map(item => `・${item}`),
    "━━━━━━━━━━━━",
    `💰 合計：NT$ ${Number(order.total || 0).toLocaleString("zh-TW")}`,
    `💳 付款：${order.paymentMethod || ""}`,
    `⏰ ${order.createdAt || new Date().toLocaleString("zh-TW")}`
  ].filter(Boolean).join("\n");
}

function pushOwnerMessage(text) {
  const token = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");
  const ownerUserId = PropertiesService.getScriptProperties().getProperty("LINE_OWNER_USER_ID");

  if (!token || !ownerUserId) {
    return;
  }

  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${token}`
    },
    payload: JSON.stringify({
      to: ownerUserId,
      messages: [{ type: "text", text }]
    }),
    muteHttpExceptions: true
  });
}

function handleLineWebhook(body) {
  const events = body.events || [];

  events.forEach(event => {
    if (event.type === "message" && event.replyToken && event.source && event.source.userId) {
      replyLineMessage(event.replyToken, `你的 LINE User ID：\n${event.source.userId}\n\n請把這串填到 LINE_OWNER_USER_ID`);
    }
  });

  return jsonResponse({ ok: true });
}

function replyLineMessage(replyToken, text) {
  const token = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ACCESS_TOKEN");

  if (!token) {
    return;
  }

  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${token}`
    },
    payload: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }]
    }),
    muteHttpExceptions: true
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
