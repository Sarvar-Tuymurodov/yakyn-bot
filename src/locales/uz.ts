export const uz = {
  // Language selection
  selectLanguage: "🌐 Tilni tanlang / Выберите язык",

  // Welcome (for new users)
  welcome: `👋 Yakyn'ga xush kelibsiz!

Yaqinlaringiz bilan iliq munosabatlarni saqlab qolishda yordam beraman.

Qanday ishlaydi:
1. Kontakt qo'shing
2. Qanchalik tez-tez eslatishni tanlang
3. Do'stona eslatmalar oling

Boshlash uchun quyidagi tugmani bosing 👇`,

  // Welcome back (for returning users)
  welcomeBack: `👋 Qaytganingizdan xursandmiz!

Ilovani ochish uchun quyidagi tugmani bosing 👇`,

  // Add contact flow
  enterName: "👤 Kontakt ismini kiriting:",
  selectFrequency: "🔔 {name} bilan bog'lanishni qanchalik tez-tez eslatay?",
  selectTime: "⏰ {name} haqida qaysi vaqtda eslatay?",

  // Frequencies
  frequencies: {
    weekly: "Har hafta",
    biweekly: "2 haftada bir",
    monthly: "Oyiga bir",
    quarterly: "3 oyda bir",
  },

  // Contact added success
  contactAdded: `✅ Kontakt qo'shildi!

👤 {name}
🔔 {frequency}
⏰ Soat {time}

Birinchi eslatma: {date}`,

  // Buttons
  buttons: {
    addAnother: "➕ Yana qo'shish",
    openApp: "📱 Yakyn'ni ochish",
    contacted: "✅ Bog'landim",
    snooze1h: "1s",
    snooze3h: "3s",
    tomorrow: "Ertaga",
    delete: "🗑 O'chirish",
    confirmDelete: "❌ Ha, o'chirish",
    cancel: "◀️ Bekor qilish",
    addNote: "📝 Eslatma qo'shish",
    skip: "⏭ O'tkazib yuborish",
  },

  // Note prompt
  askForNote: "📝 {name} bilan nima haqida gaplashdingiz?",
  noteReceived: "✅ Eslatma saqlandi!",

  // List
  listContacts: `📋 Sizda {count} ta kontakt bor
🔔 Bog'lanish kerak: {overdue}`,
  noContacts: "📭 Sizda hali kontaktlar yo'q.",

  // Reminder
  reminder: `👋 Yozish uchun zo'r fursat

{contacts}

Oddiy «salom, qalaysan?» ikkalangizning kayfiyatini ko'taradi ❤️`,
  reminderItem: "• {name}",

  // Birthday reminders
  birthdayReminder: `🎂 {days} kundan keyin {name}ning tug'ilgan kuni!

Tabrik tayyorlash uchun eng yaxshi vaqt — bir necha iliq so'z yozing yoki qo'ng'iroq rejalashtiring 💝`,
  birthdayToday: `🎉 Bugun {name}ning tug'ilgan kuni!

Hoziroq qo'ng'iroq qiling yoki yozing — e'tiboringiz bu kunni unutilmas qiladi ✨`,

  // Actions
  markedContacted: "✅ Barakalla! Aloqa saqlab qolindi 💪\n\nKeyingi eslatma: {date}",
  snoozedTomorrow: "⏰ Ertaga soat {time} da eslataman",
  snoozedHours: "⏰ {hours} soatdan keyin eslataman",

  // Delete
  confirmDeleteContact: '⚠️ "{name}" kontaktini o\'chirasizmi?',
  contactDeleted: "✅ Kontakt o'chirildi",

  // Settings
  settings: `⚙️ Sozlamalar

🌐 Til: O'zbekcha
🕐 Vaqt zonasi: {timezone}`,
  changeLanguage: "🌐 Tilni o'zgartirish",
  changeTimezone: "🕐 Vaqt zonasi",

  // Errors
  error: "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
} as const;
