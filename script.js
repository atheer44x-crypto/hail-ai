var inp  = document.getElementById('inp');
var msgs = document.getElementById('msgs');
var ri = 0;
var replies = [
  'شكرًا على سؤالك! سأقوم بمعالجة طلبك والرد عليك قريبًا.',
  'يسعدني مساعدتك، هل تودّ الاستفسار عن خدمة معينة؟',
  'تم استلام طلبك، سيتم الرد عليك من الفريق المختص.',
  'يمكنك متابعة طلبك عبر منصة بلدي مباشرةً.'
];

function addMsg(text, cls) {
  var d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function sendMsg() {
  var text = inp.value.trim();
  if (!text) return;
  addMsg(text, 'user');
  inp.value = '';
  setTimeout(function () {
    addMsg(replies[ri % replies.length], 'bot');
    ri++;
  }, 700);
}

inp.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') sendMsg();
});
