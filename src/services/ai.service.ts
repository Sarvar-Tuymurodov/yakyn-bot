import OpenAI from "openai"
import fs from "fs"
import path from "path"
import os from "os"

const openai = process.env.OPENAI_API_KEY
	? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
	: null

interface SuggestionContext {
	contactName: string
	notes?: string | null
	daysSinceContact: number | null
	birthdayInDays?: number | null
	language: "ru" | "uz"
}

export const aiService = {
	/**
	 * Generate message suggestions based on contact context
	 */
	async generateSuggestions(context: SuggestionContext): Promise<string[]> {
		const { contactName, notes, daysSinceContact, birthdayInDays, language } =
			context

		const isRussian = language === "ru"

		// Build context description
		let situationContext = ""

		// Time since last contact context
		if (daysSinceContact !== null) {
			if (daysSinceContact <= 3) {
				situationContext += isRussian
					? "Недавно общались (пару дней назад). "
					: "Yaqinda gaplashgansiz (bir necha kun oldin). "
			} else if (daysSinceContact <= 14) {
				situationContext += isRussian
					? `Не общались ${daysSinceContact} дней. `
					: `${daysSinceContact} kun gaplashmadingiz. `
			} else if (daysSinceContact <= 30) {
				situationContext += isRussian
					? "Не общались около месяца. "
					: "Taxminan bir oy gaplashmadingiz. "
			} else {
				situationContext += isRussian
					? `Давно не общались (${daysSinceContact} дней). `
					: `Uzoq gaplashmadingiz (${daysSinceContact} kun). `
			}
		}

		// Birthday context
		let birthdayContext = ""
		if (birthdayInDays != null && birthdayInDays >= 0 && birthdayInDays <= 7) {
			if (birthdayInDays === 0) {
				birthdayContext = isRussian
					? "ВАЖНО: Сегодня у этого человека день рождения!"
					: "MUHIM: Bugun bu odamning tug'ilgan kuni!"
			} else if (birthdayInDays === 1) {
				birthdayContext = isRussian
					? "Завтра у этого человека день рождения."
					: "Ertaga bu odamning tug'ilgan kuni."
			} else if (birthdayInDays <= 3) {
				birthdayContext = isRussian
					? `Через ${birthdayInDays} дня день рождения.`
					: `${birthdayInDays} kundan keyin tug'ilgan kuni.`
			}
		}

		// Notes context
		let notesContext = ""
		if (notes && notes.trim()) {
			notesContext = isRussian
				? `Информация о человеке: ${notes}`
				: `Odam haqida ma'lumot: ${notes}`
		}

		const prompt = isRussian
			? `Ты помогаешь написать короткое сообщение другу/знакомому по имени ${contactName}.

${situationContext}${birthdayContext ? "\n" + birthdayContext : ""}${notesContext ? "\n" + notesContext : ""}

Напиши 3 разных варианта сообщения. Требования:
- Пиши как реальный человек в мессенджере (короткие фразы, можно без знаков препинания в конце)
- Каждое сообщение 1-2 предложения максимум
- Разные стили: 1) просто узнать как дела, 2) предложить встретиться/созвониться, 3) что-то более личное если есть заметки
${birthdayInDays === 0 ? "- ВСЕ сообщения должны быть поздравлениями с днём рождения!" : ""}
${birthdayInDays === 1 ? "- Можно упомянуть что завтра др" : ""}
- НЕ начинай все сообщения одинаково
- Без эмодзи

Выведи только 3 сообщения, каждое на новой строке:`
			: `${contactName} ismli do'stingizga/tanishingizga qisqa xabar yozishda yordam beraman.

${situationContext}${birthdayContext ? "\n" + birthdayContext : ""}${notesContext ? "\n" + notesContext : ""}

3 xil xabar variantini yozing. Talablar:
- Haqiqiy odam kabi yozing (qisqa iboralar)
- Har bir xabar 1-2 gap
- Turli uslublar: 1) ahvolni so'rash, 2) uchrashish/qo'ng'iroq taklifi, 3) shaxsiyroq narsa
${birthdayInDays === 0 ? "- BARCHA xabarlar tug'ilgan kun tabrigi bo'lishi kerak!" : ""}
${birthdayInDays === 1 ? "- Ertaga tug'ilgan kuni ekanini aytish mumkin" : ""}
- Hammasi bir xil boshlanmasin
- Emoji ishlatmang

Faqat 3 ta xabarni, har birini yangi qatorda chiqaring:`

		if (!openai) {
			return getDefaultSuggestions(language, contactName)
		}

		try {
			const response = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: prompt }],
				max_tokens: 300,
				temperature: 0.8,
			})

			const content = response.choices[0]?.message?.content || ""
			const suggestions = content
				.split("\n")
				.map((s) => s.trim())
				.filter((s) => s.length > 0 && s.length < 200)
				.slice(0, 3)

			return suggestions.length > 0
				? suggestions
				: getDefaultSuggestions(language, contactName)
		} catch (error) {
			console.error("Error generating suggestions:", error)
			return getDefaultSuggestions(language, contactName)
		}
	},

	/**
	 * Transcribe audio using Whisper
	 */
	async transcribeAudio(
		audioBuffer: Buffer,
		language: "ru" | "uz"
	): Promise<string> {
		if (!openai) {
			throw new Error("OpenAI API key not configured")
		}

		// Create a temporary file
		const tempDir = os.tmpdir()
		const tempFilePath = path.join(tempDir, `audio_${Date.now()}.webm`)

		try {
			// Write buffer to temp file
			fs.writeFileSync(tempFilePath, audioBuffer)

			// Create read stream for OpenAI
			const fileStream = fs.createReadStream(tempFilePath)

			// Whisper doesn't officially support Uzbek, but can transcribe it
			// For Russian, we explicitly set the language
			// For Uzbek, we add a prompt hint to help recognition
			const response = await openai.audio.transcriptions.create({
				file: fileStream,
				model: "whisper-1",
				...(language === "ru"
					? { language: "ru" }
					: { prompt: "O'zbek tilida gapiraman. Salom, qalaysiz?" }
				),
			})

			return response.text
		} catch (error) {
			console.error("Error transcribing audio:", error)
			throw new Error("Failed to transcribe audio")
		} finally {
			// Clean up temp file
			try {
				if (fs.existsSync(tempFilePath)) {
					fs.unlinkSync(tempFilePath)
				}
			} catch {
				// Ignore cleanup errors
			}
		}
	},
}

function getDefaultSuggestions(language: "ru" | "uz", name: string): string[] {
	if (language === "ru") {
		return [
			`Привет, ${name}! Как дела? Давно не общались.`,
			`${name}, как ты? Может встретимся на этой неделе?`,
			`Эй, ${name}! Вспомнил(а) о тебе, как жизнь?`,
		]
	}
	return [
		`Salom, ${name}! Qalaysan? Uzoq gaplashmadik.`,
		`${name}, yaxshimisan? Shu hafta uchrashsak bo'ladimi?`,
		`Hey, ${name}! Seni esladim, hayot qanday?`,
	]
}
