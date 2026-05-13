let EXCEL_DATA = [];

async function loadData() {
  try {
    const res = await fetch('./data.json');
    EXCEL_DATA = await res.json();
    console.log('✅ تم تحميل البيانات:', EXCEL_DATA.length, 'سجل');
  } catch (e) {
    console.warn('تعذّر تحميل data.json');
  }
}
loadData();

var inp  = document.getElementById('inp');
var msgs = document.getElementById('msgs');

function addMsg(text, cls) {
  var d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.innerHTML = text.replace(/\n/g, '<br>');
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

// ===== تحليل محلي للبيانات =====
function smartAnswer(q) {
  if (!EXCEL_DATA.length) return null;

  const entities = [...new Set(EXCEL_DATA.map(r => r['الجهة']))];

  // رفض من الوزارة
  if (q.includes('وزار')) {
    const total = EXCEL_DATA.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الوزارة']) || 0), 0);
    const byEntity = {};
    EXCEL_DATA.forEach(r => {
      const v = parseFloat(r['النماذج المرفوضة من الوزارة']) || 0;
      if (v > 0) byEntity[r['الجهة']] = (byEntity[r['الجهة']] || 0) + v;
    });
    const details = Object.entries(byEntity)
      .sort((a,b) => b[1]-a[1])
      .map(([k,v]) => '• ' + k + ': <strong>' + v + '</strong>')
      .join('<br>');
    return 'إجمالي النماذج المرفوضة من الوزارة: <strong>' + total + '</strong><br><br>تفصيل حسب الجهة:<br>' + details;
  }

  // رفض من الإدارة
  if (q.includes('ادار') || q.includes('إدار')) {
    const total = EXCEL_DATA.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الإدارة']) || 0), 0);
    const byEntity = {};
    EXCEL_DATA.forEach(r => {
      const v = parseFloat(r['النماذج المرفوضة من الإدارة']) || 0;
      if (v > 0) byEntity[r['الجهة']] = (byEntity[r['الجهة']] || 0) + v;
    });
    const details = Object.entries(byEntity)
      .sort((a,b) => b[1]-a[1])
      .map(([k,v]) => '• ' + k + ': <strong>' + v + '</strong>')
      .join('<br>');
    return 'إجمالي النماذج المرفوضة من الإدارة: <strong>' + total + '</strong><br><br>تفصيل حسب الجهة:<br>' + details;
  }

  // ملخص
  if (q.includes('ملخص') || q.includes('اجمالي') || q.includes('إجمالي') || q.includes('كم')) {
    const totalAdmin = EXCEL_DATA.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الإدارة']) || 0), 0);
    const totalMin   = EXCEL_DATA.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الوزارة']) || 0), 0);
    return 'ملخص البيانات:<br>• إجمالي السجلات: <strong>' + EXCEL_DATA.length + '</strong><br>• إجمالي الرفض من الإدارة: <strong>' + totalAdmin + '</strong><br>• إجمالي الرفض من الوزارة: <strong>' + totalMin + '</strong><br>• عدد الجهات: <strong>' + entities.length + '</strong>';
  }

  // قائمة الجهات
  if (q.includes('جهات') || q.includes('بلديات') || q.includes('قائمة')) {
    return 'الجهات المتاحة (<strong>' + entities.length + '</strong> جهة):<br>' + entities.map(e => '• ' + e).join('<br>');
  }

  // بحث عن جهة
  const matched = entities.find(e => {
    const eName = e.replace('بلدية','').replace('محافظة','').replace('أمانة منطقة','').trim();
    return q.includes(eName) || q.includes(e);
  });
  if (matched) {
    const rows = EXCEL_DATA.filter(r => r['الجهة'] === matched);
    const rejAdmin = rows.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الإدارة']) || 0), 0);
    const rejMin   = rows.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الوزارة']) || 0), 0);
    const models   = [...new Set(rows.map(r => r['النماذج']))].join('، ');
    return 'معلومات <strong>' + matched + '</strong>:<br>• الرفض من الإدارة: <strong>' + rejAdmin + '</strong><br>• الرفض من الوزارة: <strong>' + rejMin + '</strong><br>• النماذج: ' + models;
  }

  // تصنيف
  if (q.includes('أحمر') || q.includes('احمر')) {
    const count = EXCEL_DATA.filter(r => r['تصنيف النماذج'] === 'أحمر').length;
    return 'عدد السجلات ذات التصنيف الأحمر: <strong>' + count + '</strong>';
  }
  if (q.includes('أخضر') || q.includes('اخضر')) {
    const count = EXCEL_DATA.filter(r => r['تصنيف النماذج'] === 'أخضر').length;
    return 'عدد السجلات ذات التصنيف الأخضر: <strong>' + count + '</strong>';
  }

  // بحث نصي
  const words = q.split(' ').filter(w => w.length > 2);
  const relevant = EXCEL_DATA.filter(r =>
    words.some(w => Object.values(r).join(' ').includes(w))
  );
  if (relevant.length) {
    return relevant.map(r =>
      '• الجهة: <strong>' + r['الجهة'] + '</strong> | النموذج: ' + r['النماذج'] +
      ' | رفض إدارة: <strong>' + r['النماذج المرفوضة من الإدارة'] + '</strong>' +
      ' | رفض وزارة: <strong>' + r['النماذج المرفوضة من الوزارة'] + '</strong>'
    ).join('<br>');
  }

  return null; // لم يُعثر على إجابة محلية → أرسل للـ API
}

// ===== إرسال للـ Claude API =====
async function askClaude(userQuestion) {
  const dataContext = EXCEL_DATA.length
    ? 'البيانات المتاحة (أول 50 سجل):\n' + JSON.stringify(EXCEL_DATA.slice(0, 50), null, 2)
    : 'لا توجد بيانات محملة حالياً.';

  const systemPrompt = `أنت محلل بيانات متخصص ومساعد ذكي.
دائماً تجاوب بالعربية الفصحى.
دائماً تخاطب المستخدم بـ "سعادتك" في كل رد.
بعد كل إجابة، اطرح سؤالاً متابعاً ذا صلة لمواصلة الحوار.
عند عرض النتائج (جداول، قوائم، ملخصات)، أظهر جميع البيانات المتاحة بدون تقليص.
إذا لم يحدد المستخدم سنة أو ربعاً، فاجمع (sum) جميع القيم عبر كل السنوات والأرباع.
تأكد أن تفسيراتك واضحة ومنظمة.

السياق - البيانات المحملة في النظام:
${dataContext}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userQuestion }]
    })
  });

  const data = await response.json();
  if (data.content && data.content[0]) {
    return data.content[0].text;
  }
  throw new Error('لا يوجد رد من الذكاء الاصطناعي');
}

// ===== الدالة الرئيسية للإرسال =====
async function sendMsg() {
  var text = inp.value.trim();
  if (!text) return;

  addMsg(text, 'user');
  inp.value = '';

  var thinking = addMsg('⏳ جاري تحليل البيانات...', 'bot thinking');

  try {
    // أولاً: جرب الإجابة المحلية السريعة
    const localAnswer = smartAnswer(text);

    if (localAnswer) {
      thinking.remove();
      addMsg(localAnswer, 'bot');
    } else {
      // ثانياً: أرسل للـ Claude API
      const aiAnswer = await askClaude(text);
      thinking.remove();
      addMsg(aiAnswer, 'bot');
    }
  } catch (err) {
    thinking.remove();
    addMsg('عذراً، حدث خطأ أثناء معالجة طلب سعادتك. يرجى المحاولة مجدداً.', 'bot');
    console.error(err);
  }
}

inp.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMsg();
});

window.sendMsg = sendMsg;
