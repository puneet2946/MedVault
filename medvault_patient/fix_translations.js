const fs = require('fs');
const path = require('path');

const ctxPath = path.join(__dirname, 'src/context/LanguageContext.js');
let ctx = fs.readFileSync(ctxPath, 'utf8');

const additions = {
  en: `    he_insights: "Health Insights",
    he_insights_desc: "Your living editorial of wellness data.",
    he_reports: "Medical Reports",
    he_reports_desc: "Access and manage your clinical documents, lab results, and imaging scans.",
    he_upload: "Upload Report",
    he_uploading: "Analyzing...",
    he_recent: "Recent Documents",
    he_ai_report: "AI Report Analysis",
    he_sync: "Live Sync",
    he_sync_desc: "Data from Apple Health",
    he_manage: "Manage Devices",
    he_hr: "Heart Rate",
    he_steps: "Daily Steps",
    he_sleep: "Sleep Quality",
    he_o2: "Oxygen (SpO2)",
    he_optimal: "Optimal Range",
    tr_med3_name: "Magnesium",
    tr_med3_time: "8:00 PM",
    tr_med3_desc: "250mg • Before sleep",\n`,
  hi: `    he_insights: "स्वास्थ्य अंतर्दृष्टि",
    he_insights_desc: "आपके वेलनेस डेटा का जीवंत संपादकीय।",
    he_reports: "चिकित्सा रिपोर्ट",
    he_reports_desc: "अपने नैदानिक दस्तावेज़, लैब परिणाम और इमेजिंग स्कैन प्रबंधित करें।",
    he_upload: "रिपोर्ट अपलोड करें",
    he_uploading: "विश्लेषण हो रहा है...",
    he_recent: "हाल के दस्तावेज़",
    he_ai_report: "एआई रिपोर्ट विश्लेषण",
    he_sync: "लाइव सिंक",
    he_sync_desc: "एप्पल हेल्थ से डेटा",
    he_manage: "डिवाइस प्रबंधित करें",
    he_hr: "हृदय गति",
    he_steps: "दैनिक कदम",
    he_sleep: "नींद की गुणवत्ता",
    he_o2: "ऑक्सीजन (SpO2)",
    he_optimal: "इष्टतम सीमा",
    tr_med3_name: "मैग्नीशियम",
    tr_med3_time: "रात 8:00 बजे",
    tr_med3_desc: "250mg • सोने से पहले",\n`,
  bn: `    he_insights: "স্বাস্থ্য অন্তর্দৃষ্টি",
    he_insights_desc: "আপনার সুস্থতা ডেটার জীবন্ত সম্পাদকীয়।",
    he_reports: "মেডিকেল রিপোর্ট",
    he_reports_desc: "আপনার ক্লিনিকাল নথি, ল্যাব ফলাফল এবং ইমেজিং স্ক্যানগুলি পরিচালনা করুন।",
    he_upload: "রিপোর্ট আপলোড করুন",
    he_uploading: "বিশ্লেষণ করা হচ্ছে...",
    he_recent: "সাম্প্রতিক নথিপত্র",
    he_ai_report: "এআই রিপোর্ট বিশ্লেষণ",
    he_sync: "লাইভ সিঙ্ক",
    he_sync_desc: "অ্যাপল হেলথ থেকে ডেটা",
    he_manage: "ডিভাইস পরিচালনা করুন",
    he_hr: "হৃদস্পন্দন",
    he_steps: "দৈনিক পদক্ষেপ",
    he_sleep: "ঘুমের গুণমান",
    he_o2: "অক্সিজেন (SpO2)",
    he_optimal: "সর্বোত্তম পরিসর",
    tr_med3_name: "ম্যাগনেসিয়াম",
    tr_med3_time: "রাত ৮:০০",
    tr_med3_desc: "250mg • ঘুমানোর আগে",\n`,
  ta: `    he_insights: "சுகாதார நுண்ணறிவு",
    he_insights_desc: "உங்கள் ஆரோக்கிய தரவுகளின் தொகுப்பு.",
    he_reports: "மருத்துவ அறிக்கைகள்",
    he_reports_desc: "உங்கள் மருத்துவ ஆவணங்கள், ஆய்வக முடிவுகள் மற்றும் ஸ்கேன்களை நிர்வகிக்கவும்.",
    he_upload: "அறிக்கையைப் பதிவேற்றவும்",
    he_uploading: "பகுப்பாய்வு செய்கிறது...",
    he_recent: "சமீபத்திய ஆவணங்கள்",
    he_ai_report: "ஏஐ அறிக்கை பகுப்பாய்வு",
    he_sync: "நேரலை ஒத்திசைவு",
    he_sync_desc: "ஆப்பிள் ஹெல்த் தரவு",
    he_manage: "சாதனங்களை நிர்வகி",
    he_hr: "இதய துடிப்பு",
    he_steps: "தினசரி படிகள்",
    he_sleep: "தூக்கத்தின் தரம்",
    he_o2: "ஆக்ஸிஜன் (SpO2)",
    he_optimal: "உகந்த வரம்பு",
    tr_med3_name: "மெக்னீசியம்",
    tr_med3_time: "இரவு 8:00",
    tr_med3_desc: "250mg • தூங்குவதற்கு முன்",\n`,
  te: `    he_insights: "ఆరోగ్య అంతర్దృష్టులు",
    he_insights_desc: "మీ వెల్నెస్ డేటా యొక్క ఎడిటోరియల్.",
    he_reports: "వైద్య నివేదికలు",
    he_reports_desc: "మీ వైద్య పత్రాలు, ల్యాబ్ ఫలితాలు మరియు ఇమేజింగ్ స్కాన్‌లను నిర్వహించండి.",
    he_upload: "నివేదికను అప్‌లోడ్ చేయండి",
    he_uploading: "విశ్లేషిస్తోంది...",
    he_recent: "ఇటీవలి పత్రాలు",
    he_ai_report: "ఏఐ నివేదిక విశ్లేషణ",
    he_sync: "లైవ్ సింక్",
    he_sync_desc: "యాపిల్ హెల్త్ నుండి డేటా",
    he_manage: "పరికరాలను నిర్వహించండి",
    he_hr: "హృదయ స్పందన రేటు",
    he_steps: "రోజువారీ దశలు",
    he_sleep: "నిద్ర నాణ్యత",
    he_o2: "ఆక్సిజన్ (SpO2)",
    he_optimal: "సరైన పరిధి",
    tr_med3_name: "మెగ్నీషియం",
    tr_med3_time: "రాత్రి 8:00",
    tr_med3_desc: "250mg • పడుకునే ముందు",\n`
};

for (const lang of Object.keys(additions)) {
  const marker = `  ${lang}: {\n`;
  if (ctx.includes(marker)) {
    ctx = ctx.replace(marker, marker + additions[lang]);
  }
}

fs.writeFileSync(ctxPath, ctx);

// Update Health Page
const healthPath = path.join(__dirname, 'src/app/health/page.js');
let health = fs.readFileSync(healthPath, 'utf8');

health = health.replace('Health Insights', '{t("he_insights")}');
health = health.replace('Your living editorial of wellness data.', '{t("he_insights_desc")}');
health = health.replace('Medical Reports', '{t("he_reports")}');
health = health.replace('Access and manage your clinical documents, lab results, and imaging scans.', '{t("he_reports_desc")}');
health = health.replace('Uploading...' , '{t("he_uploading")}');
health = health.replace('Analyzing...' , '{t("he_uploading")}');
health = health.replace('Upload Report', '{t("he_upload")}');
health = health.replace('Recent Documents', '{t("he_recent")}');
health = health.replace('AI Report Analysis', '{t("he_ai_report")}');
health = health.replace('Live Sync', '{t("he_sync")}');
health = health.replace('Data from Apple Health', '{t("he_sync_desc")}');
health = health.replace('Manage Devices', '{t("he_manage")}');
health = health.replace('Heart Rate', '{t("he_hr")}');
health = health.replace('Daily Steps', '{t("he_steps")}');
health = health.replace('Sleep Quality', '{t("he_sleep")}');
health = health.replace('Oxygen (SpO2)', '{t("he_o2")}');
health = health.replace('Optimal Range', '{t("he_optimal")}');

fs.writeFileSync(healthPath, health);

// Update Tracker Page
const trackerPath = path.join(__dirname, 'src/app/tracker/page.js');
let tracker = fs.readFileSync(trackerPath, 'utf8');

tracker = tracker.replace('<h4 className="font-bold text-on-surface">Magnesium</h4>', '<h4 className="font-bold text-on-surface">{t("tr_med3_name")}</h4>');
tracker = tracker.replace('<span className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">8:00 PM</span>', '<span className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">{t("tr_med3_time")}</span>');
tracker = tracker.replace('<p className="text-sm text-on-surface-variant">250mg • Before sleep</p>', '<p className="text-sm text-on-surface-variant">{t("tr_med3_desc")}</p>');

fs.writeFileSync(trackerPath, tracker);
