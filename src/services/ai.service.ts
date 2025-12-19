import OpenAI from "openai"
import fs from "fs"
import path from "path"
import os from "os"

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

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

		const languageInstructions =
			language === "ru"
				? "Отвечай на русском языке. Используй неформальный дружеский тон."
				: "O'zbek tilida javob ber. Do'stona va samimiy ohangda yoz."

		let contextInfo = `Имя контакта: ${contactName}`

		if (notes) {
			contextInfo += `\nЗаметки о человеке: ${notes}`
		}

		if (daysSinceContact !== null) {
			contextInfo += `\nДней с последнего контакта: ${daysSinceContact}`
		}

		if (birthdayInDays != null && birthdayInDays >= 0 && birthdayInDays <= 7) {
			if (birthdayInDays === 0) {
				contextInfo += `\nСегодня день рождения!`
			} else {
				contextInfo += `\nДень рождения через ${birthdayInDays} дней`
			}
		}

		const prompt = `${languageInstructions}

Ты помощник для приложения, которое помогает людям поддерживать связь с близкими.

Контекст:
${contextInfo}

Сгенерируй 3 коротких варианта сообщения, которое можно отправить этому человеку.
Сообщения должны быть:
- Естественными и дружескими
- Короткими (1-2 предложения)
- Разнообразными по стилю (одно может быть вопросом, другое - предложением встретиться, третье - просто поздороваться)
${birthdayInDays === 0 ? "- Обязательно поздравь с днем рождения!" : ""}
${
	birthdayInDays != null && birthdayInDays > 0 && birthdayInDays <= 3
		? "- Можно упомянуть предстоящий день рождения"
		: ""
}

Верни ТОЛЬКО 3 сообщения, каждое на новой строке, без нумерации и без лишнего текста.`

		try {
			const response = await openai.chat.completions.create({
				model: "gpt-5-mini",
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
