import OpenAI from "openai"
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"
import fs from "fs"
import path from "path"
import os from "os"
import { Blob } from "buffer"

const openai = process.env.OPENAI_API_KEY
	? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
	: null

const elevenlabs = process.env.ELEVENLABS_API_KEY
	? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
	: null

interface SuggestionContext {
	contactName: string
	notes?: string | null
	daysSinceContact: number | null
	birthdayInDays?: number | null
	language: "ru" | "uz"
}

interface ParsedContact {
	name: string
	frequency?: "weekly" | "biweekly" | "monthly" | "quarterly"
	notes?: string
	birthday?: string // YYYY-MM-DD format
}

export const aiService = {
	/**
	 * Parse voice input to extract contact information
	 */
	async parseVoiceContact(
		text: string,
		language: "ru" | "uz"
	): Promise<ParsedContact | null> {
		if (!openai || !text.trim()) {
			return null
		}

		const isRussian = language === "ru"

		const prompt = isRussian
			? `Проанализируй текст и извлеки информацию о контакте для добавления в приложение напоминаний о связи с людьми.

Текст: "${text}"

Извлеки:
1. name - имя человека (обязательно)
2. frequency - как часто напоминать: weekly (каждую неделю), biweekly (раз в 2 недели), monthly (раз в месяц), quarterly (раз в квартал)
3. notes - любая дополнительная информация о человеке
4. birthday - дата рождения в формате YYYY-MM-DD (если упоминается)

Ответь ТОЛЬКО валидным JSON объектом (без markdown):
{"name": "...", "frequency": "...", "notes": "...", "birthday": "..."}`
			: `Matnni tahlil qiling va kontakt ma'lumotlarini ajratib oling.

Matn: "${text}"

Ajratib oling:
1. name - odamning ismi (majburiy)
2. frequency - qanchalik tez-tez eslatish: weekly (har hafta), biweekly (2 haftada), monthly (har oy), quarterly (har chorak)
3. notes - odam haqida qo'shimcha ma'lumot
4. birthday - tug'ilgan kuni YYYY-MM-DD formatda (agar aytilgan bo'lsa)

FAQAT JSON obyekt bilan javob bering (markdown'siz):
{"name": "...", "frequency": "...", "notes": "...", "birthday": "..."}`

		try {
			const response = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: prompt }],
				max_tokens: 200,
				temperature: 0.3,
			})

			const content = response.choices[0]?.message?.content || ""

			// Extract JSON from response (handle potential markdown code blocks)
			let jsonStr = content.trim()
			if (jsonStr.startsWith("```")) {
				jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "")
			}

			const parsed = JSON.parse(jsonStr)

			// Validate required fields
			if (!parsed.name || typeof parsed.name !== "string") {
				return null
			}

			// Validate frequency if provided
			const validFrequencies = ["weekly", "biweekly", "monthly", "quarterly"]
			if (parsed.frequency && !validFrequencies.includes(parsed.frequency)) {
				delete parsed.frequency
			}

			return {
				name: parsed.name.trim(),
				frequency: parsed.frequency,
				notes: parsed.notes?.trim() || undefined,
				birthday: parsed.birthday || undefined,
			}
		} catch (error) {
			console.error("Error parsing voice contact:", error)
			return null
		}
	},

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
	 * Transcribe audio using Whisper (Russian) or ElevenLabs (Uzbek)
	 */
	async transcribeAudio(
		audioBuffer: Buffer,
		language: "ru" | "uz"
	): Promise<string> {
		// Use ElevenLabs for Uzbek (better support), Whisper for Russian
		if (language === "uz") {
			return this.transcribeWithElevenLabs(audioBuffer)
		}
		return this.transcribeWithWhisper(audioBuffer, language)
	},

	/**
	 * Transcribe audio using ElevenLabs (for Uzbek)
	 */
	async transcribeWithElevenLabs(audioBuffer: Buffer): Promise<string> {
		if (!elevenlabs) {
			throw new Error("ElevenLabs API key not configured")
		}

		try {
			const audioBlob = new Blob([audioBuffer], { type: "audio/webm" })

			const transcription = await elevenlabs.speechToText.convert({
				file: audioBlob,
				modelId: "scribe_v1",
				languageCode: "uzb",
			})

			// Handle different response types
			if ("text" in transcription) {
				return transcription.text || ""
			}
			if ("transcripts" in transcription && transcription.transcripts?.length > 0) {
				return transcription.transcripts.map((t) => t.text).join(" ")
			}

			return ""
		} catch (error) {
			console.error("Error transcribing with ElevenLabs:", error)
			throw new Error("Failed to transcribe audio")
		}
	},

	/**
	 * Transcribe audio using Whisper (for Russian)
	 */
	async transcribeWithWhisper(
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

			const response = await openai.audio.transcriptions.create({
				file: fileStream,
				model: "whisper-1",
				language: language,
			})

			return response.text
		} catch (error) {
			console.error("Error transcribing with Whisper:", error)
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
