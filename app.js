// 1. الإعدادات العامة (الموقع وفروق الإقامة بالدقائق)
const config = {
  latitude: 30.0444, // القاهرة كمثال
  longitude: 31.2357,
  // فارق الإقامة بالدقائق بعد كل أذان
  iqamahDelays: {
    fajr: 25,
    dhuhr: 20,
    asr: 20,
    maghrib: 10,
    isha: 20
  },
  // مدة إظهار شاشة الصلاة وإغلاق الهواتف بالدقائق
  prayerDurationMinutes: 15
};

const prayerLabels = {
  fajr: "صلاة الفجر",
  sunrise: "الشروق",
  dhuhr: "صلاة الظهر",
  asr: "صلاة العصر",
  maghrib: "صلاة المغرب",
  isha: "صلاة العشاء"
};

let prayerTimesToday = null;
let iqamahTimesToday = {};

function initApp() {
  const coordinates = new adhan.Coordinates(config.latitude, config.longitude);
  const now = new Date();
  const params = adhan.CalculationMethod.Egyptian();

  prayerTimesToday = new adhan.PrayerTimes(coordinates, now, params);

  // حساب أوقات الإقامة
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  prayers.forEach(p => {
    const pTime = new Date(prayerTimesToday[p]);
    iqamahTimesToday[p] = new Date(pTime.getTime() + config.iqamahDelays[p] * 60000);
    // تحديث وقت الإقامة في الكروت
    const el = document.getElementById(`iqamah-${p}`);
    if (el) el.textContent = formatTimeShort(iqamahTimesToday[p]);
  });

  // تحديث أوقات الأذان في الكروت
  document.getElementById("time-fajr").textContent = formatTimeShort(prayerTimesToday.fajr);
  document.getElementById("time-sunrise").textContent = formatTimeShort(prayerTimesToday.sunrise);
  document.getElementById("time-dhuhr").textContent = formatTimeShort(prayerTimesToday.dhuhr);
  document.getElementById("time-asr").textContent = formatTimeShort(prayerTimesToday.asr);
  document.getElementById("time-maghrib").textContent = formatTimeShort(prayerTimesToday.maghrib);
  document.getElementById("time-isha").textContent = formatTimeShort(prayerTimesToday.isha);

  // تحديث التواريخ
  updateDates(now);
}

function formatTimeShort(date) {
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function updateDates(date) {
  // التاريخ الميلادي
  const gregorianOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("gregorian-date").textContent = date.toLocaleDateString('ar-EG', gregorianOptions);

  // التاريخ الهجري
  const hijriOptions = { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById("hijri-date").textContent = date.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', hijriOptions);
}

function clearCardHighlights() {
  ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
    const card = document.getElementById(`card-${p}`);
    if (card) card.classList.remove('active-card');
  });
}

function tick() {
  const now = new Date();
  
  // 1. تحديث الساعة
  document.getElementById("current-time").textContent = now.toLocaleTimeString('ar-EG');

  // 2. فحص هل نحن في وقت "أداء الصلاة وإغلاق الهواتف" لأي صلاة؟
  const overlay = document.getElementById("prayer-mode-overlay");
  let inPrayer = false;

  ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
    const iqamahTime = iqamahTimesToday[p];
    if (iqamahTime) {
      const prayerEndTime = new Date(iqamahTime.getTime() + config.prayerDurationMinutes * 60000);
      if (now >= iqamahTime && now <= prayerEndTime) {
        inPrayer = true;
      }
    }
  });

  if (inPrayer) {
    overlay.classList.remove('hidden');
    return; // نوقف تحديث العداد وهو في وضع الصلاة
  } else {
    overlay.classList.add('hidden');
  }

  // 3. تحديد الصلاة النشطة / القادمة والتحقق إذا كنا بين الأذان والإقامة
  const prayersOrder = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let currentTargetPrayer = null;
  let isWaitingForIqamah = false;
  let targetTime = null;

  for (let p of prayersOrder) {
    const azanTime = prayerTimesToday[p];
    const iqamahTime = iqamahTimesToday[p];

    // إذا دخل الأذان لكن لم تحن الإقامة بعد (للصلوات الخمس)
    if (iqamahTime && now >= azanTime && now < iqamahTime) {
      currentTargetPrayer = p;
      isWaitingForIqamah = true;
      targetTime = iqamahTime;
      break;
    }

    // إذا لم يحن وقت الأذان بعد
    if (now < azanTime) {
      currentTargetPrayer = p;
      isWaitingForIqamah = false;
      targetTime = azanTime;
      break;
    }
  }

  clearCardHighlights();

  if (currentTargetPrayer && targetTime) {
    const card = document.getElementById(`card-${currentTargetPrayer}`);
    if (card) card.classList.add('active-card');

    document.getElementById("target-prayer-name").textContent = prayerLabels[currentTargetPrayer];

    if (isWaitingForIqamah) {
      document.getElementById("status-badge").textContent = "وقت الإقامة";
      document.getElementById("status-badge").className = "inline-block px-4 py-1 rounded-full text-sm font-semibold bg-amber-950 text-amber-300 border border-amber-800 mb-3 animate-pulse";
      document.getElementById("status-label").textContent = "متبقي على إقامة:";
    } else {
      document.getElementById("status-badge").textContent = "الصلاة القادمة";
      document.getElementById("status-badge").className = "inline-block px-4 py-1 rounded-full text-sm font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 mb-3";
      document.getElementById("status-label").textContent = "متبقي على أذان:";
    }

    // وقت الإقامة التابع للصلاة
    if (iqamahTimesToday[currentTargetPrayer]) {
      document.getElementById("iqamah-time-display").textContent = `وقت الإقامة المتوقع: ${formatTimeShort(iqamahTimesToday[currentTargetPrayer])}`;
    } else {
      document.getElementById("iqamah-time-display").textContent = "";
    }

    // حساب العداد التنازلي
    const diff = targetTime - now;
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById("countdown").textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  } else {
    // بعد العشاء
    document.getElementById("target-prayer-name").textContent = "فجر الغد";
    document.getElementById("status-label").textContent = "متبقي على أذان:";
    document.getElementById("countdown").textContent = "--:--:--";
  }
}

// البدء
initApp();
tick();
setInterval(tick, 1000);

// قائمة الأذكار والتنبيهات
const azkarList = [
  "سبحان الله وبحمده، سبحان الله العظيم",
  "لا حول ولا قوة إلا بالله العلي العظيم",
  "اللهم صل وسلم وبارك على نبينا محمد",
  "استغفر الله العظيم وأتوب إليه",
  "لا إله إلا أنت سبحانك إني كنت من الظالمين",
  "فضل الصلاة في وقتها: أحب الأعمال إلى الله",
  "الرجاء المحافظة على نظافة المسجد والهدوء"
];

let currentZikrIndex = 0;

function updateTicker() {
  const tickerElement = document.getElementById("ticker-text");
  if (!tickerElement) return;

  // تأثير إخفاء ناعم (Fade Out)
  tickerElement.classList.replace("opacity-100", "opacity-0");

  setTimeout(() => {
    currentZikrIndex = (currentZikrIndex + 1) % azkarList.length;
    tickerElement.textContent = azkarList[currentZikrIndex];
    // تأثير إظهار ناعم (Fade In)
    tickerElement.classList.replace("opacity-0", "opacity-100");
  }, 700);
}

// تغيير الذكر كل 10 ثوانٍ
setInterval(updateTicker, 10000);