export const uz = {
  // Language selection
  selectLanguage: "🌐 Tilni tanlang / Выберите язык",

  // Welcome
  welcome: `👋 Yakyn'ga xush kelibsiz!

Men sizga muhim odamlar bilan aloqani yo'qotmaslikda yordam beraman.

Qanday ishlaydi:
1. Kontakt qo'shing
2. Qanchalik tez-tez eslatishni tanlang
3. O'z vaqtida eslatmalar oling

Buyruqlar:
/add — kontakt qo'shish
/list — kontaktlarim`,

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
    tomorrow: "⏰ Ertaga",
    delete: "🗑 O'chirish",
    confirmDelete: "❌ Ha, o'chirish",
    cancel: "◀️ Bekor qilish",
  },

  // List
  listContacts: `📋 Sizda {count} ta kontakt bor
🔔 Bog'lanish kerak: {overdue}`,
  noContacts: "📭 Sizda hali kontaktlar yo'q.",

  // Reminder
  reminder: `🔔 Eslatma

Bog'lanish vaqti keldi:
{contacts}`,
  reminderItem: "• {name} — {days} kun oldin",

  // Actions
  markedContacted: "✅ Yaxshi! Belgilab qo'ydim. Keyingi eslatma: {date}",
  snoozedTomorrow: "⏰ Yaxshi! Ertaga soat {time} da eslataman",

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
