const cityPresets = {
  cairo: { lat: 30.0444, lng: 31.2357, method: 'Egyptian' },
  makkah: { lat: 21.4225, lng: 39.8262, method: 'UmmAlQura' },
  kuwait: { lat: 29.3759, lng: 47.9774, method: 'Kuwait' },
  dubai: { lat: 25.2048, lng: 55.2708, method: 'Dubai' }
};

let settings = JSON.parse(localStorage.getItem('prayer_settings')) || {
  mosqueName: "مسجد النور",
  cityKey: "cairo",
  iqamahDelays: { fajr: 25, dhuhr: 20, asr: 20, maghrib: 10, isha: 20 },
  prayerDurationMinutes: 15,
  audioEnabled: true
};

const prayerLabels = {
  fajr: 'صلاة الفجر',
  sunrise: 'الشروق',
  dhuhr: 'صلاة الظهر',
  asr: 'صلاة العصر',
  maghrib: 'صلاة المغرب',
  isha: 'صلاة العشاء'
};

const azkarList = [
  'سبحان الله وبحمده سبحان الله العظيم',
  'لا حول ولا قوة إلا بالله العلي العظيم',
  'اللهم صل وسلم وبارك على نبينا محمد',
  'استغفر الله العظيم وأتوب إليه',
  'لا إله إلا أنت سبحانك إني كنت من الظالمين',
  'الرجاء المحافظة على نظافة المسجد والهدوء'
];

let prayerTimesToday = null;
let iqamahTimesToday = {};
let currentZikrIndex = 0;
let audioContext = null;

function playBeep(freq = 600, duration = 0.5) {
  if (!settings.audioEnabled) return;
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch (e) {
    console.log("Audio waiting for user click.");
  }
}

function initApp() {
  document.getElementById("mosque-title").textContent = settings.mosqueName;
  const currentPreset = cityPresets[settings.cityKey] || cityPresets.cairo;
  const coordinates = new adhan.Coordinates(currentPreset.lat, currentPreset.lng);
  const now = new Date();
  let methodParams = adhan.CalculationMethod[currentPreset.method]();
  prayerTimesToday = new adhan.PrayerTimes(coordinates, now, methodParams);

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  prayers.forEach(p => {
    const pTime = new Date(prayerTimesToday[p]);
    iqamahTimesToday[p] = new Date(pTime.getTime() + (settings.iqamahDelays[p] || 15) * 60000);
    const el = document.getElementById('iqamah-' + p);
    if (el) el.textContent = formatTimeShort(iqamahTimesToday[p]);
  });

  document.getElementById('time-fajr').textContent = formatTimeShort(prayerTimesToday.fajr);
  document.getElementById('time-sunrise').textContent = formatTimeShort(prayerTimesToday.sunrise);
  document.getElementById('time-dhuhr').textContent = formatTimeShort(prayerTimesToday.dhuhr);
  document.getElementById('time-asr').textContent = formatTimeShort(prayerTimesToday.asr);
  document.getElementById('time-maghrib').textContent = formatTimeShort(prayerTimesToday.maghrib);
  document.getElementById('time-isha').textContent = formatTimeShort(prayerTimesToday.isha);

  updateDates(now);
}

function formatTimeShort(date) {
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function updateDates(date) {
  const gregorianOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('gregorian-date').textContent = date.toLocaleDateString('ar-EG', gregorianOptions);

  const hijriOptions = { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('hijri-date').textContent = date.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', hijriOptions);
}

function clearCardHighlights() {
  ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
    const card = document.getElementById(`card-${p}`);
    if (card) card.classList.remove('active-card');
  });
}

function updateTicker() {
  const tickerElement = document.getElementById('ticker-text');
  if (!tickerElement) return;
  tickerElement.classList.replace('opacity-100', 'opacity-0');
  setTimeout(() => {
    currentZikrIndex = (currentZikrIndex + 1) % azkarList.length;
    tickerElement.textContent = azkarList[currentZikrIndex];
    tickerElement.classList.replace('opacity-0', 'opacity-100');
  }, 700);
}

function tick() {
  const now = new Date();
  document.getElementById('current-time').textContent = now.toLocaleTimeString('ar-EG');

  const overlay = document.getElementById('prayer-mode-overlay');
  let inPrayer = false;

  ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
    const iqamahTime = iqamahTimesToday[p];
    if (iqamahTime) {
      const prayerEndTime = new Date(iqamahTime.getTime() + settings.prayerDurationMinutes * 60000);
      if (now >= iqamahTime && now <= prayerEndTime) {
        inPrayer = true;
      }
    }
  });

  if (inPrayer) {
    overlay.classList.remove('hidden');
    return;
  } else {
    overlay.classList.add('hidden');
  }

  const prayersOrder = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let currentTargetPrayer = null;
  let isWaitingForIqamah = false;
  let targetTime = null;

  for (let p of prayersOrder) {
    const azanTime = prayerTimesToday[p];
    const iqamahTime = iqamahTimesToday[p];

    if (iqamahTime && now >= azanTime && now < iqamahTime) {
      currentTargetPrayer = p;
      isWaitingForIqamah = true;
      targetTime = iqamahTime;
      break;
    }

    if (now < azanTime) {
      currentTargetPrayer = p;
      isWaitingForIqamah = false;
      targetTime = azanTime;
      break;
    }
  }

  clearCardHighlights();

  if (currentTargetPrayer && targetTime) {
    const card = document.getElementById('card-' + currentTargetPrayer);
    if (card) card.classList.add('active-card');

    document.getElementById('target-prayer-name').textContent = prayerLabels[currentTargetPrayer];

    if (isWaitingForIqamah) {
      document.getElementById('status-badge').textContent = 'وقت الإقامة';
      document.getElementById('status-badge').className = 'inline-block px-5 py-1.5 rounded-full text-sm font-bold bg-amber-950 text-amber-300 border border-amber-800 mb-3 animate-pulse';
      document.getElementById('status-label').textContent = 'متبقي على إقامة:';
    } else {
      document.getElementById('status-badge').textContent = 'الصلاة القادمة';
      document.getElementById('status-badge').className = 'inline-block px-5 py-1.5 rounded-full text-sm font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 mb-3';
      document.getElementById('status-label').textContent = 'متبقي على أذان:';
    }

    if (iqamahTimesToday[currentTargetPrayer]) {
      document.getElementById('iqamah-time-display').textContent = 'وقت الإقامة المتوقع: ' + formatTimeShort(iqamahTimesToday[currentTargetPrayer]);
    } else {
      document.getElementById('iqamah-time-display').textContent = '';
    }

    const diff = targetTime - now;
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById('countdown').textContent = 
        String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

      if (hours === 0 && minutes === 0 && seconds === 1) {
        playBeep(880, 1.5);
      }
    }
  } else {
    document.getElementById('target-prayer-name').textContent = 'فجر الغد';
    document.getElementById('status-label').textContent = 'متبقي على أذان:';
    document.getElementById('countdown').textContent = '--:--:--';
  }
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(err.message);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function openSettings() {
  document.getElementById('setting-mosque-name').value = settings.mosqueName;
  document.getElementById('setting-city').value = settings.cityKey;
  document.getElementById('setting-iqamah-fajr').value = settings.iqamahDelays.fajr;
  document.getElementById('setting-iqamah-dhuhr').value = settings.iqamahDelays.dhuhr;
  document.getElementById('setting-iqamah-asr').value = settings.iqamahDelays.asr;
  document.getElementById('setting-iqamah-maghrib').value = settings.iqamahDelays.maghrib;
  document.getElementById('setting-iqamah-isha').value = settings.iqamahDelays.isha;
  document.getElementById('setting-audio-enabled').checked = settings.audioEnabled;
  document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function saveSettings() {
  settings.mosqueName = document.getElementById('setting-mosque-name').value || "مسجد";
  settings.cityKey = document.getElementById('setting-city').value;
  settings.audioEnabled = document.getElementById('setting-audio-enabled').checked;
  settings.iqamahDelays = {
    fajr: parseInt(document.getElementById('setting-iqamah-fajr').value) || 20,
    dhuhr: parseInt(document.getElementById('setting-iqamah-dhuhr').value) || 15,
    asr: parseInt(document.getElementById('setting-iqamah-asr').value) || 15,
    maghrib: parseInt(document.getElementById('setting-iqamah-maghrib').value) || 10,
    isha: parseInt(document.getElementById('setting-iqamah-isha').value) || 15
  };

  localStorage.setItem('prayer_settings', JSON.stringify(settings));
  closeSettings();
  initApp();
}

initApp();
tick();
setInterval(tick, 1000);
setInterval(updateTicker, 10000);

if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js'); }); }
